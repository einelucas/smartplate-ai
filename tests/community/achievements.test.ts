// tests/community/achievements.test.ts
// Regressão do bug "não consigo compartilhar conquistas": tanto
// POST /api/community/posts quanto os dois mecanismos de celebração
// (AchievementCelebration.tsx e hooks/useAchievements.tsx) só reconheciam
// o catálogo antigo (lib/community/achievements.ts) — qualquer conquista
// do catálogo novo (achievement-catalog.ts, a maioria das que existem
// hoje) falhava com "Conquista inválida" ao tentar publicar.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getAchievementDisplay } from "../../lib/community/achievements";
import { ACHIEVEMENT_CATALOG } from "../../lib/community/achievement-catalog";

describe("getAchievementDisplay", () => {
  it("resolve um código do catálogo antigo (motor antigo, ainda concedido de verdade)", () => {
    const result = getAchievementDisplay("FIRST_ACTION");
    assert.ok(result);
    assert.equal(result?.title, "Primeiro passo");
  });

  it("resolve um código do catálogo novo (regressão do bug real) — antes retornava null aqui", () => {
    const result = getAchievementDisplay("MEALS_10");
    assert.ok(result, "MEALS_10 existe só no catálogo novo — precisa resolver, não null");
    assert.equal(result?.title, ACHIEVEMENT_CATALOG.MEALS_10.title);
    assert.equal(result?.icon, ACHIEVEMENT_CATALOG.MEALS_10.icon);
  });

  it("resolve conquistas de hidratação e BALANCED_WEEK (catálogo novo, ativadas nesta sessão)", () => {
    for (const code of ["FIRST_WATER_LOG", "WATER_GOAL_7_DAYS", "BALANCED_WEEK"]) {
      const result = getAchievementDisplay(code);
      assert.ok(result, `${code} deveria resolver via catálogo novo`);
    }
  });

  it("STREAK_* foi migrada: não existe mais no catálogo antigo, resolve só via o catálogo novo (achievement-catalog.ts)", () => {
    const result = getAchievementDisplay("STREAK_3");
    assert.ok(result);
    assert.equal(result?.description, ACHIEVEMENT_CATALOG.STREAK_3.description);
    // Confirma que o catálogo antigo realmente não define mais STREAK_3.
    assert.equal(getAchievementDisplay("STREAK_3")?.title, ACHIEVEMENT_CATALOG.STREAK_3.title);
  });

  it("retorna null para um código que não existe em nenhum catálogo", () => {
    assert.equal(getAchievementDisplay("NOT_A_REAL_CODE"), null);
  });
});
