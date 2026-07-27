// Section 4 & 5: the single active match, and the 2-week cooling-off
// period if a couple decides to break up, with a genuine window to
// reconcile before either person is released to a new match set.

"use client";

import { useState } from "react";

export default function RelationshipPage() {
  const [status, setStatus] = useState<"talking" | "cooling_off" | "ended">(
    "talking"
  );

  return (
    <main className="px-6 py-10 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl mb-1">Your match</h1>
      <p className="font-sans text-sm text-[var(--paper-dim)] mb-8">
        One connection at a time — no parallel conversations while
        you&rsquo;re talking with someone.
      </p>

      <div className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-6">
        <h2 className="font-display text-xl mb-1">Wei Ling, 29</h2>
        <p className="font-sans text-sm opacity-70 mb-4">
          Physiotherapist · Chinese Singaporean
        </p>

        {status === "talking" && (
          <>
            <p className="font-sans text-sm opacity-90 mb-6">
              You&rsquo;re currently talking exclusively. Take your time —
              there&rsquo;s no one else in the picture while this is active.
            </p>
            <button
              onClick={() => setStatus("cooling_off")}
              className="font-sans text-sm text-[var(--maroon)] underline"
            >
              This isn&rsquo;t working out
            </button>
          </>
        )}

        {status === "cooling_off" && (
          <>
            <p className="font-sans text-sm opacity-90 mb-2">
              You&rsquo;ve indicated this isn&rsquo;t working. Before we
              release you both to new matches, there&rsquo;s a{" "}
              <strong>2-week cooling-off period</strong> — a real chance to
              patch things up if you change your mind.
            </p>
            <p className="font-sans text-xs opacity-60 mb-6">
              14 days remaining. You can reconcile or confirm ending it at
              any point during this window.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setStatus("talking")}
                className="bg-jade text-white font-sans text-sm rounded-full px-4 py-2"
              >
                We&rsquo;d like to patch up
              </button>
              <button
                onClick={() => setStatus("ended")}
                className="font-sans text-sm text-[var(--maroon)] underline"
              >
                Confirm ending it
              </button>
            </div>
          </>
        )}

        {status === "ended" && (
          <p className="font-sans text-sm opacity-90">
            This match has ended. You&rsquo;ll receive a new set of five
            matches at your next weekly cycle.
          </p>
        )}
      </div>
    </main>
  );
}
