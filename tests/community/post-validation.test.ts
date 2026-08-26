// tests/community/post-validation.test.ts
// Cobertura dos campos novos imageWidth/imageHeight (createPostSchema) —
// usados só pra reservar o espaço da imagem no feed antes dela carregar
// (evita o card "crescer" enquanto a imagem baixa), nunca por lógica de
// negócio. Nunca confiar cegamente no valor enviado pelo cliente.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createPostSchema } from "../../lib/community/validation";

describe("createPostSchema — imageWidth/imageHeight", () => {
  it("aceita um post TEXT com imagem e dimensões válidas", () => {
    const result = createPostSchema.safeParse({ type: "TEXT", imageUrl: "community/user123/abc.webp", imageWidth: 1080, imageHeight: 1350 });
    assert.equal(result.success, true);
  });

  it("aceita um post TEXT com imagem mas sem dimensões (compatibilidade com posts antigos)", () => {
    const result = createPostSchema.safeParse({ type: "TEXT", imageUrl: "community/user123/abc.webp" });
    assert.equal(result.success, true);
  });

  it("rejeita dimensão zero, negativa ou decimal", () => {
    assert.equal(createPostSchema.safeParse({ type: "TEXT", imageUrl: "x", imageWidth: 0, imageHeight: 100 }).success, false);
    assert.equal(createPostSchema.safeParse({ type: "TEXT", imageUrl: "x", imageWidth: -10, imageHeight: 100 }).success, false);
    assert.equal(createPostSchema.safeParse({ type: "TEXT", imageUrl: "x", imageWidth: 100.5, imageHeight: 100 }).success, false);
  });

  it("rejeita dimensão absurda (acima do limite de saída do editor de imagem)", () => {
    const result = createPostSchema.safeParse({ type: "TEXT", imageUrl: "x", imageWidth: 100000, imageHeight: 100 });
    assert.equal(result.success, false);
  });

  it("continua exigindo texto ou imagem pra um post TEXT (regra existente, não deve quebrar)", () => {
    assert.equal(createPostSchema.safeParse({ type: "TEXT" }).success, false);
  });
});
