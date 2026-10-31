"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Film,
  Globe,
  Loader2,
  Plus,
  Trash2,
  Wrench,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

type ResourceItem = {
  id: string;
  title: string;
  url: string;
  kind: string;
  description: string | null;
  createdBy: { fullName: string } | null;
};

const KIND_ICON: Record<string, React.ReactNode> = {
  LINK: <Globe size={14} />,
  VIDEO: <Film size={14} />,
  ARTICLE: <Globe size={14} />,
  TOOL: <Wrench size={14} />,
};

const KIND_LABEL: Record<string, string> = {
  LINK: "Link",
  VIDEO: "Video",
  ARTICLE: "Article",
  TOOL: "Tool",
};

export function ResourceList({
  resources,
  courseId,
  isStaff,
}: {
  resources: ResourceItem[];
  courseId: string;
  isStaff: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  async function remove(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/resources/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <section className="card animate-rise overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-[14px] font-semibold text-ink">
          Supplementary resources
        </h2>
        {isStaff ? <AddResourceDialog courseId={courseId} /> : null}
      </div>

      {resources.length ? (
        <ul className="divide-y divide-line">
          {resources.map((resource) => (
            <li
              key={resource.id}
              className="flex items-start gap-2.5 px-4 py-3"
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-muted text-muted">
                {KIND_ICON[resource.kind] ?? KIND_ICON.LINK}
              </span>
              <div className="min-w-0 flex-1">
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[13px] font-medium text-brand hover:underline"
                >
                  {resource.title}
                  <ExternalLink size={11} className="shrink-0 opacity-60" />
                </a>
                {resource.description ? (
                  <p className="mt-0.5 text-[11.5px] text-muted">
                    {resource.description}
                  </p>
                ) : null}
                <p className="mt-0.5 text-[10.5px] text-muted">
                  {KIND_LABEL[resource.kind] ?? "Link"}
                  {resource.createdBy ? ` · ${resource.createdBy.fullName}` : ""}
                </p>
              </div>
              {isStaff ? (
                <button
                  onClick={() => remove(resource.id)}
                  disabled={deleting === resource.id}
                  className="mt-0.5 shrink-0 rounded-md p-1 text-muted hover:bg-rose-soft hover:text-rose disabled:opacity-40"
                  title="Remove"
                >
                  <Trash2 size={13} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-4 py-7 text-center">
          <p className="text-[12.5px] font-medium text-ink">
            No supplementary resources yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-[11.5px] leading-relaxed text-muted">
            Lecturers can add links to videos, articles, datasets or tools for
            this course.
          </p>
          {isStaff ? (
            <div className="mt-3 flex justify-center">
              <AddResourceDialog courseId={courseId} />
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function AddResourceDialog({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState("LINK");
  const [description, setDescription] = useState("");

  function close() {
    setOpen(false);
    setError(null);
    setDone(false);
    setBusy(false);
    setTitle("");
    setUrl("");
    setKind("LINK");
    setDescription("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          title: title.trim(),
          url: url.trim(),
          kind,
          description: description.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Could not add resource.");
        setBusy(false);
        return;
      }

      setDone(true);
      router.refresh();
      setTimeout(close, 500);
    } catch {
      setError("Could not reach the server.");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-ghost text-[12px]"
      >
        <Plus size={13} />
        Add resource
      </button>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
              <div
                className="animate-fade absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
                onClick={() => (busy ? null : close())}
              />

              <form
                onSubmit={submit}
                className="animate-rise relative z-10 w-full max-w-[460px] overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl"
              >
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                  <h2 className="text-[15px] font-semibold text-ink">
                    Add supplementary resource
                  </h2>
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
                        <span className="font-medium">Resource added.</span>
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <label className="label" htmlFor="res-title">
                      Title
                    </label>
                    <input
                      id="res-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Khan Academy — Database Normalisation"
                      className="field"
                      disabled={busy}
                      required
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor="res-url">
                      URL
                    </label>
                    <input
                      id="res-url"
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://..."
                      className="field"
                      disabled={busy}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label" htmlFor="res-kind">
                        Kind
                      </label>
                      <select
                        id="res-kind"
                        value={kind}
                        onChange={(e) => setKind(e.target.value)}
                        className="field"
                        disabled={busy}
                      >
                        <option value="LINK">Link</option>
                        <option value="VIDEO">Video</option>
                        <option value="ARTICLE">Article</option>
                        <option value="TOOL">Tool</option>
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="res-desc">
                        Description <span className="text-muted">(opt)</span>
                      </label>
                      <input
                        id="res-desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Brief note"
                        className="field"
                        disabled={busy}
                      />
                    </div>
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
                    disabled={busy}
                    className="btn btn-primary"
                  >
                    {busy ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Add resource"
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
