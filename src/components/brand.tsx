import { cn } from "@/lib/utils";

export function BrandMark({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-gradient-to-br from-[#235347] via-[#163832] to-[#0B2B26] text-white shadow-[0_3px_12px_-2px_rgba(11,43,38,0.45)] ring-1 ring-inset ring-[#8EB69B]/30",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.58}
        height={size * 0.58}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 15.5v-10Z" />
        <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h4.5a1.5 1.5 0 0 0 1.5-1.5v-10Z" />
        <path d="M17.5 1.8 18.2 3l1.2.7-1.2.7-.7 1.2-.7-1.2L15.6 3.7l1.2-.7.7-1.2Z" />
      </svg>
    </span>
  );
}

export function BrandLockup({
  subtitle = "Mount Kigali University",
  compact = false,
}: {
  subtitle?: string | null;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <BrandMark size={compact ? 34 : 38} />
      <div className="leading-tight">
        <div className="text-[15.5px] font-bold tracking-tight text-ink">
          Study Coach
        </div>
        {subtitle ? (
          <div className="text-[12px] font-semibold tracking-[0.01em] text-muted">
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}
