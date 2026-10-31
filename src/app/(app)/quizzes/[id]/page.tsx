import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Check,
  RotateCcw,
  Sparkles,
  Target,
  X,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCourseForUser } from "@/lib/courses";
import { QuizRunner } from "@/components/quiz-runner";
import { ScoreRing } from "@/components/charts";
import { cn, formatDateTime } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D"];

function bandMessage(percent: number) {
  if (percent >= 80)
    return {
      title: "Strong result",
      body: "You can explain this material confidently. Move on to a harder topic or a new document.",
    };
  if (percent >= 60)
    return {
      title: "Good progress",
      body: "Most of the material has landed. Close the gaps marked below before your next attempt.",
    };
  if (percent >= 40)
    return {
      title: "Partly there",
      body: "Revise the topics marked in red, then retake the quiz while the questions are still familiar.",
    };
  return {
    title: "Needs another pass",
    body: "Re-read the source material and ask the study coach to explain the topics you missed, then retake.",
  };
}

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ retake?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { retake } = await searchParams;

  const quiz = await db.quiz.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, code: true, title: true } },
      questions: { orderBy: { order: "asc" } },
      attempts: {
        where: { studentId: user.id, completedAt: { not: null } },
        orderBy: { completedAt: "desc" },
      },
    },
  });

  if (!quiz) notFound();

  const course = await getCourseForUser(quiz.courseId, user);
  if (!course) notFound();

  const latest = quiz.attempts[0] ?? null;
  const showRunner = retake === "1" || !latest;

  // ---------------------------------------------------------------- runner
  if (showRunner) {
    return (
      <div className="space-y-4">
        <Link
          href="/quizzes"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} />
          Back to quizzes
        </Link>

        <div className="mx-auto max-w-2xl">
          <h1 className="text-[20px] leading-tight font-semibold tracking-tight text-ink">
            {quiz.title}
          </h1>
          <p className="mt-1 mb-4 text-[12.5px] text-muted">
            {quiz.course.code} · {quiz.questions.length} questions ·{" "}
            {quiz.difficulty.charAt(0) + quiz.difficulty.slice(1).toLowerCase()}
          </p>
        </div>

        <QuizRunner
          quizId={quiz.id}
          courseLabel={quiz.course.code}
          questions={quiz.questions.map((question) => ({
            id: question.id,
            prompt: question.prompt,
            options: JSON.parse(question.options) as string[],
            topic: question.topic,
          }))}
        />
      </div>
    );
  }

  // --------------------------------------------------------------- results
  const answers = (() => {
    try {
      const parsed = JSON.parse(latest.answers);
      return Array.isArray(parsed) ? (parsed as number[]) : [];
    } catch {
      return [];
    }
  })();

  const percent = latest.total ? (latest.score / latest.total) * 100 : 0;
  const band = bandMessage(percent);

  const missedTopics = quiz.questions
    .map((question, index) => ({ question, index }))
    .filter((item) => answers[item.index] !== item.question.correctIndex)
    .map((item) => item.question.topic ?? "General");

  const uniqueMissed = [...new Set(missedTopics)];

  return (
    <div className="space-y-5">
      <Link
        href="/quizzes"
        className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} />
        Back to quizzes
      </Link>

      <div className="animate-rise flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-ink">
            {quiz.title}
          </h1>
          <p className="mt-1 text-[12.5px] text-muted">
            {quiz.course.code} · completed {formatDateTime(latest.completedAt!)}
            {quiz.attempts.length > 1
              ? ` · attempt ${quiz.attempts.length}`
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/quizzes/${quiz.id}?retake=1`} className="btn btn-ghost">
            <RotateCcw size={14} />
            Retake
          </Link>
          <Link
            href={`/assistant?course=${quiz.courseId}`}
            className="btn btn-primary"
          >
            <Sparkles size={14} />
            Ask about weak topics
          </Link>
        </div>
      </div>

      {/* Score summary -------------------------------------------------- */}
      <section className="card animate-rise flex flex-wrap items-center gap-6 p-5">
        <ScoreRing
          value={percent}
          caption={`${latest.score} of ${latest.total}`}
        />

        <div className="min-w-[200px] flex-1">
          <h2 className="text-[16px] font-semibold text-ink">{band.title}</h2>
          <p className="mt-1 max-w-md text-[13px] leading-relaxed text-muted">
            {band.body}
          </p>

          {uniqueMissed.length ? (
            <div className="mt-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium tracking-[0.02em] text-muted uppercase">
                <Target size={11} />
                Topics to revisit
              </div>
              <div className="flex flex-wrap gap-1.5">
                {uniqueMissed.map((topic) => (
                  <span
                    key={topic}
                    className="chip border-rose-soft bg-rose-soft text-rose"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-emerald">
              <Check size={13} strokeWidth={3} />
              Every question answered correctly
            </div>
          )}
        </div>
      </section>

      {/* Per-question review -------------------------------------------- */}
      <section className="card animate-rise overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-[14px] font-semibold text-ink">Answer review</h2>
          <p className="mt-0.5 text-[11.5px] text-muted">
            The correct answer is shown for each question, with an explanation.
          </p>
        </div>

        <ul className="divide-y divide-line">
          {quiz.questions.map((question, index) => {
            const options = JSON.parse(question.options) as string[];
            const chosen = answers[index] ?? -1;
            const correct = chosen === question.correctIndex;

            return (
              <li key={question.id} className="px-4 py-4">
                <div className="flex gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold",
                      correct
                        ? "bg-emerald-soft text-emerald"
                        : "bg-rose-soft text-rose",
                    )}
                  >
                    {correct ? (
                      <Check size={13} strokeWidth={3} />
                    ) : (
                      <X size={13} strokeWidth={3} />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-medium text-muted">
                        Question {index + 1}
                      </span>
                      {question.topic ? (
                        <span className="chip border-line bg-surface-muted text-[10px] text-ink-soft">
                          {question.topic}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 text-[13.5px] leading-relaxed font-medium whitespace-pre-line text-ink">
                      {question.prompt}
                    </p>

                    <ul className="mt-2.5 space-y-1.5">
                      {options.map((option, optionIndex) => {
                        const isCorrect = optionIndex === question.correctIndex;
                        const isChosen = optionIndex === chosen;

                        return (
                          <li
                            key={optionIndex}
                            className={cn(
                              "flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-[12.5px]",
                              isCorrect
                                ? "border-emerald/30 bg-emerald-soft text-emerald"
                                : isChosen
                                  ? "border-rose/25 bg-rose-soft text-rose"
                                  : "border-line bg-surface text-ink-soft",
                            )}
                          >
                            <span className="mt-[1px] font-mono text-[10.5px] opacity-70">
                              {LETTERS[optionIndex]}
                            </span>
                            <span className="flex-1">{option}</span>
                            {isCorrect ? (
                              <Check
                                size={12}
                                strokeWidth={3}
                                className="mt-0.5 shrink-0"
                              />
                            ) : isChosen ? (
                              <X size={12} strokeWidth={3} className="mt-0.5 shrink-0" />
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>

                    {question.explanation ? (
                      <div className="mt-2.5 rounded-lg border border-line bg-surface-muted px-3 py-2">
                        <div className="text-[10px] font-semibold tracking-[0.04em] text-muted uppercase">
                          Why
                        </div>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">
                          {question.explanation}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
