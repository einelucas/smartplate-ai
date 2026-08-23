// app/api/meal-plans/[id]/meals/swap/route.ts
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { safeParse, parseAIJson } from "@/lib/mealplan";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "café da manhã",
  lunch: "almoço",
  dinner: "jantar",
  snacks: "lanche",
};

type Params = { params: Promise<{ id: string }> };

function normalizeOption(opt: any) {
  return {
    name: opt.name || opt.nome || "Refeição sugerida",
    description: opt.description || opt.descricao || "",
    emoji: opt.emoji || "🍽️",
    calories: Number(opt.calories ?? opt.calorias ?? 0),
    prep_time: Number(opt.prep_time ?? opt.tempo_preparo ?? 20),
    difficulty: opt.difficulty || opt.dificuldade || "Fácil",
    proteina: Number(opt.proteina ?? 0),
    carboidratos: Number(opt.carboidratos ?? 0),
    gordura: Number(opt.gordura ?? 0),
    ingredientes: Array.isArray(opt.ingredientes) ? opt.ingredientes : [],
  };
}

/**
 * POST /api/meal-plans/[id]/meals/swap
 * Gera 3 sugestões de refeição alternativas via IA para substituir a refeição atual.
 * Body: { day: string, mealType: "breakfast"|"lunch"|"dinner"|"snacks", snackIndex?: number }
 */
export async function POST(request: Request, context: Params) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = await context.params;
  try {
    const { day, mealType, snackIndex } = await request.json();
    if (!day || !mealType)
      return NextResponse.json({ error: "day e mealType são obrigatórios" }, { status: 400 });

    const plan = await prisma.mealPlan.findUnique({ where: { id: params.id, userId }, select: { id: true } });
    if (!plan)
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });

    const dayPlan = await prisma.dayPlan.findUnique({
      where: { mealPlanId_day: { mealPlanId: params.id, day } },
    });
    if (!dayPlan)
      return NextResponse.json({ error: "Dia não encontrado" }, { status: 404 });

    let currentMeal: any = null;
    if (mealType === "snacks") {
      const snacks = safeParse<any[]>(dayPlan.snacks) || [];
      currentMeal = typeof snackIndex === "number" ? snacks[snackIndex] : null;
    } else {
      currentMeal = safeParse<any>((dayPlan as Record<string, any>)[mealType]);
    }

    const [profile, preferences] = await Promise.all([
      prisma.profile.findUnique({ where: { userId }, select: { dietType: true } }),
      prisma.userPreferences.findUnique({ where: { userId }, select: { dislikedFoods: true, preferredFoods: true } }),
    ]);

    const label = MEAL_TYPE_LABELS[mealType] || "refeição";
    const targetCalories = currentMeal?.calories || 400;

    const prompt = `Sugira exatamente 3 opções alternativas de ${label} para substituir "${currentMeal?.name || "uma refeição"}" em um plano alimentar brasileiro.
Tipo de dieta: ${profile?.dietType || "tradicional"}.
Não gosta de: ${(preferences?.dislikedFoods || []).join(", ") || "nenhum"}.
Prefere: ${(preferences?.preferredFoods || []).join(", ") || "nenhum"}.
Calorias-alvo aproximadas: ${targetCalories} kcal (variação de até 20%).
Retorne APENAS JSON válido, sem markdown, neste formato exato:
{
  "options": [
    { "name": "string", "description": "string", "emoji": "string (um emoji)", "calories": 0, "prep_time": 0, "difficulty": "Fácil", "proteina": 0, "carboidratos": 0, "gordura": 0, "ingredientes": ["string"] }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "openai/gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 1200,
    });

    const content = response.choices[0]?.message?.content ?? "";
    const parsed = parseAIJson(content);
    const options = (Array.isArray(parsed.options) ? parsed.options : []).slice(0, 3).map(normalizeOption);

    return NextResponse.json({ options });
  } catch (error) {
    console.error("Erro ao gerar opções de troca:", error);
    return NextResponse.json({ error: "Erro ao gerar opções de troca" }, { status: 500 });
  }
}
