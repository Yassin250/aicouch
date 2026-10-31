import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Upload,
} from "lucide-react";

import { BrandLockup } from "@/components/brand";
import { db } from "@/lib/db";

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Student dashboard",
    body: "Your courses, recent material and activity in one place, so you always know what to revise next.",
  },
  {
    icon: MessageSquare,
    title: "AI study assistant",
    body: "Ask about any concept and get an explanation written for your level, grounded in your course notes.",
  },
  {
    icon: Upload,
    title: "Lecture note upload",
    body: "Upload lecture notes as PDFs. The text is extracted, split into sections and indexed for search.",
  },
  {
    icon: FileText,
    title: "AI summarisation",
    body: "Turn a long handout into an overview, key concepts, likely exam points and a revision checklist.",
  },
  {
    icon: ListChecks,
    title: "Quiz generator",
    body: "Generate practice questions from your own material, with marking and explanations.",
  },
  {
    icon: CalendarDays,
    title: "Study planner",
    body: "Break a course into study sessions you can actually keep, and tick them off as you go.",
  },
  {
    icon: TrendingUp,
    title: "Progress tracking",
    body: "See quiz scores and completed activities over time instead of guessing whether you are ready.",
  },
  {
    icon: BookOpen,
    title: "Learning recommendations",
    body: "The system identifies weak topics from your performance and points you back to the right notes.",
  },
  {
    icon: Sparkles,
    title: "Source-cited answers",
    body: "Every explanation links to the document and section it came from, so you can verify it yourself.",
  },
];

const STEPS = [
  {
    title: "Upload your notes",
    body: "Drop in the PDF your lecturer gave you. The system extracts the text and indexes it in seconds.",
  },
  {
    title: "Ask, summarise, practise",
    body: "Ask a question about a concept, generate a summary for revision, or create a quiz from the same material.",
  },
  {
    title: "Track what you know",
    body: "Your activity and scores build a picture of which topics need another pass before the exam.",
  },
];

