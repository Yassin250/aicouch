"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarPlus, Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";

type CourseOption = { id: string; code: string; title: string };

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function isoDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function PlanDialog({
  courses,
  weakTopics = [],
  defaultCourseId,
  label = "New study plan",
  variant = "primary",
}: {
  courses: CourseOption[];
  weakTopics?: string[];
  defaultCourseId?: string;
  label?: string;
  variant?: "primary" | "ghost" | "subtle";
}) {
  const router = useRouter();

  const today = new Date();
  const fortnight = new Date();
  fortnight.setDate(today.getDate() + 13);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState(defaultCourseId ?? "");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState(isoDate(today));
  const [endDate, setEndDate] = useState(isoDate(fortnight));
  const [sessions, setSessions] = useState("6");
  const [minutes, setMinutes] = useState("60");
  const [useWeakTopics, setUseWeakTopics] = useState(weakTopics.length > 0);
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

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Study plan",
          courseId: courseId || null,
          goal,
          startDate,
          endDate,
          sessions: Number(sessions),
          minutes: Number(minutes),
          topics: useWeakTopics ? weakTopics : [],
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "The plan could not be created.");
        setBusy(false);
        return;
      }

      setOpen(false);
      setTitle("");
      setGoal("");
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
        className="animate-rise relative z-10 w-full max-w-[520px] overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">
              Create a study plan
            </h2>
            <p className="mt-0.5 text-[12px] text-muted">
              Sessions are spread evenly across your date range.
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

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="label" htmlFor="plan-title">
              Plan title
            </label>
            <input
              id="plan-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Database exam revision"
              className="field"
              disabled={busy}
              required
              minLength={3}
            />
          </div>

          <div>
            <label className="label" htmlFor="plan-course">
              Course <span className="text-muted">(optional)</span>
            </label>
            <select
              id="plan-course"
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="field"
              disabled={busy}
            >
              <option value="">General study (no specific course)</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="plan-goal">
              Goal <span className="text-muted">(optional)</span>
            </label>
            <input
              id="plan-goal"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="e.g. Reach 80% on the normalisation quiz"
              className="field"
              disabled={busy}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="plan-start">
                Start date
              </label>
              <input
                id="plan-start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="field"
                disabled={busy}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="plan-end">
                End date
              </label>
              <input
                id="plan-end"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="field"
                disabled={busy}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="plan-sessions">
                Sessions
              </label>
              <select
                id="plan-sessions"
                value={sessions}
                onChange={(event) => setSessions(event.target.value)}
                className="field"
                disabled={busy}
              >
                {[3, 4, 6, 8, 10, 12, 16].map((value) => (
                  <option key={value} value={value}>
                    {value} sessions
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="plan-minutes">
                Length
              </label>
              <select
                id="plan-minutes"
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
                className="field"
                disabled={busy}
              >
                {[30, 45, 60, 90, 120].map((value) => (
                  <option key={value} value={value}>
                    {value} minutes
                  </option>
                ))}
              </select>
            </div>
          </div>

          {weakTopics.length ? (
            <button
              type="button"
              onClick={() => setUseWeakTopics((value) => !value)}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                useWeakTopics
                  ? "border-brand-ring bg-brand-soft"
                  : "border-line bg-surface-muted",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                  useWeakTopics
                    ? "border-brand bg-brand text-white"
                    : "border-line-strong bg-surface",
                )}
              >
                {useWeakTopics ? "✓" : ""}
              </span>
              <span>
                <span className="block text-[12.5px] font-medium text-ink">
                  Focus on my weak topics
                </span>
                <span className="mt-0.5 block text-[11.5px] text-muted">
                  {weakTopics.slice(0, 3).join(", ")}
                  {weakTopics.length > 3 ? ` +${weakTopics.length - 3} more` : ""}
                </span>
              </span>
            </button>
          ) : null}

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
          <button type="submit" disabled={busy} className="btn btn-primary">
            {busy ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Building schedule…
              </>
            ) : (
              <>
                <CalendarPlus size={14} />
                Create plan
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  ) : null;

  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonClass}>
        <CalendarPlus size={15} />
        {label}
      </button>
      {mounted && dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}
