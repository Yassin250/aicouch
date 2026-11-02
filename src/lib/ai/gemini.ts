import "server-only";

/**
 * Provider-aware AI client.
 *
 * All other modules import { generateText, embedTexts, isAiConfigured, AiError }
 * from this file. Internally, calls are routed to the active provider
 * (Gemini, Groq, OpenRouter, or Ollama) based on the AI_PROVIDER env var.
 * No other file needs to change when the provider changes.
 */

// ---------------------------------------------------------------------------
// Shared config (read env once at startup)
// ---------------------------------------------------------------------------

function env(name: string) {
  return (process.env[name] ?? "").trim();
}

function intEnv(name: string, fallback: number) {
  const v = Number.parseInt(env(name), 10);
  return Number.isFinite(v) ? v : fallback;
}

type ProviderName = "gemini" | "openrouter" | "groq" | "ollama";

function resolveProvider(): ProviderName {
  const explicit = env("AI_PROVIDER") as ProviderName;
  if (explicit) return explicit;
  if (env("GEMINI_API_KEY")) return "gemini";
  if (env("OPENROUTER_API_KEY")) return "openrouter";
  if (env("GROQ_API_KEY")) return "groq";
  if (env("OLLAMA_BASE_URL")) return "ollama";
  return "gemini";
}

export const aiConfig = {
  provider: resolveProvider(),

  // Gemini
  apiKey: env("GEMINI_API_KEY"),
  chatModel: env("GEMINI_CHAT_MODEL") || "gemini-3.5-flash",
  embedModel: env("GEMINI_EMBED_MODEL") || "gemini-embedding-2",
  thinkingBudget: intEnv("GEMINI_THINKING_BUDGET", 0),
  embedDim: intEnv("GEMINI_EMBED_DIM", 768),

  // Groq
  groqApiKey: env("GROQ_API_KEY"),
  groqChatModel: env("GROQ_CHAT_MODEL") || "qwen/qwen3.8-27b",

  // OpenRouter
  openrouterApiKey: env("OPENROUTER_API_KEY"),
  openrouterChatModel:
    env("OPENROUTER_CHAT_MODEL") || "meta-llama/llama-3.1-8b-instruct:free",

  // Ollama
  ollamaBaseUrl: env("OLLAMA_BASE_URL") || "http://localhost:11434",
  ollamaChatModel: env("OLLAMA_CHAT_MODEL") || "llama3.1",
  ollamaEmbedModel: env("OLLAMA_EMBED_MODEL") || "nomic-embed-text",
  ollamaEmbedDim: intEnv("OLLAMA_EMBED_DIM", 768),
};

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class AiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "AiError";
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// isAiConfigured — true when the active provider has a usable key / URL
// ---------------------------------------------------------------------------

export function isAiConfigured(): boolean {
  switch (aiConfig.provider) {
    case "gemini":
      return aiConfig.apiKey.length > 0;
    case "groq":
      return aiConfig.groqApiKey.length > 0;
    case "openrouter":
      return aiConfig.openrouterApiKey.length > 0;
    case "ollama":
      return aiConfig.ollamaBaseUrl.length > 0;
  }
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

type GenerateOptions = {
  prompt: string;
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
  json?: boolean;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return (
      data?.error?.message ??
      `The AI service returned status ${response.status}.`
    );
  } catch {
    return `The AI service returned status ${response.status}.`;
  }
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

// ---------------------------------------------------------------------------
// Provider implementations
// ---------------------------------------------------------------------------

// ---- Gemini ----------------------------------------------------------------

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

async function generateViaGemini(options: GenerateOptions): Promise<string> {
  if (!aiConfig.apiKey) throw new AiError("No Gemini API key configured.");

  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 0.4,
    maxOutputTokens: options.maxOutputTokens ?? 2048,
  };

  if (options.json) generationConfig.responseMimeType = "application/json";
  if (Number.isFinite(aiConfig.thinkingBudget) && aiConfig.thinkingBudget >= 0) {
    generationConfig.thinkingConfig = { thinkingBudget: aiConfig.thinkingBudget };
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
        `${GEMINI_BASE}/models/${aiConfig.chatModel}:generateContent?key=${aiConfig.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(120_000),
        },
      );
    } catch {
      throw new AiError("Could not reach Gemini. Check your connection.");
    }
    if (response.ok) break;
    lastError = await readError(response);
    if (!RETRYABLE_STATUS.has(response.status) || attempt === 2)
      throw new AiError(lastError, response.status);
    await sleep(1200 * (attempt + 1));
  }

  if (!response?.ok) throw new AiError(lastError || "Gemini did not respond.");

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const parts: Array<{ text?: string; thought?: boolean }> =
    candidate?.content?.parts ?? [];
  const text = parts
    .filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!text) {
    const reason = candidate?.finishReason;
    if (reason === "MAX_TOKENS")
      throw new AiError("Answer cut off — try a shorter question.");
    if (reason === "SAFETY" || reason === "PROHIBITED_CONTENT")
      throw new AiError("The model declined to answer this request.");
    throw new AiError("Gemini returned an empty response.");
  }
  return text;
}

// ---- Groq ------------------------------------------------------------------

const GROQ_BASE = "https://api.groq.com/openai/v1";

async function generateViaGroq(options: GenerateOptions): Promise<string> {
  if (!aiConfig.groqApiKey) throw new AiError("No Groq API key configured.");

  const messages: Array<{ role: string; content: string }> = [];
  if (options.system) messages.push({ role: "system", content: options.system });
  messages.push({ role: "user", content: options.prompt });

  const body: Record<string, unknown> = {
    model: aiConfig.groqChatModel,
    messages,
    temperature: options.temperature ?? 0.4,
    max_tokens: options.maxOutputTokens ?? 2048,
  };

  if (options.json) {
    body.response_format = { type: "json_object" };
  }

  let response: Response | null = null;
  let lastError = "";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      response = await fetch(`${GROQ_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiConfig.groqApiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      throw new AiError("Could not reach Groq. Check your connection.");
    }
    if (response.ok) break;
    lastError = await readError(response);
    if (!RETRYABLE_STATUS.has(response.status) || attempt === 2)
      throw new AiError(lastError, response.status);
    await sleep(1200 * (attempt + 1));
  }

  if (!response?.ok) throw new AiError(lastError || "Groq did not respond.");

  const data = await response.json();
  const text: string = data?.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new AiError("Groq returned an empty response.");
  return text;
}

