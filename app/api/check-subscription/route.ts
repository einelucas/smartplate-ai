// app/api/check-subscription/route.ts
import { NextRequest, NextResponse } from "next/server";
import { hasPremiumAccess } from "@/lib/premium/access";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId)
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  try {
    // Resolução central: Stripe ativo OU PremiumGrant válido (ex.: Beta) —
    // ambos abrem exatamente o mesmo gate do middleware. Mantém o nome do
    // campo "subscriptionActive" na resposta para não exigir mudança no
    // middleware.ts, que já consome esta chave.
    const isPremium = await hasPremiumAccess(userId);

    return NextResponse.json({ subscriptionActive: isPremium });
  } catch (error) {
    console.error("check-subscription error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
