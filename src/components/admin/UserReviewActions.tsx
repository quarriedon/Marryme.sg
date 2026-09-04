"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UserStatus } from "@/types/database";

export function UserReviewActions({ userId, status }: { userId: string; status: UserStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "approve" | "reject") {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
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
          disabled={busy !== null || status === "approved"}
          className="font-sans text-sm px-4 py-2 rounded-full bg-[var(--jade)] text-white disabled:opacity-40"
        >
          {busy === "approve" ? "Approving…" : status === "approved" ? "Approved" : "Approve"}
        </button>
        <button
          type="button"
          onClick={() => act("reject")}
          disabled={busy !== null || status === "suspended"}
          className="font-sans text-sm px-4 py-2 rounded-full bg-[var(--maroon)] text-white disabled:opacity-40"
        >
          {busy === "reject" ? "Rejecting…" : status === "suspended" ? "Rejected" : "Reject"}
        </button>
      </div>
      {error && <p className="font-sans text-xs text-[var(--maroon)] mt-2">{error}</p>}
    </div>
  );
}