// ---- OpenRouter ------------------------------------------------------------

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

async function generateViaOpenRouter(options: GenerateOptions): Promise<string> {
  if (!aiConfig.openrouterApiKey)
    throw new AiError("No OpenRouter API key configured.");

  const messages: Array<{ role: string; content: string }> = [];
  if (options.system) messages.push({ role: "system", content: options.system });
  messages.push({ role: "user", content: options.prompt });

  const body: Record<string, unknown> = {
    model: aiConfig.openrouterChatModel,
    messages,
    temperature: options.temperature ?? 0.4,
    max_tokens: options.maxOutputTokens ?? 2048,
  };

  let response: Response | null = null;
  let lastError = "";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiConfig.openrouterApiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90_000),
      });
    } catch {
      throw new AiError("Could not reach OpenRouter. Check your connection.");
    }
    if (response.ok) break;
    lastError = await readError(response);
    if (!RETRYABLE_STATUS.has(response.status) || attempt === 2)
      throw new AiError(lastError, response.status);
    await sleep(1200 * (attempt + 1));
  }

  if (!response?.ok) throw new AiError(lastError || "OpenRouter did not respond.");

  const data = await response.json();
  const text: string = data?.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new AiError("OpenRouter returned an empty response.");
  return text;
}

// ---- Ollama ----------------------------------------------------------------

async function generateViaOllama(options: GenerateOptions): Promise<string> {
  const messages: Array<{ role: string; content: string }> = [];
  if (options.system) messages.push({ role: "system", content: options.system });
  messages.push({ role: "user", content: options.prompt });

  let response: Response | null = null;

  try {
    response = await fetch(`${aiConfig.ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: aiConfig.ollamaChatModel,
        messages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.4,
          num_predict: options.maxOutputTokens ?? 2048,
        },
      }),
      signal: AbortSignal.timeout(180_000),
    });
  } catch {
    throw new AiError("Could not reach Ollama. Make sure it is running.");
  }

  if (!response.ok) {
    const msg = await readError(response);
    throw new AiError(msg, response.status);
  }

  const data = await response.json();
  const text: string = data?.message?.content?.trim() ?? "";
  if (!text) throw new AiError("Ollama returned an empty response.");
  return text;
}

// ---------------------------------------------------------------------------
// Public: generateText — routes to the active provider
// ---------------------------------------------------------------------------

export async function generateText(options: GenerateOptions): Promise<string> {
  switch (aiConfig.provider) {
    case "gemini":
      return generateViaGemini(options);
    case "groq":
      return generateViaGroq(options);
    case "openrouter":
      return generateViaOpenRouter(options);
    case "ollama":
      return generateViaOllama(options);
  }
}

// ---------------------------------------------------------------------------
// Public: embedTexts — returns null for providers without embeddings (Groq)
// so callers gracefully fall back to keyword search.
// ---------------------------------------------------------------------------

export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  if (texts.length === 0) return null;

  // Groq has no embedding API — fall back to keyword search
  if (aiConfig.provider === "groq") return null;

  // Ollama embeddings
  if (aiConfig.provider === "ollama") {
    try {
      const vectors: number[][] = [];
      for (const text of texts) {
        const res = await fetch(`${aiConfig.ollamaBaseUrl}/api/embeddings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: aiConfig.ollamaEmbedModel, prompt: text }),
          signal: AbortSignal.timeout(30_000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data?.embedding?.length) return null;
        vectors.push(data.embedding as number[]);
      }
      return vectors;
    } catch {
      return null;
    }
  }

  // Gemini embeddings
  if (aiConfig.provider === "gemini") {
    if (!aiConfig.apiKey) return null;
    const GEMINI_EMBED_BASE =
      "https://generativelanguage.googleapis.com/v1beta";
    const batches: string[][] = [];
    for (let i = 0; i < texts.length; i += 20) batches.push(texts.slice(i, i + 20));
    const vectors: number[][] = [];
    try {
      for (const batch of batches) {
        const res = await fetch(
          `${GEMINI_EMBED_BASE}/models/${aiConfig.embedModel}:batchEmbedContents?key=${aiConfig.apiKey}`,
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
        if (!res.ok) return null;
        const data = await res.json();
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

  // OpenRouter has no embedding API — fall back to keyword search
  return null;
}
