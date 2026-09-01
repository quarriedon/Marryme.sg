import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { verifyAndConsumeOtp } from "@/lib/otp";
import type { UserRow } from "@/types/database";

/**
 * Attaches a verified phone number to the *currently signed-in*
 * account — used on the profile form when someone signed up with
 * email/password and phone is being collected for the first time.
 * (Someone who signed up via phone OTP already has a verified phone;
 * this route is for the other case.) Distinct from the NextAuth
 * "phone-otp" provider in src/lib/auth.ts, which verifies a code to
 * issue a *session* rather than update an existing one.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const phone = body?.phone;
  const code = body?.code;
  if (typeof phone !== "string" || typeof code !== "string") {
    return NextResponse.json({ error: "Phone and code are required." }, { status: 400 });
  }

  const valid = await verifyAndConsumeOtp(phone, code);
  if (!valid) {
    return NextResponse.json(
      { error: "That code didn't work — check it and try again." },
      { status: 400 }
    );
  }

  const existing = await queryOne<UserRow>(
    "SELECT id FROM users WHERE phone = ? AND id <> ? LIMIT 1",
    [phone, session.user.id]
  );
  if (existing) {
    return NextResponse.json(
      { error: "This phone number is already linked to another account." },
      { status: 409 }
    );
  }

  await query("UPDATE users SET phone = ? WHERE id = ?", [phone, session.user.id]);
  return NextResponse.json({ ok: true });
}
