import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query, queryOne } from "@/lib/db";
import type { UserRow } from "@/types/database";

/**
 * Creates an email/password account. Sign-in itself happens
 * separately, client-side, via next-auth's `signIn("credentials", …)`
 * — this route only validates and inserts the row.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = body?.email;
  const password = body?.password;

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const existing = await queryOne<UserRow>(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await query("INSERT INTO users (email, password_hash) VALUES (?, ?)", [
    email,
    passwordHash,
  ]);

  return NextResponse.json({ ok: true });
}
