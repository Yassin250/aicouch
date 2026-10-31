# AI-Based Study Coach System

An AI-powered academic learning assistant for students of the **School of Computing, Informatics and Media Studies** at **Mount Kigali University** — built for the Bachelor of Business Information and Communication Technology (BBICT) and Bachelor of Science in Computer Science programmes.

Students upload their lecture notes, ask questions about difficult concepts, and generate revision summaries. Every AI answer is grounded in the student's own course material and cites the document it came from.

---

## Status

| Module | Status |
| --- | --- |
| Registration, login, role-based access (student / lecturer / admin) | Done |
| Student dashboard with courses, materials, progress and next sessions | Done |
| Lecture material upload (PDF / TXT / Markdown) with text extraction and indexing | Done |
| Retrieval-augmented AI study assistant with source citations | Done |
| AI lecture-note summarisation | Done |
| AI quiz generator with marking, explanations and per-question review | Done |
| Study planner with auto-scheduled sessions and completion tracking | Done |
| Progress tracking: score history, per-course performance, topic mastery | Done |
| Learning recommendations generated from quiz mistakes | Done |
| Administrator: account management, roles, deactivation, password resets, enrolments | Done |
| Administrator: programme and course management with lecturer assignment | Done |
| Administrator: usage monitoring, AI service status, audit and error log | Done |

---

## Technology

| Layer | Technology |
| --- | --- |
| Presentation | React 19, Next.js App Router, Tailwind CSS v4 |
| Application | Next.js server components and route handlers, Zod validation |
| AI processing | Google Gemini (`generateContent`, `batchEmbedContents`) with an offline fallback |
| Data | Prisma ORM over PostgreSQL 17 (database `Study-coach`) |
| Auth | bcrypt password hashing, signed HTTP-only session cookie (`jose`) |

The system is a logical three-tier architecture (presentation, application, AI processing, data) deployed as a single Next.js application so it can be run and demonstrated without managing multiple servers.

---

## Quick start

### 1. Create the database

In **pgAdmin 4**:

1. Right-click **Databases** under the PostgreSQL 17 server → **Query Tool**.
2. Paste and run the contents of [`prisma/sql/create-database.sql`](prisma/sql/create-database.sql), or simply:

```sql
CREATE DATABASE "Study-coach"
    WITH OWNER = postgres ENCODING = 'UTF8' TEMPLATE = template0;
```

> The double quotes are required. Without them PostgreSQL parses the hyphen as
> a minus sign and the statement fails.

### 2. Configure and run

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file and put your postgres password in it
cp .env.example .env

# 3. Create the tables and load demo data
npm run db:push
npm run db:seed

# 4. Start the development server
npm run dev
```

Open <http://localhost:3000>. `npm run db:studio` opens a browser view of the
tables if you want to show the database during the defence.

### Enabling live AI

The system runs **without any API key** in offline demo mode: the assistant still answers, but by quoting the most relevant passages from your uploaded material instead of generating new explanations.

To switch on full AI:

1. Get a free key at <https://aistudio.google.com/apikey>.
2. Put it in `.env` as `GEMINI_API_KEY="..."`.
3. Restart `npm run dev`.

With a key present, uploaded documents are also embedded, so retrieval switches from keyword scoring to vector similarity.

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Student (BBICT, Year 2) | `student@mku.ac.rw` | `Student@123` |
| Student (Computer Science, Year 2) | `jean@mku.ac.rw` | `Student@123` |
| Lecturer | `lecturer@mku.ac.rw` | `Lecturer@123` |
| Administrator | `admin@mku.ac.rw` | `Admin@123` |

The seed loads 2 programmes, 10 courses, 4 sets of lecture notes, 3 quizzes, a study plan with past and upcoming sessions, and a short quiz history — so the dashboard, planner and progress charts have real data on first login.

---

## How the AI works

The assistant uses **Retrieval-Augmented Generation (RAG)**:

1. A lecturer or student uploads a PDF.
2. The server extracts the text (`unpdf`) and normalises it.
3. The text is split into ~900-character overlapping chunks.
4. Each chunk is embedded with Gemini and stored in PostgreSQL as a JSON array
   of floats. Similarity is computed in the application layer; moving to the
   `pgvector` extension is the documented scaling path.
5. A student asks a question. Only chunks from courses they are enrolled in are considered.
6. The most relevant chunks are selected by cosine similarity — or by lexical scoring when no key is configured.
7. The retrieved passages are passed to the model as context, with instructions to cite them as `[1]`, `[2]`.
8. The answer is returned with a list of source documents the student can open.

If no relevant material is found, the assistant says so rather than inventing an answer.

### How quizzes and recommendations work

1. A student chooses a course or a specific document and asks for 3–10 questions.
2. With an API key, Gemini writes the questions as JSON and the response is validated before it is stored. Without a key, the offline generator builds questions directly from the notes: first "what does X mean?" questions from sentences of the form *"X is a …"*, then fill-in-the-blank questions from key statements.
3. The quiz is stored with four options, the correct index, an explanation and a topic per question. Correct answers are never sent to the browser before submission.
4. On submission the answers are marked on the server. Every topic the student missed becomes a **recommendation**; a topic answered correctly closes any open recommendation for that topic.
5. The planner can then build a schedule around those weak topics, and the progress page charts score history and topic mastery from the same records.

---

## Project structure

```
prisma/
  schema.prisma          Database schema — 16 tables covering the design
                         entities (Embeddings folded into DocumentChunk;
                         Deadline and SystemEvent added during development)
  seed.ts                Programmes, courses, demo users and sample notes
