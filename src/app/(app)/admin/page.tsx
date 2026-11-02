import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Database,
  FileText,
  Gauge,
  ServerCog,
  Sparkles,
  Users,
} from "lucide-react";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiConfig, isAiConfigured } from "@/lib/ai/gemini";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";

export const metadata = { title: "System overview" };

const LEVEL_STYLE: Record<string, string> = {
  ERROR: "border-rose-soft bg-rose-soft text-rose",
  WARN: "border-amber-soft bg-amber-soft text-amber",
  INFO: "border-line bg-surface-muted text-muted",
};

const CATEGORY_STYLE: Record<string, string> = {
  AUTH: "text-brand",
  AI: "text-teal",
  UPLOAD: "text-amber",
  ADMIN: "text-ink-soft",
  SYSTEM: "text-muted",
};

export default async function AdminOverviewPage() {
  await requireRole("ADMIN");

  const [
    roleCounts,
    activeUsers,
    newUsers,
    programmeCount,
    courseCount,
    documentCount,
    chunkCount,
    storage,
    chatSessions,
    chatMessages,
    quizCount,
    attemptCount,
    planCount,
    activityCount,
    deadlineCount,
    events,
    issues,
  ] = await Promise.all([
    db.user.groupBy({ by: ["role"], _count: { _all: true } }),
    db.user.count({ where: { isActive: true } }),
    db.user.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
    }),
    db.programme.count(),
    db.course.count(),
    db.document.count(),
    db.documentChunk.count(),
    db.document.aggregate({ _sum: { fileSize: true } }),
    db.chatSession.count(),
    db.chatMessage.count(),
    db.quiz.count(),
    db.quizAttempt.count(),
    db.studyPlan.count(),
    db.studyActivity.count(),
    db.deadline.count(),
    db.systemEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { fullName: true } } },
    }),
    db.systemEvent.findMany({
      where: { level: { in: ["WARN", "ERROR"] } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: { select: { fullName: true } } },
    }),
  ]);

  const byRole = (role: string) =>
    roleCounts.find((entry) => entry.role === role)?._count._all ?? 0;

  const totalUsers = roleCounts.reduce((sum, entry) => sum + entry._count._all, 0);

  const storageBytes = storage._sum.fileSize ?? 0;
  const storageLabel =
    storageBytes >= 1024 * 1024
      ? `${(storageBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(storageBytes / 1024))} KB`;

  const aiLive = isAiConfigured();

  const stats = [
    {
      label: "Accounts",
      value: totalUsers,
      hint: `${activeUsers} active · ${newUsers} new this week`,
      icon: Users,
      href: "/admin/users",
    },
    {
      label: "Students",
      value: byRole("STUDENT"),
      hint: `${byRole("ADMIN")} admin${byRole("ADMIN") === 1 ? "" : "s"}`,
      icon: Users,
      href: "/admin/users?role=STUDENT",
    },
    {
      label: "Courses",
      value: courseCount,
      hint: `${programmeCount} programme${programmeCount === 1 ? "" : "s"}`,
      icon: BookOpen,
      href: "/admin/courses",
    },
    {
      label: "Materials",
      value: documentCount,
      hint: `${chunkCount} sections · ${storageLabel}`,
      icon: FileText,
      href: "/admin",
    },
  ];

  const usage = [
    { label: "Programmes", value: programmeCount },
    { label: "Courses", value: courseCount },
    { label: "Study materials", value: documentCount },
    { label: "Indexed sections", value: chunkCount },
    { label: "Conversations", value: chatSessions },
    { label: "Chat messages", value: chatMessages },
    { label: "Quizzes", value: quizCount },
    { label: "Quiz attempts", value: attemptCount },
    { label: "Study plans", value: planCount },
    { label: "Planned sessions", value: activityCount },
    { label: "Deadlines", value: deadlineCount },
  ];

  return (
    <div className="space-y-5">
      <div className="animate-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] leading-[1.15] font-semibold tracking-[-0.03em] text-ink">
            System overview
          </h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Accounts, academic content and the AI service at a glance.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/users" className="btn btn-ghost">
            <Users size={15} />
            Manage users
          </Link>
          <Link href="/admin/courses" className="btn btn-primary">
            <BookOpen size={15} />
            Manage courses
          </Link>
        </div>
      </div>

      {/* Stats ----------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className={cn(
                "card animate-rise p-4 transition-colors hover:border-brand-ring",
                index === 1 && "delay-1",
                index === 2 && "delay-2",
                index === 3 && "delay-3",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-medium text-muted">
                  {stat.label}
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <Icon size={13} />
                </span>
              </div>
              <div className="mt-2.5 text-[24px] leading-none font-semibold text-ink">
                {stat.value}
              </div>
              <div className="mt-1.5 text-[11px] text-muted">{stat.hint}</div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {/* Usage ------------------------------------------------------- */}
          <section className="card animate-rise overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Database size={13} className="text-brand" />
              <h2 className="text-[14px] font-semibold text-ink">
                System usage
              </h2>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-0 px-4 py-2 sm:grid-cols-3">
              {usage.map((item) => (
                <div
                  key={item.label}
                  className="flex items-baseline justify-between gap-2 border-b border-line/70 py-2 last:border-0"
                >
                  <dt className="text-[11.5px] text-muted">{item.label}</dt>
                  <dd className="text-[12.5px] font-semibold text-ink">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Recent activity --------------------------------------------- */}
          <section className="card animate-rise overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Activity size={13} className="text-brand" />
              <h2 className="text-[14px] font-semibold text-ink">
                Recent activity
              </h2>
            </div>

            {events.length ? (
              <ul className="divide-y divide-line">
                {events.map((event) => (
                  <li key={event.id} className="flex items-start gap-2.5 px-4 py-2.5">
                    <span
                      className={cn(
                        "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                        event.level === "ERROR"
                          ? "bg-rose"
                          : event.level === "WARN"
                            ? "bg-amber"
                            : "bg-brand-ring",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[12.5px] font-medium text-ink">
                          {event.message}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-medium tracking-[0.04em] uppercase",
                            CATEGORY_STYLE[event.category] ?? "text-muted",
                          )}
                        >
                          {event.category}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-[10.5px] text-muted">
                        {event.user?.fullName ? `${event.user.fullName} · ` : ""}
                        {event.detail ?? "—"}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted">
                      {relativeTime(event.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-8 text-center text-[12px] text-muted">
                No activity recorded yet.
              </p>
            )}
          </section>
        </div>

        <div className="space-y-5">
          {/* AI service --------------------------------------------------- */}
          <section className="card animate-rise p-4">
            <div className="flex items-center gap-2">
              <ServerCog size={13} className="text-brand" />
              <h2 className="text-[14px] font-semibold text-ink">AI service</h2>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span
                className={cn(
                  "chip",
                  aiLive
                    ? "border-emerald-soft bg-emerald-soft text-emerald"
                    : "border-amber-soft bg-amber-soft text-amber",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    aiLive ? "bg-emerald" : "bg-amber",
                  )}
                />
                {aiLive ? "Connected" : "Offline mode"}
              </span>
              <span className="text-[11px] text-muted">
                {aiLive ? "Google Gemini" : "fallback generator"}
              </span>
            </div>

            <dl className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[11px] text-muted">Chat model</dt>
                <dd className="font-mono text-[11px] text-ink">
                  {aiConfig.chatModel}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[11px] text-muted">Embedding model</dt>
                <dd className="font-mono text-[11px] text-ink">
                  {aiConfig.embedModel}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[11px] text-muted">Vector size</dt>
                <dd className="text-[11px] text-ink">{aiConfig.embedDim}d</dd>
              </div>
            </dl>

            <p className="mt-3 border-t border-line pt-2.5 text-[11px] leading-relaxed text-muted">
              When the service fails, the system falls back to answering from
              your notes and records a warning below.
            </p>
          </section>

          {/* Errors ------------------------------------------------------- */}
          <section className="card animate-rise overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={13} className="text-amber" />
                <h2 className="text-[14px] font-semibold text-ink">
                  Errors &amp; warnings
                </h2>
              </div>
              {issues.length ? (
                <span className="chip border-line bg-surface-muted text-[10px] text-muted">
                  {issues.length}
                </span>
              ) : null}
            </div>

            {issues.length ? (
              <ul className="divide-y divide-line">
                {issues.map((event) => (
                  <li key={event.id} className="px-4 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[12px] leading-snug font-medium text-ink">
                        {event.message}
                      </span>
                      <span
                        className={cn(
                          "chip shrink-0",
                          LEVEL_STYLE[event.level] ?? LEVEL_STYLE.INFO,
                        )}
                      >
                        {event.level}
                      </span>
                    </div>
                    {event.detail ? (
                      <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-muted">
                        {event.detail}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[10px] text-muted">
                      {formatDateTime(event.createdAt)}
                      {event.user?.fullName ? ` · ${event.user.fullName}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-[12.5px] font-medium text-emerald">
                  No errors recorded
                </p>
                <p className="mt-1 text-[11.5px] text-muted">
                  Everything is running cleanly.
                </p>
              </div>
            )}
          </section>

          <section className="animate-rise rounded-[16px] border border-brand-ring bg-brand-soft p-4">
            <div className="flex items-center gap-1.5">
              <Gauge size={13} className="text-brand-dark" />
              <h2 className="text-[13px] font-semibold text-brand-dark">
                Administrative scope
              </h2>
            </div>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-brand-dark/80">
              Student accounts, programmes and courses are managed here. Students
              control their own learning materials. As an administrator, you
              can monitor system usage, review reports and manage issues.
            </p>
            <Link
              href="/admin/courses"
              className="btn btn-ghost mt-3 w-full text-[12px]"
            >
              <BookOpen size={12} />
              Manage academic courses
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
