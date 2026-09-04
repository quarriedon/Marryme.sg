// Manual match override — search a member, view their current
// curated batch, and add/remove candidates or force a mutual match
// for support cases the algorithm got wrong.

import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import {
  AddCandidateForm,
  ForceMutualForm,
  RemoveMatchButton,
} from "@/components/admin/MatchOverrideActions";

type SearchRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

type BatchRow = {
  match_id: string;
  candidate_id: string;
  candidate_name: string | null;
  candidate_email: string | null;
  has_interest: number;
  reciprocal_interest: number;
};

type MutualMatchRow = {
  id: string;
  status: string;
  matched_at: string;
  other_name: string | null;
};

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; userId?: string }>;
}) {
  const { q, userId } = await searchParams;

  const results = q
    ? await query<SearchRow>(
        `SELECT id, full_name, email, phone FROM users
         WHERE full_name LIKE ? OR email LIKE ? OR phone LIKE ?
         ORDER BY created_at DESC LIMIT 20`,
        [`%${q}%`, `%${q}%`, `%${q}%`]
      )
    : [];

  const selectedUser = userId
    ? await queryOne<SearchRow>("SELECT id, full_name, email, phone FROM users WHERE id = ?", [
        userId,
      ])
    : null;

  const batch = selectedUser
    ? await query<BatchRow>(
        `SELECT
           m.id AS match_id,
           c.id AS candidate_id,
           c.full_name AS candidate_name,
           c.email AS candidate_email,
           EXISTS(
             SELECT 1 FROM interests i
             WHERE i.user_id = m.user_id AND i.batch_id = m.batch_id AND i.matched_user_id = m.matched_user_id
           ) AS has_interest,
           EXISTS(
             SELECT 1 FROM interests i2
             WHERE i2.user_id = m.matched_user_id AND i2.matched_user_id = m.user_id
           ) AS reciprocal_interest
         FROM matches m
         JOIN users c ON c.id = m.matched_user_id
         WHERE m.user_id = ? AND m.expires_at > NOW()
         ORDER BY m.created_at ASC`,
        [selectedUser.id]
      )
    : [];

  const mutualMatches = selectedUser
    ? await query<MutualMatchRow>(
        `SELECT mm.id, mm.status, mm.matched_at, u.full_name AS other_name
         FROM mutual_matches mm
         JOIN users u ON u.id = (CASE WHEN mm.user_a_id = ? THEN mm.user_b_id ELSE mm.user_a_id END)
         WHERE mm.user_a_id = ? OR mm.user_b_id = ?
         ORDER BY mm.matched_at DESC`,
        [selectedUser.id, selectedUser.id, selectedUser.id]
      )
    : [];

  return (
    <main className="px-6 py-10 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="gilded-heading font-display text-3xl mb-1">Matches</h1>
        <p className="font-sans text-sm text-[var(--paper-dim)]">
          Search a member to view and override their curated matches.
        </p>
      </div>

      <form method="GET" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name, email, or phone"
          className="font-sans text-sm bg-paper text-[var(--text-on-paper)] border border-black/10 rounded-lg px-3 py-2 flex-1"
        />
        <button
          type="submit"
          className="font-sans text-sm px-4 py-2 rounded-lg bg-gold text-ink font-medium"
        >
          Search
        </button>
      </form>

      {q && !selectedUser && (
        <div className="bg-paper text-[var(--text-on-paper)] rounded-xl divide-y divide-black/10">
          {results.length === 0 ? (
            <p className="font-sans text-sm opacity-70 px-4 py-6">No members found.</p>
          ) : (
            results.map((u) => (
              <Link
                key={u.id}
                href={`/admin/matches?userId=${u.id}`}
                className="block px-4 py-3 font-sans text-sm hover:bg-black/5"
              >
                <span className="font-medium">{u.full_name ?? "Unnamed"}</span>{" "}
                <span className="opacity-60">{u.email ?? u.phone}</span>
              </Link>
            ))
          )}
        </div>
      )}

      {selectedUser && (
        <div className="space-y-6">
          <div className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-5">
            <p className="font-sans text-xs uppercase tracking-wide opacity-50 mb-1">
              Managing matches for
            </p>
            <h2 className="font-display text-xl">{selectedUser.full_name ?? "Unnamed"}</h2>
            <p className="font-sans text-sm opacity-60">
              {selectedUser.email ?? selectedUser.phone}
            </p>
            <Link href="/admin/matches" className="font-sans text-xs text-gold-soft hover:underline mt-2 inline-block">
              ← Search a different member
            </Link>
          </div>

          <div className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-5">
            <h3 className="font-sans text-sm font-medium mb-3">Current batch</h3>
            {batch.length === 0 ? (
              <p className="font-sans text-sm opacity-60 mb-4">
                No live batch right now (expired, none generated yet, or ineligible).
              </p>
            ) : (
              <ul className="space-y-2 mb-4">
                {batch.map((row) => (
                  <li
                    key={row.match_id}
                    className="flex items-center justify-between gap-3 font-sans text-sm border border-black/10 rounded-lg px-3 py-2"
                  >
                    <div>
                      <span className="font-medium">{row.candidate_name ?? "Unnamed"}</span>{" "}
                      <span className="opacity-60">{row.candidate_email}</span>
                      <div className="flex gap-2 mt-1">
                        {Boolean(row.has_interest) && (
                          <span className="text-xs bg-[var(--gold)]/20 text-[var(--gold)] px-1.5 py-0.5 rounded-full">
                            Interested
                          </span>
                        )}
                        {Boolean(row.reciprocal_interest) && (
                          <span className="text-xs bg-[var(--jade)]/15 text-[var(--jade)] px-1.5 py-0.5 rounded-full">
                            Reciprocal interest
                          </span>
                        )}
                      </div>
                    </div>
                    <RemoveMatchButton matchId={row.match_id} />
                  </li>
                ))}
              </ul>
            )}
            <AddCandidateForm userId={selectedUser.id} />
          </div>

          <div className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-5">
            <h3 className="font-sans text-sm font-medium mb-3">Mutual matches</h3>
            {mutualMatches.length === 0 ? (
              <p className="font-sans text-sm opacity-60 mb-4">None yet.</p>
            ) : (
              <ul className="space-y-1 mb-4 font-sans text-sm">
                {mutualMatches.map((mm) => (
                  <li key={mm.id} className="opacity-80">
                    {mm.other_name ?? "Unnamed"} —{" "}
                    <span className={mm.status === "active" ? "text-[var(--jade)]" : "opacity-60"}>
                      {mm.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <ForceMutualForm userId={selectedUser.id} />
          </div>
        </div>
      )}
    </main>
  );
}
