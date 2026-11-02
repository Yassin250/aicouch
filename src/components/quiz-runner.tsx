"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Send,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Question = {
  id: string;
  prompt: string;
  options: string[];
  topic: string | null;
};

const LETTERS = ["A", "B", "C", "D"];

export function QuizRunner({
  quizId,
  questions,
  courseLabel,
}: {
  quizId: string;
  questions: Question[];
  courseLabel: string;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(
    () => questions.map(() => -1),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = questions[index];
  const answered = answers.filter((value) => value >= 0).length;
  const isLast = index === questions.length - 1;

  function choose(optionIndex: number) {
    setAnswers((current) =>
      current.map((value, i) => (i === index ? optionIndex : value)),
    );
  }

  function next() {
    if (!isLast) setIndex((value) => value + 1);
  }

  function previous() {
    if (index > 0) setIndex((value) => value - 1);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (busy) return;
      const numeric = Number(event.key);
      if (numeric >= 1 && numeric <= 4) {
        choose(numeric - 1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (isLast) void submit();
        else next();
      } else if (event.key === "ArrowLeft") {
        previous();
      } else if (event.key === "ArrowRight") {
        next();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, isLast, busy, answers]);

  async function submit() {
    if (busy) return;

    if (answered < questions.length) {
      setError(
        `Answer all ${questions.length} questions before submitting. You have ${questions.length - answered} left.`,
      );
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/quizzes/${quizId}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Your answers could not be submitted.");
        setBusy(false);
        return;
      }

      router.replace(`/quizzes/${quizId}`);
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress ------------------------------------------------------ */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-medium text-ink">
            Question {index + 1} of {questions.length}
          </span>
          <span className="text-[11.5px] text-muted">· {courseLabel}</span>
        </div>
        <span className="text-[11.5px] text-muted">
          {answered} answered
        </span>
      </div>

      <div className="mb-4 flex gap-1">
        {questions.map((question, i) => (
          <button
            key={question.id}
            onClick={() => setIndex(i)}
            aria-label={`Go to question ${i + 1}`}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i === index
                ? "bg-brand"
                : answers[i] >= 0
                  ? "bg-brand-ring"
                  : "bg-line",
            )}
          />
        ))}
      </div>

      {/* Question ------------------------------------------------------ */}
      <div className="card animate-rise overflow-hidden">
        <div className="border-b border-line px-5 py-3">
          {current.topic ? (
            <span className="chip border-brand-ring bg-brand-soft text-[10.5px] text-brand-dark">
              {current.topic}
            </span>
          ) : (
            <span className="chip border-line bg-surface-muted text-[10.5px] text-muted">
              Question {index + 1}
            </span>
          )}
        </div>

        <div className="px-5 py-5">
          <p className="text-[15px] leading-[1.6] font-medium whitespace-pre-line text-ink">
            {current.prompt}
          </p>

          <div className="mt-5 space-y-2">
            {current.options.map((option, optionIndex) => {
              const selected = answers[index] === optionIndex;

              return (
                <button
                  key={optionIndex}
                  onClick={() => choose(optionIndex)}
                  data-testid={`option-${optionIndex}`}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-all",
                    selected
                      ? "border-brand bg-brand-soft shadow-[0_0_0_1px_rgba(35,83,71,0.35)]"
                      : "border-line bg-surface hover:border-line-strong hover:bg-surface-muted",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold transition-colors",
                      selected
                        ? "border-brand bg-brand text-white"
                        : "border-line-strong bg-surface text-muted",
                    )}
                  >
                    {selected ? <Check size={12} strokeWidth={3} /> : LETTERS[optionIndex]}
                  </span>
                  <span className="text-[13.5px] leading-relaxed text-ink-soft">
                    {option}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line bg-surface-muted px-5 py-3">
          <button
            onClick={previous}
            disabled={index === 0 || busy}
            className="btn btn-ghost"
          >
            <ArrowLeft size={14} />
            Previous
          </button>

          {isLast ? (
            <button
              onClick={submit}
              disabled={busy}
              data-testid="quiz-submit"
              className="btn btn-primary"
            >
              {busy ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Marking…
                </>
              ) : (
                <>
                  <Send size={14} />
                  Submit answers
                </>
              )}
            </button>
          ) : (
            <button
              onClick={next}
              disabled={busy}
              data-testid="quiz-next"
              className="btn btn-primary"
            >
              Next
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-soft bg-rose-soft px-3.5 py-2.5 text-[12.5px] text-rose">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {error}
        </div>
      ) : null}

      <p className="mt-3 text-center text-[11px] text-muted">
        Tip: press 1–4 to answer, Enter for the next question.
      </p>
    </div>
  );
}
