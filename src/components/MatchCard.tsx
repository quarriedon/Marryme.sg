"use client";

import { useState } from "react";

export type MatchCandidate = {
  id: string;
  name: string;
  age: number;
  occupation: string;
  community: string;
  blurb: string;
  status: "available" | "unavailable" | "chosen";
};

export function MatchCard({
  candidate,
  disableChoose,
}: {
  candidate: MatchCandidate;
  disableChoose: boolean;
}) {
  const [chosen, setChosen] = useState(candidate.status === "chosen");
  const [waitlisted, setWaitlisted] = useState(false);

  function handleChoose() {
    if (candidate.status === "unavailable") {
      // Section 2.3: record interest on the waitlist instead of a match.
      setWaitlisted(true);
      return;
    }
    setChosen(true);
  }

  return (
    <div className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-5 flex items-start justify-between gap-6">
      <div>
        <div className="flex items-baseline gap-2">
          <h2 className="font-display text-xl">{candidate.name}</h2>
          <span className="font-sans text-sm opacity-60">{candidate.age}</span>
          {candidate.status === "unavailable" && !waitlisted && (
            <span className="font-sans text-[10px] uppercase tracking-wide bg-black/5 rounded-full px-2 py-0.5 opacity-60">
              Talking with someone else
            </span>
          )}
          {chosen && (
            <span className="font-sans text-[10px] uppercase tracking-wide bg-jade text-white rounded-full px-2 py-0.5">
              Your choice
            </span>
          )}
        </div>
        <p className="font-sans text-xs uppercase tracking-wide opacity-50 mt-1">
          {candidate.occupation} · {candidate.community}
        </p>
        <p className="font-sans text-sm mt-3 leading-relaxed opacity-90">
          {candidate.blurb}
        </p>

        {waitlisted && (
          <p className="font-sans text-xs text-[var(--jade)] mt-3">
            {candidate.name} is unavailable right now — we&rsquo;ll keep
            you in mind. If things don&rsquo;t work out for them, you&rsquo;ll
            be first in line.
          </p>
        )}
      </div>

      <div className="shrink-0 flex flex-col items-end gap-2">
        <button
          disabled={(disableChoose && !chosen) || waitlisted}
          onClick={handleChoose}
          className="bg-ink text-[var(--paper)] font-sans text-sm font-medium rounded-full px-4 py-2 hover:bg-ink-soft transition-colors disabled:opacity-40"
        >
          {chosen
            ? "Chosen"
            : waitlisted
              ? "Waitlisted"
              : candidate.status === "unavailable"
                ? "Join waitlist"
                : "Choose"}
        </button>
        <button className="font-sans text-xs text-[var(--text-on-paper)] opacity-60 hover:opacity-100 underline">
          Message
        </button>
      </div>
    </div>
  );
}
