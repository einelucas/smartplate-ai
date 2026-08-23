// app/api/generate-mealplan/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { calculateAge } from "@/lib/profile/options";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

interface GenerateOverrides {
  dietType?: string;
  dietGoal?: string;
  calories?: number;
  cookingLevel?: string;
  allergies?: string[];
  dislikedFoods?: string[];
  preferredFoods?: string[];
  maxPrepTime?: number;
  budgetLevel?: string;
  includeSnacks?: boolean;
  additionalNotes?: string;
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Corpo opcional: quando vem do modal "Gerar Novo Plano", contém as
    // preferências que o usuário ajustou para esta geração específica.
    let overrides: GenerateOverrides = {};
    try {
      const body = await request.json();
      if (body && typeof body === "object") overrides = body;
    } catch {
      // sem body (ex: botão rápido "Gerar Novo Plano" da Início) — segue só com os dados salvos
    }

    const [profile, preferences] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId },
        select: {
          height: true,
          currentWeight: true,
          targetWeight: true,
          dietType: true,
          cookingLevel: true,
          birthDate: true,
          activityLevel: true,
        },
      }),
      prisma.userPreferences.findUnique({
        where: { userId },
        select: {
          allergies: true,
          dislikedFoods: true,
          preferredFoods: true,
          maxPrepTime: true,
          budgetLevel: true,
          dietGoal: true,
        },
      }),
    ]);

    if (!profile?.currentWeight || !profile?.targetWeight) {
      return NextResponse.json(
        { error: "Complete seus dados físicos no perfil primeiro" },
        { status: 400 }
      );
    }

    // Se vieram ajustes do modal, persiste no perfil/preferências para as próximas gerações lembrarem.
    const hasOverrides = Object.keys(overrides).length > 0;
    if (hasOverrides) {
      await Promise.all([
        prisma.profile.update({
          where: { userId },
          data: {
            ...(overrides.dietType !== undefined && { dietType: overrides.dietType }),
            ...(overrides.cookingLevel !== undefined && { cookingLevel: overrides.cookingLevel }),
          },
        }),
        prisma.userPreferences.upsert({
          where: { userId },
          update: {
            ...(overrides.allergies !== undefined && { allergies: overrides.allergies }),
            ...(overrides.dislikedFoods !== undefined && { dislikedFoods: overrides.dislikedFoods }),
            ...(overrides.preferredFoods !== undefined && { preferredFoods: overrides.preferredFoods }),
            ...(overrides.maxPrepTime !== undefined && { maxPrepTime: overrides.maxPrepTime }),
            ...(overrides.budgetLevel !== undefined && { budgetLevel: overrides.budgetLevel }),
            ...(overrides.dietGoal !== undefined && { dietGoal: overrides.dietGoal }),
            ...(overrides.additionalNotes !== undefined && { additionalNotes: overrides.additionalNotes }),
          },
          create: {
            userId,
            allergies: overrides.allergies || [],
            dislikedFoods: overrides.dislikedFoods || [],
            preferredFoods: overrides.preferredFoods || [],
            maxPrepTime: overrides.maxPrepTime,
            budgetLevel: overrides.budgetLevel,
            dietGoal: overrides.dietGoal,
            additionalNotes: overrides.additionalNotes,
          },
        }),
      ]);
    }

    const dietType = overrides.dietType || profile.dietType || "balanceada";
    const cookingLevel = overrides.cookingLevel || profile.cookingLevel || "intermediário";

    let dailyCalories: number;
    if (overrides.calories) {
      // Usuário definiu manualmente no modal — sempre tem prioridade.
      dailyCalories = overrides.calories;
    } else if (profile.height && profile.birthDate && profile.activityLevel) {
      dailyCalories = calculateDailyCalories({
        heightCm: profile.height,
        currentWeight: profile.currentWeight,
        targetWeight: profile.targetWeight,
        birthDate: profile.birthDate,
        activityLevel: profile.activityLevel,
      });
    } else {
      // Nunca inventa idade/atividade em silêncio — pede para completar o Perfil.
      return NextResponse.json(
        {
          error:
            "Complete seus dados no Perfil (altura, data de nascimento e nível de atividade) para calcular sua meta calórica automaticamente, ou informe as calorias manualmente ao gerar o plano.",
        },
        { status: 400 }
      );
    }

    const userContext = {
      peso_atual_kg: profile.currentWeight,
      peso_meta_kg: profile.targetWeight,
      altura_cm: profile.height || 170,
      tipo_de_dieta: dietType,
      objetivo: overrides.dietGoal || preferences?.dietGoal || "perder peso",
      nivel_na_cozinha: cookingLevel,
      calorias_diarias_alvo: dailyCalories,
      alergias_e_restricoes: overrides.allergies ?? preferences?.allergies ?? [],
      nao_gosta: overrides.dislikedFoods ?? preferences?.dislikedFoods ?? [],
      prefere: overrides.preferredFoods ?? preferences?.preferredFoods ?? [],
      tempo_maximo_preparo_min: overrides.maxPrepTime ?? preferences?.maxPrepTime ?? 30,
      orcamento: overrides.budgetLevel ?? preferences?.budgetLevel ?? "medium",
      incluir_lanches: overrides.includeSnacks ?? true,
      observacoes_adicionais: overrides.additionalNotes || "",
    };

    const prompt = buildPrompt(userContext);

    const response = await openai.chat.completions.create({
      model: "openai/gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Você é um assistente especializado em nutrição. Responda apenas com JSON válido.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 4000,
    });

    const aiContent = response.choices[0]?.message?.content;
    if (!aiContent) throw new Error("Resposta vazia da IA");

    // Parsear JSON da IA
    const rawPlan = parseAIJson(aiContent);

    // Converter do formato PT (que a IA retorna) para o formato EN (que o frontend usa)
    const mealPlan = convertPtPlanToFrontend(rawPlan);

    return NextResponse.json({
      success: true,
      mealPlan,
      userData: {
        calories: dailyCalories,
        dietType,
        cookingLevel,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro em generate-mealplan:", message);
    return NextResponse.json(
      { error: "Erro ao gerar plano alimentar", details: message },
      { status: 500 }
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

// Fatores de atividade padrão (Mifflin-St Jeor) por nível — ver
// lib/profile/options.ts para os valores/labels de ACTIVITY_LEVELS.
const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

function calculateDailyCalories(params: {
  heightCm: number;
  currentWeight: number;
  targetWeight: number;
  birthDate: Date;
  activityLevel: string;
}): number {
  const { heightCm, currentWeight, targetWeight, birthDate, activityLevel } = params;
  const age = calculateAge(birthDate);
  const activityFactor = ACTIVITY_FACTORS[activityLevel] ?? ACTIVITY_FACTORS.moderate;

  const bmr = 10 * currentWeight + 6.25 * heightCm - 5 * age + 5;
  const maintenance = Math.round(bmr * activityFactor);
  if (targetWeight < currentWeight) return Math.round(maintenance - 500);
  if (targetWeight > currentWeight) return Math.round(maintenance + 300);
  return maintenance;
}

function buildPrompt(userContext: Record<string, unknown>): string {
  return `
Você é um nutricionista profissional. Crie um plano alimentar de 7 dias em português brasileiro, personalizado com base nestes dados do usuário (formato JSON):

${JSON.stringify(userContext, null, 2)}

Regras importantes:
- Respeite rigorosamente "alergias_e_restricoes" — nunca inclua esses ingredientes.
- Evite os itens de "nao_gosta" sempre que possível.
- Priorize ingredientes/estilos de "prefere" quando fizer sentido.
- Receitas não devem passar de "tempo_maximo_preparo_min" minutos de preparo.
- Se "incluir_lanches" for false, retorne "lanches" como um array vazio em todos os dias.
- Leve "observacoes_adicionais" em conta se houver algo relevante ali.
- Ajuste as calorias totais do dia para ficar próximo de "calorias_diarias_alvo".

Retorne APENAS JSON com esta estrutura exata (sem markdown, sem texto):
{
  "segunda": {
    "cafe": { "nome": "string", "descricao": "string", "emoji": "string", "calorias": 0, "proteina": 0, "carboidratos": 0, "gordura": 0, "tempo_preparo": 0, "dificuldade": "Fácil", "ingredientes": [] },
    "almoco": { mesmo formato },
    "jantar": { mesmo formato },
    "lanches": [ { mesmo formato } ]
  },
  "terca": { ... },
  "quarta": { ... },
  "quinta": { ... },
  "sexta": { ... },
  "sabado": { ... },
  "domingo": { ... }
}
`.trim();
}

function parseAIJson(content: string): any {
  const cleaned = content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("JSON inválido na resposta da IA");
  }
}

/**
 * Converte uma refeição do formato PT (IA) para o formato EN (frontend).
 * PT: nome, descricao, calorias, proteina, carboidratos, gordura, tempo_preparo, dificuldade, emoji, ingredientes
 * EN: name, description, calories, prep_time, difficulty, rating, emoji
 */
function convertMeal(meal: any): any {
  if (!meal) return null;
  return {
    name: meal.nome || meal.name || "Refeição",
    description: meal.descricao || meal.description || "",
    calories: meal.calorias ?? meal.calories ?? 0,
    prep_time: meal.tempo_preparo ?? meal.prep_time ?? 0,
    difficulty: meal.dificuldade || meal.difficulty || "Fácil",
    emoji: meal.emoji || "🍽️",
    rating: meal.rating || 0,
    // mantém macros para uso futuro
    proteina: meal.proteina ?? 0,
    carboidratos: meal.carboidratos ?? 0,
    gordura: meal.gordura ?? 0,
    ingredientes: meal.ingredientes || [],
  };
}

/**
 * Converte o plano semanal PT para o formato que o frontend (meal-plan-dashboard) usa.
 * O dashboard usa chaves em inglês: Monday, Tuesday... e refeições: breakfast, lunch, dinner, snacks
 */
function convertPtPlanToFrontend(rawPlan: any): any {
  const dayMap: Record<string, string> = {
    segunda: "Monday",
    terca: "Tuesday",
    quarta: "Wednesday",
    quinta: "Thursday",
    sexta: "Friday",
    sabado: "Saturday",
    domingo: "Sunday",
  };

  const result: any = {};

  for (const [dayPt, dayEn] of Object.entries(dayMap)) {
    const day = rawPlan[dayPt];
    if (!day) {
      result[dayEn] = {
        breakfast: null,
        lunch: null,
        dinner: null,
        snacks: [],
      };
      continue;
    }

    result[dayEn] = {
      breakfast: convertMeal(day.cafe),
      lunch: convertMeal(day.almoco),
      dinner: convertMeal(day.jantar),
      snacks: Array.isArray(day.lanches)
        ? day.lanches.map(convertMeal)
        : [],
    };
  }

  return result;
}
