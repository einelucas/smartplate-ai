// lib/community/invite-code.ts
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// Sem caracteres ambíguos (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length: number): string {
  const bytes = crypto.randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) code += ALPHABET[bytes[i] % ALPHABET.length];
  return code;
}

export async function generateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode(8);
    const existing = await prisma.communityGroup.findUnique({ where: { inviteCode: code }, select: { id: true } });
    if (!existing) return code;
  }
  return randomCode(12);
}
