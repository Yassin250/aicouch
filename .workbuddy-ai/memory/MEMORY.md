# Project: AI-Based Study Coach System (Mount Kigali University)

Final year project. Workspace: `D:\campany\Coach`.
Target users: BBICT and BSc Computer Science students, School of Computing,
Informatics and Media Studies.

## Documentation deliverable (agreed, not started yet)

Word (.docx), **Chapters 1–5 + a short user manual**, written against what
actually exists. Chapter 3 is already written by the student and stays valid.

Planned structure:
1. Introduction — background, problem statement (student's own text), objectives.
2. Literature review — RAG, adaptive learning, LLM tutoring, related systems.
3. Methodology — already written by the student; keep as-is.
4. System analysis and design — requirements, use case, DFD, ERD, architecture,
   UI designs. Must match the real build.
5. Implementation, testing and evaluation — modules, code walkthrough, test
   tables, UAT, honest evaluation of the AI component.
+ User manual — install, demo accounts, how to upload/ask/quiz/plan.

## Facts the documentation must use (verify against the repo, don't invent)

- Stack: Next.js 16 (React 19, App Router), TypeScript, Tailwind v4, Prisma 6,
  PostgreSQL, bcrypt + jose session cookie, Gemini REST API.
- Architecture is a **logical** three-tier (presentation / application / AI
  processing / data) deployed as ONE Next.js app — not the 3 separate services
  sketched in Chapter 3. Explain this as a deliberate deployment simplification.
- **17 tables** in `prisma/schema.prisma`. Deltas to explain in Chapter 4:
  - "Embeddings" (3.11) is folded into `DocumentChunk.embedding` as a JSON
    float array, not a separate table.
  - `Deadline` was **added** for the "upcoming deadlines" requirement.
  - `SystemEvent` was **added** for the administrator's "review technical
    errors" and security-audit needs.
  - `Resource` was **added** for supplementary learning materials (links,
    videos, articles, tools) that lecturers attach to courses.
  Present these as requirements discovered during review, not as
  things that were always planned.

## Administrator module (built after the student checklist)

The admin role existed in the data model from the start but had **no UI at
all** until this was built. Now: `/admin` (usage, AI status, error log),
`/admin/users` (create, role, deactivate, reset password, enrolments, delete),
`/admin/courses` (programmes and courses, lecturer assignment).

Guard rails worth mentioning in the viva: an admin cannot change their own role,
deactivate or delete themselves; accounts that own materials or quizzes cannot
be deleted (deactivate instead); courses with materials/quizzes cannot be
deleted; programmes with courses or users cannot be deleted. Deactivation takes
effect on the next request because `getCurrentUser` rejects inactive accounts.

`User.isActive` + `User.lastLoginAt` + `SystemEvent` are the security and audit
mechanism: logins, failed logins, AI fallbacks, upload failures and every admin
mutation are recorded with level and category.
- 9 modules, all implemented. Screenshots in `screenshots/`, regenerate with
  `node scripts/screenshots.js` (needs dev server running).
- Demo accounts and seeded data documented in `README.md`.

## Lecturer module

The lecturer role existed in the data model but had no dedicated workflow
beyond uploading PDFs. Built now:

- **Multi-format upload**: PDF, DOCX, PPTX, TXT, MD via `jszip`-based text
  extraction for Office Open XML formats.
- **Teaching metadata**: `Document.week`, `topic`, `sessionNumber` — materials
  are sorted by week then session on the materials page.
- **Publish lifecycle**: `DRAFT | PUBLISHED | ARCHIVED`. Students only ever see
  `PUBLISHED`. Lecturers and admins see all states, can edit inline, and change
  state. The material detail page returns 404 for students if the state is not
  `PUBLISHED`.
- **Supplementary resources**: `Resource` table (title, URL, kind, description).
  Lecturers add links/videos/articles/tools to a course; students see them on
  every material detail page for that course.

## Points to write honestly (examiners will probe these)

- Embeddings stored as JSON text + cosine similarity computed in app code.
  pgvector is the documented scaling path, NOT currently used. Say so.
- Offline fallback mode (no API key): extractive answers and rule-based quiz
  generation. Weakness: cloze questions read mechanically vs AI-written ones.
- Quiz marking is MCQ only, server-side, answers never sent to the client.
- No OCR: scanned PDFs are rejected with a message.
- Single-institution scope, no integration with the university SIS.

## Student core-activities checklist (verified against the code)

The student's 25-item checklist is now fully covered, with two items resolved
by explicit decision rather than new code:
- "Add or select courses" → **kept admin-controlled** (matches the stakeholder
  roles in Chapter 3). Documented as "view my courses", not self-enrolment.
- "Organize materials" → **per-course grouping + filter + full-text search** is
  considered sufficient. No tags or folders.

Gaps closed during review: material search (title/description/note text),
dashboard "Today's study tasks" + "Recent quiz results", chat follow-up context
(previous turns are now sent to the model), and the Deadline tracker.

## Still open

- Database is PostgreSQL 17, database `Study-coach` (migrated from SQLite).
- Live Gemini AI is enabled and verified (see daily log for model notes).

## AI configuration that actually works (verified against the key)

- `gemini-2.5-flash` returns 404: "no longer available to new users".
- `gemini-3.8-flash` works but measured **30–90 s per answer** (4 samples).
  `gemini-3.5-flash` returns the same quality in 4–28 s, so it is the default.
- `thinkingConfig.thinkingBudget = 0` is needed for interactive latency;
  reasoning parts come back in `parts[]` with `thought: true` and must be
  filtered or they leak into the answer.
- Embeddings: `gemini-embedding-2`, `outputDimensionality: 768` (default 3072).
- Free tier throws 503 "high demand" regularly — retry twice with backoff
  before falling back to offline mode.
- Latency is genuinely variable (4 s to 100 s for the same prompt). For the
  evaluation chapter, quote a range and a median, not a single figure.
