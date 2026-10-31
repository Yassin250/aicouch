"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Pencil, X } from "lucide-react";

import { cn } from "@/lib/utils";

type DocumentForm = {
  id: string;
  title: string;
  description: string;
  week: number | null;
  topic: string;
  sessionNumber: number | null;
  publishState: string;
};

export function EditMaterialDialog({
  doc,
}: {
  doc: DocumentForm;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [title, setTitle] = useState(doc.title);
  const [description, setDescription] = useState(doc.description);
  const [week, setWeek] = useState(doc.week ?? "");
  const [topic, setTopic] = useState(doc.topic);
  const [sessionNumber, setSessionNumber] = useState(
    doc.sessionNumber ?? "",
  );
  const [publishState, setPublishState] = useState(doc.publishState);

  function close() {
    setOpen(false);
    setError(null);
    setDone(false);
    setBusy(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const body: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || null,
      topic: topic.trim() || null,
      publishState,
    };

    const w = Number(week);
    if (Number.isFinite(w) && w > 0) body.week = w;
    else body.week = null;

    const s = Number(sessionNumber);
    if (Number.isFinite(s) && s > 0) body.sessionNumber = s;
    else body.sessionNumber = null;

    try {
      const response = await fetch(`/api/materials/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Could not save changes.");
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
        <Pencil size={13} />
        Edit
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
                className="animate-rise relative z-10 w-full max-w-[520px] overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl"
              >
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                  <h2 className="text-[15px] font-semibold text-ink">
                    Edit material
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
                        <span className="font-medium">Changes saved.</span>
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <label className="label" htmlFor="edit-title">
                      Title
                    </label>
                    <input
                      id="edit-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="field"
                      disabled={busy}
                      required
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor="edit-desc">
                      Description <span className="text-muted">(optional)</span>
                    </label>
                    <input
                      id="edit-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="field"
                      disabled={busy}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="label" htmlFor="edit-week">
                        Week
                      </label>
                      <input
                        id="edit-week"
                        type="number"
                        min={1}
                        max={52}
                        value={week}
                        onChange={(e) => setWeek(e.target.value)}
                        className="field"
                        disabled={busy}
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="edit-session">
                        Session
                      </label>
                      <input
                        id="edit-session"
                        type="number"
                        min={1}
                        max={99}
                        value={sessionNumber}
                        onChange={(e) => setSessionNumber(e.target.value)}
                        className="field"
                        disabled={busy}
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="edit-state">
                        State
                      </label>
                      <select
                        id="edit-state"
                        value={publishState}
                        onChange={(e) => setPublishState(e.target.value)}
                        className="field"
                        disabled={busy}
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="PUBLISHED">Published</option>
                        <option value="ARCHIVED">Archived</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="label" htmlFor="edit-topic">
                      Topic <span className="text-muted">(optional)</span>
                    </label>
                    <input
                      id="edit-topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. Normalisation"
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
                    disabled={busy}
                    className="btn btn-primary"
                  >
                    {busy ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save changes"
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
