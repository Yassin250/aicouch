import "server-only";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export const aiConfig = {
  apiKey: (process.env.GEMINI_API_KEY ?? "").trim(),
  chatModel: (process.env.GEMINI_CHAT_MODEL || "gemini-3.8-flash").trim(),
  embedModel: (process.env.GEMINI_EMBED_MODEL || "gemini-embedding-2").trim(),
  /**
   * Gemini 3.x models "think" before answering. That is valuable for hard
   * questions but adds 20-90 seconds of latency, which is unusable in a chat
   * interface. 0 disables it; set -1 to let the model decide.
   */
  thinkingBudget: Number.parseInt(
    process.env.GEMINI_THINKING_BUDGET ?? "0",
    10,
  ),
  /** Truncated embedding size. 768 keeps storage small and search fast. */
  embedDim: Number.parseInt(process.env.GEMINI_EMBED_DIM ?? "768", 10),
};

export function isAiConfigured() {
  return aiConfig.apiKey.length > 0;
}

export class AiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "AiError";
    this.status = status;
  }
}

type GenerateOptions = {
  prompt: string;
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
  json?: boolean;
};

async function readError(response: Response) {
  try {
    const data = await response.json();
    return (
      data?.error?.message ?? `The AI service returned status ${response.status}.`
    );
  } catch {
    return `The AI service returned status ${response.status}.`;
  }
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Single-turn text generation against the Gemini REST API.
 * Throws AiError when the key is missing or the request fails - callers are
 * expected to fall back to the offline generator so the system never breaks.
 *
 * Transient failures (rate limits, "high demand") are retried twice with a
 * short backoff before giving up, because the free tier throws them regularly.
 */
export async function generateText(options: GenerateOptions): Promise<string> {
  if (!isAiConfigured()) {
    throw new AiError("No Gemini API key is configured.");
  }

  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 0.4,
    maxOutputTokens: options.maxOutputTokens ?? 2048,
  };

  if (options.json) generationConfig.responseMimeType = "application/json";

  if (Number.isFinite(aiConfig.thinkingBudget) && aiConfig.thinkingBudget >= 0) {
    generationConfig.thinkingConfig = {
      thinkingBudget: aiConfig.thinkingBudget,
    };
  }

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: options.prompt }] }],
    generationConfig,
  };

  if (options.system) {
    body.systemInstruction = { parts: [{ text: options.system }] };
  }

  let response: Response | null = null;
  let lastError = "";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      response = await fetch(
        `${API_BASE}/models/${aiConfig.chatModel}:generateContent?key=${aiConfig.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(120_000),
        },
      );
    } catch {
      throw new AiError("Could not reach the AI service. Check your connection.");
    }

    if (response.ok) break;

    lastError = await readError(response);

    if (!RETRYABLE_STATUS.has(response.status) || attempt === 2) {
      throw new AiError(lastError, response.status);
    }

    await sleep(1200 * (attempt + 1));
  }

  if (!response || !response.ok) {
    throw new AiError(lastError || "The AI service did not respond.");
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const parts: Array<{ text?: string; thought?: boolean }> =
    candidate?.content?.parts ?? [];

  // Reasoning parts are returned alongside the answer and must not be shown.
  const text = parts
    .filter((part) => !part.thought)
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    const reason = candidate?.finishReason;
    if (reason === "MAX_TOKENS") {
      throw new AiError(
        "The answer was cut off before it could be written. Try a shorter question.",
      );
    }
    if (reason === "SAFETY" || reason === "PROHIBITED_CONTENT") {
      throw new AiError("The model declined to answer this request.");
    }
    throw new AiError("The AI service returned an empty response.");
  }

  return text;
}

/**
 * Embeds a batch of texts. Returns null when embeddings are unavailable so
 * callers can degrade to lexical retrieval instead of failing.
 */
export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  if (!isAiConfigured() || texts.length === 0) return null;

  const batches: string[][] = [];
  for (let i = 0; i < texts.length; i += 20) {
    batches.push(texts.slice(i, i + 20));
  }

  const vectors: number[][] = [];

  try {
    for (const batch of batches) {
      const response = await fetch(
        `${API_BASE}/models/${aiConfig.embedModel}:batchEmbedContents?key=${aiConfig.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: batch.map((text) => ({
              model: `models/${aiConfig.embedModel}`,
              content: { parts: [{ text }] },
              outputDimensionality: aiConfig.embedDim,
            })),
          }),
          signal: AbortSignal.timeout(90_000),
        },
      );

      if (!response.ok) return null;

      const data = await response.json();
      const batchVectors: Array<{ values?: number[] }> = data?.embeddings ?? [];
      if (batchVectors.length !== batch.length) return null;

      for (const item of batchVectors) {
        if (!item.values?.length) return null;
        vectors.push(item.values);
      }
    }
  } catch {
    return null;
  }

  return vectors;
}
