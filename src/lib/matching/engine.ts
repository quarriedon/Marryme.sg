import { query, queryOne, withTransaction } from "@/lib/db";
import type { Interest, MatchRow, MutualMatch, Profile, UserRow } from "@/types/database";
import { BATCH_SIZE, MAX_INTERESTS_PER_BATCH, BATCH_DURATION_DAYS } from "@/lib/matching/constants";

export { BATCH_SIZE, MAX_INTERESTS_PER_BATCH, BATCH_DURATION_DAYS };

/** MySQL returns TINYINT booleans as 0/1 and JSON columns pre-parsed — normalize to the shape the engine works with. */
function toProfile(row: UserRow): Profile {
  return {
    ...row,
    faith_matters_to_them: Boolean(row.faith_matters_to_them),
    open_to_other_faith:
      row.open_to_other_faith === null ? null : Boolean(row.open_to_other_faith),
    photos: row.photos ?? [],
  };
}

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

async function hasActiveMutualMatch(userId: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM mutual_matches
     WHERE status = 'active' AND (user_a_id = ? OR user_b_id = ?)
     LIMIT 1`,
    [userId, userId]
  );
  return row !== null;
}

async function isInCoolingOff(userId: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM mutual_matches
     WHERE status = 'ended' AND cooling_off_until > NOW()
       AND (user_a_id = ? OR user_b_id = ?)
     LIMIT 1`,
    [userId, userId]
  );
  return row !== null;
}

