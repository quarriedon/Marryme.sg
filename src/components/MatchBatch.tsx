"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MatchCard, type MatchCandidate } from "@/components/MatchCard";
import { MAX_INTERESTS_PER_BATCH } from "@/lib/matching/constants";

export function MatchBatch({
  batchId,
  candidates,
  initialInterestedIds,
}: {
  batchId: string;
  candidates: MatchCandidate[];
  initialInterestedIds: string[];
}) {
  const [interestedIds, setInterestedIds] = useState(new Set(initialInterestedIds));
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mutualMatchName, setMutualMatchName] = useState<string | null>(null);
  const router = useRouter();

  const atLimit = interestedIds.size >= MAX_INTERESTS_PER_BATCH;

  async function handleExpressInterest(candidate: MatchCandidate) {
    setPendingId(candidate.matchedUserId);
    setError(null);

    const res = await fetch("/api/interests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchedUserId: candidate.matchedUserId, batchId }),
    });
    const body = await res.json();

    setPendingId(null);
    if (!res.ok) {
      setError(body.error ?? "Something went wrong.");
      return;
    }

    setInterestedIds((prev) => new Set(prev).add(candidate.matchedUserId));
    if (body.mutualMatch) {
      setMutualMatchName(candidate.name);
      router.refresh();
    }
  }

  if (mutualMatchName) {
    return (
      <div className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-10 text-center">
        <p className="font-display text-2xl mb-2">It&rsquo;s mutual!</p>
        <p className="font-sans text-sm opacity-80">
          You and {mutualMatchName} both expressed interest. Head to your{" "}
          <a href="/dashboard/relationship" className="underline text-[var(--jade)]">
            relationship
          </a>{" "}
          tab to start talking.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4">
        {candidates.map((c) => (
          <MatchCard
            key={c.matchedUserId}
            candidate={c}
            interested={interestedIds.has(c.matchedUserId)}
            interestDisabled={atLimit}
            pending={pendingId === c.matchedUserId}
            onExpressInterest={() => handleExpressInterest(c)}
          />
        ))}
      </div>
      {error && (
        <p className="font-sans text-sm text-[var(--maroon)] mt-4">{error}</p>
      )}
    </div>
  );
}
