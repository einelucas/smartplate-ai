// lib/community/feed-items.ts
// Serialização compartilhada de CommunityPost -> forma que o frontend
// consome (CommunityPostSummary). Usada por /api/community/feed,
// .../hashtags/[slug]/posts e qualquer rota futura que precise listar posts
// no mesmo formato — nunca duplicar essa montagem (author lookup, reações,
// resolução de imagem) em cada rota.
import { prisma } from "@/lib/prisma";
import { isLocalUploadPath } from "@/lib/storage/blob";

type PostImageMetadata = { imageUrl?: string | null; [key: string]: unknown };

// Tipos de post cujo metadata pode conter uma foto (pathname de Blob
// privado) — usado tanto pra resolver a URL-proxy aqui quanto pela rota de
// imagem (app/api/community/posts/[id]/image/route.ts), que importa este
// mesmo set em vez de manter uma cópia própria.
export const IMAGE_CAPABLE_TYPES = new Set(["TEXT", "ACTIVITY", "EXTERNAL_SHARE", "ACHIEVEMENT", "PLAN_SHARE"]);

/** Pathname de Blob privado nunca vai pro cliente como está — vira a rota-proxy. Path antigo (/uploads/...) já é servido direto. */
export function resolvePostMetadata(post: { id: string; type: string; metadata: unknown }) {
  if (!IMAGE_CAPABLE_TYPES.has(post.type) || !post.metadata) return post.metadata;
  const meta = post.metadata as PostImageMetadata;
  if (!meta.imageUrl || isLocalUploadPath(meta.imageUrl)) return meta;
  return { ...meta, imageUrl: `/api/community/posts/${post.id}/image` };
}

export type RawFeedPost = {
  id: string;
  type: string;
  text: string | null;
  metadata: unknown;
  groupId: string | null;
  createdAt: Date;
  authorUserId: string;
  reactions: { userId: string; type: string }[];
  _count: { comments: number };
};

/** Um único lookup de SocialProfile pros autores da página inteira — nunca 1 query por post. */
export async function serializeFeedPosts(posts: RawFeedPost[], viewerUserId: string) {
  const authorIds = Array.from(new Set(posts.map((p) => p.authorUserId)));
  const profiles = await prisma.socialProfile.findMany({
    where: { userId: { in: authorIds } },
    select: { userId: true, username: true, displayName: true, avatarUrl: true },
  });
  const byId = new Map(profiles.map((p) => [p.userId, p]));

  return posts.map((post) => {
    const reactionCounts: Record<string, number> = {};
    const myReactions: string[] = [];
    for (const reaction of post.reactions) {
      reactionCounts[reaction.type] = (reactionCounts[reaction.type] ?? 0) + 1;
      if (reaction.userId === viewerUserId) myReactions.push(reaction.type);
    }
    return {
      id: post.id,
      type: post.type,
      text: post.text,
      metadata: resolvePostMetadata(post),
      groupId: post.groupId,
      createdAt: post.createdAt,
      author: byId.get(post.authorUserId) ?? {
        userId: post.authorUserId,
        username: null,
        displayName: "Usuário SmartPlate",
        avatarUrl: null,
      },
      isMine: post.authorUserId === viewerUserId,
      reactionCounts,
      myReactions,
      commentCount: post._count.comments,
    };
  });
}