export default async function LandingPage() {
  // The marketing page must render even when the database is not reachable,
  // for example during a build or before the first `db:push`.
  let programmes: {
    code: string;
    name: string;
    _count: { courses: number };
  }[] = [];
  let courseCount = 0;
  let materialCount = 0;

  try {
    const [programmeRows, courses, materials] = await Promise.all([
      db.programme.findMany({
        select: {
          code: true,
          name: true,
          _count: { select: { courses: true } },
        },
        orderBy: { code: "asc" },
      }),
      db.course.count(),
      db.document.count(),
    ]);

    programmes = programmeRows;
    courseCount = courses;
    materialCount = materials;
  } catch {
    // Fall back to an empty scope section rather than failing the page.
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Nav ------------------------------------------------------------ */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-6 px-5">
          <Link href="/">
            <BrandLockup subtitle="Mount Kigali University" compact />
          </Link>

          <nav className="ml-4 hidden items-center gap-6 text-[13px] font-medium text-ink-soft md:flex">
            <a href="#features" className="transition-colors hover:text-ink">
              Features
            </a>
            <a href="#how" className="transition-colors hover:text-ink">
              How it works
            </a>
            <a href="#scope" className="transition-colors hover:text-ink">
              Programmes
            </a>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
            >
              Sign in
            </Link>
            <Link href="/register" className="btn btn-primary text-[13px]">
              Get started
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero ----------------------------------------------------------- */}
      <section className="relative overflow-hidden">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />
        <div className="pointer-events-none absolute -top-40 left-1/4 h-[460px] w-[460px] rounded-full bg-brand/10 blur-[110px]" />
        <div className="pointer-events-none absolute -top-20 right-0 h-[380px] w-[380px] rounded-full bg-teal/10 blur-[110px]" />

        <div className="relative mx-auto grid max-w-[1120px] items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div className="animate-rise">
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink-soft shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-soft text-brand">
                <GraduationCap size={10} />
              </span>
              Final year project · School of Computing, Informatics and Media
              Studies
            </div>

            <h1 className="mt-5 text-[38px] leading-[1.06] font-semibold tracking-[-0.03em] text-ink sm:text-[46px] lg:text-[50px]">
              Your personal study coach for{" "}
              <span className="relative whitespace-nowrap">
                <span className="relative z-10 text-brand">computing</span>
                <span className="absolute inset-x-0 bottom-1 z-0 h-[9px] rounded bg-brand-soft" />
              </span>
              .
            </h1>

            <p className="mt-4 max-w-[520px] text-[15px] leading-[1.65] text-ink-soft">
              Study Coach explains difficult concepts, summarises your lecture
              notes, and turns them into practice questions — all grounded in
              the material your lecturers actually gave you, not the open
              internet.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/register" className="btn btn-primary px-4 py-2.5">
                Start studying
                <ArrowRight size={15} />
              </Link>
              <Link href="/login" className="btn btn-ghost px-4 py-2.5">
                Sign in to your account
              </Link>
            </div>

            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-muted">
              {[
                "Free to use",
                "Grounded in course material",
                "Works on phone and laptop",
              ].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Check size={12} className="text-emerald" strokeWidth={3} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Product mock ---------------------------------------------- */}
          <div className="animate-rise delay-2 relative">
            <div className="absolute -inset-x-6 -inset-y-4 rounded-[28px] bg-gradient-to-br from-brand-soft/70 via-white to-teal-soft/60 blur-[2px]" />

            <div className="relative rounded-2xl border border-line bg-surface p-3 shadow-[0_20px_50px_-24px_rgba(16,24,40,0.28)]">
              <div className="flex items-center gap-2 border-b border-line px-1.5 pb-2.5">
                <span className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#f0d5d8]" />
                  <span className="h-2 w-2 rounded-full bg-[#f3e3c8]" />
                  <span className="h-2 w-2 rounded-full bg-[#cfe8d8]" />
                </span>
                <span className="ml-1 text-[10.5px] font-medium text-muted">
                  Study Coach · BBICT2103
                </span>
                <span className="chip ml-auto border-emerald-soft bg-emerald-soft text-[9px] text-emerald">
                  <span className="h-1 w-1 rounded-full bg-emerald" />
                  Live
                </span>
              </div>

              <div className="space-y-2.5 px-1 pt-3">
                <div className="flex justify-end">
                  <div className="max-w-[78%] rounded-2xl rounded-tr-sm bg-ink px-3 py-2 text-[11.5px] leading-relaxed text-white">
                    Why does normalisation reduce data redundancy?
                  </div>
                </div>

                <div className="flex gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-[#6d5ef0] text-white">
                    <Sparkles size={11} />
                  </span>
                  <div className="rounded-2xl rounded-tl-sm border border-line bg-surface-muted px-3 py-2.5">
                    <p className="text-[11.5px] leading-[1.6] text-ink-soft">
                      Normalisation splits one large table into related tables so
                      each fact is stored{" "}
                      <span className="font-semibold text-ink">once</span>. If a
                      student&apos;s programme appears in 12 rows, an update means
                      12 chances for inconsistency.
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {[
                        "1NF removes repeating groups",
                        "2NF removes partial dependencies",
                        "3NF removes transitive dependencies",
                      ].map((line) => (
                        <li
                          key={line}
                          className="flex items-start gap-1.5 text-[11px] text-ink-soft"
                        >
                          <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-brand-ring" />
                          {line}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex items-center gap-1">
                      <span className="chip border-line bg-surface text-[9px] text-ink-soft">
                        <FileText size={8} />
                        Week 5 — Normalisation
                      </span>
                      <span className="chip border-line bg-surface text-[9px] text-ink-soft">
                        [1]
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-xl border border-line-strong px-2.5 py-2">
                <span className="flex-1 text-[11px] text-[#98a2b3]">
                  Ask about a concept…
                </span>
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-white">
                  <ArrowRight size={11} />
                </span>
              </div>
            </div>

            {/* Floating cards */}
            <div className="absolute -bottom-5 -left-4 hidden rounded-xl border border-line bg-surface px-3 py-2.5 shadow-[0_10px_28px_-14px_rgba(16,24,40,0.3)] sm:block">
              <div className="text-[9.5px] font-medium tracking-[0.04em] text-muted uppercase">
                Quiz average
              </div>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="text-[17px] font-semibold text-ink">78%</span>
                <span className="text-[9.5px] font-medium text-emerald">
                  +12%
                </span>
              </div>
            </div>

            <div className="absolute -top-4 -right-3 hidden rounded-xl border border-line bg-surface px-3 py-2 shadow-[0_10px_28px_-14px_rgba(16,24,40,0.3)] sm:block">
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-teal-soft text-teal">
                  <FileText size={10} />
                </span>
                <div className="text-[10px] leading-tight">
                  <div className="font-medium text-ink">Notes indexed</div>
                  <div className="text-muted">14 sections</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features ------------------------------------------------------- */}
      <section id="features" className="border-t border-line bg-canvas">
        <div className="mx-auto max-w-[1120px] px-5 py-16">
          <div className="max-w-[600px]">
            <p className="text-[11px] font-semibold tracking-[0.1em] text-brand uppercase">
              System features
            </p>
            <h2 className="mt-2 text-[27px] leading-tight font-semibold tracking-tight text-ink">
              Everything a student needs between lectures
            </h2>
            <p className="mt-2.5 text-[14px] leading-relaxed text-muted">
              Nine integrated features, built around the way computing students
              actually revise — reading notes, testing themselves, and running
              out of time.
            </p>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-[14px] border border-line bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-brand-ring hover:shadow-[0_8px_24px_-16px_rgba(79,70,229,0.5)]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                    <Icon size={15} strokeWidth={1.9} />
                  </span>
                  <h3 className="mt-3 text-[13.5px] font-semibold text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                    {feature.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works --------------------------------------------------- */}
      <section id="how" className="border-t border-line bg-surface">
        <div className="mx-auto max-w-[1120px] px-5 py-16">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.1em] text-brand uppercase">
                How it works
              </p>
              <h2 className="mt-2 text-[27px] leading-tight font-semibold tracking-tight text-ink">
                Three steps from notes to understanding
              </h2>
              <p className="mt-2.5 max-w-[420px] text-[14px] leading-relaxed text-muted">
                The system uses retrieval-augmented generation: your question is
                matched against your own course material, and only the relevant
                sections are passed to the language model.
              </p>
              <Link
                href="/register"
                className="btn btn-primary mt-5 px-4 py-2.5"
              >
                Create your account
                <ArrowRight size={15} />
              </Link>
            </div>

            <ol className="space-y-3">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="flex gap-3.5 rounded-[14px] border border-line bg-canvas p-4"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[11.5px] font-semibold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-[13.5px] font-semibold text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Scope ---------------------------------------------------------- */}
      <section id="scope" className="border-t border-line bg-canvas">
        <div className="mx-auto max-w-[1120px] px-5 py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.1em] text-brand uppercase">
                Scope
              </p>
              <h2 className="mt-2 text-[24px] leading-tight font-semibold tracking-tight text-ink">
                Built for two programmes at MKU
              </h2>
            </div>
            <div className="flex gap-6">
              <div>
                <div className="text-[20px] font-semibold text-ink">
                  {courseCount}
                </div>
                <div className="text-[11px] text-muted">courses</div>
              </div>
              <div>
                <div className="text-[20px] font-semibold text-ink">
                  {materialCount}
                </div>
                <div className="text-[11px] text-muted">materials indexed</div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {programmes.map((programme) => (
              <div
                key={programme.code}
                className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <GraduationCap size={18} />
                </span>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold text-ink">
                    {programme.name}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-muted">
                    {programme._count.courses} courses ·{" "}
                    <span className="font-mono">{programme.code}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer --------------------------------------------------------- */}
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 px-5 py-7">
          <BrandLockup subtitle="Mount Kigali University" compact />
          <p className="text-[11.5px] text-muted">
            AI-Based Study Coach System · Final year project ·{" "}
            {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