async function hasUnexpiredBatch(userId: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM matches WHERE user_id = ? AND expires_at > NOW() LIMIT 1`,
    [userId]
  );
  return row !== null;
}

/**
 * Rule 5: a user can only have one active mutual match at a time.
 * Rule 7: after a mutual match ends, no new batches until cooling-off
 * passes. Rule 6: a batch with no mutual match after 7 days expires,
 * and a fresh one is generated — handled implicitly here, since an
 * expired batch simply no longer counts as "unexpired" on the next
 * scheduled run.
 */
async function isEligibleForNewBatch(profile: Profile): Promise<boolean> {
  if (profile.status !== "approved") return false;
  if (!profile.gender || !profile.date_of_birth) return false; // onboarding incomplete

  const [activeMatch, coolingOff, unexpiredBatch] = await Promise.all([
    hasActiveMutualMatch(profile.id),
    isInCoolingOff(profile.id),
    hasUnexpiredBatch(profile.id),
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
async function candidatesFor(user: Profile, approvedPool: Profile[]): Promise<Profile[]> {
  const pastMatches = await query<{ user_a_id: string; user_b_id: string }>(
    `SELECT user_a_id, user_b_id FROM mutual_matches WHERE user_a_id = ? OR user_b_id = ?`,
    [user.id, user.id]
  );

  const pastPartnerIds = new Set(
    pastMatches.map((m) => (m.user_a_id === user.id ? m.user_b_id : m.user_a_id))
  );

  const candidates = approvedPool
    .filter((c) => c.id !== user.id)
    .filter((c) => !pastPartnerIds.has(c.id))
    .filter((c) => isEligibleCandidatePair(user, c));

  if (candidates.length === 0) return [];

  // Exclude anyone currently in an active mutual match (unavailable).
  const candidateIds = candidates.map((c) => c.id);
  const placeholders = candidateIds.map(() => "?").join(",");
  const takenRows = await query<{ user_a_id: string; user_b_id: string }>(
    `SELECT user_a_id, user_b_id FROM mutual_matches
     WHERE status = 'active' AND (user_a_id IN (${placeholders}) OR user_b_id IN (${placeholders}))`,
    [...candidateIds, ...candidateIds]
  );
  const takenIds = new Set(takenRows.flatMap((m) => [m.user_a_id, m.user_b_id]));

  return candidates.filter((c) => !takenIds.has(c.id));
}

/**
 * Generates one batch of up to BATCH_SIZE curated matches for a
 * single user, if they're currently eligible. Returns the new
 * batch_id, or null if no batch was generated (ineligible, or no
 * candidates available).
 */
export async function generateBatchForUser(
  user: Profile,
  approvedPool: Profile[]
): Promise<string | null> {
  if (!(await isEligibleForNewBatch(user))) return null;

  const candidates = shuffle(await candidatesFor(user, approvedPool)).slice(0, BATCH_SIZE);
  if (candidates.length === 0) return null;

  const batchId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + BATCH_DURATION_DAYS * 24 * 60 * 60 * 1000);

  const values = candidates.map((c) => [crypto.randomUUID(), user.id, c.id, batchId, expiresAt]);
  const placeholders = values.map(() => "(?, ?, ?, ?, ?)").join(", ");
  await query(
    `INSERT INTO matches (id, user_id, matched_user_id, batch_id, expires_at) VALUES ${placeholders}`,
    values.flat()
  );

  return batchId;
}

/**
 * Scheduled entry point (Rule 8): run on a cadence (e.g. daily) to
 * expire stale batches and top up anyone who's eligible but doesn't
 * currently have a live batch — new signups, batches that expired
 * with no mutual match, and users whose cooling-off just ended.
 */
export async function runScheduledMatching(): Promise<{
  usersProcessed: number;
  batchesGenerated: number;
}> {
  const rows = await query<UserRow>(`SELECT * FROM users WHERE status = 'approved'`);
  const pool = rows.map(toProfile);
  let batchesGenerated = 0;

  for (const user of pool) {
    const batchId = await generateBatchForUser(user, pool);
    if (batchId) batchesGenerated += 1;
  }

  return { usersProcessed: pool.length, batchesGenerated };
}

export class InterestLimitError extends Error {
  constructor() {
    super(
      `You can only express interest in up to ${MAX_INTERESTS_PER_BATCH} matches per batch.`
    );
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
  userId: string,
  matchedUserId: string,
  batchId: string
): Promise<{ interest: Interest; mutualMatch: MutualMatch | null }> {
  const matchRow = await queryOne<MatchRow>(
    `SELECT * FROM matches
     WHERE user_id = ? AND batch_id = ? AND matched_user_id = ? AND expires_at > NOW()
     LIMIT 1`,
    [userId, batchId, matchedUserId]
  );
  if (!matchRow) {
    throw new Error("This match is no longer available.");
  }

  const alreadyExpressed = await queryOne<Interest>(
    `SELECT * FROM interests WHERE user_id = ? AND batch_id = ? AND matched_user_id = ? LIMIT 1`,
    [userId, batchId, matchedUserId]
  );

  if (!alreadyExpressed) {
    const existingCount = await query<{ id: string }>(
      `SELECT id FROM interests WHERE user_id = ? AND batch_id = ?`,
      [userId, batchId]
    );
    if (existingCount.length >= MAX_INTERESTS_PER_BATCH) {
      throw new InterestLimitError();
    }

    const id = crypto.randomUUID();
    await query(
      `INSERT INTO interests (id, user_id, matched_user_id, batch_id) VALUES (?, ?, ?, ?)`,
      [id, userId, matchedUserId, batchId]
    );
  }

  const interest = await queryOne<Interest>(
    `SELECT * FROM interests WHERE user_id = ? AND batch_id = ? AND matched_user_id = ? LIMIT 1`,
    [userId, batchId, matchedUserId]
  );
  if (!interest) throw new Error("Failed to record interest.");

  const mutualMatch = await checkForMutualMatch(userId, matchedUserId);

  return { interest, mutualMatch };
}

/**
 * Rule 4: if the other user has already expressed interest back (in
 * any of their own batches), the interest is mutual — create the
 * mutual_match and unlock chat. Rule 5 (one active match at a time)
 * is enforced by refusing to create a second active mutual match for
 * either party. Runs inside a transaction with locking reads to keep
 * the check-then-insert as safe as MySQL reasonably allows here.
 */
export async function checkForMutualMatch(
  userId: string,
  otherUserId: string
): Promise<MutualMatch | null> {
  const reciprocal = await queryOne<Interest>(
    `SELECT id FROM interests WHERE user_id = ? AND matched_user_id = ? LIMIT 1`,
    [otherUserId, userId]
  );
  if (!reciprocal) return null;

  const [userAId, userBId] = [userId, otherUserId].sort();

  return withTransaction(async (conn) => {
    const [existingActiveRows] = await conn.query(
      `SELECT id FROM mutual_matches
       WHERE status = 'active' AND (user_a_id IN (?, ?) OR user_b_id IN (?, ?))
       FOR UPDATE`,
      [userId, otherUserId, userId, otherUserId]
    );
    if ((existingActiveRows as unknown[]).length > 0) return null;

    const id = crypto.randomUUID();
    await conn.query(
      `INSERT INTO mutual_matches (id, user_a_id, user_b_id, status) VALUES (?, ?, ?, 'active')`,
      [id, userAId, userBId]
    );

    const [rows] = await conn.query(`SELECT * FROM mutual_matches WHERE id = ?`, [id]);
    return (rows as MutualMatch[])[0] ?? null;
  });
}

export type { MatchRow };
