"use client";

// Section 3: every user completes a personality test before receiving
// matches. Copy is written to avoid "scientifically proven" claims —
// framed as informed by psychology, not guaranteed compatibility.

import { useState } from "react";
import { useRouter } from "next/navigation";

type Question = {
  id: string;
  text: string;
  options: string[];
};

const QUESTIONS: Question[] = [
  {
    id: "conflict_style",
    text: "When you disagree with someone close to you, you usually...",
    options: [
      "Say what's on your mind right away",
      "Take time to think before raising it",
      "Wait for them to bring it up first",
      "Try to find a compromise quickly",
    ],
  },
  {
    id: "family_role",
    text: "How involved do you want family to be in your relationship?",
    options: [
      "Very involved — family opinion matters a lot",
      "Somewhat involved, but the decision is ours",
      "Mostly independent, informed after the fact",
      "Fully independent of extended family",
    ],
  },
  {
    id: "weekend_energy",
    text: "Your ideal weekend looks more like...",
    options: [
      "Quiet, at home, just the two of you",
      "Out with a small group of close friends",
      "Trying something new together",
      "A mix — depends on the week",
    ],
  },
  {
    id: "life_pace",
    text: "When it comes to big life decisions, you tend to...",
    options: [
      "Plan years ahead",
      "Plan a few months at a time",
      "Decide when the moment comes",
      "Prefer your partner to take the lead on planning",
    ],
  },
  {
    id: "love_language",
    text: "You feel most cared for when someone...",
    options: [
      "Tells you directly how they feel",
      "Spends focused, undistracted time with you",
      "Does something practical to help you out",
      "Shows physical affection",
    ],
  },
];

export default function PersonalityTestPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const question = QUESTIONS[step];
  const progress = ((step + 1) / QUESTIONS.length) * 100;

  function selectAnswer(option: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: option }));
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      void submit({ ...answers, [question.id]: option });
    }
  }

  async function submit(finalAnswers: Record<string, string>) {
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/onboarding/personality-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finalAnswers),
    });

    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Please sign in again to save your answers.");
      return;
    }
    router.push("/onboarding/profile");
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <p className="font-sans text-xs tracking-[0.15em] uppercase text-gold-soft mb-3">
          Question {step + 1} of {QUESTIONS.length}
        </p>
        <div className="h-1 bg-[var(--gold)]/15 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-gold transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <h1 className="gilded-heading font-display text-2xl md:text-3xl italic mb-8 leading-snug">
          {question.text}
        </h1>
        <div className="space-y-3">
          {question.options.map((option) => (
            <button
              key={option}
              disabled={submitting}
              onClick={() => selectAnswer(option)}
              className="w-full text-left font-sans text-sm bg-paper text-[var(--text-on-paper)] rounded-xl px-5 py-4 hover:bg-paper-dim transition-colors disabled:opacity-50"
            >
              {option}
            </button>
          ))}
        </div>
        {error && (
          <p className="font-sans text-sm text-[var(--maroon)] mt-4">
            {error}
          </p>
        )}
        <p className="font-sans text-xs text-[var(--paper-dim)] mt-8 text-center opacity-70">
          Your answers help us understand how you relate to others — no
          answer is right or wrong.
        </p>
      </div>
    </main>
  );
}
