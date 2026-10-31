/**
 * Backfills vector embeddings for document chunks that were indexed while no
 * Gemini API key was configured.
 *
 * Run with:  npm run db:embed
 *
 * Without embeddings the assistant still answers, but retrieval falls back to
 * keyword scoring. With them, chunks are matched by meaning.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

// Standalone scripts do not get Next.js's automatic .env loading.
function loadEnv() {
  try {
    const raw = readFileSync(path.join(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/.exec(line);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch {
    // .env is optional; real environment variables still work.
  }
}

loadEnv();

const prisma = new PrismaClient();

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const API_KEY = (process.env.GEMINI_API_KEY ?? "").trim();
const MODEL = (process.env.GEMINI_EMBED_MODEL || "gemini-embedding-2").trim();
const DIM = Number.parseInt(process.env.GEMINI_EMBED_DIM ?? "768", 10);

async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await fetch(
    `${API_BASE}/models/${MODEL}:batchEmbedContents?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: `models/${MODEL}`,
          content: { parts: [{ text }] },
          outputDimensionality: DIM,
        })),
      }),
      signal: AbortSignal.timeout(120_000),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Embedding request failed (${response.status}): ${await response.text()}`,
    );
  }

  const data = (await response.json()) as {
    embeddings?: Array<{ values?: number[] }>;
  };

  return (data.embeddings ?? []).map((item) => item.values ?? []);
}

async function main() {
  if (!API_KEY) {
    console.log("No GEMINI_API_KEY configured — nothing to embed.");
    return;
  }

  const chunks = await prisma.documentChunk.findMany({
    where: { embedding: null },
    select: { id: true, content: true },
    orderBy: { id: "asc" },
  });

  if (!chunks.length) {
    console.log("Every chunk already has an embedding. Nothing to do.");
    return;
  }

  console.log(`Embedding ${chunks.length} chunks with ${MODEL} (${DIM}d)…`);

  let done = 0;

  for (let i = 0; i < chunks.length; i += 20) {
    const batch = chunks.slice(i, i + 20);
    const vectors = await embedBatch(batch.map((chunk) => chunk.content));

    if (vectors.length !== batch.length) {
      throw new Error(
        `Expected ${batch.length} vectors, received ${vectors.length}.`,
      );
    }

    for (let j = 0; j < batch.length; j += 1) {
      await prisma.documentChunk.update({
        where: { id: batch[j].id },
        data: { embedding: JSON.stringify(vectors[j]) },
      });
      done += 1;
    }

    console.log(`  ${done}/${chunks.length}`);
  }

  console.log("Done. Semantic retrieval is now active.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
