import "server-only";

/**
 * Provider-aware configuration.
 *
 * The app can talk to any of four backends. Only one is active at a time,
 * selected by `AI_PROVIDER` or, when that is unset, by whichever key is
 * present in the environment. Each provider keeps its own env vars so a
 * project can carry more than one key without ambiguity.
 *
 *   gemini     Google Gemini REST API (generativelanguage.googleapis.com)
 *   openrouter OpenRouter aggregation layer - one key, many free models
 *   groq       Groq fast inference API (chat only, no embeddings)
 *   ollama     Self-hosted Ollama models on localhost (chat + embeddings)
 */

export type ProviderName = "gemini" | "openrouter" | "groq" | "ollama";

export const PROVIDER_NAMES: ProviderName[] = [
  "gemini",
  "openrouter",
  "groq",
  "ollama",
];

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

function intEnv(name: string, fallback: number): number {
  const value = Number.parseInt(env(name), 10);
  return Number.isFinite(value) ? value : fallback;
}

function floatEnv(name: string, fallback: number): number {
  const value = Number.parseFloat(env(name));
  return Number.isFinite(value) ? value : fallback;
}

function resolveProvider(): ProviderName {
  if (env("GEMINI_API_KEY")) return "gemini";
  if (env("OPENROUTER_API_KEY")) return "openrouter";
  if (env("GROQ_API_KEY")) return "groq";
  if (env("OLLAMA_BASE_URL")) return "ollama";
  return "gemini";
}

export const aiConfig = {
  provider: (env("AI_PROVIDER") || resolveProvider()) as ProviderName,

  // ---- Gemini ----------------------------------------------------------
  geminiApiKey: env("GEMINI_API_KEY"),
  geminiChatModel: env("GEMINI_CHAT_MODEL") || "gemini-3.5-flash",
  geminiEmbedModel: env("GEMINI_EMBED_MODEL") || "gemini-embedding-2",
  geminiEmbedDim: intEnv("GEMINI_EMBED_DIM", 768),
  /** Gemini 3.x "thinking" budget. 0 disables it; -1 lets the model decide. */
  geminiThinkingBudget: intEnv("GEMINI_THINKING_BUDGET", 0),

  // ---- OpenRouter ------------------------------------------------------
  openrouterApiKey: env("OPENROUTER_API_KEY"),
  openrouterChatModel:
    env("OPENROUTER_CHAT_MODEL") || "google/gemini-2.0-flash-001",
  openrouterEmbedModel:
    env("OPENROUTER_EMBED_MODEL") || "openai/text-embedding-3-small",
  openrouterEmbedDim: intEnv("OPENROUTER_EMBED_DIM", 1536),
  /** Optional OpenRouter site metadata, shown in their dashboard. */
  openrouterSiteUrl: env("OPENROUTER_SITE_URL"),
  openrouterSiteName: env("OPENROUTER_SITE_NAME"),

  // ---- Groq ------------------------------------------------------------
  groqApiKey: env("GROQ_API_KEY"),
  groqChatModel: env("GROQ_CHAT_MODEL") || "llama-3.1-8b-instant",
  /** Groq has no hosted embedding API; leave blank to disable embeddings. */
  groqEmbedModel: env("GROQ_EMBED_MODEL"),
  groqEmbedDim: intEnv("GROQ_EMBED_DIM", 0),

  // ---- Ollama ----------------------------------------------------------
  ollamaBaseUrl: env("OLLAMA_BASE_URL") || "http://localhost:11434",
  ollamaChatModel: env("OLLAMA_CHAT_MODEL") || "llama3.1",
  ollamaEmbedModel: env("OLLAMA_EMBED_MODEL") || "nomic-embed-text",
  ollamaEmbedDim: intEnv("OLLAMA_EMBED_DIM", 768),
};

export function providerLabel(): string {
  switch (aiConfig.provider) {
    case "gemini":
      return "Google Gemini";
    case "openrouter":
      return "OpenRouter";
    case "groq":
      return "Groq";
    case "ollama":
      return "Ollama (local)";
  }
}

/** True when the active provider has a usable key / base URL. */
export function isConfigured(): boolean {
  switch (aiConfig.provider) {
    case "gemini":
      return aiConfig.geminiApiKey.length > 0;
    case "openrouter":
      return aiConfig.openrouterApiKey.length > 0;
    case "groq":
      return aiConfig.groqApiKey.length > 0;
    case "ollama":
      return aiConfig.ollamaBaseUrl.length > 0;
  }
}

/** Default temperature for chat calls, tuned per provider. */
export function defaultTemperature(): number {
  return floatEnv("AI_TEMPERATURE", 0.4);
}