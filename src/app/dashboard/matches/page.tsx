// Section 2: the core mechanic. Five curated matches per week, no
// swiping, no on-demand refresh. Mock data for now — replace with a
// real query against match_sets / match_set_candidates once the
// weekly matching job exists (see README "Next steps").

import { Interlace } from "@/components/Interlace";
import { MatchCard, type MatchCandidate } from "@/components/MatchCard";

const MOCK_WEEK_STARTING = "This week";

const MOCK_CANDIDATES: MatchCandidate[] = [
  {
    id: "1",
    name: "Wei Ling",
    age: 29,
    occupation: "Physiotherapist",
    community: "Chinese Singaporean",
    blurb:
      "Grew up in Toa Payoh, now based in Queenstown. Looking for someone who wants a family and takes weekends seriously.",
    status: "available",
  },
  {
    id: "2",
    name: "Aisyah",
    age: 31,
    occupation: "UX Designer",
    community: "Malay Singaporean",
    blurb:
      "Loves hawker food road trips and quiet Sundays. Practising, and looking for someone on the same page.",
    status: "available",
  },
  {
    id: "3",
    name: "Arjun",
    age: 33,
    occupation: "Civil Engineer",
    community: "Indian Singaporean",
    blurb:
      "First-generation SG, close to family in Little India. Wants kids in the next few years, open on the rest.",
    status: "unavailable", // currently talking with someone else
  },
  {
    id: "4",
    name: "Michelle",
    age: 30,
    occupation: "Teacher",
    community: "Eurasian",
    blurb:
      "Grew up in Katong. Believes in slow, honest relationships over fast ones.",
    status: "available",
  },
  {
    id: "5",
    name: "Daniel",
    age: 32,
    occupation: "Product Manager",
    community: "Chinese Singaporean",
    blurb: "Enjoys hiking and board games. Ready to settle down, not rush.",
    status: "available",
  },
];

export default function MatchesPage() {
  const hasChosen = MOCK_CANDIDATES.some((c) => c.status === "chosen");

  return (
    <main className="px-6 py-10 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl mb-1">Your five, {MOCK_WEEK_STARTING.toLowerCase()}</h1>
      <p className="font-sans text-sm text-[var(--paper-dim)] mb-2 max-w-lg">
        No swiping, no browsing beyond this. Talk to any of the five — when
        you&rsquo;re ready, choose one to pursue.
      </p>
      <p className="font-sans text-xs text-[var(--paper-dim)] opacity-60 mb-8">
        If you don&rsquo;t choose this week, your next set of five arrives
        in 7 days — not sooner.
      </p>

      <div className="space-y-4">
        {MOCK_CANDIDATES.map((c) => (
          <MatchCard key={c.id} candidate={c} disableChoose={hasChosen} />
        ))}
      </div>

      <div className="flex justify-center my-10">
        <Interlace className="opacity-50" />
      </div>

      <p className="font-sans text-xs text-center text-[var(--paper-dim)] opacity-60">
        We keep this list small on purpose — knowing there are more
        people &ldquo;out there&rdquo; is exactly what stops people from
        giving a real chance to who&rsquo;s in front of them.
      </p>
    </main>
  );
}
