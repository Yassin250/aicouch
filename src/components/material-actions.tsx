"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Sparkles, Trash2 } from "lucide-react";

export function SummarizeButton({
  documentId,
  label = "Summarise with AI",
}: {
  documentId: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setWarning(null);

    try {
      const response = await fetch(`/api/materials/${documentId}/summarize`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "The summary could not be generated.");
        setBusy(false);
        return;
      }

      if (data.warning) setWarning(data.warning);
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={run} disabled={busy} className="btn btn-primary">
        {busy ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Reading your notes…
          </>
        ) : (
          <>
            <Sparkles size={14} />
            {label}
          </>
        )}
      </button>

      {error ? (
        <p className="mt-2 flex items-start gap-1.5 text-[12px] text-rose">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}

      {warning ? (
        <p className="mt-2 text-[11.5px] text-amber">{warning}</p>
      ) : null}
    </div>
  );
}

export function DeleteMaterialButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      const response = await fetch(`/api/materials/${documentId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setBusy(false);
        setConfirming(false);
        return;
      }
      router.push("/materials");
      router.refresh();
    } catch {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1.5">
        <button
          onClick={remove}
          disabled={busy}
          className="btn bg-rose text-white hover:bg-[#a00d3c]"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : null}
          Confirm delete
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="btn btn-ghost"
          disabled={busy}
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="btn btn-ghost text-rose hover:bg-rose-soft hover:text-rose"
      title="Remove this material"
    >
      <Trash2 size={14} />
      Delete
    </button>
  );
}
