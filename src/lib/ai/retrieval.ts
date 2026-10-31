import "server-only";

import { db } from "@/lib/db";
import { embedTexts } from "./gemini";

const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "any", "can", "had",
  "her", "was", "one", "our", "out", "day", "get", "has", "him", "his", "how",
  "its", "may", "new", "now", "old", "see", "two", "way", "who", "boy", "did",
  "she", "use", "what", "when", "where", "which", "while", "with", "this",
  "that", "these", "those", "from", "have", "does", "did", "been", "being",
  "will", "would", "could", "should", "about", "into", "than", "then", "them",
  "they", "there", "their", "explain", "describe", "define", "tell", "give",
  "please", "help", "understand", "meaning", "difference", "between",
]);

export type RetrievedChunk = {
  documentId: string;
  documentTitle: string;
  courseId: string;
  chunkIndex: number;
  content: string;
  score: number;
};

export function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s+#]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

/**
 * Splits extracted text into overlapping, retrieval-sized chunks. Breaks are
 * pushed towards paragraph or sentence boundaries so a chunk rarely starts
 * mid-sentence.
 */
export function chunkText(
  raw: string,
  targetSize = 900,
  overlap = 160,
): string[] {
  const text = raw
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) return [];
  if (text.length <= targetSize) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + targetSize, text.length);

    if (end < text.length) {
      const window = text.slice(start, end);
      const candidates = [
        window.lastIndexOf("\n\n"),
        window.lastIndexOf(". "),
        window.lastIndexOf("? "),
        window.lastIndexOf("! "),
      ];
      const breakAt = Math.max(...candidates);
      if (breakAt > targetSize * 0.45) end = start + breakAt + 1;
    }

    const piece = text.slice(start, end).trim();
    if (piece.length > 40) chunks.push(piece);

    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

function cosine(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Term-frequency score with a logarithmic length penalty, used when vectors are
 * absent. Log normalisation keeps scores comparable between a short and a long
 * chunk, which a square-root penalty does not.
 */
function lexicalScore(queryTokens: string[], content: string) {
  const tokens = tokenize(content);
  if (!tokens.length) return 0;

  const frequency = new Map<string, number>();
  for (const token of tokens) {
    frequency.set(token, (frequency.get(token) ?? 0) + 1);
  }

  let score = 0;
  for (const queryToken of new Set(queryTokens)) {
    const count = frequency.get(queryToken) ?? 0;
    if (count > 0) score += 1 + Math.log(count);
  }

  return score / (1 + Math.log(tokens.length));
}

/**
 * Retrieves the most relevant chunks of approved course material for a query.
 * Scoped by course so students can only ever receive content they are enrolled
 * in. Uses vector similarity when embeddings exist, otherwise lexical scoring.
 */
export async function retrieveChunks(options: {
  courseIds: string[];
  query: string;
  limit?: number;
  maxPerDocument?: number;
  /** Lecturers and administrators may search drafts as well as published notes. */
  includeUnpublished?: boolean;
}): Promise<RetrievedChunk[]> {
  const { courseIds, query } = options;
  const limit = options.limit ?? 5;
  const maxPerDocument = options.maxPerDocument ?? 2;

  if (!courseIds.length || !query.trim()) return [];

  const chunks = await db.documentChunk.findMany({
    where: {
      document: {
        courseId: { in: courseIds },
        status: "READY",
        ...(options.includeUnpublished
          ? {}
          : { publishState: "PUBLISHED" }),
      },
    },
    include: {
      document: { select: { id: true, title: true, courseId: true } },
    },
    take: 4000,
  });

  if (!chunks.length) return [];

  const queryVector = (await embedTexts([query]))?.[0] ?? null;
  const everyChunkHasVector =
    Boolean(queryVector) && chunks.every((chunk) => Boolean(chunk.embedding));

  const queryTokens = tokenize(query);

  const scored = chunks.map((chunk) => {
    let score = 0;

    if (everyChunkHasVector && queryVector && chunk.embedding) {
      try {
        score = cosine(queryVector, JSON.parse(chunk.embedding) as number[]);
      } catch {
        score = lexicalScore(queryTokens, chunk.content);
      }
    } else {
      score = lexicalScore(queryTokens, chunk.content);
    }

    return {
      documentId: chunk.document.id,
      documentTitle: chunk.document.title,
      courseId: chunk.document.courseId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      score,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0]?.score ?? 0;
  if (best <= 0) return [];

  // With vectors we can use an absolute cosine floor. With lexical scoring the
  // values depend on the query, so the cutoff is relative to the best match.
  const minimum = everyChunkHasVector ? 0.25 : Math.max(best * 0.45, 0.05);
  const perDocument = new Map<string, number>();
  const results: RetrievedChunk[] = [];

  for (const item of scored) {
    if (item.score < minimum) continue;

    const used = perDocument.get(item.documentId) ?? 0;
    if (used >= maxPerDocument) continue;

    perDocument.set(item.documentId, used + 1);
    results.push(item);

    if (results.length >= limit) break;
  }

  return results;
}

/** Builds the numbered context block handed to the language model. */
export function buildContextBlock(chunks: RetrievedChunk[], maxChars = 7000) {
  let used = 0;
  const parts: string[] = [];

  chunks.forEach((chunk, index) => {
    if (used + chunk.content.length > maxChars) return;
    used += chunk.content.length;
    parts.push(
      `[${index + 1}] Source: "${chunk.documentTitle}"\n${chunk.content}`,
    );
  });

  return parts.join("\n\n---\n\n");
}

/**
 * Chunks are stored with a deliberate overlap so no idea is cut in half during
 * retrieval. When the whole document is needed (for display or summarisation)
 * that overlap must be stitched back together, otherwise sentences appear
 * twice.
 */
export function mergeOverlappingChunks(parts: string[]) {
  if (!parts.length) return "";

  let merged = parts[0];

  for (const part of parts.slice(1)) {
    let overlap = 0;
    const limit = Math.min(merged.length, part.length, 400);

    for (let size = limit; size >= 40; size -= 1) {
      if (merged.slice(-size) === part.slice(0, size)) {
        overlap = size;
        break;
      }
    }

    merged += overlap > 0 ? part.slice(overlap) : `\n\n${part}`;
  }

  return merged;
}
