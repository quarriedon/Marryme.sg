// "My Profile" / activity section — a read-only view pulling from
// existing tables only (users, mutual_matches, memberships,
// personality_responses, matches). No new backend logic beyond
// querying and displaying what's already there.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { ageFromDob } from "@/lib/age";
import { DeleteAccountSection } from "@/components/DeleteAccountSection";
import type { Membership, UserRow } from "@/types/database";

const COMMUNITY_LABELS: Record<string, string> = {
  chinese: "Chinese",
  malay: "Malay",
  indian: "Indian",
  eurasian: "Eurasian",
  other: "Other",
};

const INTENT_LABELS: Record<string, string> = {
  marriage_minded: "Marriage-minded",
  open_to_marriage: "Open to marriage",
  not_sure: "Not sure yet",
};

type MutualMatchRow = {
  id: string;
  status: "active" | "ended";
  matched_at: string;
  other_name: string | null;
};

export default async function MyProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const user = await queryOne<UserRow>("SELECT * FROM users WHERE id = ?", [userId]);
  if (!user) redirect("/login");

  const membership = await queryOne<Membership>(
    "SELECT * FROM memberships WHERE user_id = ? ORDER BY started_at DESC LIMIT 1",
    [userId]
  );

  const mutualMatches = await query<MutualMatchRow>(
    `SELECT mm.id, mm.status, mm.matched_at,
            u.full_name AS other_name
     FROM mutual_matches mm
     JOIN users u ON u.id = (CASE WHEN mm.user_a_id = ? THEN mm.user_b_id ELSE mm.user_a_id END)
     WHERE mm.user_a_id = ? OR mm.user_b_id = ?
     ORDER BY mm.matched_at DESC`,
    [userId, userId, userId]
  );

  const [batchStats] = await query<{ batch_count: number; interests_sent: number }>(
    `SELECT
       (SELECT COUNT(DISTINCT batch_id) FROM matches WHERE user_id = ?) AS batch_count,
       (SELECT COUNT(*) FROM interests WHERE user_id = ?) AS interests_sent`,
    [userId, userId]
  );

  const personalityTest = await queryOne<{ completed_at: string }>(
    "SELECT completed_at FROM personality_responses WHERE user_id = ?",
    [userId]
  );

  const age = user.date_of_birth ? ageFromDob(user.date_of_birth) : null;
  const photoUrl = user.photos?.[0];
  const activeMatch = mutualMatches.find((m) => m.status === "active");

  return (
    <main className="px-6 py-10 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="gilded-heading font-display text-3xl mb-1">My profile</h1>
        <p className="font-sans text-sm text-[var(--paper-dim)]">
          How your profile looks to a curated match, plus your account activity.
        </p>
      </div>

      {/* Profile preview */}
      <section className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-6">
        <p className="font-sans text-xs uppercase tracking-wide opacity-50 mb-3">
          Preview — as others see it
        </p>
        <div className="flex gap-4 items-start">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic, auth-gated route
            <img
              src={photoUrl}
              alt={user.full_name ?? "Your profile photo"}
              className="w-24 h-24 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-lg bg-black/10 shrink-0 flex items-center justify-center text-xs opacity-50">
              No photo
            </div>
          )}
          <div>
            <div className="flex items-baseline gap-2">
              <h2 className="font-display text-xl">{user.full_name ?? "Unnamed"}</h2>
              {age != null && <span className="font-sans text-sm opacity-60">{age}</span>}
            </div>
            <p className="font-sans text-xs uppercase tracking-wide opacity-50 mt-1">
              {[user.occupation, user.location].filter(Boolean).join(" · ")}
            </p>
            {user.bio && <p className="font-sans text-sm mt-2 opacity-90">{user.bio}</p>}
            <p className="font-sans text-xs opacity-60 mt-2">
              {user.community && COMMUNITY_LABELS[user.community]}
              {user.own_faith ? ` · ${user.own_faith}` : ""}
              {user.relationship_intent ? ` · ${INTENT_LABELS[user.relationship_intent]}` : ""}
            </p>
          </div>
        </div>
        <Link
          href="/onboarding/profile"
          className="inline-block mt-4 font-sans text-sm underline text-[var(--jade)]"
        >
          Edit profile
        </Link>
      </section>

      {/* Membership */}
      <section className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-6">
        <p className="font-sans text-xs uppercase tracking-wide opacity-50 mb-2">Membership</p>
        {membership ? (
          <p className="font-sans text-sm">
            <span className="font-medium capitalize">{membership.tier}</span> member — expires{" "}
            {new Date(membership.expires_at).toLocaleDateString("en-SG", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        ) : (
          <p className="font-sans text-sm opacity-70">
            No active membership yet.{" "}
            <span className="opacity-50">(Billing isn&rsquo;t live yet — coming soon.)</span>
          </p>
        )}
      </section>

      {/* Match history */}
      <section className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-6">
        <p className="font-sans text-xs uppercase tracking-wide opacity-50 mb-3">Match history</p>
        <div className="grid grid-cols-2 gap-4 mb-4 font-sans text-sm">
          <div>
            <p className="text-2xl font-display">{batchStats?.batch_count ?? 0}</p>
            <p className="opacity-60 text-xs">Curated batches received</p>
          </div>
          <div>
            <p className="text-2xl font-display">{batchStats?.interests_sent ?? 0}</p>
            <p className="opacity-60 text-xs">Interests you&rsquo;ve sent</p>
          </div>
        </div>

        {mutualMatches.length === 0 ? (
          <p className="font-sans text-sm opacity-70">No mutual matches yet.</p>
        ) : (
          <ul className="space-y-2">
            {mutualMatches.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between font-sans text-sm border-t border-black/10 pt-2"
              >
                <span>{m.other_name ?? "Someone"}</span>
                <span
                  className={`text-xs uppercase tracking-wide px-2 py-0.5 rounded-full ${
                    m.status === "active" ? "bg-jade text-white" : "bg-black/10 opacity-70"
                  }`}
                >
                  {m.status === "active" ? "Active conversation" : "Ended"}
                </span>
              </li>
            ))}
          </ul>
        )}

        {activeMatch && (
          <Link
            href="/dashboard/messages"
            className="inline-block mt-4 font-sans text-sm underline text-[var(--jade)]"
          >
            Go to messages
          </Link>
        )}
      </section>

      {/* Activity summary */}
      <section className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-6">
        <p className="font-sans text-xs uppercase tracking-wide opacity-50 mb-3">Activity</p>
        <dl className="font-sans text-sm space-y-2">
          <div className="flex justify-between">
            <dt className="opacity-60">Account created</dt>
            <dd>
              {new Date(user.created_at).toLocaleDateString("en-SG", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="opacity-60">Last active</dt>
            <dd>
              {user.last_login_at
                ? new Date(user.last_login_at).toLocaleDateString("en-SG", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="opacity-60">Personality test</dt>
            <dd>
              {personalityTest ? (
                "Completed"
              ) : (
                <Link href="/onboarding/personality-test" className="underline text-[var(--jade)]">
                  Not completed yet
                </Link>
              )}
            </dd>
          </div>
        </dl>
      </section>

      {/* Account settings */}
      <section className="bg-paper text-[var(--text-on-paper)] rounded-xl px-6 py-6">
        <p className="font-sans text-xs uppercase tracking-wide opacity-50 mb-3">
          Account settings
        </p>
        <DeleteAccountSection />
      </section>
    </main>
  );
}
