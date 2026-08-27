// lib/community/authz.ts
// Regras de autorização server-side da Comunidade. Nunca confiar em `role`,
// `groupId` ou dono informado pelo cliente — sempre reconsultar o banco.
import { prisma } from "@/lib/prisma";
import type { PostType } from "@prisma/client";
import type { Db } from "./types";

export class AuthzError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.name = "AuthzError";
    this.status = status;
  }
}

/** Chave normalizada de par (menor id primeiro) para evitar amizades duplicadas A→B / B→A. */
export function normalizeFriendPair(userIdA: string, userIdB: string): { userAId: string; userBId: string } {
  return userIdA < userIdB ? { userAId: userIdA, userBId: userIdB } : { userAId: userIdB, userBId: userIdA };
}

export async function isBlockedEitherWay(db: Db, userId: string, otherUserId: string): Promise<boolean> {
  const block = await db.communityBlock.findFirst({
    where: {
      OR: [
        { blockerUserId: userId, blockedUserId: otherUserId },
        { blockerUserId: otherUserId, blockedUserId: userId },
      ],
    },
    select: { id: true },
  });
  return !!block;
}

/** IDs de usuários cujas publicações o usuário informado silenciou no próprio feed (nunca bidirecional — só afeta quem silenciou). */
export async function getMutedUserIds(db: Db, userId: string): Promise<Set<string>> {
  const mutes = await db.userFeedMute.findMany({ where: { muterUserId: userId }, select: { mutedUserId: true } });
  return new Set(mutes.map((m) => m.mutedUserId));
}

/**
 * Tipos de post (PostType) que o usuário informado silenciou no próprio
 * feed. postType é String na tabela (mesmo motivo de XpEvent.eventType), mas
 * o valor gravado sempre veio validado contra o enum real em
 * mutePostTypeSchema — o cast aqui reflete essa garantia, não a contorna.
 */
export async function getMutedPostTypes(db: Db, userId: string): Promise<Set<PostType>> {
  const mutes = await db.userContentMute.findMany({ where: { userId }, select: { postType: true } });
  return new Set(mutes.map((m) => m.postType as PostType));
}

/** IDs de todo usuário bloqueado ou que bloqueou o usuário informado (para filtrar feed/busca/sugestões). */
export async function getBlockedUserIds(db: Db, userId: string): Promise<Set<string>> {
  const blocks = await db.communityBlock.findMany({
    where: { OR: [{ blockerUserId: userId }, { blockedUserId: userId }] },
    select: { blockerUserId: true, blockedUserId: true },
  });
  const ids = new Set<string>();
  for (const block of blocks) {
    ids.add(block.blockerUserId === userId ? block.blockedUserId : block.blockerUserId);
  }
  return ids;
}

export async function getGroupMembership(db: Db, groupId: string, userId: string) {
  return db.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
}

export async function requireGroupMembership(db: Db, groupId: string, userId: string) {
  const membership = await getGroupMembership(db, groupId, userId);
  if (!membership) throw new AuthzError("Você não é membro deste grupo", 403);
  return membership;
}

export async function requireGroupRole(db: Db, groupId: string, userId: string, roles: Array<"OWNER" | "ADMIN">) {
  const membership = await requireGroupMembership(db, groupId, userId);
  if (!roles.includes(membership.role as "OWNER" | "ADMIN")) {
    throw new AuthzError("Permissão insuficiente neste grupo", 403);
  }
  return membership;
}

/**
 * Quem pode remover (soft delete) um post: o próprio autor, sempre; dentro
 * de um grupo, também OWNER/ADMIN daquele grupo específico — governança
 * local (checklist seção 25), nunca substitui a moderação central
 * (denúncia + hide, gatilhadas por requireModerator). Posts fora de grupo
 * (groupId null) só podem ser removidos pelo próprio autor.
 */
export async function canDeleteCommunityPost(
  db: Db,
  post: { authorUserId: string; groupId: string | null },
  userId: string
): Promise<boolean> {
  if (post.authorUserId === userId) return true;
  if (!post.groupId) return false;
  const membership = await getGroupMembership(db, post.groupId, userId);
  return membership?.role === "OWNER" || membership?.role === "ADMIN";
}

export async function getProfileRole(userId: string): Promise<"USER" | "MODERATOR" | "ADMIN"> {
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { role: true } });
  return profile?.role ?? "USER";
}

export async function requireModerator(userId: string) {
  const role = await getProfileRole(userId);
  if (role !== "MODERATOR" && role !== "ADMIN") {
    throw new AuthzError("Acesso restrito à moderação", 403);
  }
  return role;
}
