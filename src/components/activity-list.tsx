"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Loader2, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

type Activity = {
  id: string;
  title: string;
  scheduledFor: string;
  durationMinutes: number;
  status: string;
  courseCode?: string | null;
};

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(date: Date) {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function ActivityList({ activities }: { activities: Activity[] }) {
  const router = useRouter();
  const [items, setItems] = useState(activities);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => setItems(activities), [activities]);

  async function toggle(activity: Activity) {
    const nextStatus = activity.status === "DONE" ? "PENDING" : "DONE";

    setPendingId(activity.id);
    setItems((current) =>
      current.map((item) =>
        item.id === activity.id ? { ...item, status: nextStatus } : item,
      ),
    );

    try {
      const response = await fetch(`/api/activities/${activity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        setItems(activities);
      } else {
        router.refresh();
      }
    } catch {
      setItems(activities);
    } finally {
      setPendingId(null);
    }
  }

  const sorted = [...items].sort(
    (a, b) =>
      new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime(),
  );

  const groups: { key: string; date: Date; items: Activity[] }[] = [];
  for (const activity of sorted) {
    const date = new Date(activity.scheduledFor);
    const key = dayKey(date);
    const existing = groups.find((group) => group.key === key);
    if (existing) existing.items.push(activity);
    else groups.push({ key, date, items: [activity] });
  }

  const today = startOfDay(new Date());

  return (
    <ul className="space-y-3">
      {groups.map((group) => (
        <li key={group.key}>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-[11px] font-semibold tracking-[0.04em] text-muted uppercase">
              {dayLabel(group.date)}
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <ul className="space-y-1">
            {group.items.map((activity) => {
              const done = activity.status === "DONE";
              const overdue =
                !done && startOfDay(new Date(activity.scheduledFor)) < today;

              return (
                <li key={activity.id}>
                  <button
                    onClick={() => toggle(activity)}
                    disabled={pendingId === activity.id}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
                      done
                        ? "border-emerald-soft bg-emerald-soft/50"
                        : "border-line bg-surface hover:bg-surface-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors",
                        done
                          ? "border-emerald bg-emerald text-white"
                          : "border-line-strong bg-surface",
                      )}
                    >
                      {pendingId === activity.id ? (
                        <Loader2 size={10} className="animate-spin text-muted" />
                      ) : done ? (
                        <Check size={11} strokeWidth={3} />
                      ) : null}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-[12.5px] leading-snug font-medium",
                          done ? "text-muted line-through" : "text-ink",
                        )}
                      >
                        {activity.title}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={9} />
                          {activity.durationMinutes} min
                        </span>
                        {activity.courseCode ? (
                          <span className="font-mono">{activity.courseCode}</span>
                        ) : null}
                        {overdue ? (
                          <span className="chip border-amber-soft bg-amber-soft text-[9px] text-amber">
                            Overdue
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

export function DeletePlanButton({ planId }: { planId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      const response = await fetch(`/api/plans/${planId}`, { method: "DELETE" });
      if (response.ok) {
        router.refresh();
        return;
      }
    } catch {
      // fall through
    }
    setBusy(false);
    setConfirming(false);
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={remove}
          disabled={busy}
          className="btn bg-rose px-2 py-1 text-[11px] text-white hover:bg-[#a00d3c]"
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : null}
          Delete
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="btn btn-ghost px-2 py-1 text-[11px]"
          disabled={busy}
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-md p-1.5 text-muted transition-colors hover:bg-rose-soft hover:text-rose"
      title="Delete plan"
    >
      <Trash2 size={13} />
    </button>
  );
}
