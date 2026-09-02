import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne, withTransaction } from "@/lib/db";
import { BATCH_DURATION_DAYS, BATCH_SIZE } from "@/lib/matching/constants";
import type { MatchRow, UserRow } from "@/types/database";

/**
 * Admin overrides for a user's curated matches — used for support
 * cases where the algorithm's suggestion needs a human correction
 * (e.g. a candidate who shouldn't have been shown, or manually
 * pairing two members). Three actions, one endpoint:
 *
 * - "remove": drop one candidate from a user's current batch.
 * - "add": add a specific other member as a candidate in a user's
 *   current (or new) batch.
 * - "force_mutual": create a mutual match between two members
 *   directly, bypassing the reciprocal-interest requirement — still
 *   respects the "one active mutual match at a time" rule.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.action !== "string") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (body.action === "remove") {
    const matchId = body.matchId;
    if (typeof matchId !== "string") {
      return NextResponse.json({ error: "matchId is required." }, { status: 400 });
    }
    const match = await queryOne<MatchRow>("SELECT * FROM matches WHERE id = ?", [matchId]);
    if (!match) {
      return NextResponse.json({ error: "Match not found." }, { status: 404 });
    }
    await query("DELETE FROM matches WHERE id = ?", [matchId]);
    await query(
      "DELETE FROM interests WHERE user_id = ? AND batch_id = ? AND matched_user_id = ?",
      [match.user_id, match.batch_id, match.matched_user_id]
    );
    return NextResponse.json({ ok: true });
  }

  if (body.action === "add") {
    const { userId, candidateEmail } = body;
    if (typeof userId !== "string" || typeof candidateEmail !== "string") {
      return NextResponse.json(
        { error: "userId and candidateEmail are required." },
        { status: 400 }
      );
    }
    const candidate = await queryOne<UserRow>("SELECT id FROM users WHERE email = ?", [
      candidateEmail.trim(),
    ]);
    if (!candidate) {
      return NextResponse.json({ error: "No member found with that email." }, { status: 404 });
    }
    if (candidate.id === userId) {
      return NextResponse.json({ error: "Can't match a user with themselves." }, { status: 400 });
    }

    const existingBatch = await queryOne<{ batch_id: string }>(
      "SELECT batch_id FROM matches WHERE user_id = ? AND expires_at > NOW() LIMIT 1",
      [userId]
    );
    const batchId = existingBatch?.batch_id ?? crypto.randomUUID();
    const expiresAt = new Date(Date.now() + BATCH_DURATION_DAYS * 24 * 60 * 60 * 1000);

    if (!existingBatch) {
      // Nothing to top up — this is a fresh batch of one.
    } else {
      const count = await query<{ id: string }>(
        "SELECT id FROM matches WHERE user_id = ? AND batch_id = ?",
        [userId, batchId]
      );
      if (count.length >= BATCH_SIZE) {
        return NextResponse.json(
          { error: `This user's current batch already has ${BATCH_SIZE} candidates.` },
          { status: 400 }
        );
      }
    }

    const already = await queryOne<MatchRow>(
      "SELECT id FROM matches WHERE user_id = ? AND batch_id = ? AND matched_user_id = ?",
      [userId, batchId, candidate.id]
    );
    if (already) {
      return NextResponse.json(
        { error: "This candidate is already in the user's current batch." },
        { status: 400 }
      );
    }

    await query(
      `INSERT INTO matches (id, user_id, matched_user_id, batch_id, expires_at) VALUES (?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), userId, candidate.id, batchId, expiresAt]
    );
    return NextResponse.json({ ok: true });
  }

  if (body.action === "force_mutual") {
    const { userId, candidateEmail } = body;
    if (typeof userId !== "string" || typeof candidateEmail !== "string") {
      return NextResponse.json(
        { error: "userId and candidateEmail are required." },
        { status: 400 }
      );
    }
    const candidate = await queryOne<UserRow>("SELECT id FROM users WHERE email = ?", [
      candidateEmail.trim(),
    ]);
    if (!candidate) {
      return NextResponse.json({ error: "No member found with that email." }, { status: 404 });
    }
    if (candidate.id === userId) {
      return NextResponse.json({ error: "Can't match a user with themselves." }, { status: 400 });
    }

    const [userAId, userBId] = [userId, candidate.id].sort();

    const result = await withTransaction(async (conn) => {
      const [existingActiveRows] = await conn.query(
        `SELECT id FROM mutual_matches
         WHERE status = 'active' AND (user_a_id IN (?, ?) OR user_b_id IN (?, ?))
         FOR UPDATE`,
        [userId, candidate.id, userId, candidate.id]
      );
      if ((existingActiveRows as unknown[]).length > 0) {
        return { error: "One of these members already has an active mutual match." };
      }

      await conn.query(
        `INSERT INTO mutual_matches (id, user_a_id, user_b_id, status) VALUES (?, ?, ?, 'active')`,
        [crypto.randomUUID(), userAId, userBId]
      );
      return { error: null };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
