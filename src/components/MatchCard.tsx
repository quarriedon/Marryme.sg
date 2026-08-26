"use client";

export type MatchCandidate = {
  matchedUserId: string;
  name: string;
  age: number | null;
  occupation: string | null;
  location: string | null;
  bio: string | null;
};

export function MatchCard({
  candidate,
  interested,
  interestDisabled,
  onExpressInterest,
  pending,
}: {
  candidate: MatchCandidate;
  interested: boolean;
  interestDisabled: boolean;
  onExpressInterest: () => void;
  pending: boolean;
}) {
  return (
    <div className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-5 flex items-start justify-between gap-6">
      <div>
        <div className="flex items-baseline gap-2">
          <h2 className="font-display text-xl">{candidate.name}</h2>
          {candidate.age != null && (
            <span className="font-sans text-sm opacity-60">{candidate.age}</span>
          )}
          {interested && (
            <span className="font-sans text-[10px] uppercase tracking-wide bg-jade text-white rounded-full px-2 py-0.5">
              Interest sent
            </span>
          )}
        </div>
        <p className="font-sans text-xs uppercase tracking-wide opacity-50 mt-1">
          {[candidate.occupation, candidate.location].filter(Boolean).join(" · ")}
        </p>
        {candidate.bio && (
          <p className="font-sans text-sm mt-3 leading-relaxed opacity-90">
            {candidate.bio}
          </p>
        )}
      </div>

      <div className="shrink-0 flex flex-col items-end gap-2">
        <button
          disabled={interested || (interestDisabled && !interested) || pending}
          onClick={onExpressInterest}
          className="bg-ink text-[var(--paper)] font-sans text-sm font-medium rounded-full px-4 py-2 hover:bg-ink-soft transition-colors disabled:opacity-40"
        >
          {interested ? "Interest sent" : pending ? "Sending…" : "Express interest"}
        </button>
      </div>
    </div>
  );
}
