import Link from "next/link";
import {
  BookOpen,
  FileText,
  FolderOpen,
  Layers,
  Pencil,
  Search,
  X,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAccessibleCourses } from "@/lib/courses";
import { UploadMaterialDialog } from "@/components/upload-material-dialog";
import { EditMaterialDialog } from "@/components/edit-material-dialog";
import { cn, formatFileSize, relativeTime } from "@/lib/utils";

export const metadata = { title: "Materials" };

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; q?: string }>;
}) {
  const user = await requireUser();
  const { course: courseFilter, q } = await searchParams;

  const query = (q ?? "").trim();
  const isStaff = user.role === "LECTURER" || user.role === "ADMIN";

  const courses = await getAccessibleCourses(user, {
    _count: { select: { documents: true } },
  });

  const activeCourse = courses.find((item) => item.id === courseFilter);
  const scopeIds = activeCourse ? [activeCourse.id] : courses.map((c) => c.id);

  // Students only see published material. Staff see everything.
  const publishFilter = isStaff ? undefined : "PUBLISHED";

  const documents = scopeIds.length
    ? await db.document.findMany({
        where: {
          courseId: { in: scopeIds },
          ...(publishFilter ? { publishState: publishFilter } : {}),
          ...(query
            ? {
                OR: [
                  { title: { contains: query, mode: "insensitive" } },
                  { description: { contains: query, mode: "insensitive" } },
                  {
                    chunks: {
                      some: {
                        content: { contains: query, mode: "insensitive" },
                      },
                    },
                  },
                ],
              }
            : {}),
        },
        include: {
          course: { select: { code: true, title: true } },
          uploadedBy: { select: { fullName: true } },
          _count: { select: { chunks: true } },
        },
        orderBy: [{ week: "asc" }, { sessionNumber: "asc" }, { createdAt: "desc" }],
      })
    : [];

  const courseLink = (id?: string) => {
    const params = new URLSearchParams();
    if (id) params.set("course", id);
    if (query) params.set("q", query);
    const suffix = params.toString();
    return `/materials${suffix ? `?${suffix}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <div className="animate-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] leading-tight font-semibold tracking-tight text-ink">
            Study materials
          </h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Lecture notes the coach can read, explain, summarise and quiz you on.
          </p>
        </div>
        {courses.length ? (
          <UploadMaterialDialog
            courses={courses.map((course) => ({
              id: course.id,
              code: course.code,
              title: course.title,
            }))}
            defaultCourseId={activeCourse?.id}
          />
        ) : null}
      </div>

      {/* Search ---------------------------------------------------------- */}
      {courses.length ? (
        <div className="animate-rise flex flex-wrap items-center gap-2">
          <form
            method="get"
            action="/materials"
            className="relative min-w-[240px] flex-1"
          >
            {activeCourse ? (
              <input type="hidden" name="course" value={activeCourse.id} />
            ) : null}
            <Search
              size={14}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
            />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search titles and note content…"
              className="field pr-24 pl-9"
              aria-label="Search study materials"
            />
            <button
              type="submit"
              className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md bg-surface-muted px-2.5 py-1 text-[11.5px] font-medium text-ink-soft transition-colors hover:bg-line"
            >
              Search
            </button>
          </form>

          {query ? (
            <Link
              href={courseLink(activeCourse?.id)}
              className="btn btn-ghost text-[12.5px]"
            >
              <X size={13} />
              Clear
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* Course filter --------------------------------------------------- */}
      {courses.length ? (
        <div className="animate-rise flex flex-wrap gap-1.5">
          <Link
            href={courseLink()}
            className={cn(
              "chip border px-2.5 py-1.5 text-[12px] transition-colors",
              !activeCourse
                ? "border-brand bg-brand-soft text-brand-dark"
                : "border-line bg-surface text-ink-soft hover:border-line-strong",
            )}
          >
            <Layers size={12} />
            All courses
          </Link>
          {courses.map((course) => (
            <Link
              key={course.id}
              href={courseLink(course.id)}
              className={cn(
                "chip border px-2.5 py-1.5 text-[12px] transition-colors",
                activeCourse?.id === course.id
                  ? "border-brand bg-brand-soft text-brand-dark"
                  : "border-line bg-surface text-ink-soft hover:border-line-strong",
              )}
            >
              <span className="font-mono text-[10.5px]">{course.code}</span>
              <span className="max-w-[170px] truncate">{course.title}</span>
            </Link>
          ))}
        </div>
      ) : null}

      {query ? (
        <p className="text-[12.5px] text-muted">
          {documents.length} result{documents.length === 1 ? "" : "s"} for{" "}
          <span className="font-medium text-ink">“{query}”</span>
          {activeCourse ? ` in ${activeCourse.code}` : ""}
        </p>
      ) : null}

      {/* Materials ------------------------------------------------------- */}
      {documents.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {documents.map((document) => (
            <div
              key={document.id}
              className={cn(
                "card animate-rise group flex flex-col p-4 transition-all",
                document.publishState === "ARCHIVED"
                  ? "opacity-60 hover:opacity-100"
                  : "hover:-translate-y-0.5 hover:border-brand-ring hover:shadow-[0_6px_20px_rgba(79,70,229,0.08)]",
              )}
            >
              <Link href={`/materials/${document.id}`} className="contents">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-soft bg-rose-soft text-rose">
                    <FileText size={16} strokeWidth={1.9} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 text-[13.5px] leading-snug font-medium text-ink">
                      {document.title}
                    </h2>
                    <p className="mt-0.5 truncate text-[11.5px] text-muted">
                      {document.course.code} · {document.course.title}
                    </p>
                  </div>
                </div>

                {document.description ? (
                  <p className="mt-2.5 line-clamp-2 text-[12px] leading-relaxed text-muted">
                    {document.description}
                  </p>
                ) : null}

                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                  {document.week ? (
                    <span className="chip border-brand-ring bg-brand-soft text-brand-dark">
                      Week {document.week}
                    </span>
                  ) : null}
                  {document.topic ? (
                    <span className="chip border-line bg-surface-muted text-muted">
                      {document.topic}
                    </span>
                  ) : null}
                  {isStaff ? (
                    <span
                      className={cn(
                        "chip border px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider",
                        document.publishState === "PUBLISHED"
                          ? "border-emerald-soft bg-emerald-soft text-emerald"
                          : document.publishState === "DRAFT"
                            ? "border-amber-soft bg-amber-soft text-amber"
                            : "border-line bg-surface-muted text-muted",
                      )}
                    >
                      {document.publishState.toLowerCase()}
                    </span>
                  ) : null}
                  <span className="chip border-line bg-surface-muted text-muted">
                    {document.pageCount
                      ? `${document.pageCount} page${document.pageCount === 1 ? "" : "s"}`
                      : `${document._count.chunks} sections`}
                  </span>
                  <span className="chip border-line bg-surface-muted text-muted">
                    {formatFileSize(document.fileSize)}
                  </span>
                  {document.summary ? (
                    <span className="chip border-emerald-soft bg-emerald-soft text-emerald">
                      Summarised
                    </span>
                  ) : null}
                  <span className="ml-auto text-[10.5px] text-muted">
                    {relativeTime(document.createdAt)}
                  </span>
                </div>
              </Link>

              {isStaff ? (
                <div className="mt-2 flex items-center justify-end gap-1 border-t border-line pt-2">
                  <EditMaterialDialog
                    doc={{
                      id: document.id,
                      title: document.title,
                      description: document.description ?? "",
                      week: document.week ?? null,
                      topic: document.topic ?? "",
                      sessionNumber: document.sessionNumber ?? null,
                      publishState: document.publishState,
                    }}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="card animate-rise px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand">
            {query ? <Search size={20} /> : <FolderOpen size={20} />}
          </div>
          <h2 className="mt-3.5 text-[15px] font-semibold text-ink">
            {query
              ? `No material matches “${query}”`
              : courses.length
                ? "No material in this course yet"
                : "You are not enrolled in any course"}
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted">
            {query
              ? "Try a shorter phrase, a single key term, or search all courses instead of one."
              : courses.length
                ? "Upload the lecture notes for this course. Once indexed, the AI assistant answers questions using only that material."
                : "Ask the administrator to enrol you in your courses, then come back to upload notes."}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            {query ? (
              <Link href={courseLink(activeCourse?.id)} className="btn btn-ghost">
                Clear search
              </Link>
            ) : null}
            {courses.length ? (
              <UploadMaterialDialog
                courses={courses.map((course) => ({
                  id: course.id,
                  code: course.code,
                  title: course.title,
                }))}
                defaultCourseId={activeCourse?.id}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
