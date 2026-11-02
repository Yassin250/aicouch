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
    title: "Study material upload",
    body: "Upload PDF, Word (.docx), PowerPoint (.pptx), text, and images of handwritten notes. The text is extracted, organized and indexed.",
  },
  {
    icon: FileText,
    title: "AI notes improvement & summary",
    body: "Rewrite unclear notes, correct grammar, organize headings and generate quick revision checklists.",
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
    title: "Upload your learning materials",
    body: "Upload PDF, Word documents, PowerPoint slides, text files or photos of handwritten notes. Text is extracted in seconds.",
  },
  {
    title: "Improve, ask & summarise",
    body: "Let the AI clean up messy notes, ask questions about challenging concepts, or generate structured study summaries.",
  },
  {
    title: "Practise quizzes & track progress",
    body: "Generate practice quizzes with detailed explanations, identify weak areas, and follow personal revision plans.",
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
      <section className="relative overflow-hidden bg-gradient-to-b from-[#eaf5ec] via-[#f2f9f3] to-canvas">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />
        <div className="pointer-events-none absolute -top-48 left-1/4 h-[520px] w-[520px] rounded-full bg-sage/25 blur-[120px]" />
        <div className="pointer-events-none absolute -top-24 right-0 h-[420px] w-[420px] rounded-full bg-mint/60 blur-[110px]" />

        <div className="relative mx-auto grid max-w-[1120px] items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div className="animate-rise">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-ring/60 bg-surface/80 px-3 py-1 text-[11.5px] font-medium text-brand-dark shadow-[0_1px_2px_rgba(5,31,32,0.05)] backdrop-blur">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand text-white">
                <GraduationCap size={10} />
              </span>
              Final year project · School of Computing, Informatics and Media
              Studies
            </div>

            <h1 className="mt-6 text-[40px] leading-[1.03] font-semibold tracking-[-0.038em] text-balance text-ink sm:text-[48px] lg:text-[54px]">
              Your personal study coach for{" "}
              <span className="relative whitespace-nowrap">
                <span className="relative z-10 text-brand">computing</span>
                <span className="absolute inset-x-0 bottom-1.5 z-0 h-[10px] rounded-sm bg-mint" />
              </span>
              .
            </h1>

            <p className="mt-5 max-w-[520px] text-[15.5px] leading-[1.7] text-pretty text-ink-soft">
              Study Coach explains difficult concepts, improves and summarises
              your study notes, and generates practice quizzes — all strictly
              grounded in the learning materials you upload yourself.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="btn btn-primary px-5 py-3 text-[14px]"
              >
                Start studying
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/login"
                className="btn btn-ghost px-5 py-3 text-[14px]"
              >
                Sign in to your account
              </Link>
            </div>

            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-muted">
              {[
                "Free to use",
                "Grounded in your own material",
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

            <div className="relative rounded-2xl border border-line bg-surface p-3 shadow-[0_20px_50px_-24px_rgba(5,31,32,0.28)]">
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
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#2E6B57] to-brand-deep text-white">
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
                <span className="flex-1 text-[11px] text-[#93a89c]">
                  Ask about a concept…
                </span>
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-white">
                  <ArrowRight size={11} />
                </span>
              </div>
            </div>

            {/* Floating cards */}
            <div className="absolute -bottom-5 -left-4 hidden rounded-xl border border-line bg-surface px-3 py-2.5 shadow-[0_10px_28px_-14px_rgba(5,31,32,0.3)] sm:block">
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

            <div className="absolute -top-4 -right-3 hidden rounded-xl border border-line bg-surface px-3 py-2 shadow-[0_10px_28px_-14px_rgba(5,31,32,0.3)] sm:block">
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
        <div className="mx-auto max-w-[1120px] px-5 py-16 lg:py-20">
          <div className="max-w-[620px]">
            <p className="eyebrow text-brand">System features</p>
            <h2 className="mt-2.5 text-[30px] leading-[1.15] font-semibold tracking-[-0.03em] text-balance text-ink">
              Everything a student needs to master their courses
            </h2>
            <p className="mt-3 text-[14.5px] leading-[1.7] text-pretty text-muted">
              Built around how students actually study and revise — uploading
              notes, improving clarity, generating quizzes, and tracking weak
              topics.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-[14px] border border-line bg-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-ring hover:shadow-[0_10px_28px_-18px_rgba(35,83,71,0.55)]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-soft text-brand transition-colors duration-200 group-hover:bg-brand group-hover:text-white">
                    <Icon size={16} strokeWidth={1.9} />
                  </span>
                  <h3 className="mt-3.5 text-[13.5px] font-semibold tracking-[-0.01em] text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-[12.5px] leading-[1.65] text-muted">
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
              <p className="eyebrow text-brand">How it works</p>
              <h2 className="mt-2.5 text-[30px] leading-[1.15] font-semibold tracking-[-0.03em] text-balance text-ink">
                Three steps from notes to understanding
              </h2>
              <p className="mt-3 max-w-[420px] text-[14.5px] leading-[1.7] text-pretty text-muted">
                The system uses retrieval-augmented generation: your question is
                matched against your own course material, and only the relevant
                sections are passed to the language model.
              </p>
              <Link
                href="/register"
                className="btn btn-primary mt-6 px-5 py-2.5"
              >
                Create your account
                <ArrowRight size={15} />
              </Link>

              <div className="mt-8 rounded-[14px] border border-brand-ring/50 bg-brand-soft/60 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-white">
                    <Sparkles size={12} />
                  </span>
                  <span className="text-[12.5px] font-semibold text-brand-dark">
                    Why grounding matters
                  </span>
                </div>
                <p className="mt-2 text-[12.5px] leading-[1.65] text-brand-dark/80">
                  A general chatbot can invent facts. Because every answer is
                  retrieved from <em>your</em> uploaded notes first, you can
                  always check the cited section and see where it came from.
                </p>
              </div>
            </div>

            <ol className="space-y-3">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="group flex gap-4 rounded-[14px] border border-line bg-surface p-4 transition-colors hover:border-brand-ring"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[12px] font-semibold text-brand-dark ring-1 ring-brand-ring/60 transition-colors group-hover:bg-brand group-hover:text-white group-hover:ring-brand">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-[14px] font-semibold text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-[13px] leading-[1.65] text-muted">
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
              <p className="eyebrow text-brand">Scope</p>
              <h2 className="mt-2.5 text-[26px] leading-tight font-semibold tracking-[-0.03em] text-ink">
                Built for two programmes at MKU
              </h2>
            </div>
            <div className="flex gap-8">
              <div>
                <div className="text-[22px] leading-none font-semibold tracking-tight text-ink">
                  {courseCount}
                </div>
                <div className="mt-1 text-[11px] text-muted">courses</div>
              </div>
              <div>
                <div className="text-[22px] leading-none font-semibold tracking-tight text-ink">
                  {materialCount}
                </div>
                <div className="mt-1 text-[11px] text-muted">
                  materials indexed
                </div>
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
