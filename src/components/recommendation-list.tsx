"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type Recommendation = {
  id: string;
  topic: string;
  reason: string;
  priority: number;
  courseId: string | null;
  courseCode: string | null;
};

export function RecommendationList({
  items,
  compact = false,
}: {
  items: Recommendation[];
  compact?: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);

  async function markDone(id: string) {
    setPendingId(id);
    try {
      const response = await fetch(`/api/recommendations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DONE" }),
      });

      if (response.ok) {
        setHidden((current) => [...current, id]);
        router.refresh();
      }
    } catch {
      // leave the item in place
    } finally {
      setPendingId(null);
    }
  }

  const visible = items.filter((item) => !hidden.includes(item.id));

  if (!visible.length) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-[12.5px] font-medium text-ink">Nothing to revise</p>
        <p className="mx-auto mt-1 max-w-xs text-[11.5px] leading-relaxed text-muted">
          Take a quiz and any topic you miss will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {visible.map((item) => (
        <li key={item.id} className="px-4 py-3">
          <div className="flex items-start gap-2.5">
            <span
              className={cn(
                "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                item.priority >= 2 ? "bg-rose" : "bg-amber",
              )}
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[12.5px] font-semibold text-ink">
                  {item.topic}
                </span>
                {item.courseCode ? (
                  <span className="chip border-line bg-surface-muted font-mono text-[9.5px] text-ink-soft">
                    {item.courseCode}
                  </span>
                ) : null}
              </div>

              {compact ? null : (
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
                  {item.reason}
                </p>
              )}

              <div className="mt-1.5 flex items-center gap-1.5">
                <button
                  onClick={() => markDone(item.id)}
                  disabled={pendingId === item.id}
                  className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-1.5 py-1 text-[10.5px] font-medium text-ink-soft transition-colors hover:border-emerald/40 hover:bg-emerald-soft hover:text-emerald"
                >
                  {pendingId === item.id ? (
                    <Loader2 size={9} className="animate-spin" />
                  ) : (
                    <Check size={9} strokeWidth={3} />
                  )}
                  Mark revised
                </button>

                {item.courseId ? (
                  <Link
                    href={`/assistant?course=${item.courseId}`}
                    className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-1.5 py-1 text-[10.5px] font-medium text-ink-soft transition-colors hover:border-brand-ring hover:bg-brand-soft hover:text-brand-dark"
                  >
                    <Sparkles size={9} />
                    Ask coach
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
