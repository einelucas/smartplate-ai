// lib/community/types.ts
import type { PrismaClient } from "@prisma/client";

/** Cliente Prisma dentro de uma transação (mesmo shape, sem os métodos $). */
export type PrismaTx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/** Aceita tanto o client normal quanto um client de transação. */
export type Db = PrismaClient | PrismaTx;
