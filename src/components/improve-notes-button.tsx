"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

export function ImproveNotesButton({
  documentId,
  label,
  variant = "ghost",
}: {
  documentId: string;
  label: string;
  variant?: "ghost" | "primary";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function improve() {
    setBusy(true);
    try {
      const response = await fetch(`/api/materials/${documentId}/improve`, {
        method: "POST",
      });
      if (response.ok) {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  const isPrimary = variant === "primary";

  return (
    <button
      onClick={improve}
      disabled={busy}
      className={
        isPrimary
          ? "btn btn-primary mt-3 w-full"
          : "btn btn-ghost text-[12px]"
      }
    >
      {busy ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          Improving…
        </>
      ) : (
        <>
          <Sparkles size={14} />
          {label}
        </>
      )}
    </button>
  );
}
