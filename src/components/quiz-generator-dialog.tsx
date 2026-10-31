"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertCircle, ListChecks, Loader2, Sparkles, X } from "lucide-react";

import { cn } from "@/lib/utils";

type CourseOption = { id: string; code: string; title: string };
type DocumentOption = { id: string; courseId: string; title: string };

export function QuizGeneratorDialog({
  courses,
  documents,
  defaultCourseId,
  defaultDocumentId,
  autoOpen = false,
  label = "Generate quiz",
  variant = "primary",
  fullWidth = false,
}: {
  courses: CourseOption[];
  documents: DocumentOption[];
  defaultCourseId?: string;
  defaultDocumentId?: string;
  autoOpen?: boolean;
  label?: string;
  variant?: "primary" | "ghost" | "subtle";
  fullWidth?: boolean;
}) {
  const router = useRouter();

  // Default to the course that actually has material, so the dialog never opens
  // on a course that cannot produce a quiz.
  const initialCourse =
    defaultCourseId ??
    documents.find((document) => document.id === defaultDocumentId)?.courseId ??
    documents[0]?.courseId ??
    courses[0]?.id ??
    "";

  const [open, setOpen] = useState(autoOpen);
  const [mounted, setMounted] = useState(false);
  const [courseId, setCourseId] = useState(initialCourse);
  const [documentId, setDocumentId] = useState(defaultDocumentId ?? "");
  const [count, setCount] = useState("5");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // A document belongs to one course, so changing the course clears it.
  useEffect(() => {
    if (documentId && !documents.some((d) => d.id === documentId && d.courseId === courseId)) {
      setDocumentId("");
    }
  }, [courseId, documentId, documents]);

  const courseDocuments = documents.filter(
    (document) => document.courseId === courseId,
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          documentId: documentId || null,
          count: Number(count),
          difficulty,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "The quiz could not be generated.");
        setBusy(false);
        return;
      }

      setOpen(false);
      router.push(`/quizzes/${data.quiz.id}`);
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection.");
      setBusy(false);
    }
  }

  const buttonClass =
    variant === "primary"
      ? "btn btn-primary"
      : variant === "subtle"
        ? "btn btn-subtle"
        : "btn btn-ghost";

  const dialog = open ? (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="animate-fade absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={() => (busy ? null : setOpen(false))}
      />

      <form
        onSubmit={submit}
        className="animate-rise relative z-10 w-full max-w-[500px] overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">
              Generate a practice quiz
            </h2>
            <p className="mt-0.5 text-[12px] text-muted">
              Questions are built from your indexed lecture notes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={busy}
            className="rounded-md p-1.5 text-muted hover:bg-surface-muted disabled:opacity-40"
          >
            <X size={17} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="label" htmlFor="quiz-course">
              Course
            </label>
            <select
              id="quiz-course"
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="field"
              disabled={busy}
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="quiz-document">
              Source material
            </label>
            <select
              id="quiz-document"
              value={documentId}
              onChange={(event) => setDocumentId(event.target.value)}
              className="field"
              disabled={busy || courseDocuments.length === 0}
            >
              <option value="">
                {courseDocuments.length
                  ? "All materials in this course"
                  : "No material in this course yet"}
              </option>
              {courseDocuments.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.title}
                </option>
              ))}
            </select>
            {courseDocuments.length === 0 ? (
              <p className="mt-1.5 text-[11.5px] text-amber">
                Upload lecture notes for this course before generating a quiz.
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="quiz-count">
                Questions
              </label>
              <select
                id="quiz-count"
                value={count}
                onChange={(event) => setCount(event.target.value)}
                className="field"
                disabled={busy}
              >
                {[3, 5, 8, 10].map((value) => (
                  <option key={value} value={value}>
                    {value} questions
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="quiz-difficulty">
                Difficulty
              </label>
              <select
                id="quiz-difficulty"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
                className="field"
                disabled={busy}
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-rose-soft bg-rose-soft px-3.5 py-2.5 text-[12.5px] text-rose">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-muted px-5 py-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={busy}
            className="btn btn-ghost"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !courseId}
            className="btn btn-primary"
          >
            {busy ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Writing questions…
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Generate quiz
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(buttonClass, fullWidth && "w-full")}
      >
        <ListChecks size={15} />
        {label}
      </button>
      {mounted && dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}
