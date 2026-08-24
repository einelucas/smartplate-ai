// lib/integrations/token-crypto.ts
// Criptografia autenticada (AES-256-GCM) para tokens de Connected Apps.
// Server-only — nunca importar deste arquivo em um componente client.
// A chave vem SEMPRE de env (TOKEN_ENCRYPTION_KEY), nunca do banco, nunca
// logada, nunca enviada ao client.
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recomendado para GCM
const FORMAT_VERSION = 1;

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("TOKEN_ENCRYPTION_KEY não configurada no ambiente");
  }
  // Aceita hex (64 chars) ou base64 — sempre precisa resultar em 32 bytes (AES-256).
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY inválida: precisa resultar em exatamente 32 bytes (hex de 64 chars ou base64)");
  }
  return key;
}

/**
 * Criptografa um token em texto puro. Formato empacotado:
 * `v1.<iv base64>.<authTag base64>.<ciphertext base64>` — IV sempre aleatório
 * por chamada, nunca reaproveitado.
 */
export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    `v${FORMAT_VERSION}`,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

export function decryptToken(packed: string): string {
  const parts = packed.split(".");
  if (parts.length !== 4 || parts[0] !== `v${FORMAT_VERSION}`) {
    throw new Error("Formato de token criptografado inválido");
  }
  const [, ivB64, authTagB64, ciphertextB64] = parts;
  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

/** true se TOKEN_ENCRYPTION_KEY está configurada — usar antes de tentar conectar qualquer provider. */
export function isTokenEncryptionConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}
