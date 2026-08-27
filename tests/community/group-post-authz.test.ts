// tests/community/group-post-authz.test.ts
// canDeleteCommunityPost — governança local de grupo (checklist seção 25):
// o autor sempre pode remover o próprio post; dentro de um grupo, OWNER/ADMIN
// daquele grupo específico também pode remover posts de outros membros;
// fora de grupo (groupId null), só o autor.
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { canDeleteCommunityPost } from "../../lib/community/authz";
import { createTestUser, type TestUser } from "../helpers/fixtures";

const cleanups: (() => Promise<void>)[] = [];
after(async () => {
  for (const cleanup of cleanups) await cleanup();
  await prisma.$disconnect();
});

async function makeUser(): Promise<TestUser> {
  const user = await createTestUser({ timezone: "UTC" });
  cleanups.push(user.cleanup);
  return user;
}

async function makeGroup(ownerUserId: string) {
  const group = await prisma.communityGroup.create({ data: { name: "Grupo de teste", ownerUserId } });
  cleanups.push(async () => {
    await prisma.communityGroup.delete({ where: { id: group.id } }).catch(() => {});
  });
  return group;
}

describe("canDeleteCommunityPost", () => {
  it("o autor sempre pode remover o próprio post, mesmo sem groupId", async () => {
    const author = await makeUser();
    const canDelete = await canDeleteCommunityPost(prisma, { authorUserId: author.userId, groupId: null }, author.userId);
    assert.equal(canDelete, true);
  });

  it("outro usuário não pode remover um post fora de grupo (groupId null)", async () => {
    const author = await makeUser();
    const other = await makeUser();
    const canDelete = await canDeleteCommunityPost(prisma, { authorUserId: author.userId, groupId: null }, other.userId);
    assert.equal(canDelete, false);
  });

  it("OWNER do grupo pode remover post de outro membro", async () => {
    const owner = await makeUser();
    const author = await makeUser();
    const group = await makeGroup(owner.userId);
    await prisma.groupMember.createMany({
      data: [
        { groupId: group.id, userId: owner.userId, role: "OWNER" },
        { groupId: group.id, userId: author.userId, role: "MEMBER" },
      ],
    });

    const canDelete = await canDeleteCommunityPost(prisma, { authorUserId: author.userId, groupId: group.id }, owner.userId);
    assert.equal(canDelete, true);
  });

  it("ADMIN do grupo pode remover post de outro membro", async () => {
    const owner = await makeUser();
    const admin = await makeUser();
    const author = await makeUser();
    const group = await makeGroup(owner.userId);
    await prisma.groupMember.createMany({
      data: [
        { groupId: group.id, userId: owner.userId, role: "OWNER" },
        { groupId: group.id, userId: admin.userId, role: "ADMIN" },
        { groupId: group.id, userId: author.userId, role: "MEMBER" },
      ],
    });

    const canDelete = await canDeleteCommunityPost(prisma, { authorUserId: author.userId, groupId: group.id }, admin.userId);
    assert.equal(canDelete, true);
  });

  it("MEMBER comum do grupo NÃO pode remover post de outro membro", async () => {
    const owner = await makeUser();
    const member = await makeUser();
    const author = await makeUser();
    const group = await makeGroup(owner.userId);
    await prisma.groupMember.createMany({
      data: [
        { groupId: group.id, userId: owner.userId, role: "OWNER" },
        { groupId: group.id, userId: member.userId, role: "MEMBER" },
        { groupId: group.id, userId: author.userId, role: "MEMBER" },
      ],
    });

    const canDelete = await canDeleteCommunityPost(prisma, { authorUserId: author.userId, groupId: group.id }, member.userId);
    assert.equal(canDelete, false);
  });

  it("OWNER de OUTRO grupo não pode remover o post (governança é só do grupo do post)", async () => {
    const ownerA = await makeUser();
    const ownerB = await makeUser();
    const author = await makeUser();
    const groupA = await makeGroup(ownerA.userId);
    await makeGroup(ownerB.userId);
    await prisma.groupMember.createMany({
      data: [
        { groupId: groupA.id, userId: ownerA.userId, role: "OWNER" },
        { groupId: groupA.id, userId: author.userId, role: "MEMBER" },
      ],
    });

    const canDelete = await canDeleteCommunityPost(prisma, { authorUserId: author.userId, groupId: groupA.id }, ownerB.userId);
    assert.equal(canDelete, false);
  });
});
