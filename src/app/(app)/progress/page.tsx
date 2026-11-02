import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ListChecks,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

import { requireStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { CourseBars, ScoreBars } from "@/components/charts";
import { RecommendationList } from "@/components/recommendation-list";
import { formatDate, relativeTime } from "@/lib/utils";

export const metadata = { title: "Progress" };

export default async function ProgressPage() {
  const user = await requireStudent();

  const [attempts, activities, recommendations] = await Promise.all([
    db.quizAttempt.findMany({
      where: { studentId: user.id, completedAt: { not: null } },
      include: {
        quiz: {
          include: {
            course: { select: { id: true, code: true, title: true } },
            questions: { select: { id: true, correctIndex: true, topic: true } },
          },
        },
      },
      orderBy: { completedAt: "desc" },
      take: 40,
    }),
    db.studyActivity.findMany({
      where: { plan: { studentId: user.id } },
      select: { status: true, durationMinutes: true },
    }),
    db.recommendation.findMany({
      where: { studentId: user.id, status: "NEW" },
      include: { course: { select: { id: true, code: true } } },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 10,
    }),
  ]);

  // ------------------------------------------------------------ aggregates
  const graded = attempts.map((attempt) => {
    let answers: number[] = [];
    try {
      const parsed = JSON.parse(attempt.answers);
      if (Array.isArray(parsed)) answers = parsed as number[];
    } catch {
      answers = [];
    }

    const percent = attempt.total
      ? (attempt.score / attempt.total) * 100
      : 0;

    return { attempt, answers, percent };
  });

  const average = graded.length
    ? graded.reduce((sum, item) => sum + item.percent, 0) / graded.length
    : 0;
  const best = graded.length
    ? Math.max(...graded.map((item) => item.percent))
    : 0;

  const completedSessions = activities.filter(
    (activity) => activity.status === "DONE",
  ).length;
  const totalMinutes = activities
    .filter((activity) => activity.status === "DONE")
    .reduce((sum, activity) => sum + activity.durationMinutes, 0);

  // Score history: oldest to newest, last 8 attempts.
  const trend = [...graded]
    .sort(
      (a, b) =>
        new Date(a.attempt.completedAt!).getTime() -
        new Date(b.attempt.completedAt!).getTime(),
    )
    .slice(-8)
    .map((item) => ({
      label: formatDate(item.attempt.completedAt!),
      value: item.percent,
      hint: item.attempt.quiz.course.code,
    }));

  // Performance per course.
  const courseMap = new Map<
    string,
    { code: string; title: string; sum: number; count: number }
  >();

  for (const item of graded) {
    const course = item.attempt.quiz.course;
    const entry =
      courseMap.get(course.id) ??
      { code: course.code, title: course.title, sum: 0, count: 0 };
    entry.sum += item.percent;
    entry.count += 1;
    courseMap.set(course.id, entry);
  }

  const courseBars = [...courseMap.values()]
    .map((entry) => ({
      label: entry.code,
      hint: `${entry.count} attempt${entry.count === 1 ? "" : "s"}`,
      value: entry.sum / entry.count,
    }))
    .sort((a, b) => b.value - a.value);

  // Topic mastery across every question answered.
  const topicMap = new Map<string, { wrong: number; total: number }>();

  for (const item of graded) {
    item.attempt.quiz.questions.forEach((question, index) => {
      const topic = question.topic ?? "General";
      const entry = topicMap.get(topic) ?? { wrong: 0, total: 0 };
      entry.total += 1;
      if (item.answers[index] !== question.correctIndex) entry.wrong += 1;
      topicMap.set(topic, entry);
    });
  }

  const weakTopics = [...topicMap.entries()]
    .filter(([, value]) => value.wrong > 0)
    .map(([topic, value]) => ({
      topic,
      wrong: value.wrong,
      total: value.total,
      accuracy: Math.round(((value.total - value.wrong) / value.total) * 100),
    }))
    .sort((a, b) => b.wrong - a.wrong || a.accuracy - b.accuracy)
    .slice(0, 6);

  const stats = [
    {
      label: "Quizzes taken",
      value: graded.length,
      icon: ListChecks,
      hint: `${activities.length ? completedSessions : 0} sessions completed`,
    },
    {
      label: "Average score",
      value: `${Math.round(average)}%`,
      icon: TrendingUp,
      hint: graded.length ? `across ${graded.length} attempts` : "no attempts yet",
    },
    {
      label: "Best score",
      value: `${Math.round(best)}%`,
      icon: Target,
      hint: "personal best",
    },
    {
      label: "Time studied",
      value: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
      icon: CheckCircle2,
      hint: `${completedSessions} activities done`,
    },
  ];

  const recent = graded.slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="animate-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] leading-[1.15] font-semibold tracking-[-0.03em] text-ink">
            Your progress
          </h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Quiz scores, study activity and the topics that still need work.
          </p>
        </div>

        <Link href="/quizzes" className="btn btn-primary">
          <ListChecks size={15} />
          Take a quiz
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card animate-rise p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-medium text-muted">
                  {stat.label}
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <Icon size={13} />
                </span>
              </div>
              <div className="mt-2.5 text-[22px] leading-none font-semibold text-ink">
                {stat.value}
              </div>
              <div className="mt-1.5 text-[11px] text-muted">{stat.hint}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <section className="card animate-rise overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-brand" />
                <h2 className="text-[14px] font-semibold text-ink">
                  Score history
                </h2>
              </div>
              <span className="text-[11.5px] text-muted">last 8 attempts</span>
            </div>

            <div className="px-4 py-4">
              {trend.length ? (
                <ScoreBars data={trend} />
              ) : (
                <div className="py-8 text-center">
                  <p className="text-[13px] font-medium text-ink">
                    No quiz results yet
                  </p>
                  <p className="mx-auto mt-1 max-w-xs text-[12px] leading-relaxed text-muted">
                    Take a practice quiz and your scores will appear here so you
                    can see whether revision is working.
                  </p>
                  <Link href="/quizzes" className="btn btn-subtle mt-4">
                    Go to quizzes
                    <ArrowRight size={13} />
                  </Link>
                </div>
              )}
            </div>
          </section>

          <section className="card animate-rise overflow-hidden">
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-[14px] font-semibold text-ink">
                Performance by course
              </h2>
            </div>
            <div className="px-4 py-4">
              <CourseBars data={courseBars} />
            </div>
          </section>

          {weakTopics.length ? (
            <section className="card animate-rise overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 className="text-[14px] font-semibold text-ink">
                  Topic mastery
                </h2>
                <span className="text-[11.5px] text-muted">
                  from your quiz answers
                </span>
              </div>

              <ul className="divide-y divide-line">
                {weakTopics.map((item) => (
                  <li
                    key={item.topic}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        item.accuracy >= 50 ? "bg-amber" : "bg-rose"
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink">
                      {item.topic}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted">
                      {item.total - item.wrong}/{item.total} correct
                    </span>
                    <span
                      className={`chip shrink-0 ${
                        item.accuracy >= 50
                          ? "border-amber-soft bg-amber-soft text-amber"
                          : "border-rose-soft bg-rose-soft text-rose"
                      }`}
                    >
                      {item.accuracy}%
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="space-y-5">
          <section className="card animate-rise overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-brand" />
                <h2 className="text-[14px] font-semibold text-ink">
                  Recommended revision
                </h2>
              </div>
              {recommendations.length ? (
                <span className="chip border-line bg-surface-muted text-[10px] text-muted">
                  {recommendations.length} open
                </span>
              ) : null}
            </div>

            <RecommendationList
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
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-[14px] font-semibold text-ink">
                Recent attempts
              </h2>
            </div>

            {recent.length ? (
              <ul className="divide-y divide-line">
                {recent.map((item) => (
                  <li key={item.attempt.id}>
                    <Link
                      href={`/quizzes/${item.attempt.quizId}`}
                      className="flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-surface-muted"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium text-ink">
                          {item.attempt.quiz.title}
                        </span>
                        <span className="mt-0.5 block text-[10.5px] text-muted">
                          {item.attempt.quiz.course.code} ·{" "}
                          {relativeTime(item.attempt.completedAt!)}
                        </span>
                      </span>
                      <span
                        className={`chip shrink-0 ${
                          item.percent >= 80
                            ? "border-emerald-soft bg-emerald-soft text-emerald"
                            : item.percent >= 60
                              ? "border-brand-ring bg-brand-soft text-brand-dark"
                              : item.percent >= 40
                                ? "border-amber-soft bg-amber-soft text-amber"
                                : "border-rose-soft bg-rose-soft text-rose"
                        }`}
                      >
                        {Math.round(item.percent)}%
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-8 text-center text-[12px] text-muted">
                Your attempts will be listed here.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
