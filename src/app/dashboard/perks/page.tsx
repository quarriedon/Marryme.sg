// Section 7: free wedding-day photoshoot and album for couples who
// found their match through MarryMe.sg.

"use client";

import { useState } from "react";

export default function PerksPage() {
  const [claimed, setClaimed] = useState(false);

  return (
    <main className="px-6 py-10 max-w-2xl mx-auto">
      <h1 className="gilded-heading font-display text-3xl mb-1">Your wedding gift</h1>
      <p className="font-sans text-sm text-[var(--paper-dim)] mb-8">
        Found your match with us? Your wedding-day photoshoot and album
        are on the house.
      </p>

      <div className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-6">
        {!claimed ? (
          <>
            <p className="font-sans text-sm opacity-90 mb-6">
              Congratulations! Let us know your wedding date and we&rsquo;ll
              arrange a complimentary photoshoot and printed album as our
              gift to you.
            </p>
            <button
              onClick={() => setClaimed(true)}
              className="bg-gold text-ink font-sans text-sm font-medium rounded-full px-5 py-2.5 hover:bg-gold-soft transition-colors"
            >
              Claim your photoshoot
            </button>
          </>
        ) : (
          <p className="font-sans text-sm text-[var(--jade)]">
            Claimed! Our team will reach out to arrange your date and
            photographer.
          </p>
        )}
      </div>
    </main>
  );
}
