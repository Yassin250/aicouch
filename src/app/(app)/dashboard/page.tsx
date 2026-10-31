import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CalendarDays,
  FileText,
  ListChecks,
  MessageSquare,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Upload,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessibleCourses } from "@/lib/courses";
import { isAiConfigured } from "@/lib/ai/gemini";
import { RecommendationList } from "@/components/recommendation-list";
import { DeadlineDialog, DeadlineList } from "@/components/deadlines";
import { cn, formatDate, relativeTime, truncate } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await requireUser();

  const courses = await getAccessibleCourses(user, {
    _count: { select: { documents: true } },
  });
  const courseIds = courses.map((course) => course.id);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [
    documents,
    sessions,
    materialCount,
    summaryCount,
    attempts,
    todayTasks,
    upcomingTasks,
    recentAttempts,
    deadlines,
    recommendations,
  ] = await Promise.all([
    courseIds.length
      ? db.document.findMany({
          where: { courseId: { in: courseIds } },
          include: { course: { select: { code: true, title: true } } },
          orderBy: { createdAt: "desc" },
          take: 4,
        })
      : Promise.resolve([]),
    db.chatSession.findMany({
      where: { studentId: user.id },
      include: { _count: { select: { messages: true } } },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),
    courseIds.length
      ? db.document.count({ where: { courseId: { in: courseIds } } })
      : Promise.resolve(0),
    courseIds.length
      ? db.document.count({
          where: { courseId: { in: courseIds }, summary: { not: null } },
        })
      : Promise.resolve(0),
    db.quizAttempt.findMany({
      where: { studentId: user.id, completedAt: { not: null } },
      select: { score: true, total: true },
    }),
    db.studyActivity.findMany({
      where: {
        plan: { studentId: user.id },
        status: "PENDING",
        scheduledFor: { gte: startOfToday, lt: endOfToday },
      },
      include: { plan: { select: { title: true } } },
      orderBy: { scheduledFor: "asc" },
      take: 4,
    }),
    db.studyActivity.findMany({
      where: {
        plan: { studentId: user.id },
        status: "PENDING",
        scheduledFor: { gte: endOfToday },
      },
      orderBy: { scheduledFor: "asc" },
      take: 3,
    }),
    db.quizAttempt.findMany({
      where: { studentId: user.id, completedAt: { not: null } },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            course: { select: { code: true } },
          },
        },
      },
      orderBy: { completedAt: "desc" },
      take: 3,
    }),
    db.deadline.findMany({
      where: { studentId: user.id, status: "OPEN" },
      include: { course: { select: { code: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    db.recommendation.findMany({
      where: { studentId: user.id, status: "NEW" },
      include: { course: { select: { id: true, code: true } } },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 3,
    }),
  ]);

  const firstName = user.fullName.split(" ")[0];
  const aiLive = isAiConfigured();

  const averageScore = attempts.length
    ? Math.round(
        (attempts.reduce(
          (sum, attempt) =>
            sum + (attempt.total ? attempt.score / attempt.total : 0),
          0,
        ) /
          attempts.length) *
          100,
      )
    : 0;

  const stats = [
    {
      label: "Enrolled courses",
      value: courses.length,
      icon: BookOpen,
      hint: user.programme?.code ?? "All programmes",
    },
    {
      label: "Study materials",
      value: materialCount,
      icon: FileText,
      hint: `${summaryCount} summarised`,
    },
    {
      label: "Quizzes taken",
      value: attempts.length,
      icon: ListChecks,
      hint: attempts.length ? "keep practising" : "none yet",
    },
    {
      label: "Average score",
      value: attempts.length ? `${averageScore}%` : "—",
      icon: TrendingUp,
      hint: attempts.length ? "across all attempts" : "take a quiz to start",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header ------------------------------------------------------------ */}
      <div className="animate-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium tracking-[0.02em] text-brand">
            {formatDate(new Date())}
          </p>
          <h1 className="mt-1 text-[26px] leading-tight font-semibold tracking-tight text-ink">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-muted">
            {courses.length
              ? `${courses.length} course${courses.length === 1 ? "" : "s"}, ${materialCount} study material${materialCount === 1 ? "" : "s"}, ${recommendations.length} topic${recommendations.length === 1 ? "" : "s"} to revisit.`
              : "Your courses will appear here once you are enrolled."}
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/materials" className="btn btn-ghost">
            <Upload size={15} />
            Upload notes
          </Link>
          <Link href="/assistant" className="btn btn-primary">
            <Sparkles size={15} />
            Ask the coach
          </Link>
        </div>
      </div>

      {/* Stats ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={cn(
                "card animate-rise p-4",
                index === 1 && "delay-1",
                index === 2 && "delay-2",
                index === 3 && "delay-3",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-medium tracking-[0.01em] text-muted">
                  {stat.label}
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <Icon size={14} strokeWidth={2} />
                </span>
              </div>
              <div className="mt-2.5 text-[24px] leading-none font-semibold tracking-tight text-ink">
                {stat.value}
              </div>
              <div className="mt-1.5 text-[11.5px] text-muted">{stat.hint}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        {/* Left column --------------------------------------------------- */}
        <div className="space-y-5">
          <section className="card animate-rise overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-[14px] font-semibold text-ink">
                Continue studying
              </h2>
              <Link
                href="/materials"
                className="text-[12.5px] font-medium text-brand hover:text-brand-dark"
              >
                All materials
              </Link>
            </div>

            {documents.length ? (
              <ul className="divide-y divide-line">
                {documents.map((document) => (
                  <li key={document.id}>
                    <Link
                      href={`/materials/${document.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-muted text-rose">
                        <FileText size={16} strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-ink">
                          {document.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[11.5px] text-muted">
                          {document.course.code} · {document.course.title} ·{" "}
                          {relativeTime(document.createdAt)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "chip shrink-0",
                          document.summary
                            ? "border-emerald-soft bg-emerald-soft text-emerald"
                            : "border-line bg-surface-muted text-muted",
                        )}
                      >
                        {document.summary ? "Summarised" : "Notes"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Upload size={18} />
                </div>
                <p className="mt-3 text-[13.5px] font-medium text-ink">
                  No study material yet
                </p>
                <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-muted">
                  Upload your first lecture notes as a PDF and the coach will be
                  able to explain, summarise and quiz you on them.
                </p>
                <Link href="/materials" className="btn btn-primary mt-4">
                  <Upload size={14} />
                  Upload notes
                </Link>
              </div>
            )}
          </section>

          <section className="animate-rise">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-ink">Your courses</h2>
              <span className="text-[11.5px] text-muted">
                {user.programme?.name ?? "All programmes"}
              </span>
            </div>

            {courses.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {courses.slice(0, 6).map((course) => (
                  <Link
                    key={course.id}
                    href={`/materials?course=${course.id}`}
                    className="card group p-3.5 transition-all hover:-translate-y-0.5 hover:border-brand-ring hover:shadow-[0_4px_16px_rgba(79,70,229,0.08)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="chip border-line bg-surface-muted font-mono text-[10.5px] tracking-wide text-ink-soft">
                        {course.code}
                      </span>
                      <span className="text-[10.5px] text-muted">
                        Y{course.yearOfStudy} · S{course.semester}
                      </span>
                    </div>
                    <div className="mt-2 text-[13.5px] leading-snug font-medium text-ink">
                      {course.title}
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-muted">
                      <FileText size={12} />
                      {course._count?.documents ?? 0} material
                      {(course._count?.documents ?? 0) === 1 ? "" : "s"}
                      <ArrowRight
                        size={12}
                        className="ml-auto text-brand opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="card px-4 py-8 text-center text-[13px] text-muted">
                You are not enrolled in any course yet. Please contact the
                administrator.
              </div>
            )}
          </section>

          <section className="card animate-rise overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-1.5">
                <MessageSquare size={13} className="text-brand" />
                <h2 className="text-[14px] font-semibold text-ink">
                  Recent conversations
                </h2>
              </div>
              <Link
                href="/assistant"
                className="text-[12px] font-medium text-brand hover:text-brand-dark"
              >
                New
              </Link>
            </div>

            {sessions.length ? (
              <ul className="divide-y divide-line">
                {sessions.map((session) => (
                  <li key={session.id}>
                    <Link
                      href={`/assistant/${session.id}`}
                      className="block px-4 py-2.5 transition-colors hover:bg-surface-muted"
                    >
                      <div className="truncate text-[12.5px] font-medium text-ink">
                        {truncate(session.title, 42)}
                      </div>
                      <div className="mt-0.5 text-[10.5px] text-muted">
                        {session._count.messages} message
                        {session._count.messages === 1 ? "" : "s"} ·{" "}
                        {relativeTime(session.updatedAt)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-center text-[11.5px] text-muted">
                No conversations yet.
              </p>
            )}
          </section>
        </div>

        {/* Right column -------------------------------------------------- */}
        <div className="space-y-5">
          <section className="card animate-rise overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-1.5">
                <CalendarDays size={13} className="text-brand" />
                <h2 className="text-[14px] font-semibold text-ink">
                  Today&apos;s study tasks
                </h2>
              </div>
              <Link
                href="/planner"
                className="text-[12px] font-medium text-brand hover:text-brand-dark"
              >
                Planner
              </Link>
            </div>

            {todayTasks.length ? (
              <ul className="divide-y divide-line">
                {todayTasks.map((activity) => (
                  <li
                    key={activity.id}
                    className="flex items-start gap-2.5 px-4 py-2.5"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-medium text-ink">
                        {activity.title}
                      </div>
                      <div className="mt-0.5 text-[10.5px] text-muted">
                        {new Date(activity.scheduledFor).toLocaleTimeString(
                          "en-GB",
                          { hour: "2-digit", minute: "2-digit" },
                        )}{" "}
                        · {activity.durationMinutes} min
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-[12.5px] font-medium text-ink">
                  Nothing scheduled today
                </p>
                <p className="mx-auto mt-1 max-w-[220px] text-[11.5px] leading-relaxed text-muted">
                  A free day — or a good moment to plan one.
                </p>
                <Link href="/planner" className="btn btn-subtle mt-3 text-[12px]">
                  <CalendarDays size={13} />
                  Plan my week
                </Link>
              </div>
            )}

            {upcomingTasks.length ? (
              <div className="border-t border-line bg-surface-muted/70 px-4 py-2.5">
                <div className="mb-1.5 text-[10px] font-semibold tracking-[0.05em] text-muted uppercase">
                  Next up
                </div>
                <ul className="space-y-1.5">
                  {upcomingTasks.map((activity) => (
                    <li
                      key={activity.id}
                      className="flex items-baseline justify-between gap-2"
                    >
                      <span className="min-w-0 truncate text-[12px] text-ink-soft">
                        {activity.title}
                      </span>
                      <span className="shrink-0 text-[10.5px] text-muted">
                        {formatDate(activity.scheduledFor)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="card animate-rise overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-1.5">
                <CalendarClock size={13} className="text-brand" />
                <h2 className="text-[14px] font-semibold text-ink">
                  Upcoming deadlines
                </h2>
              </div>
              <DeadlineDialog
                courses={courses.map((course) => ({
                  id: course.id,
                  code: course.code,
                  title: course.title,
                }))}
                label="Add"
              />
            </div>

            <DeadlineList
              items={deadlines.map((deadline) => ({
                id: deadline.id,
                title: deadline.title,
                type: deadline.type,
                dueDate: deadline.dueDate.toISOString(),
                status: deadline.status,
                courseCode: deadline.course?.code ?? null,
              }))}
            />
          </section>

          <section className="card animate-rise overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-1.5">
                <Target size={13} className="text-brand" />
                <h2 className="text-[14px] font-semibold text-ink">
                  Recommended revision
                </h2>
              </div>
              <Link
                href="/progress"
                className="text-[12px] font-medium text-brand hover:text-brand-dark"
              >
                Progress
              </Link>
            </div>

            <RecommendationList
              compact
              items={recommendations.map((item) => ({
                id: item.id,
                topic: item.topic,
                reason: item.reason,
                priority: item.priority,
                courseId: item.course?.id ?? null,
                courseCode: item.course?.code ?? null,
              }))}
            />
          </section>

          <section className="card animate-rise overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-1.5">
                <Trophy size={13} className="text-brand" />
                <h2 className="text-[14px] font-semibold text-ink">
                  Recent quiz results
                </h2>
              </div>
              <Link
                href="/quizzes"
                className="text-[12px] font-medium text-brand hover:text-brand-dark"
              >
                Quizzes
              </Link>
            </div>

            {recentAttempts.length ? (
              <ul className="divide-y divide-line">
                {recentAttempts.map((attempt) => {
                  const percent = attempt.total
                    ? Math.round((attempt.score / attempt.total) * 100)
                    : 0;

                  return (
                    <li key={attempt.id}>
                      <Link
                        href={`/quizzes/${attempt.quiz.id}`}
                        className="flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-surface-muted"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-medium text-ink">
                            {attempt.quiz.title}
                          </span>
                          <span className="mt-0.5 block text-[10.5px] text-muted">
                            {attempt.quiz.course.code} ·{" "}
                            {relativeTime(attempt.completedAt!)}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "chip shrink-0",
                            percent >= 80
                              ? "border-emerald-soft bg-emerald-soft text-emerald"
                              : percent >= 60
                                ? "border-brand-ring bg-brand-soft text-brand-dark"
                                : percent >= 40
                                  ? "border-amber-soft bg-amber-soft text-amber"
                                  : "border-rose-soft bg-rose-soft text-rose",
                          )}
                        >
                          {attempt.score}/{attempt.total}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-4 py-6 text-center text-[11.5px] text-muted">
                No quiz attempts yet.
              </p>
            )}
          </section>

          {!aiLive ? (
            <section className="animate-rise rounded-[16px] border border-amber-soft bg-amber-soft p-4">
              <h2 className="text-[13px] font-semibold text-amber">
                Running in offline demo mode
              </h2>
              <p className="mt-1 text-[12px] leading-relaxed text-amber/90">
                Add a free Gemini API key to{" "}
                <code className="rounded bg-white/60 px-1 py-0.5 font-mono text-[11px]">
                  .env
                </code>{" "}
                and restart to switch on full AI explanations and AI-written
                quiz questions.
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
