"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PhotoReviewActions({ photoId }: { photoId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "approve" | "reject") {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/photos/${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => act("approve")}
          disabled={busy !== null}
          className="font-sans text-xs px-3 py-1.5 rounded-full bg-[var(--jade)] text-white disabled:opacity-50"
        >
          {busy === "approve" ? "Approving…" : "Approve"}
        </button>
        <button
          type="button"
          onClick={() => act("reject")}
          disabled={busy !== null}
          className="font-sans text-xs px-3 py-1.5 rounded-full bg-[var(--maroon)] text-white disabled:opacity-50"
        >
          {busy === "reject" ? "Rejecting…" : "Reject"}
        </button>
      </div>
      {error && <p className="font-sans text-xs text-[var(--maroon)] mt-1">{error}</p>}
    </div>
  );
}
