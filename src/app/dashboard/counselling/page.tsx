// Section 6: pre-marriage counselling offered once a match decides
// to marry. Simple request form for the MVP — replace with real
// counsellor scheduling once partnerships are in place.

"use client";

import { useState } from "react";

export default function CounsellingPage() {
  const [requested, setRequested] = useState(false);

  return (
    <main className="px-6 py-10 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl mb-1">Pre-marriage counselling</h1>
      <p className="font-sans text-sm text-[var(--paper-dim)] mb-8">
        If you and your match are ready to take this to marriage,
        we&rsquo;ll connect you with a counsellor before the big day.
      </p>

      <div className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-6">
        {!requested ? (
          <>
            <p className="font-sans text-sm opacity-90 mb-6">
              This isn&rsquo;t a requirement — it&rsquo;s here for couples
              who want the support. A counsellor will reach out to schedule
              a session with both of you.
            </p>
            <button
              onClick={() => setRequested(true)}
              className="bg-ink text-[var(--paper)] font-sans text-sm font-medium rounded-full px-5 py-2.5 hover:bg-ink-soft transition-colors"
            >
              Request counselling
            </button>
          </>
        ) : (
          <p className="font-sans text-sm text-[var(--jade)]">
            Request received. We&rsquo;ll be in touch to schedule your
            session shortly.
          </p>
        )}
      </div>
    </main>
  );
}
