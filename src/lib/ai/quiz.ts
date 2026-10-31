import "server-only";

import { AiError, generateText, isAiConfigured } from "./gemini";
import { QUIZ_SYSTEM, buildQuizPrompt } from "./prompts";
import { tokenize } from "./retrieval";
import { logEvent } from "@/lib/events";

export type GeneratedQuestion = {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
};

export type QuizGeneration = {
  questions: GeneratedQuestion[];
  mode: "live" | "offline";
  warning?: string;
};

// ---------------------------------------------------------------------------
// Live generation
// ---------------------------------------------------------------------------

/** Accepts raw model output, tolerating stray code fences, and validates it. */
function parseQuestions(raw: string): GeneratedQuestion[] | null {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1) return null;

  let data: unknown;
  try {
    data = JSON.parse(text.slice(first, last + 1));
  } catch {
    return null;
  }

  const list = Array.isArray(data)
    ? data
    : (data as { questions?: unknown })?.questions;

  if (!Array.isArray(list)) return null;

  const questions: GeneratedQuestion[] = [];

  for (const item of list) {
    const candidate = item as Record<string, unknown>;
    const prompt = typeof candidate.prompt === "string" ? candidate.prompt.trim() : "";
    const options = Array.isArray(candidate.options)
      ? candidate.options.map((option) => String(option).trim())
      : [];
    const correctIndex = Number(candidate.correctIndex);

    if (!prompt || options.length !== 4) continue;
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
      continue;
    }
    if (options.some((option) => !option)) continue;

    questions.push({
      prompt,
      options,
      correctIndex,
      explanation:
        typeof candidate.explanation === "string"
          ? candidate.explanation.trim()
          : "",
      topic:
        typeof candidate.topic === "string" && candidate.topic.trim()
          ? candidate.topic.trim()
          : "General",
    });
  }

  return questions.length ? questions : null;
}

// ---------------------------------------------------------------------------
// Offline generation
// ---------------------------------------------------------------------------

const STOPWORD_STARTS = new Set([
  "the", "this", "that", "these", "those", "it", "they", "there", "in", "a",
  "an", "as", "if", "when", "because", "which", "we", "you", "i", "he", "she",
  "but", "and", "for", "to", "of", "on", "at", "by", "with", "from", "his",
  "her", "its", "our", "their", "one", "two", "three", "each", "every", "some",
  "most", "many", "such", "other", "another", "both", "all", "any", "no",
]);

function sentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 45);
}

