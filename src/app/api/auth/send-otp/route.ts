import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

const OTP_TTL_MINUTES = 10;

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Generates and stores a one-time phone verification code (replaces
 * Supabase Auth's built-in `signInWithOtp`). Verification happens via
 * next-auth's "phone-otp" Credentials provider (see src/lib/auth.ts).
 *
 * No SMS provider is wired up yet — for now the code is logged
 * server-side so you can test the flow locally. Wire this up to
 * Twilio (or similar) before launch.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const phone = body?.phone;
  if (typeof phone !== "string" || phone.trim().length === 0) {
    return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await query(
    "INSERT INTO otp_codes (phone, code_hash, expires_at) VALUES (?, ?, ?)",
    [phone, codeHash, expiresAt]
  );

  // TODO: send via Twilio (or similar) instead of logging.
  console.log(`[send-otp] verification code for ${phone}: ${code}`);

  return NextResponse.json({ ok: true });
}
