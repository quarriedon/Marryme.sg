"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function GrantMembershipForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState("founding");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, tier, expiresAt }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Something went wrong.");
      return;
    }
    setEmail("");
    setExpiresAt("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid sm:grid-cols-[2fr_1fr_1fr_auto] gap-2 items-start">
      <input
        type="email"
        required
        placeholder="member@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="font-sans text-sm bg-white/70 border border-black/10 rounded-lg px-3 py-2"
      />
      <select
        value={tier}
        onChange={(e) => setTier(e.target.value)}
        className="font-sans text-sm bg-white/70 border border-black/10 rounded-lg px-3 py-2"
      >
        <option value="founding">Founding</option>
        <option value="regular">Regular</option>
        <option value="priority">Priority</option>
      </select>
      <input
        type="date"
        required
        value={expiresAt}
        onChange={(e) => setExpiresAt(e.target.value)}
        className="font-sans text-sm bg-white/70 border border-black/10 rounded-lg px-3 py-2"
      />
      <button
        type="submit"
        disabled={busy}
        className="font-sans text-sm px-4 py-2 rounded-lg bg-gold text-ink font-medium disabled:opacity-50"
      >
        {busy ? "Granting…" : "Grant"}
      </button>
      {error && <p className="font-sans text-xs text-[var(--maroon)] sm:col-span-4">{error}</p>}
    </form>
  );
}

export function EditExpiryButton({
  membershipId,
  currentExpiresAt,
}: {
  membershipId: string;
  currentExpiresAt: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentExpiresAt.slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="font-sans text-xs text-gold-soft hover:underline"
      >
        Edit
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="font-sans text-xs border border-black/10 rounded px-1.5 py-0.5"
      />
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const res = await fetch(`/api/admin/memberships/${membershipId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ expiresAt: value }),
          });
          setBusy(false);
          if (!res.ok) {
            const b = await res.json().catch(() => null);
            setError(b?.error ?? "Failed.");
            return;
          }
          setEditing(false);
          router.refresh();
        }}
        className="font-sans text-xs text-[var(--jade)]"
      >
        Save
      </button>
      {error && <span className="font-sans text-xs text-[var(--maroon)]">{error}</span>}
    </div>
  );
}
