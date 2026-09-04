"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

async function postOverride(payload: object): Promise<string | null> {
  const res = await fetch("/api/admin/matches/override", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return body?.error ?? "Something went wrong.";
  }
  return null;
}

export function RemoveMatchButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await postOverride({ action: "remove", matchId });
        setBusy(false);
        router.refresh();
      }}
      className="font-sans text-xs px-2.5 py-1 rounded-full border border-[var(--maroon)]/40 text-[var(--maroon)] disabled:opacity-50"
    >
      {busy ? "Removing…" : "Remove"}
    </button>
  );
}

export function AddCandidateForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await postOverride({ action: "add", userId, candidateEmail: email });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setEmail("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-start">
      <input
        type="email"
        required
        placeholder="candidate@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="font-sans text-sm bg-white/70 border border-black/10 rounded-lg px-3 py-1.5 flex-1"
      />
      <button
        type="submit"
        disabled={busy}
        className="shrink-0 font-sans text-xs px-3 py-1.5 rounded-full bg-ink text-[var(--paper)] disabled:opacity-50"
      >
        {busy ? "Adding…" : "Add to batch"}
      </button>
      {error && <p className="font-sans text-xs text-[var(--maroon)] w-full">{error}</p>}
    </form>
  );
}

export function ForceMutualForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!confirm("Force a mutual match between these two members? This bypasses reciprocal interest.")) {
      return;
    }
    setBusy(true);
    setError(null);
    const err = await postOverride({ action: "force_mutual", userId, candidateEmail: email });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setEmail("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-start">
      <input
        type="email"
        required
        placeholder="other-member@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="font-sans text-sm bg-white/70 border border-black/10 rounded-lg px-3 py-1.5 flex-1"
      />
      <button
        type="submit"
        disabled={busy}
        className="shrink-0 font-sans text-xs px-3 py-1.5 rounded-full bg-[var(--jade)] text-white disabled:opacity-50"
      >
        {busy ? "Matching…" : "Force mutual match"}
      </button>
      {error && <p className="font-sans text-xs text-[var(--maroon)] w-full">{error}</p>}
    </form>
  );
}
