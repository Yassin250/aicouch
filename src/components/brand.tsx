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
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-gradient-to-br from-brand to-[#6d5ef0] text-white shadow-[0_2px_8px_rgba(79,70,229,0.35)]",
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
    <div className="flex items-center gap-2.5">
      <BrandMark size={compact ? 32 : 36} />
      <div className="leading-tight">
        <div className="text-[14.5px] font-semibold tracking-tight text-ink">
          Study Coach
        </div>
        {subtitle ? (
          <div className="text-[11px] font-medium tracking-[0.01em] text-muted">
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}