/** Deterministic PRNG so the same material always produces the same quiz. */
function seededRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function capitalise(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Maps a lowercased token back to how it is actually written in the notes. */
function surfaceForms(text: string) {
  const map = new Map<string, string>();
  const words = text.match(/[A-Za-z][A-Za-z0-9+#\-]*/g) ?? [];

  for (const word of words) {
    const key = word.toLowerCase();
    if (!map.has(key)) map.set(key, word);
  }

  return map;
}

/**
 * Words that are frequent but carry no meaning as a quiz answer. Without this
 * list the cloze generator happily blanks out verbs like "matters".
 */
const GENERIC_TERMS = new Set([
  "matters", "requires", "require", "usually", "always", "often", "however",
  "therefore", "because", "between", "different", "example", "process",
  "another", "further", "already", "whether", "without", "through", "number",
  "several", "certain", "general", "similar", "following", "considered",
  "determine", "identify", "understand", "correct", "common", "simply",
  "remains", "becomes", "occurs", "allows", "called", "known", "applies",
  "holds", "depends", "contains", "includes", "consists", "refers",
  "exactly", "places", "place", "terms", "term", "rather", "almost", "nearly",
  "quite", "really", "generally", "typically", "normally", "actually",
  "particularly", "specifically", "especially", "within", "across", "around",
  "during", "before", "after", "above", "below", "under", "over",
]);

/** Nouns that can never be a useful quiz answer, however frequent they are. */
const GENERIC_NOUNS = new Set([
  "fix", "fixes", "problem", "problems", "answer", "reason", "reasons",
  "result", "results", "solution", "point", "points", "case", "cases", "way",
  "ways", "time", "times", "part", "parts", "rest", "fact", "facts", "idea",
  "approach", "method", "methods", "choice", "difference", "example",
  "examples", "sentence", "mistake", "mistakes", "error", "errors", "note",
  "notes", "thing", "things", "student", "students",
]);

/**
 * A definition must open with something definition-shaped. "X is therefore
 * dependent on Y" or "X is to move Y into Z" are conclusions and instructions,
 * not definitions, and produce nonsense questions.
 */
const BAD_DEFINITION_OPENERS = new Set([
  "to", "therefore", "that", "this", "it", "they", "then", "so", "and", "but",
  "because", "if", "when", "which", "who", "there", "here", "now", "also",
  "still", "only", "just", "even", "thus", "hence", "however", "instead",
  "otherwise", "not", "no", "made", "done", "used", "needed", "possible",
]);

/** A real definition opens with a determiner: "a set of…", "the process of…". */
const DEFINITION_DETERMINERS = new Set([
  "a", "an", "the", "any", "every", "each", "no", "all", "one", "two",
  "three", "four", "five", "some",
]);

/** Sentences that state something about a term, useful for cloze questions. */
const STATEMENT_PATTERN =
  /\b(is|are|was|were|requires?|means|refers?|consists?|describes?|defines?|represents?|depends?|contains?|allows?|occurs?|happens?)\b/i;

function singular(word: string) {
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ses") || word.endsWith("xes")) return word.slice(0, -2);
  if (
    word.endsWith("s") &&
    !word.endsWith("ss") &&
    !word.endsWith("us") &&
    !word.endsWith("is")
  ) {
    return word.slice(0, -1);
  }
  return word;
}

function termKey(term: string) {
  const words = term.toLowerCase().replace(/\s+/g, " ").trim().split(" ");
  words[words.length - 1] = singular(words[words.length - 1]);
  return words.join(" ");
}

type Definition = { term: string; definition: string };

/** Pulls "Term is a definition." pairs out of the material. */
function findDefinitions(text: string): Definition[] {
  const pattern =
    /^(?:The\s+|A\s+|An\s+)?([A-Za-z][A-Za-z0-9\s\-+#()\/.]{1,44}?)\s+(?:is|are|refers to|means|is defined as)\s+(.{30,200})$/;

  const seen = new Set<string>();
  const results: Definition[] = [];

  for (const sentence of sentences(text)) {
    const match = pattern.exec(sentence);
    if (!match) continue;

    const term = match[1].trim();
    const definition = match[2].trim().replace(/[.;]+$/, "");
    const firstWord = definition.split(" ")[0]?.toLowerCase() ?? "";
    const termWords = term.split(" ");

    if (!term || termWords.length > 5) continue;
    if (/[,;:]/.test(term)) continue;
    if (STOPWORD_STARTS.has(termWords[0].toLowerCase())) continue;
    if (BAD_DEFINITION_OPENERS.has(firstWord)) continue;
    // The definition must read as a noun phrase, not a conclusion.
    if (!DEFINITION_DETERMINERS.has(firstWord)) continue;
    if (definition.split(" ").length < 6) continue;
    if (
      termWords.some(
        (word) =>
          GENERIC_NOUNS.has(word.toLowerCase()) ||
          GENERIC_TERMS.has(word.toLowerCase()),
      )
    ) {
      continue;
    }

    const key = termKey(term);
    if (seen.has(key)) continue;

    seen.add(key);
    results.push({ term, definition });
  }

  return results;
}

function definitionQuestions(
  definitions: Definition[],
  count: number,
  random: () => number,
): GeneratedQuestion[] {
  if (definitions.length < 4) return [];

  const questions: GeneratedQuestion[] = [];

  for (const target of definitions) {
    if (questions.length >= count) break;

    const distractors = shuffle(
      definitions.filter((item) => item.term !== target.term),
      random,
    ).slice(0, 3);

    if (distractors.length < 3) continue;

    const options = shuffle(
      [target.definition, ...distractors.map((item) => item.definition)],
      random,
    );

    questions.push({
      prompt: `In this course, what does "${capitalise(target.term)}" mean?`,
      options: options.map(capitalise),
      correctIndex: options.indexOf(target.definition),
      explanation: `The material defines ${target.term} as: ${target.definition}.`,
      topic: capitalise(target.term),
    });
  }

  return questions;
}

/** Fills the remaining slots with cloze questions built from key sentences. */
function clozeQuestions(
  text: string,
  count: number,
  random: () => number,
  exclude: Set<string>,
): GeneratedQuestion[] {
  const frequency = new Map<string, number>();
  for (const token of tokenize(text)) {
    frequency.set(token, (frequency.get(token) ?? 0) + 1);
  }

  const surface = surfaceForms(text);

  const terms = [...frequency.entries()]
    .filter(
      ([token, times]) =>
        token.length >= 6 &&
        times >= 2 &&
        !GENERIC_TERMS.has(token) &&
        !GENERIC_NOUNS.has(token),
    )
    // Favour terms that are both frequent and specific (long) — "normalisation"
    // should outrank "table".
    .sort((a, b) => b[1] * b[0].length - a[1] * a[0].length)
    .map(([token]) => token);

  if (terms.length < 4) return [];

  const questions: GeneratedQuestion[] = [];

  for (const sentence of sentences(text)) {
    if (questions.length >= count) break;

    // Only blank out terms in sentences that actually assert something.
    if (!STATEMENT_PATTERN.test(sentence)) continue;

    const tokens = tokenize(sentence);
    if (tokens.length < 8) continue;

    const candidate = tokens
      .filter((token) => terms.includes(token))
      .sort((a, b) => b.length - a.length)[0];

    if (!candidate || exclude.has(candidate)) continue;

    // Blanking a word that appears twice in the same sentence reads as a
    // mistake, so skip those sentences.
    const pattern = new RegExp(`\\b${candidate}\\b`, "gi");
    const occurrences = (sentence.match(pattern) ?? []).length;
    if (occurrences !== 1) continue;

    exclude.add(candidate);

    const distractors = shuffle(
      terms.filter((term) => term !== candidate),
      random,
    ).slice(0, 3);

    if (distractors.length < 3) continue;

    const display = (token: string) => capitalise(surface.get(token) ?? token);
    const options = shuffle([candidate, ...distractors], random).map(display);

    questions.push({
      prompt: `Complete the statement from your notes:\n\n"${sentence.replace(
        new RegExp(`\\b${candidate}\\b`, "i"),
        "________",
      )}"`,
      options,
      correctIndex: options.indexOf(display(candidate)),
      explanation: `The missing term is "${display(candidate)}". Original statement: ${sentence}`,
      topic: display(candidate),
    });
  }

  return questions;
}

function offlineQuiz(
  text: string,
  count: number,
  seed: number,
): GeneratedQuestion[] {
  const random = seededRandom(seed);
  const definitions = findDefinitions(text);

  const fromDefinitions = definitionQuestions(definitions, count, random);

  if (fromDefinitions.length >= count) {
    return fromDefinitions.slice(0, count);
  }

  const usedTerms = new Set(
    fromDefinitions.map((question) => question.topic.toLowerCase()),
  );

  const fromCloze = clozeQuestions(
    text,
    count - fromDefinitions.length,
    random,
    usedTerms,
  );

  return [...fromDefinitions, ...fromCloze].slice(0, count);
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function generateQuiz(input: {
  courseTitle: string;
  text: string;
  count: number;
  difficulty: string;
}): Promise<QuizGeneration> {
  const seed = input.text.length + input.count * 7;

  if (isAiConfigured()) {
    try {
      const raw = await generateText({
        system: QUIZ_SYSTEM,
        prompt: buildQuizPrompt({
          courseTitle: input.courseTitle,
          text: input.text.slice(0, 16000),
          count: input.count,
          difficulty: input.difficulty,
        }),
        temperature: 0.6,
        maxOutputTokens: 2600,
        json: true,
      });

      const parsed = parseQuestions(raw);

      if (parsed) {
        return { questions: parsed.slice(0, input.count), mode: "live" };
      }

      await logEvent({
        level: "WARN",
        category: "AI",
        message: "Quiz generation returned unusable JSON",
        detail: raw.slice(0, 500),
      });

      return {
        questions: offlineQuiz(input.text, input.count, seed),
        mode: "offline",
        warning:
          "The AI returned questions in an unexpected format, so questions were built directly from your notes instead.",
      };
    } catch (error) {
      const message =
        error instanceof AiError
          ? error.message
          : "The AI service could not be reached.";

      await logEvent({
        level: "WARN",
        category: "AI",
        message: "Quiz generation fell back to offline mode",
        detail: message,
      });

      return {
        questions: offlineQuiz(input.text, input.count, seed),
        mode: "offline",
        warning: `Live AI unavailable (${message}). Questions were built directly from your notes.`,
      };
    }
  }

  return {
    questions: offlineQuiz(input.text, input.count, seed),
    mode: "offline",
    warning:
      "Generated in offline mode from your notes. Add a Gemini API key in .env for AI-written questions.",
  };
}
