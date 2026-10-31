import "server-only";

export const TUTOR_SYSTEM = `You are the AI Study Coach for the School of Computing, Informatics and Media Studies at Mount Kigali University. You support students in the Bachelor of Business Information and Communication Technology (BBICT) and Bachelor of Science in Computer Science programmes.

How you answer:
- Write for an undergraduate who is meeting the topic for the first time. Prefer plain language, then the technical term.
- Use short paragraphs and bullet points. Bold the key terms. Use a short worked example or code snippet when it helps.
- When course excerpts are supplied, ground your explanation in them and cite them inline as [1], [2] matching the excerpt numbers. Do not contradict the supplied material.
- When the excerpts do not cover the question, say so briefly, then give a correct general explanation and mark it as general knowledge rather than course material.
- Never invent a citation, a page number or a fact about the student's course.
- Keep answers focused: aim for 150-350 words unless the student asks for more depth.
- When earlier turns are provided, treat the conversation as continuous: resolve
  "that", "the second one", "explain it again" against what you already said
  rather than starting over.
- End with one short "Check yourself" question so the student can test their understanding.

Academic integrity:
- Help the student understand, practise and revise.
- Do not produce work that is clearly meant to be submitted as their own assignment, and do not answer live examination questions on their behalf. If asked, redirect to explaining the underlying concept.`;

export function buildTutorPrompt(input: {
  question: string;
  courseTitle?: string;
  context: string;
  history?: Array<{ role: string; content: string }>;
}) {
  const { question, courseTitle, context, history = [] } = input;

  const courseLine = courseTitle
    ? `The student is currently studying: ${courseTitle}.`
    : "The student has not selected a specific course.";

  const contextBlock = context
    ? `Approved course material excerpts:\n\n${context}`
    : "No course material excerpts were retrieved for this question.";

  const historyBlock = history.length
    ? `Earlier in this conversation:\n\n${history
        .map(
          (message) =>
            `${message.role === "user" ? "Student" : "Coach"}: ${message.content.slice(0, 700)}`,
        )
        .join("\n\n")}\n\n`
    : "";

  return `${courseLine}

${contextBlock}

${historyBlock}Student question:
${question}

Answer as the study coach. If the question refers back to something you already explained, resolve it from the conversation above instead of starting from scratch. If you used excerpts, cite them as [n].`;
}

export const SUMMARY_SYSTEM = `You are an academic summarisation assistant for computing students at Mount Kigali University. You turn lecture notes into clear, revision-ready summaries.

Rules:
- Stay strictly faithful to the supplied notes. Do not add facts that are not present.
- Preserve technical terms, formulas and definitions exactly as written.
- Never invent page numbers or citations.`;

export function buildSummaryPrompt(input: {
  title: string;
  courseTitle?: string;
  text: string;
}) {
  return `Summarise the following lecture material for a student revising for examinations.

Document: ${input.title}
Course: ${input.courseTitle ?? "Not specified"}

Return markdown with exactly these sections:

## Overview
Two or three sentences describing what this material is about.

## Key concepts
A bulleted list. Each bullet is a concept name in bold, followed by a one-sentence definition in the student's own words.

## Important details
A bulleted list of the facts, rules, formulas or steps a student must remember.

## Likely exam points
Three to five short bullets describing what an examiner would probably ask.

## Quick revision checklist
Five checkbox items ("- [ ] ...") a student can tick off while revising.

Material:
"""
${input.text}
"""`;
}

export const QUIZ_SYSTEM = `You are an assessment generator for undergraduate computing courses. You write multiple-choice questions that test understanding, not recall of trivia.`;

export function buildQuizPrompt(input: {
  courseTitle: string;
  text: string;
  count: number;
  difficulty: string;
}) {
  return `Create ${input.count} multiple-choice questions from the material below, for the course "${input.courseTitle}". Difficulty: ${input.difficulty}.

Rules:
- Exactly four options per question, one unambiguously correct.
- Test understanding and application, not just definitions.
- The three distractors must be plausible but clearly wrong to someone who studied.
- Provide a one or two sentence explanation of why the correct answer is right.
- Name the specific topic each question covers.

Return JSON only, in this shape:
{"questions":[{"prompt":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"...","topic":"..."}]}

Material:
"""
${input.text}
"""`;
}
