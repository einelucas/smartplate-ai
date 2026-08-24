// app/api/notifications/read-all/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
