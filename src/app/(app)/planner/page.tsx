import { CalendarDays, CheckCircle2, Clock, Target } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessibleCourses } from "@/lib/courses";
import { PlanDialog } from "@/components/plan-dialog";
import { ActivityList, DeletePlanButton } from "@/components/activity-list";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Study Planner" };

export default async function PlannerPage() {
  const user = await requireUser();

  const [courses, plans, recommendations] = await Promise.all([
    getAccessibleCourses(user),
    db.studyPlan.findMany({
      where: { studentId: user.id },
      include: {
        course: { select: { code: true } },
        activities: { orderBy: { scheduledFor: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.recommendation.findMany({
      where: { studentId: user.id, status: "NEW" },
      orderBy: { priority: "desc" },
      take: 8,
      select: { topic: true },
    }),
  ]);

  const allActivities = plans.flatMap((plan) => plan.activities);
  const completed = allActivities.filter(
    (activity) => activity.status === "DONE",
  ).length;
  const now = new Date();
  const weekAhead = new Date();
  weekAhead.setDate(now.getDate() + 7);
  const thisWeek = allActivities.filter((activity) => {
    const date = new Date(activity.scheduledFor);
    return activity.status !== "DONE" && date >= now && date <= weekAhead;
  }).length;

  const totalMinutes = allActivities
    .filter((activity) => activity.status === "DONE")
    .reduce((sum, activity) => sum + activity.durationMinutes, 0);

  const weakTopics = [...new Set(recommendations.map((item) => item.topic))];

  const stats = [
    {
      label: "Sessions planned",
      value: allActivities.length,
      icon: CalendarDays,
    },
    { label: "Completed", value: completed, icon: CheckCircle2 },
    { label: "Due this week", value: thisWeek, icon: Target },
    {
      label: "Time studied",
      value: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="animate-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] leading-tight font-semibold tracking-tight text-ink">
            Study planner
          </h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Break revision into sessions you can actually keep, then tick them off.
          </p>
        </div>

        <PlanDialog
          courses={courses.map((course) => ({
            id: course.id,
            code: course.code,
            title: course.title,
          }))}
          weakTopics={weakTopics}
        />
      </div>

      {allActivities.length ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="card p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted">
                    {stat.label}
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-soft text-brand">
                    <Icon size={12} />
                  </span>
                </div>
                <div className="mt-2 text-[20px] leading-none font-semibold text-ink">
                  {stat.value}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {plans.length ? (
        <div className="space-y-4">
          {plans.map((plan) => {
            const done = plan.activities.filter(
              (activity) => activity.status === "DONE",
            ).length;
            const percent = plan.activities.length
              ? Math.round((done / plan.activities.length) * 100)
              : 0;

            return (
              <section key={plan.id} className="card animate-rise overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="text-[14.5px] font-semibold text-ink">
                        {plan.title}
                      </h2>
                      {plan.course ? (
                        <span className="chip border-brand-ring bg-brand-soft font-mono text-[10px] text-brand-dark">
                          {plan.course.code}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[11.5px] text-muted">
                      {formatDate(plan.startDate)} — {formatDate(plan.endDate)} ·{" "}
                      {done} of {plan.activities.length} sessions done
                    </p>
                    {plan.goal ? (
                      <p className="mt-1 text-[12px] text-ink-soft">
                        Goal: {plan.goal}
                      </p>
                    ) : null}
                  </div>

                  <DeletePlanButton planId={plan.id} />
                </div>

                <div className="px-4 pt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-emerald transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                <div className="px-4 py-4">
                  <ActivityList
                    activities={plan.activities.map((activity) => ({
                      id: activity.id,
                      title: activity.title,
                      scheduledFor: activity.scheduledFor.toISOString(),
                      durationMinutes: activity.durationMinutes,
                      status: activity.status,
                      courseCode: plan.course?.code ?? null,
                    }))}
                  />
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="card animate-rise px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <CalendarDays size={20} />
          </div>
          <h2 className="mt-3.5 text-[15px] font-semibold text-ink">
            No study plan yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted">
            Tell the planner how many sessions you can manage and it will spread
            them across the weeks before your exam. If you have taken a quiz, it
            can focus the sessions on the topics you got wrong.
          </p>
          <div className="mt-5 flex justify-center">
            <PlanDialog
              courses={courses.map((course) => ({
                id: course.id,
                code: course.code,
                title: course.title,
              }))}
              weakTopics={weakTopics}
              label="Create your first plan"
            />
          </div>
        </div>
      )}
    </div>
  );
}
