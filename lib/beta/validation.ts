// lib/beta/validation.ts
import { z } from "zod";

export const redeemBetaCodeSchema = z.object({
  code: z.string().trim().min(1).max(64),
});
