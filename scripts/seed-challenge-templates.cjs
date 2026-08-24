// scripts/seed-challenge-templates.cjs
// Cria os 7 desafios GLOBAIS iniciais descritos no checklist (seção 7,
// "Desafios iniciais"). Idempotente: se já existir um desafio GLOBAL ativo
// (endsAt no futuro) com o mesmo título+métrica+alvo, não cria duplicado —
// pode rodar de novo com segurança.
//
// Uso: npm run challenges:seed
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date();

const TEMPLATES = [
  { title: "Atividade em 4 dias", description: "Registre atividade física em 4 dias diferentes.", metric: "ACTIVE_DAYS", target: 4, rewardXp: 40, durationDays: 7 },
  { title: "150 minutos ativos", description: "Acumule 150 minutos de atividade física.", metric: "ACTIVITY_MINUTES", target: 150, rewardXp: 60, durationDays: 14 },
  { title: "300 minutos ativos", description: "Acumule 300 minutos de atividade física.", metric: "ACTIVITY_MINUTES", target: 300, rewardXp: 120, durationDays: 30 },
  { title: "10 atividades", description: "Registre 10 atividades físicas.", metric: "ACTIVITY_COUNT", target: 10, rewardXp: 80, durationDays: 30 },
  { title: "20 refeições concluídas", description: "Conclua 20 refeições do seu plano.", metric: "MEAL_COMPLETIONS", target: 20, rewardXp: 80, durationDays: 30 },
  { title: "Sequência de 7 dias", description: "Mantenha uma sequência de 7 dias consecutivos.", metric: "STREAK_DAYS", target: 7, rewardXp: 70, durationDays: 21 },
  { title: "Semana equilibrada", description: "Tenha 5 dias com refeição concluída e atividade no mesmo dia.", metric: "BALANCED_DAYS", target: 5, rewardXp: 90, durationDays: 21 },
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const template of TEMPLATES) {
    const existing = await prisma.challenge.findFirst({
      where: {
        scope: "GLOBAL",
        title: template.title,
        metric: template.metric,
        target: template.target,
        endsAt: { gte: now },
      },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.challenge.create({
      data: {
        scope: "GLOBAL",
        creatorUserId: null,
        title: template.title,
        description: template.description,
        metric: template.metric,
        target: template.target,
        rewardXp: template.rewardXp,
        startsAt: now,
        endsAt: new Date(now.getTime() + template.durationDays * DAY_MS),
      },
    });
    created += 1;
  }

  console.log(`Desafios criados: ${created}. Já existentes (ignorados): ${skipped}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
