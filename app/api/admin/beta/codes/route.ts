// app/api/admin/beta/codes/route.ts
// GET lista códigos Beta (paginado/filtrado). POST cria um novo lote — a
// ÚNICA resposta em que os códigos aparecem em texto puro (nunca persistido,
// nunca logado); depois desta chamada não há como recuperá-los.
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { AuthzError, requireAdmin } from "@/lib/admin/authz";
import { createBetaBatch, listBetaCodes } from "@/lib/admin/beta";
import { betaCodeStatusFilterSchema, createBetaBatchSchema, paginationSchema } from "@/lib/admin/validation";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await requireAdmin(userId);
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const statusParsed = betaCodeStatusFilterSchema.safeParse(searchParams.get("status") ?? undefined);
  const paginationParsed = paginationSchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });
  if (!statusParsed.success || !paginationParsed.success) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const batchId = searchParams.get("batchId") || undefined;
  const { page, pageSize } = paginationParsed.data;
  const { rows, total } = await listBetaCodes({ status: statusParsed.data, batchId, page, pageSize });

  return NextResponse.json({ rows, total, page, pageSize });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await requireAdmin(userId);
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }

  const body = await request.json().catch(() => null);
  const parsed = createBetaBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { quantity, durationDays, redeemUntil } = parsed.data;
  const result = await createBetaBatch({
    quantity,
    durationDays,
    redeemUntil: redeemUntil ? new Date(redeemUntil) : undefined,
    actorUserId: userId,
  });

  return NextResponse.json(result, { status: 201 });
}
