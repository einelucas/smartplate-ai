// app/api/hydration/logs/route.ts
// GET: registros de um dia local específico (default: hoje). POST: novo consumo.
// Dono sempre resolvido pela sessão autenticada — nunca aceita userId do cliente.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLocalDateString, withTimezoneBuffer } from "@/lib/community/dates";
import { createWaterLogSchema, localDateQuerySchema } from "@/lib/hydration/validation";
import { getEligibleWaterLogs } from "@/lib/hydration/stats";
import { reevaluateWaterGoalForDay } from "@/lib/hydration/gamification";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const rawDate = searchParams.get("date");
  if (rawDate && !localDateQuerySchema.safeParse(rawDate).success) {
    return NextResponse.json({ error: "Data inválida" }, { status: 400 });
  }

  const socialProfile = await prisma.socialProfile.findUnique({ where: { userId }, select: { timezone: true } });
  const timezone = socialProfile?.timezone;
  const dateStr = rawDate ?? getLocalDateString(new Date(), timezone);

  const logs = await getEligibleWaterLogs(prisma, userId, withTimezoneBuffer(dateStr, dateStr));
  const dayLogs = logs
    .filter((log) => getLocalDateString(log.loggedAt, timezone) === dateStr)
    .sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime())
    .map((log) => ({ id: log.id, amountMl: log.amountMl, loggedAt: log.loggedAt.toISOString() }));

  return NextResponse.json({ date: dateStr, logs: dayLogs });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createWaterLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const socialProfile = await prisma.socialProfile.findUnique({ where: { userId }, select: { timezone: true } });
  const timezone = socialProfile?.timezone;

  const log = await prisma.$transaction(async (tx) => {
    const created = await tx.waterLog.create({
      data: {
        userId,
        amountMl: parsed.data.amountMl,
        ...(parsed.data.loggedAt ? { loggedAt: parsed.data.loggedAt } : {}),
      },
    });

    const localDateStr = getLocalDateString(created.loggedAt, timezone);
    await reevaluateWaterGoalForDay(tx, userId, timezone, localDateStr);

    return created;
  });

  return NextResponse.json(
    { log: { id: log.id, amountMl: log.amountMl, loggedAt: log.loggedAt.toISOString() } },
    { status: 201 }
  );
}
