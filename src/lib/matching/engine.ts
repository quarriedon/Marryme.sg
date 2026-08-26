import type { SupabaseClient } from "@supabase/supabase-js";
import type { Interest, MatchRow, MutualMatch, Profile } from "@/types/database";
import { BATCH_SIZE, MAX_INTERESTS_PER_BATCH, BATCH_DURATION_DAYS } from "@/lib/matching/constants";

export { BATCH_SIZE, MAX_INTERESTS_PER_BATCH, BATCH_DURATION_DAYS };

function ageFromDob(dateOfBirth: string, on: Date = new Date()): number {
  const dob = new Date(dateOfBirth);
  let age = on.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    on.getMonth() > dob.getMonth() ||
    (on.getMonth() === dob.getMonth() && on.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

/**
 * Rule 2 (faith filtering): if faith matters to a user, they may only
 * be matched with someone whose faith is compatible — same faith, or
 * both parties open to marrying across faiths. If faith does not
 * matter to a user, they may only be matched with other users for
 * whom it also does not matter — the two pools never mix.
 */
export function isFaithCompatible(a: Profile, b: Profile): boolean {
  if (a.faith_matters_to_them !== b.faith_matters_to_them) return false;
  if (!a.faith_matters_to_them) return true; // neither cares — compatible

  if (a.own_faith && b.own_faith && a.own_faith === b.own_faith) return true;
  return Boolean(a.open_to_other_faith && b.open_to_other_faith);
}

/**
 * Mutual preference check: each person's stated gender/age preference
 * (when set) must be satisfied by the other. Location is a one-way
 * preference on the viewer's side, per the build spec.
 */
export function isPreferenceCompatible(a: Profile, b: Profile): boolean {
  if (a.preferred_gender && b.gender && a.preferred_gender !== b.gender) {
    return false;
  }
  if (b.preferred_gender && a.gender && b.preferred_gender !== a.gender) {
    return false;
  }

  if (b.date_of_birth) {
    const bAge = ageFromDob(b.date_of_birth);
    if (a.preferred_age_min && bAge < a.preferred_age_min) return false;
    if (a.preferred_age_max && bAge > a.preferred_age_max) return false;
  }
  if (a.date_of_birth) {
    const aAge = ageFromDob(a.date_of_birth);
    if (b.preferred_age_min && aAge < b.preferred_age_min) return false;
    if (b.preferred_age_max && aAge > b.preferred_age_max) return false;
  }

  if (a.preferred_location && b.location && a.preferred_location !== b.location) {
    return false;
  }

  return true;
}

export function isEligibleCandidatePair(a: Profile, b: Profile): boolean {
  return isFaithCompatible(a, b) && isPreferenceCompatible(a, b);
}

async function hasActiveMutualMatch(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { count } = await supabase
    .from("mutual_matches")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);
  return Boolean(count && count > 0);
}

async function isInCoolingOff(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { count } = await supabase
    .from("mutual_matches")
    .select("id", { count: "exact", head: true })
    .eq("status", "ended")
    .gt("cooling_off_until", new Date().toISOString())
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);
  return Boolean(count && count > 0);
}

async function hasUnexpiredBatch(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString());
  return Boolean(count && count > 0);
}

/**
 * Rule 5: a user can only have one active mutual match at a time.
 * Rule 7: after a mutual match ends, no new batches until cooling-off
 * passes. Rule 6: a batch with no mutual match after 7 days expires,
 * and a fresh one is generated — handled implicitly here, since an
 * expired batch simply no longer counts as "unexpired" on the next
 * scheduled run.
 */
async function isEligibleForNewBatch(
  supabase: SupabaseClient,
  profile: Profile
): Promise<boolean> {
  if (profile.status !== "approved") return false;
  if (!profile.gender || !profile.date_of_birth) return false; // onboarding incomplete

  const [activeMatch, coolingOff, unexpiredBatch] = await Promise.all([
    hasActiveMutualMatch(supabase, profile.id),
    isInCoolingOff(supabase, profile.id),
    hasUnexpiredBatch(supabase, profile.id),
  ]);

  return !activeMatch && !coolingOff && !unexpiredBatch;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Builds one user's candidate pool from the full approved-profile
 * pool: faith- and preference-compatible, not currently in an active
 * mutual match themselves (they're unavailable), excluding anyone
 * this user has an existing (any-status) mutual match history with.
 */
async function candidatesFor(
  supabase: SupabaseClient,
  user: Profile,
  approvedPool: Profile[]
): Promise<Profile[]> {
  const { data: pastMatches } = await supabase
    .from("mutual_matches")
    .select("user_a_id, user_b_id")
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);

  const pastPartnerIds = new Set(
    (pastMatches ?? []).map((m: { user_a_id: string; user_b_id: string }) =>
      m.user_a_id === user.id ? m.user_b_id : m.user_a_id
    )
  );

  const candidateIds = approvedPool
    .filter((c) => c.id !== user.id)
    .filter((c) => !pastPartnerIds.has(c.id))
    .filter((c) => isEligibleCandidatePair(user, c))
    .map((c) => c.id);

  if (candidateIds.length === 0) return [];

  // Exclude anyone currently in an active mutual match (unavailable).
  const { data: takenRows } = await supabase
    .from("mutual_matches")
    .select("user_a_id, user_b_id")
    .eq("status", "active")
    .or(
      `user_a_id.in.(${candidateIds.join(",")}),user_b_id.in.(${candidateIds.join(",")})`
    );

  const takenIds = new Set(
    (takenRows ?? []).flatMap((m: { user_a_id: string; user_b_id: string }) => [
      m.user_a_id,
      m.user_b_id,
    ])
  );

  return approvedPool.filter(
    (c) => candidateIds.includes(c.id) && !takenIds.has(c.id)
  );
}

/**
 * Generates one batch of up to BATCH_SIZE curated matches for a
 * single user, if they're currently eligible. Returns the new
 * batch_id, or null if no batch was generated (ineligible, or no
 * candidates available).
 */
export async function generateBatchForUser(
  supabase: SupabaseClient,
  user: Profile,
  approvedPool: Profile[]
): Promise<string | null> {
  if (!(await isEligibleForNewBatch(supabase, user))) return null;

  const candidates = shuffle(await candidatesFor(supabase, user, approvedPool)).slice(
    0,
    BATCH_SIZE
  );
  if (candidates.length === 0) return null;

  const batchId = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + BATCH_DURATION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error } = await supabase.from("matches").insert(
    candidates.map((c) => ({
      user_id: user.id,
      matched_user_id: c.id,
      batch_id: batchId,
      expires_at: expiresAt,
    }))
  );
  if (error) throw error;

  return batchId;
}

