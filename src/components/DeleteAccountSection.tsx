"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

/**
 * Requires typing DELETE (not just a click-through modal) before the
 * button enables, per the brief's "prevent accidental deletion"
 * requirement. The actual delete + cascade happens in
 * DELETE /api/account.
 */
export function DeleteAccountSection() {
  const [expanded, setExpanded] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmText.trim().toUpperCase() === "DELETE";

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Could not delete your account — please try again.");
        setDeleting(false);
        return;
      }
      await signOut({ redirectTo: "/" });
    } catch {
      setError("Something went wrong — please check your connection and try again.");
      setDeleting(false);
    }
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="font-sans text-sm text-[var(--maroon)] underline"
      >
        Delete account
      </button>
    );
  }

  return (
    <div className="border border-[var(--maroon)]/30 rounded-lg p-4">
      <p className="font-sans text-sm mb-3">
        This permanently deletes your profile, photos, matches, messages, and
        membership history. This can&rsquo;t be undone.
      </p>
      <label className="font-sans text-xs uppercase tracking-wide opacity-60 block mb-1.5">
        Type DELETE to confirm
      </label>
      <input
        className="w-full font-sans text-sm bg-white/70 border border-black/10 rounded-lg px-3 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--maroon)]"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="DELETE"
      />
      {error && <p className="font-sans text-xs text-[var(--maroon)] mb-3">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={!canDelete || deleting}
          onClick={handleDelete}
          className="bg-[var(--maroon)] text-white font-sans text-sm font-medium rounded-full px-4 py-2 disabled:opacity-40"
        >
          {deleting ? "Deleting…" : "Permanently delete my account"}
        </button>
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            setConfirmText("");
            setError(null);
          }}
          className="font-sans text-sm opacity-60 hover:opacity-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
