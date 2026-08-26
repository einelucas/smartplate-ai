// tests/avatar/resolve.test.ts
// Testes puros da regra central de precedência de avatar (lib/community/avatar.ts):
// foto personalizada > foto do provedor > null. Esta é a lógica que estava
// ausente/quebrada antes da correção (updateSocialProfileSchema não aceitava
// nenhum campo de avatar, então o upload nunca chegava no banco).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isTrustedClerkImageUrl, pickProviderAvatarUrl, resolveAvatarUrl, toPublicIdentity } from "../../lib/community/avatar";

describe("resolveAvatarUrl — precedência custom > provider > null", () => {
  it("prioriza a foto personalizada quando ambas existem", () => {
    assert.equal(
      resolveAvatarUrl({ customAvatarUrl: "https://img.clerk.com/custom.jpg", providerAvatarUrl: "https://lh3.googleusercontent.com/google.jpg" }),
      "https://img.clerk.com/custom.jpg"
    );
  });

  it("usa a foto do provedor quando não há foto personalizada", () => {
    assert.equal(
      resolveAvatarUrl({ customAvatarUrl: null, providerAvatarUrl: "https://lh3.googleusercontent.com/google.jpg" }),
      "https://lh3.googleusercontent.com/google.jpg"
    );
  });

  it("retorna null quando nenhuma das duas existe (componente decide o fallback visual)", () => {
    assert.equal(resolveAvatarUrl({ customAvatarUrl: null, providerAvatarUrl: null }), null);
  });

  it("remover a foto personalizada (customAvatarUrl: null) restaura o fallback do provedor", () => {
    const before = resolveAvatarUrl({ customAvatarUrl: "https://img.clerk.com/custom.jpg", providerAvatarUrl: "https://lh3.googleusercontent.com/google.jpg" });
    assert.equal(before, "https://img.clerk.com/custom.jpg");

    const after = resolveAvatarUrl({ customAvatarUrl: null, providerAvatarUrl: "https://lh3.googleusercontent.com/google.jpg" });
    assert.equal(after, "https://lh3.googleusercontent.com/google.jpg");
  });
});

describe("isTrustedClerkImageUrl — nunca aceita URL arbitrária enviada pelo cliente", () => {
  it("aceita qualquer subdomínio real do Clerk (o CDN de imagens não tem um subdomínio único documentado)", () => {
    assert.equal(isTrustedClerkImageUrl("https://img.clerk.com/abc123.jpg"), true);
    assert.equal(isTrustedClerkImageUrl("https://images.clerk.com/abc123.jpg"), true);
    assert.equal(isTrustedClerkImageUrl("https://clerk.com/abc123.jpg"), true);
  });

  it("rejeita um domínio arbitrário, mesmo parecido", () => {
    assert.equal(isTrustedClerkImageUrl("https://evil-clerk.com/abc.jpg"), false);
    assert.equal(isTrustedClerkImageUrl("https://clerk.com.evil.com/abc.jpg"), false);
    assert.equal(isTrustedClerkImageUrl("https://evil.com/img.clerk.com.jpg"), false);
    assert.equal(isTrustedClerkImageUrl("https://lh3.googleusercontent.com/foto.jpg"), false);
  });

  it("rejeita string que não é uma URL válida", () => {
    assert.equal(isTrustedClerkImageUrl("not-a-url"), false);
    assert.equal(isTrustedClerkImageUrl(""), false);
  });

  it("rejeita esquemas não-http(s) (ex.: javascript:)", () => {
    assert.equal(isTrustedClerkImageUrl("javascript:alert(1)"), false);
  });

  it("rejeita http sem TLS", () => {
    assert.equal(isTrustedClerkImageUrl("http://img.clerk.com/abc.jpg"), false);
  });
});

describe("pickProviderAvatarUrl — externalAccounts do Clerk, nunca user.imageUrl", () => {
  it("prioriza a conta do Google quando existe", () => {
    const result = pickProviderAvatarUrl([
      { provider: "github", imageUrl: "https://img.clerk.com/github.jpg" },
      { provider: "oauth_google", imageUrl: "https://lh3.googleusercontent.com/google.jpg" },
    ]);
    assert.equal(result, "https://lh3.googleusercontent.com/google.jpg");
  });

  it("usa a primeira conta externa disponível se não houver Google", () => {
    const result = pickProviderAvatarUrl([{ provider: "github", imageUrl: "https://img.clerk.com/github.jpg" }]);
    assert.equal(result, "https://img.clerk.com/github.jpg");
  });

  it("retorna null quando não há nenhuma conta externa", () => {
    assert.equal(pickProviderAvatarUrl([]), null);
  });

  it("ignora uma conta externa sem imageUrl", () => {
    const result = pickProviderAvatarUrl([{ provider: "oauth_google", imageUrl: "" }]);
    assert.equal(result, null);
  });
});

describe("toPublicIdentity — nunca expõe os campos brutos customAvatarUrl/providerAvatarUrl", () => {
  it("serializa só userId/username/displayName/avatarUrl", () => {
    const row = { userId: "u1", username: "fulano", displayName: "Fulano", customAvatarUrl: "https://img.clerk.com/a.jpg", providerAvatarUrl: null };
    const result = toPublicIdentity(row);
    assert.deepEqual(result, { userId: "u1", username: "fulano", displayName: "Fulano", avatarUrl: "https://img.clerk.com/a.jpg" });
    assert.ok(!("customAvatarUrl" in result));
    assert.ok(!("providerAvatarUrl" in result));
  });
});
