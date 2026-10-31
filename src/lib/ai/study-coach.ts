import "server-only";

import {
  buildContextBlock,
  retrieveChunks,
  tokenize,
  type RetrievedChunk,
} from "./retrieval";
import { AiError, generateText, isAiConfigured } from "./gemini";
import {
  SUMMARY_SYSTEM,
  TUTOR_SYSTEM,
  buildSummaryPrompt,
  buildTutorPrompt,
} from "./prompts";
import { logEvent } from "@/lib/events";

export type AnswerSource = {
  documentId: string;
  documentTitle: string;
  label: string;
};

export type StudyAnswer = {
  answer: string;
  sources: AnswerSource[];
  mode: "live" | "offline";
  warning?: string;
};

function toSources(chunks: RetrievedChunk[]): AnswerSource[] {
  return chunks.map((chunk, index) => ({
    documentId: chunk.documentId,
    documentTitle: chunk.documentTitle,
    label: `[${index + 1}]`,
  }));
}

function sentencesOf(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 40);
}

/**
 * Extractive fallback used when no API key is present or the model call fails.
 * It still produces a grounded, useful answer by quoting the retrieved
 * material, so the system remains demonstrable offline.
 */
function offlineAnswer(question: string, chunks: RetrievedChunk[]): string {
  if (!chunks.length) {
    return [
      "I could not find this topic in the course materials you currently have access to.",
      "",
      "To get a grounded answer, try one of the following:",
      "",
      "- Upload the relevant lecture notes as a PDF on the **Materials** page.",
      "- Select the specific course from the course filter, then ask again.",
      "- Rephrase the question using the terms used in your lecture slides.",
      "",
      "*This reply was produced in offline mode. Add a Gemini API key in `.env` to enable full AI explanations.*",
    ].join("\n");
  }

  const queryTokens = new Set(tokenize(question));
  const bullets: string[] = [];

  for (const [index, chunk] of chunks.slice(0, 2).entries()) {
    const relevant = sentencesOf(chunk.content)
      .map((sentence) => {
        const tokens = tokenize(sentence);
        const overlap = tokens.filter((token) => queryTokens.has(token)).length;
        return { sentence, score: overlap / Math.sqrt(tokens.length + 1) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .filter((item) => item.score > 0);

    const picked = relevant.length
      ? relevant
      : sentencesOf(chunk.content)
          .slice(0, 2)
          .map((sentence) => ({ sentence, score: 0 }));

    for (const item of picked) {
      bullets.push(`- ${item.sentence} [${index + 1}]`);
    }
  }

  return [
    `Here is what your course material says about this topic:`,
    "",
    ...bullets,
    "",
    `**Source${chunks.length > 1 ? "s" : ""}:** ${chunks
      .slice(0, 2)
      .map((chunk) => `“${chunk.documentTitle}”`)
      .join(", ")}`,
    "",
    "**Check yourself:** Can you explain this topic in your own words without looking at the notes?",
    "",
    "*This reply was produced in offline mode from your uploaded material. Add a Gemini API key in `.env` for full AI-generated explanations.*",
  ].join("\n");
}

function offlineSummary(title: string, text: string): string {
  const sentences = sentencesOf(text);
  const frequency = new Map<string, number>();

  for (const sentence of sentences) {
    for (const token of tokenize(sentence)) {
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
    }
  }

  const scored = sentences.map((sentence, index) => {
    const tokens = tokenize(sentence);
    const weight = tokens.reduce(
      (sum, token) => sum + (frequency.get(token) ?? 0),
      0,
    );
    return { sentence, index, score: weight / Math.sqrt(tokens.length + 1) };
  });

  const keyPoints = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .sort((a, b) => a.index - b.index);

  return [
    "## Overview",
    sentences[0] ?? `This document covers ${title}.`,
    "",
    "## Key points",
    ...keyPoints.map((item) => `- ${item.sentence}`),
    "",
    "## Quick revision checklist",
    "- [ ] Read the notes once without highlighting anything",
    "- [ ] Rewrite the key definitions from memory",
    "- [ ] Explain the hardest concept out loud",
    "- [ ] Attempt practice questions on this material",
    "",
    "*Generated in offline mode. Add a Gemini API key in `.env` for a full AI summary.*",
  ].join("\n");
}

export async function answerStudyQuestion(input: {
  question: string;
  courseIds: string[];
  courseTitle?: string;
  history?: Array<{ role: string; content: string }>;
  /** Used for retrieval when the question alone is too short to search with. */
  searchQuery?: string;
  includeUnpublished?: boolean;
}): Promise<StudyAnswer> {
  const chunks = await retrieveChunks({
    courseIds: input.courseIds,
    query: input.searchQuery || input.question,
    limit: 5,
    includeUnpublished: input.includeUnpublished,
  });

  const sources = toSources(chunks);

  if (!isAiConfigured()) {
    return {
      answer: offlineAnswer(input.question, chunks),
      sources,
      mode: "offline",
      warning:
        "Running in offline mode — add a Gemini API key in .env for live AI answers.",
    };
  }

  try {
    const answer = await generateText({
      system: TUTOR_SYSTEM,
      prompt: buildTutorPrompt({
        question: input.question,
        courseTitle: input.courseTitle,
        context: buildContextBlock(chunks),
        history: input.history,
      }),
      temperature: 0.35,
      maxOutputTokens: 1400,
    });

    return { answer, sources, mode: "live" };
  } catch (error) {
    const message =
      error instanceof AiError
        ? error.message
        : "The AI service could not be reached.";

    await logEvent({
      level: "WARN",
      category: "AI",
      message: "Study assistant fell back to offline mode",
      detail: message,
    });

    return {
      answer: offlineAnswer(input.question, chunks),
      sources,
      mode: "offline",
      warning: `Live AI unavailable (${message}). Showing a grounded extract instead.`,
    };
  }
}

export async function summarizeMaterial(input: {
  title: string;
  courseTitle?: string;
  text: string;
}): Promise<{ summary: string; mode: "live" | "offline"; warning?: string }> {
  const trimmed = input.text.slice(0, 24000);

  if (!isAiConfigured()) {
    return {
      summary: offlineSummary(input.title, trimmed),
      mode: "offline",
      warning:
        "Running in offline mode — add a Gemini API key in .env for a full AI summary.",
    };
  }

  try {
    const summary = await generateText({
      system: SUMMARY_SYSTEM,
      prompt: buildSummaryPrompt({
        title: input.title,
        courseTitle: input.courseTitle,
        text: trimmed,
      }),
      temperature: 0.25,
      maxOutputTokens: 2000,
    });

    return { summary, mode: "live" };
  } catch (error) {
    const message =
      error instanceof AiError
        ? error.message
        : "The AI service could not be reached.";

    await logEvent({
      level: "WARN",
      category: "AI",
      message: "Summarisation fell back to offline mode",
      detail: message,
    });

    return {
      summary: offlineSummary(input.title, trimmed),
      mode: "offline",
      warning: `Live AI unavailable (${message}). Showing an extractive summary.`,
    };
  }
}

export function aiStatusLabel() {
  return isAiConfigured() ? "Live AI connected" : "Offline demo mode";
}
