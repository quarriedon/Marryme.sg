import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import type { MembershipTier, UserRow } from "@/types/database";

const TIERS: MembershipTier[] = ["founding", "regular", "priority"];

/** Grants a new membership row for a member — see /admin/memberships. */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const { email, tier, expiresAt } = body ?? {};

  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  if (!TIERS.includes(tier)) {
    return NextResponse.json({ error: "Invalid tier." }, { status: 400 });
  }
  if (typeof expiresAt !== "string" || Number.isNaN(new Date(expiresAt).getTime())) {
    return NextResponse.json({ error: "A valid expiry date is required." }, { status: 400 });
  }

  const user = await queryOne<UserRow>("SELECT id FROM users WHERE email = ?", [email.trim()]);
  if (!user) {
    return NextResponse.json({ error: "No member found with that email." }, { status: 404 });
  }

  await query(
    "INSERT INTO memberships (id, user_id, tier, started_at, expires_at) VALUES (UUID(), ?, ?, NOW(), ?)",
    [user.id, tier, expiresAt]
  );

  return NextResponse.json({ ok: true });
}
