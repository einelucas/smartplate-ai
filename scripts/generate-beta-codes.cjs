// scripts/generate-beta-codes.cjs
// Gerador administrativo de códigos Beta de uso único. Roda em Node puro
// (sem dependências novas) contra o @prisma/client já existente no projeto.
//
// Uso:
//   node --env-file=.env scripts/generate-beta-codes.cjs --count 30 --days 30
// ou, via npm script:
//   npm run beta:generate -- --count 30 --days 30
//
// Os códigos em texto puro só existem aqui, no momento da geração — o banco
// guarda apenas o hash. Nunca colar o conteúdo do arquivo gerado em chat,
// PR, issue ou log.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const BETA_CODE_PREFIX = "SPBETA";
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // sem 0/O, 1/I/L
const SEGMENT_LENGTH = 4;
const SEGMENT_COUNT = 3;

function randomSegment(length) {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function generateBetaCodePlain() {
  const segments = Array.from({ length: SEGMENT_COUNT }, () => randomSegment(SEGMENT_LENGTH));
  return `${BETA_CODE_PREFIX}-${segments.join("-")}`;
}

function hashBetaCode(normalizedCode) {
  return crypto.createHash("sha256").update(normalizedCode).digest("hex");
}

function parseArgs(argv) {
  const args = { count: 30, days: 30 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--count") args.count = Number(argv[++i]);
    else if (argv[i] === "--days") args.days = Number(argv[++i]);
  }
  return args;
}

async function main() {
  const { count, days } = parseArgs(process.argv.slice(2));

  if (!Number.isInteger(count) || count <= 0 || count > 500) {
    console.error("Parâmetro --count inválido (esperado inteiro entre 1 e 500).");
    process.exit(1);
  }
  if (!Number.isInteger(days) || days <= 0 || days > 365) {
    console.error("Parâmetro --days inválido (esperado inteiro entre 1 e 365).");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const createdCodes = [];

  try {
    for (let i = 0; i < count; i++) {
      let created = null;
      for (let attempt = 0; attempt < 5 && !created; attempt++) {
        const plain = generateBetaCodePlain();
        const codeHash = hashBetaCode(plain);
        try {
          await prisma.betaCode.create({
            data: {
              codeHash,
              codeHint: plain.slice(-4),
              durationDays: days,
            },
          });
          created = plain;
        } catch (error) {
          if (error && error.code === "P2002") continue; // colisão de hash — improvável, tenta outro
          throw error;
        }
      }
      if (!created) {
        throw new Error(`Falha ao gerar código único após múltiplas tentativas (índice ${i}).`);
      }
      createdCodes.push(created);
    }
  } finally {
    await prisma.$disconnect();
  }

  const lines = createdCodes.map((code, i) => `${String(i + 1).padStart(2, "0")}  ${code}`);

  console.log(`\n${createdCodes.length} códigos Beta criados (${days} dias cada).\n`);
  console.log(lines.join("\n"));

  const generatedDir = path.join(process.cwd(), "generated");
  fs.mkdirSync(generatedDir, { recursive: true });
  const fileName = `beta-codes-${new Date().toISOString().slice(0, 10)}.txt`;
  const filePath = path.join(generatedDir, fileName);
  const fileContent = [
    `SmartPlate AI — códigos Beta gerados em ${new Date().toISOString()}`,
    `Quantidade: ${createdCodes.length} | Duração: ${days} dias a partir da ativação`,
    "Este arquivo nunca deve ser commitado nem compartilhado além da distribuição individual dos códigos.",
    "",
    ...lines,
    "",
  ].join("\n");
  fs.writeFileSync(filePath, fileContent, "utf8");

  console.log(`\nArquivo local salvo em: generated/${fileName}`);
  console.log("Este é o único momento em que os códigos aparecem em texto puro. Distribua com cuidado.\n");
}

main().catch((error) => {
  console.error("Erro ao gerar códigos Beta:", error);
  process.exit(1);
});
