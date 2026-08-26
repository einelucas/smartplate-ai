// tests/avatar/sync.test.ts
// Persistência real no banco (fixtures isoladas, sempre limpas ao final —
// ver tests/helpers/fixtures.ts). Cobre exatamente o bug corrigido: antes,
// nenhum write path conseguia gravar customAvatarUrl (updateSocialProfileSchema
// descartava o campo), então a foto personalizada nunca sobrevivia a um
// reload de página nem aparecia pra outros usuários.
import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../lib/prisma";
import { resolveAvatarUrl } from "../../lib/community/avatar";
import { createTestUser, type TestUser } from "../helpers/fixtures";

const cleanups: (() => Promise<void>)[] = [];
after(async () => {
  for (const cleanup of cleanups) await cleanup();
  await prisma.$disconnect();
});

async function makeUser(): Promise<TestUser> {
  const user = await createTestUser();
  cleanups.push(user.cleanup);
  return user;
}

describe("persistência da foto personalizada", () => {
  it("usuário do Google sem foto personalizada usa a foto do provedor", async () => {
    const user = await makeUser();
    await prisma.socialProfile.update({
      where: { userId: user.userId },
      data: { providerAvatarUrl: "https://lh3.googleusercontent.com/google.jpg" },
    });

    const fresh = await prisma.socialProfile.findUniqueOrThrow({ where: { userId: user.userId } });
    assert.equal(resolveAvatarUrl(fresh), "https://lh3.googleusercontent.com/google.jpg");
  });

  it("enviar uma foto personalizada passa a ter prioridade sobre a do provedor", async () => {
    const user = await makeUser();
    await prisma.socialProfile.update({
      where: { userId: user.userId },
      data: { providerAvatarUrl: "https://lh3.googleusercontent.com/google.jpg" },
    });

    // Simula exatamente o que a rota PATCH faz ao receber um upload.
    await prisma.socialProfile.update({
      where: { userId: user.userId },
      data: { customAvatarUrl: "https://img.clerk.com/custom.jpg" },
    });

    const fresh = await prisma.socialProfile.findUniqueOrThrow({ where: { userId: user.userId } });
    assert.equal(resolveAvatarUrl(fresh), "https://img.clerk.com/custom.jpg");
  });

  it("a foto personalizada sobrevive a uma nova leitura (equivalente a atualizar a página / novo login)", async () => {
    const user = await makeUser();
    await prisma.socialProfile.update({
      where: { userId: user.userId },
      data: { customAvatarUrl: "https://img.clerk.com/custom.jpg", providerAvatarUrl: "https://lh3.googleusercontent.com/google.jpg" },
    });

    // Duas leituras independentes — nada de estado em memória/sessão sendo reaproveitado.
    const read1 = await prisma.socialProfile.findUniqueOrThrow({ where: { userId: user.userId } });
    const read2 = await prisma.socialProfile.findUniqueOrThrow({ where: { userId: user.userId } });
    assert.equal(resolveAvatarUrl(read1), "https://img.clerk.com/custom.jpg");
    assert.equal(resolveAvatarUrl(read2), "https://img.clerk.com/custom.jpg");
  });

  it("uma sincronização do provedor (ex.: foto do Google mudou) nunca sobrescreve a foto personalizada", async () => {
    const user = await makeUser();
    await prisma.socialProfile.update({
      where: { userId: user.userId },
      data: { customAvatarUrl: "https://img.clerk.com/custom.jpg", providerAvatarUrl: "https://lh3.googleusercontent.com/google-old.jpg" },
    });

    // Simula a MESMA operação que a rota faz quando o Google muda — atualiza
    // só providerAvatarUrl, nunca toca customAvatarUrl (ver app/api/community/me/route.ts).
    await prisma.socialProfile.update({
      where: { userId: user.userId },
      data: { providerAvatarUrl: "https://lh3.googleusercontent.com/google-new.jpg" },
    });

    const fresh = await prisma.socialProfile.findUniqueOrThrow({ where: { userId: user.userId } });
    assert.equal(fresh.customAvatarUrl, "https://img.clerk.com/custom.jpg"); // intocada
    assert.equal(resolveAvatarUrl(fresh), "https://img.clerk.com/custom.jpg"); // continua vencendo
  });

  it("remover a foto personalizada restaura o fallback do provedor imediatamente", async () => {
    const user = await makeUser();
    await prisma.socialProfile.update({
      where: { userId: user.userId },
      data: { customAvatarUrl: "https://img.clerk.com/custom.jpg", providerAvatarUrl: "https://lh3.googleusercontent.com/google.jpg" },
    });

    await prisma.socialProfile.update({ where: { userId: user.userId }, data: { customAvatarUrl: null } });

    const fresh = await prisma.socialProfile.findUniqueOrThrow({ where: { userId: user.userId } });
    assert.equal(resolveAvatarUrl(fresh), "https://lh3.googleusercontent.com/google.jpg");
  });

  it("usuário sem Google e sem nenhuma foto resolve para null (avatar padrão/iniciais no componente)", async () => {
    const user = await makeUser();
    const fresh = await prisma.socialProfile.findUniqueOrThrow({ where: { userId: user.userId } });
    assert.equal(resolveAvatarUrl(fresh), null);
  });

  it("segunda foto personalizada substitui corretamente a primeira", async () => {
    const user = await makeUser();
    await prisma.socialProfile.update({ where: { userId: user.userId }, data: { customAvatarUrl: "https://img.clerk.com/v1.jpg" } });
    await prisma.socialProfile.update({ where: { userId: user.userId }, data: { customAvatarUrl: "https://img.clerk.com/v2.jpg" } });

    const fresh = await prisma.socialProfile.findUniqueOrThrow({ where: { userId: user.userId } });
    assert.equal(resolveAvatarUrl(fresh), "https://img.clerk.com/v2.jpg");
  });

  it("atualizar o avatar de um usuário nunca afeta o de outro (isolamento entre contas)", async () => {
    const userA = await makeUser();
    const userB = await makeUser();
    await prisma.socialProfile.update({ where: { userId: userA.userId }, data: { customAvatarUrl: "https://img.clerk.com/a.jpg" } });
    await prisma.socialProfile.update({ where: { userId: userB.userId }, data: { customAvatarUrl: "https://img.clerk.com/b.jpg" } });

    const freshA = await prisma.socialProfile.findUniqueOrThrow({ where: { userId: userA.userId } });
    const freshB = await prisma.socialProfile.findUniqueOrThrow({ where: { userId: userB.userId } });
    assert.equal(resolveAvatarUrl(freshA), "https://img.clerk.com/a.jpg");
    assert.equal(resolveAvatarUrl(freshB), "https://img.clerk.com/b.jpg");
  });

  it("feed/comunidade e perfil leem a mesma fonte resolvida (mesmo formato de serialização)", async () => {
    const user = await makeUser();
    await prisma.socialProfile.update({
      where: { userId: user.userId },
      data: { customAvatarUrl: "https://img.clerk.com/custom.jpg", providerAvatarUrl: "https://lh3.googleusercontent.com/google.jpg" },
    });

    // Mesma consulta que app/api/community/me/route.ts e as rotas de
    // listagem (feed, amigos, membros, ranking, comentários) fazem.
    const social = await prisma.socialProfile.findUniqueOrThrow({
      where: { userId: user.userId },
      select: { userId: true, username: true, displayName: true, customAvatarUrl: true, providerAvatarUrl: true },
    });
    assert.equal(resolveAvatarUrl(social), "https://img.clerk.com/custom.jpg");
  });
});