src/
  app/
    page.tsx             Public landing page
    login/, register/    Authentication screens
    (app)/               Authenticated area (sidebar shell)
      dashboard/         Student dashboard
      materials/         Material list, upload, detail and summary
      assistant/         AI chat interface and conversation history
      quizzes/           Quiz library, quiz runner, results and review
      planner/           Study plans and session tracking
      progress/          Score history, topic mastery, recommendations
      admin/             Administrator area: overview, users, programmes & courses
    api/
      auth/              register, login, logout
      materials/         upload, delete, download, summarise
      chat/              ask a question, rename or delete a conversation
      quizzes/           generate a quiz, submit an attempt, delete a quiz
      plans/             create and delete study plans
      activities/        mark a study session complete
      recommendations/   mark a recommendation as revised
      deadlines/         create, complete and delete deadlines
      admin/             users, programmes and courses (administrator only)
  components/            UI components (shell, chat, quiz runner, dialogs, charts)
  lib/
    auth.ts              Session user, role guards, password hashing
    courses.ts           Course access control for every role
    pdf.ts               Text extraction from PDF and plain text
    ai/
      gemini.ts          Gemini REST client and embeddings
      retrieval.ts       Chunking, scoring and context building
      prompts.ts         Tutor, summary and quiz prompt templates
      quiz.ts            Quiz generation with JSON validation and offline fallback
      study-coach.ts     High-level AI operations with offline fallback
```

---

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check without emitting |
| `npm run db:push` | Apply the Prisma schema to the database |
| `npm run db:seed` | Reload demo data (clears existing rows) |
| `npm run db:reset` | Recreate the database from scratch and seed |
| `npm run db:embed` | Generate embeddings for documents indexed before an API key existed |
| `npm run db:studio` | Browse the database in Prisma Studio |

---

## Troubleshooting

**"Another next dev server is already running"**

You already have a dev server for this folder. Next.js only allows one per
project, so the second `npm run dev` refuses to start. Either use the server
that is already running, or stop it first:

```bash
netstat -ano | findstr :3000     # find the PID in the last column
taskkill /PID <pid> /F           # stop it
npm run dev
```

**"Port 3000 is in use … using available port 3001 instead"**

Something else (often a leftover server) owns port 3000. The app still works on
3001 — check the URL printed in the terminal. If you want 3000 back, free it as
shown above.

**`prisma generate` fails with `EPERM`**

The dev server is holding the query engine DLL. Stop it, run
`npx prisma generate`, then start it again.

**AI answers stop working and a yellow warning appears**

The app fell back to offline mode: either no `GEMINI_API_KEY` is set, or the
model returned a rate-limit / high-demand error that survived the retries.
Answers still work — they quote your notes instead of generating new text.

---

## Notes and limitations

- **Scanned PDFs** contain no extractable text layer. The upload is rejected with an explanation; the file must be OCR'd first.
- **Uploads** are stored in `storage/uploads/` and capped at 15 MB.
- **Offline mode** is a deliberate design decision, not a degraded state: the system stays demonstrable in a lab without internet access or an API key.
- **Academic integrity**: the assistant is instructed to explain concepts and never to produce work intended for submission.
