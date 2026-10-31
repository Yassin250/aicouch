import Link from "next/link";
import { BookOpenCheck, MessagesSquare, ShieldCheck } from "lucide-react";

import { BrandLockup } from "@/components/brand";

const POINTS = [
  {
    icon: MessagesSquare,
    title: "Answers from your own notes",
    body: "Every explanation is retrieved from the lecture material for your course, not from the open internet.",
  },
  {
    icon: BookOpenCheck,
    title: "Built for revision",
    body: "Summaries, key concepts and revision checklists generated from the notes you upload.",
  },
  {
    icon: ShieldCheck,
    title: "Scoped to your enrolment",
    body: "You only ever see material for the courses you are registered in.",
  },
];

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel ---------------------------------------------------- */}
      <div className="relative hidden overflow-hidden bg-[#0f1330] p-10 lg:flex lg:flex-col">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-[0.16]" />
        <div className="pointer-events-none absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-brand/25 blur-[90px]" />
        <div className="pointer-events-none absolute -right-28 bottom-0 h-[380px] w-[380px] rounded-full bg-teal/20 blur-[100px]" />

        <div className="relative">
          <Link href="/" className="inline-block">
            <div className="flex items-center gap-2.5">
              <span className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-[11px] bg-white/10 text-white ring-1 ring-white/15">
                <svg
                  viewBox="0 0 24 24"
                  width="21"
                  height="21"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 15.5v-10Z" />
                  <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h4.5a1.5 1.5 0 0 0 1.5-1.5v-10Z" />
                </svg>
              </span>
              <div className="leading-tight">
                <div className="text-[14.5px] font-semibold tracking-tight text-white">
                  Study Coach
                </div>
                <div className="text-[11px] text-white/55">
                  Mount Kigali University
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="relative mt-auto max-w-md">
          <p className="text-[11px] font-medium tracking-[0.14em] text-white/40 uppercase">
            School of Computing, Informatics and Media Studies
          </p>
          <h2 className="mt-3 text-[30px] leading-[1.18] font-semibold tracking-tight text-white">
            Understand the hard parts
            <br />
            of your degree.
          </h2>
          <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">
            An AI study coach for BBICT and Computer Science students — grounded
            in the lecture notes your lecturers provide.
          </p>

          <ul className="mt-8 space-y-4">
            {POINTS.map((point) => {
              const Icon = point.icon;
              return (
                <li key={point.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/80 ring-1 ring-white/10">
                    <Icon size={13} />
                  </span>
                  <div>
                    <div className="text-[12.5px] font-medium text-white/90">
                      {point.title}
                    </div>
                    <div className="mt-0.5 text-[11.5px] leading-relaxed text-white/50">
                      {point.body}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative mt-10 text-[10.5px] text-white/30">
          © {new Date().getFullYear()} Mount Kigali University · Final year
          project
        </div>
      </div>

      {/* Form panel ----------------------------------------------------- */}
      <div className="flex min-h-screen flex-col bg-surface">
        <div className="flex items-center justify-between px-6 py-5 lg:hidden">
          <BrandLockup subtitle="MKU" compact />
          <Link
            href="/"
            className="text-[12.5px] font-medium text-muted hover:text-ink"
          >
            Home
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-8">
          <div className="w-full max-w-[400px]">
            <h1 className="text-[24px] leading-tight font-semibold tracking-tight text-ink">
              {title}
            </h1>
            <p className="mt-1.5 text-[13.5px] text-muted">{subtitle}</p>

            <div className="mt-6">{children}</div>

            <div className="mt-5 text-[12.5px] text-muted">{footer}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
