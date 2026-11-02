import Link from "next/link";
import { ArrowRight, ListChecks, Trophy } from "lucide-react";

import { requireStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessibleCourses } from "@/lib/courses";
import { QuizGeneratorDialog } from "@/components/quiz-generator-dialog";
import { cn, formatDate } from "@/lib/utils";

export const metadata = { title: "Quizzes" };

const DIFFICULTY_STYLE: Record<string, string> = {
  EASY: "border-emerald-soft bg-emerald-soft text-emerald",
  MEDIUM: "border-brand-ring bg-brand-soft text-brand-dark",
  HARD: "border-amber-soft bg-amber-soft text-amber",
};

export default async function QuizzesPage({
  searchParams,
}: {
  searchParams: Promise<{ document?: string }>;
}) {
  const user = await requireStudent();
  const { document: documentParam } = await searchParams;

  const courses = await getAccessibleCourses(user);
  const courseIds = courses.map((course) => course.id);

  const [quizzes, documents] = await Promise.all([
    courseIds.length
      ? db.quiz.findMany({
          where: {
            courseId: { in: courseIds },
            ...(user.role === "STUDENT" ? { createdById: user.id } : {}),
          },
          include: {
            course: { select: { code: true, title: true } },
            _count: { select: { questions: true } },
            attempts: {
              where: { studentId: user.id, completedAt: { not: null } },
              select: { score: true, total: true },
              orderBy: { completedAt: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 30,
        })
      : Promise.resolve([]),
    courseIds.length
      ? db.document.findMany({
          where: {
            courseId: { in: courseIds },
            status: "READY",
            ...(user.role === "STUDENT" ? { uploadedById: user.id } : {}),
          },
          select: { id: true, title: true, courseId: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const dialogCourses = courses.map((course) => ({
    id: course.id,
    code: course.code,
    title: course.title,
  }));

  return (
    <div className="space-y-5">
      <div className="animate-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] leading-[1.15] font-semibold tracking-[-0.03em] text-ink">
            Practice quizzes
          </h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Test yourself on your own study materials. Every answer is explained.
          </p>
        </div>

        {courses.length ? (
          <QuizGeneratorDialog
            courses={dialogCourses}
            documents={documents.map((document) => ({
              id: document.id,
              title: document.title,
              courseId: document.courseId,
            }))}
            defaultDocumentId={documentParam}
            autoOpen={Boolean(documentParam)}
            label="Generate quiz"
          />
        ) : null}
      </div>

      {quizzes.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {quizzes.map((quiz) => {
            const attempts = quiz.attempts;
            const best = attempts.length
              ? Math.max(
                  ...attempts.map((attempt) =>
                    attempt.total ? (attempt.score / attempt.total) * 100 : 0,
                  ),
                )
              : null;

            return (
              <div
                key={quiz.id}
                className="card animate-rise flex flex-col p-4 transition-all hover:border-brand-ring hover:shadow-[0_6px_20px_rgba(35,83,71,0.09)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "chip",
                      DIFFICULTY_STYLE[quiz.difficulty] ??
                        "border-line bg-surface-muted text-muted",
                    )}
                  >
                    {quiz.difficulty.charAt(0) +
                      quiz.difficulty.slice(1).toLowerCase()}
                  </span>

                  {best !== null ? (
                    <span className="chip border-line bg-surface-muted text-ink-soft">
                      <Trophy size={10} />
                      Best {Math.round(best)}%
                    </span>
                  ) : (
                    <span className="chip border-line bg-surface-muted text-muted">
                      Not attempted
                    </span>
                  )}
                </div>

                <h2 className="mt-2.5 line-clamp-2 text-[14px] leading-snug font-semibold text-ink">
                  {quiz.title}
                </h2>
                <p className="mt-1 text-[11.5px] text-muted">
                  {quiz.course.code} · {quiz.course.title}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                  <span className="chip border-line bg-surface-muted">
                    <ListChecks size={10} />
                    {quiz._count.questions} questions
                  </span>
                  <span className="chip border-line bg-surface-muted">
                    {attempts.length} attempt{attempts.length === 1 ? "" : "s"}
                  </span>
                  <span className="ml-auto text-[10.5px]">
                    {formatDate(quiz.createdAt)}
                  </span>
                </div>

                <Link
                  href={`/quizzes/${quiz.id}`}
                  className="btn btn-ghost mt-3.5 w-full text-[13px]"
                >
                  {attempts.length ? "Review and retake" : "Start quiz"}
                  <ArrowRight size={13} />
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card animate-rise px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <ListChecks size={20} />
          </div>
          <h2 className="mt-3.5 text-[15px] font-semibold text-ink">
            No quizzes yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted">
            {documents.length
              ? "Generate a practice quiz from one of your study documents. Questions are written from the material you uploaded."
              : "Upload your study notes first — quizzes are generated from your own material, not from a generic question bank."}
          </p>
          {documents.length ? (
            <div className="mt-5 flex justify-center">
              <QuizGeneratorDialog
                courses={dialogCourses}
                documents={documents.map((document) => ({
                  id: document.id,
                  title: document.title,
                  courseId: document.courseId,
                }))}
                defaultDocumentId={documentParam}
                label="Generate your first quiz"
              />
            </div>
          ) : (
            <Link href="/materials" className="btn btn-primary mt-5">
              Upload study notes
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
