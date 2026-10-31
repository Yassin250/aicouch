"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarClock,
  Check,
  Loader2,
  Trash2,
  X,
} from "lucide-react";

import { cn, formatDate } from "@/lib/utils";

type CourseOption = { id: string; code: string; title: string };

export type DeadlineItem = {
  id: string;
  title: string;
  type: string;
  dueDate: string;
  status: string;
  courseCode: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  ASSIGNMENT: "Assignment",
  TEST: "Test",
  EXAM: "Exam",
  OTHER: "Other",
};

function daysUntil(iso: string) {
  const due = new Date(iso);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function countdown(iso: string) {
  const days = daysUntil(iso);

  if (days < 0) {
    return {
      label: days === -1 ? "Overdue" : `${Math.abs(days)}d overdue`,
      tone: "border-rose-soft bg-rose-soft text-rose",
    };
  }
  if (days === 0) {
    return { label: "Due today", tone: "border-rose-soft bg-rose-soft text-rose" };
  }
  if (days === 1) {
    return { label: "Tomorrow", tone: "border-amber-soft bg-amber-soft text-amber" };
  }
  if (days <= 7) {
    return {
      label: `${days} days`,
      tone: "border-amber-soft bg-amber-soft text-amber",
    };
  }
  return {
    label: `${days} days`,
    tone: "border-line bg-surface-muted text-muted",
  };
}

export function DeadlineList({ items }: { items: DeadlineItem[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(items);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => setRows(items), [items]);

  async function update(id: string, action: "toggle" | "delete") {
    setPendingId(id);

    try {
      const response =
        action === "delete"
          ? await fetch(`/api/deadlines/${id}`, { method: "DELETE" })
          : await fetch(`/api/deadlines/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                status:
                  rows.find((row) => row.id === id)?.status === "DONE"
                    ? "OPEN"
                    : "DONE",
              }),
            });

      if (response.ok) {
        router.refresh();
      }
    } catch {
      // leave the row as it was
    } finally {
      setPendingId(null);
    }
  }

  if (!rows.length) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-[12.5px] font-medium text-ink">No deadlines yet</p>
        <p className="mx-auto mt-1 max-w-[220px] text-[11.5px] leading-relaxed text-muted">
          Add an assignment or exam date and it will count down here.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {rows.map((row) => {
        const tone = countdown(row.dueDate);
        const done = row.status === "DONE";

        return (
          <li key={row.id} className="flex items-start gap-2.5 px-4 py-2.5">
            <button
              onClick={() => update(row.id, "toggle")}
              disabled={pendingId === row.id}
              title={done ? "Mark as open" : "Mark as done"}
              className={cn(
                "mt-0.5 flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                done
                  ? "border-emerald bg-emerald text-white"
                  : "border-line-strong bg-surface hover:border-emerald/50",
              )}
            >
              {pendingId === row.id ? (
                <Loader2 size={9} className="animate-spin text-muted" />
              ) : done ? (
                <Check size={10} strokeWidth={3} />
              ) : null}
            </button>

            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "truncate text-[12.5px] font-medium",
                  done ? "text-muted line-through" : "text-ink",
                )}
              >
                {row.title}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted">
                <span>{TYPE_LABEL[row.type] ?? row.type}</span>
                {row.courseCode ? (
                  <span className="font-mono">{row.courseCode}</span>
                ) : null}
                <span>· {formatDate(row.dueDate)}</span>
              </div>
            </div>

            {done ? null : (
              <span className={cn("chip shrink-0", tone.tone)}>{tone.label}</span>
            )}

            <button
              onClick={() => update(row.id, "delete")}
              disabled={pendingId === row.id}
              title="Delete deadline"
              className="mt-0.5 shrink-0 rounded p-0.5 text-muted/60 transition-colors hover:bg-rose-soft hover:text-rose disabled:opacity-40"
            >
              <Trash2 size={11} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function isoDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function DeadlineDialog({
  courses,
  label = "Add deadline",
  variant = "ghost",
}: {
  courses: CourseOption[];
  label?: string;
  variant?: "primary" | "ghost" | "subtle";
}) {
  const router = useRouter();

  const weekAhead = new Date();
  weekAhead.setDate(weekAhead.getDate() + 7);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("ASSIGNMENT");
  const [courseId, setCourseId] = useState("");
  const [dueDate, setDueDate] = useState(isoDate(weekAhead));
  const [notes, setNotes] = useState("");
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
      const response = await fetch("/api/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          type,
          courseId: courseId || null,
          dueDate,
          notes,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "The deadline could not be saved.");
        setBusy(false);
        return;
      }

      setOpen(false);
      setTitle("");
      setNotes("");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
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
        className="animate-rise relative z-10 w-full max-w-[460px] overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Add a deadline</h2>
            <p className="mt-0.5 text-[12px] text-muted">
              Assignments, tests and exams you are working towards.
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

        <div className="space-y-3.5 px-5 py-4">
          <div>
            <label className="label" htmlFor="deadline-title">
              Title
            </label>
            <input
              id="deadline-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Database assignment 2"
              className="field"
              required
              minLength={2}
              disabled={busy}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="deadline-type">
                Type
              </label>
              <select
                id="deadline-type"
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="field"
                disabled={busy}
              >
                <option value="ASSIGNMENT">Assignment</option>
                <option value="TEST">Test</option>
                <option value="EXAM">Exam</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="deadline-date">
                Due date
              </label>
              <input
                id="deadline-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="field"
                required
                disabled={busy}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="deadline-course">
              Course <span className="text-muted">(optional)</span>
            </label>
            <select
              id="deadline-course"
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="field"
              disabled={busy}
            >
              <option value="">Not course specific</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} — {course.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="deadline-notes">
              Notes <span className="text-muted">(optional)</span>
            </label>
            <input
              id="deadline-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What has to be submitted?"
              className="field"
              disabled={busy}
            />
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
          <button type="submit" disabled={busy} className="btn btn-primary">
            {busy ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <CalendarClock size={14} />
                Add deadline
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
        <CalendarClock size={13} />
        {label}
      </button>
      {mounted && dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}