/**
 * Scheduled entry point (Rule 8): run on a cadence (e.g. daily) to
 * expire stale batches and top up anyone who's eligible but doesn't
 * currently have a live batch — new signups, batches that expired
 * with no mutual match, and users whose cooling-off just ended.
 */
export async function runScheduledMatching(supabase: SupabaseClient): Promise<{
  usersProcessed: number;
  batchesGenerated: number;
}> {
  const { data: approvedPool, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "approved");
  if (error) throw error;

  const pool = (approvedPool ?? []) as Profile[];
  let batchesGenerated = 0;

  for (const user of pool) {
    const batchId = await generateBatchForUser(supabase, user, pool);
    if (batchId) batchesGenerated += 1;
  }

  return { usersProcessed: pool.length, batchesGenerated };
}

export class InterestLimitError extends Error {
  constructor() {
    super(`You can only express interest in up to ${MAX_INTERESTS_PER_BATCH} matches per batch.`);
    this.name = "InterestLimitError";
  }
}

/**
 * On-demand entry point (Rule 8): called when a user expresses
 * interest in one of their curated matches. Enforces the max-2 cap
 * (Rule 3) and checks for a mutual match immediately, rather than
 * waiting for the next scheduled run.
 */
export async function expressInterest(
  supabase: SupabaseClient,
  userId: string,
  matchedUserId: string,
  batchId: string
): Promise<{ interest: Interest; mutualMatch: MutualMatch | null }> {
  const { data: matchRow, error: matchError } = await supabase
    .from("matches")
    .select("*")
    .eq("user_id", userId)
    .eq("batch_id", batchId)
    .eq("matched_user_id", matchedUserId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (matchError) throw matchError;
  if (!matchRow) {
    throw new Error("This match is no longer available.");
  }

  const { count: existingInterests, error: countError } = await supabase
    .from("interests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("batch_id", batchId);
  if (countError) throw countError;

  const alreadyExpressed = await supabase
    .from("interests")
    .select("id")
    .eq("user_id", userId)
    .eq("batch_id", batchId)
    .eq("matched_user_id", matchedUserId)
    .maybeSingle();

  if (!alreadyExpressed.data && (existingInterests ?? 0) >= MAX_INTERESTS_PER_BATCH) {
    throw new InterestLimitError();
  }

  const { data: interest, error: insertError } = await supabase
    .from("interests")
    .upsert(
      { user_id: userId, matched_user_id: matchedUserId, batch_id: batchId },
      { onConflict: "user_id,matched_user_id,batch_id" }
    )
    .select()
    .single();
  if (insertError) throw insertError;

  const mutualMatch = await checkForMutualMatch(supabase, userId, matchedUserId);

  return { interest: interest as Interest, mutualMatch };
}

/**
 * Rule 4: if the other user has already expressed interest back (in
 * any of their own batches), the interest is mutual — create the
 * mutual_match and unlock chat. Rule 5 (one active match at a time)
 * is enforced by refusing to create a second active mutual match for
 * either party.
 */
export async function checkForMutualMatch(
  supabase: SupabaseClient,
  userId: string,
  otherUserId: string
): Promise<MutualMatch | null> {
  const { data: reciprocal, error } = await supabase
    .from("interests")
    .select("id")
    .eq("user_id", otherUserId)
    .eq("matched_user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!reciprocal) return null;

  const [userTaken, otherTaken] = await Promise.all([
    hasActiveMutualMatch(supabase, userId),
    hasActiveMutualMatch(supabase, otherUserId),
  ]);
  if (userTaken || otherTaken) return null;

  const [userAId, userBId] = [userId, otherUserId].sort();

  const { data: mutualMatch, error: insertError } = await supabase
    .from("mutual_matches")
    .insert({ user_a_id: userAId, user_b_id: userBId, status: "active" })
    .select()
    .single();
  if (insertError) throw insertError;

  return mutualMatch as MutualMatch;
}

export type { MatchRow };
