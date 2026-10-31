import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  FileText,
  Layers,
  Sparkles,
  User,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCourseForUser } from "@/lib/courses";
import { mergeOverlappingChunks } from "@/lib/ai/retrieval";
import { Markdown } from "@/components/markdown";
import {
  DeleteMaterialButton,
  SummarizeButton,
} from "@/components/material-actions";
import { EditMaterialDialog } from "@/components/edit-material-dialog";
import { QuizGeneratorDialog } from "@/components/quiz-generator-dialog";
import { ResourceList } from "@/components/resource-list";
import { formatDate, formatFileSize } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default async function MaterialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const document = await db.document.findUnique({
    where: { id },
    include: {
      course: { include: { programme: { select: { name: true } } } },
      uploadedBy: { select: { fullName: true, role: true } },
      chunks: { orderBy: { chunkIndex: "asc" }, select: { content: true } },
    },
  });

  if (!document) notFound();

  const course = await getCourseForUser(document.courseId, user);
  if (!course) notFound();

  const isStaff = user.role === "LECTURER" || user.role === "ADMIN";
  const canView = document.publishState === "PUBLISHED" || isStaff;
  if (!canView) notFound();

  const resources = await db.resource.findMany({
    where: { courseId: document.courseId },
    include: { createdBy: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
  });

  const fullText = mergeOverlappingChunks(
    document.chunks.map((chunk) => chunk.content),
  );
  const preview = fullText.slice(0, 2600);
  const canDelete =
    document.uploadedById === user.id || isStaff;

  const facts = [
    {
      icon: Layers,
      label: "Sections indexed",
      value: String(document.chunks.length),
    },
    {
      icon: FileText,
      label: "Extracted text",
      value: `${(document.charCount ?? fullText.length).toLocaleString()} characters`,
    },
    {
      icon: CalendarDays,
      label: "Uploaded",
      value: formatDate(document.createdAt),
    },
    {
      icon: User,
      label: "Added by",
      value: document.uploadedBy.fullName,
    },
  ];

  return (
    <div className="space-y-5">
      <Link
        href={`/materials?course=${document.courseId}`}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} />
        Back to materials
      </Link>

      <div className="animate-rise flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="chip border-brand-ring bg-brand-soft font-mono text-[10.5px] text-brand-dark">
              {document.course.code}
            </span>
            <span className="chip border-line bg-surface-muted text-muted">
              {document.course.programme.name}
            </span>
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
            {document.pageCount ? (
              <span className="chip border-line bg-surface-muted text-muted">
                {document.pageCount} pages
              </span>
            ) : null}
            <span className="chip border-line bg-surface-muted text-muted">
              {formatFileSize(document.fileSize)}
            </span>
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
          </div>

          <h1 className="mt-2 text-[23px] leading-tight font-semibold tracking-tight text-ink">
            {document.title}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {document.description || document.course.title}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/materials/${document.id}/file`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
          >
            <Download size={14} />
            Open original
          </a>
          {isStaff ? (
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
          ) : null}
          {canDelete ? <DeleteMaterialButton documentId={document.id} /> : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          {/* Summary ----------------------------------------------------- */}
          <section className="card animate-rise overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-soft text-brand">
                  <Sparkles size={13} />
                </span>
                <h2 className="text-[14px] font-semibold text-ink">
                  AI summary
                </h2>
              </div>
              <SummarizeButton
                documentId={document.id}
                label={document.summary ? "Regenerate" : "Summarise with AI"}
              />
            </div>

            <div className="px-4 py-4">
              {document.summary ? (
                <Markdown content={document.summary} />
              ) : (
                <div className="py-6 text-center">
                  <p className="text-[13px] font-medium text-ink">
                    No summary generated yet
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-muted">
                    Turn these notes into an overview, key concepts, exam points
                    and a revision checklist in a few seconds.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Extracted text --------------------------------------------- */}
          <section className="card animate-rise overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-[14px] font-semibold text-ink">
                Extracted text
              </h2>
              <span className="text-[11.5px] text-muted">
                what the coach can read
              </span>
            </div>
            <div className="max-h-[380px] overflow-y-auto px-4 py-4">
              <pre className="font-sans text-[12.5px] leading-[1.75] whitespace-pre-wrap text-ink-soft">
                {preview}
                {fullText.length > preview.length
                  ? "\n\n… (preview truncated)"
                  : ""}
              </pre>
            </div>
          </section>
        </div>

        {/* Sidebar ------------------------------------------------------ */}
        <div className="space-y-5">
          <section className="card animate-rise p-4">
            <h2 className="text-[14px] font-semibold text-ink">Details</h2>
            <dl className="mt-3 space-y-3">
              {facts.map((fact) => {
                const Icon = fact.icon;
                return (
                  <div key={fact.label} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-muted text-muted">
                      <Icon size={13} />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-[11px] tracking-[0.01em] text-muted">
                        {fact.label}
                      </dt>
                      <dd className="truncate text-[12.5px] font-medium text-ink">
                        {fact.value}
                      </dd>
                    </div>
                  </div>
                );
              })}
            </dl>
          </section>

          <section className="animate-rise rounded-[16px] border border-brand-ring bg-brand-soft p-4">
            <h2 className="text-[13.5px] font-semibold text-brand-dark">
              Revise this material with the coach
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-brand-dark/80">
              Ask a question and the answer will be grounded in this document,
              with the exact source cited.
            </p>
            <Link
              href={`/assistant?course=${document.courseId}`}
              className="btn btn-primary mt-3 w-full"
            >
              <Sparkles size={14} />
              Ask about this course
            </Link>

            <div className="mt-2">
              <QuizGeneratorDialog
                courses={[
                  {
                    id: document.courseId,
                    code: document.course.code,
                    title: document.course.title,
                  },
                ]}
                documents={[
                  {
                    id: document.id,
                    title: document.title,
                    courseId: document.courseId,
                  },
                ]}
                defaultCourseId={document.courseId}
                defaultDocumentId={document.id}
                label="Quiz me on this material"
                variant="ghost"
                fullWidth
              />
            </div>
          </section>

          <ResourceList
            resources={resources}
            courseId={document.courseId}
            isStaff={isStaff}
          />
        </div>
      </div>
    </div>
  );
}
