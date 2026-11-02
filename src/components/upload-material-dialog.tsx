"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Upload, X } from "lucide-react";

import { cn } from "@/lib/utils";

const ACCEPTED_MIME = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/webp",
];

const ACCEPT_EXT = ".pdf,.docx,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp";

function isAccepted(file: File) {
  if (ACCEPTED_MIME.includes(file.type)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ["pdf", "docx", "pptx", "txt", "md", "png", "jpg", "jpeg", "webp"].includes(
    ext ?? "",
  );
}

type CourseOption = {
  id: string;
  code: string;
  title: string;
};

export function UploadMaterialDialog({
  courses,
  defaultCourseId,
}: {
  courses: CourseOption[];
  defaultCourseId?: string;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [courseId, setCourseId] = useState(
    defaultCourseId ?? courses[0]?.id ?? "",
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  function reset() {
    setFile(null);
    setTitle("");
    setDescription("");
    setError(null);
    setDone(null);
    setBusy(false);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function pickFile(next: File | null) {
    setError(null);
    if (!next) return;

    if (!isAccepted(next)) {
      setError(
        "Only PDF, DOCX, PPTX, TXT, MD, PNG, JPG or WEBP files are supported.",
      );
      return;
    }
    if (next.size > 15 * 1024 * 1024) {
      setError("That file is larger than 15 MB.");
      return;
    }

    setFile(next);
    if (!title) {
      setTitle(next.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file || !courseId) {
      setError("Choose a course and a file first.");
      return;
    }

    setBusy(true);
    setError(null);

    const body = new FormData();
    body.append("file", file);
    body.append("courseId", courseId);
    body.append("title", title);
    body.append("description", description);

    try {
      const response = await fetch("/api/materials", { method: "POST", body });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "The upload failed. Please try again.");
        setBusy(false);
        return;
      }

      setDone(data.document?.title ?? "Material");
      router.refresh();

      setTimeout(() => {
        close();
        router.push(`/materials/${data.document.id}`);
      }, 700);
    } catch {
      setError("Could not reach the server. Check your connection.");
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-primary">
        <Upload size={15} />
        Upload notes
      </button>

      {mounted && open
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
              <div
                className="animate-fade absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
                onClick={() => (busy ? null : close())}
              />

              <form
                onSubmit={submit}
                className="animate-rise relative z-10 w-full max-w-[520px] overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl"
              >
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                  <div>
                    <h2 className="text-[15px] font-semibold text-ink">
                      Upload your notes
                    </h2>
                    <p className="mt-0.5 text-[12px] text-muted">
                      PDF, DOCX, PPTX, images, TXT or Markdown · up to 15 MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    disabled={busy}
                    className="rounded-md p-1.5 text-muted hover:bg-surface-muted disabled:opacity-40"
                  >
                    <X size={17} />
                  </button>
                </div>

                <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
                  {done ? (
                    <div className="flex items-start gap-2.5 rounded-xl border border-emerald-soft bg-emerald-soft px-3.5 py-3">
                      <CheckCircle2 size={17} className="mt-0.5 text-emerald" />
                      <div className="text-[13px] text-emerald">
                        <span className="font-medium">“{done}” is ready.</span>
                        <div className="mt-0.5 text-[12px] opacity-80">
                          Text extracted and indexed. Opening the material…
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <label className="label" htmlFor="course">
                      Course
                    </label>
                    <select
                      id="course"
                      value={courseId}
                      onChange={(event) => setCourseId(event.target.value)}
                      className="field"
                      disabled={busy}
                    >
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.code} — {course.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragging(false);
                      pickFile(event.dataTransfer.files?.[0] ?? null);
                    }}
                    onClick={() => fileInput.current?.click()}
                    className={cn(
                      "cursor-pointer rounded-xl border border-dashed px-4 py-7 text-center transition-colors",
                      dragging
                        ? "border-brand bg-brand-soft"
                        : "border-line-strong bg-surface-muted hover:border-brand-ring hover:bg-brand-soft/40",
                    )}
                  >
                    <input
                      ref={fileInput}
                      type="file"
                      accept={ACCEPT_EXT}
                      className="hidden"
                      onChange={(event) =>
                        pickFile(event.target.files?.[0] ?? null)
                      }
                    />
                    <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-brand">
                      <Upload size={17} />
                    </span>
                    {file ? (
                      <div className="mt-2.5">
                        <div className="truncate text-[13px] font-medium text-ink">
                          {file.name}
                        </div>
                        <div className="mt-0.5 text-[11.5px] text-muted">
                          {(file.size / 1024).toFixed(0)} KB · click to replace
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2.5">
                        <div className="text-[13px] font-medium text-ink">
                          Drop your notes here
                        </div>
                        <div className="mt-0.5 text-[11.5px] text-muted">
                          or click to browse your files
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="label" htmlFor="title">
                      Title
                    </label>
                    <input
                      id="title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="e.g. Database Normalisation Notes"
                      className="field"
                      disabled={busy}
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor="description">
                      Description <span className="text-muted">(optional)</span>
                    </label>
                    <input
                      id="description"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="What do these notes cover?"
                      className="field"
                      disabled={busy}
                    />
                  </div>

                  {error ? (
                    <div className="flex items-start gap-2 rounded-xl border border-rose-soft bg-rose-soft px-3.5 py-2.5 text-[12.5px] text-rose">
                      <AlertCircle size={15} className="mt-0.5 shrink-0" />
                      {error}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-muted px-5 py-3">
                  <button
                    type="button"
                    onClick={close}
                    disabled={busy}
                    className="btn btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy || !file}
                    className="btn btn-primary"
                  >
                    {busy ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        Upload and index
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
