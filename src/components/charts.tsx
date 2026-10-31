import { cn } from "@/lib/utils";

/** Circular score indicator used on quiz results. */
export function ScoreRing({
  value,
  size = 116,
  caption,
}: {
  value: number;
  size?: number;
  caption?: string;
}) {
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(Math.max(value, 0), 100) / 100);

  const tone =
    value >= 80
      ? { ring: "#067647", text: "text-emerald" }
      : value >= 60
        ? { ring: "#4f46e5", text: "text-brand" }
        : value >= 40
          ? { ring: "#b54708", text: "text-amber" }
          : { ring: "#c01048", text: "text-rose" };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e6e9f2"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone.ring}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn("text-[24px] leading-none font-semibold", tone.text)}
        >
          {Math.round(value)}%
        </span>
        {caption ? (
          <span className="mt-1 text-[10.5px] text-muted">{caption}</span>
        ) : null}
      </div>
    </div>
  );
}

/** Vertical bars for score history. Values are percentages. */
export function ScoreBars({
  data,
}: {
  data: { label: string; value: number; hint?: string }[];
}) {
  if (!data.length) return null;

  return (
    <div>
      <div className="flex h-[136px] items-end gap-1.5">
        {data.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="flex h-full flex-1 flex-col items-center justify-end"
            title={`${item.label} — ${Math.round(item.value)}%${item.hint ? ` (${item.hint})` : ""}`}
          >
            <div
              className={cn(
                "w-full max-w-[34px] rounded-t-[5px] transition-all",
                item.value >= 80
                  ? "bg-emerald/85"
                  : item.value >= 60
                    ? "bg-brand/85"
                    : item.value >= 40
                      ? "bg-amber/80"
                      : "bg-rose/80",
              )}
              style={{ height: `${Math.max(Math.round(item.value), 3)}%` }}
            />
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-1.5 border-t border-line pt-2">
        {data.map((item, index) => (
          <div
            key={`${item.label}-label-${index}`}
            className="flex-1 text-center"
          >
            <div className="text-[10.5px] font-semibold text-ink-soft">
              {Math.round(item.value)}%
            </div>
            <div className="truncate text-[9.5px] text-muted">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Horizontal comparison bars, e.g. average score per course. */
export function CourseBars({
  data,
}: {
  data: { label: string; hint?: string; value: number }[];
}) {
  if (!data.length) {
    return (
      <p className="py-4 text-center text-[12.5px] text-muted">
        No quiz results yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {data.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="truncate text-[12.5px] font-medium text-ink">
              {item.label}
            </span>
            <span className="shrink-0 text-[11.5px] text-muted">
              {Math.round(item.value)}%
              {item.hint ? ` · ${item.hint}` : ""}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className={cn(
                "h-full rounded-full",
                item.value >= 80
                  ? "bg-emerald"
                  : item.value >= 60
                    ? "bg-brand"
                    : item.value >= 40
                      ? "bg-amber"
                      : "bg-rose",
              )}
              style={{ width: `${Math.max(Math.round(item.value), 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
