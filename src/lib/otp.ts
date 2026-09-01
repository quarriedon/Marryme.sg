import bcrypt from "bcryptjs";
import { query, queryOne } from "@/lib/db";
import type { OtpCodeRow } from "@/types/database";

/**
 * Shared by the NextAuth "phone-otp" sign-in provider (src/lib/auth.ts)
 * and the profile-onboarding phone-verification step
 * (POST /api/onboarding/verify-phone) — same underlying check, two
 * different things happen after a successful verify (issue a
 * session vs. attach the phone to an already-signed-in account).
 */
export async function verifyAndConsumeOtp(
  phone: string,
  code: string
): Promise<boolean> {
  const otp = await queryOne<OtpCodeRow>(
    `SELECT * FROM otp_codes
     WHERE phone = ? AND consumed_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [phone]
  );
  if (!otp) return false;

  const valid = await bcrypt.compare(code, otp.code_hash);
  if (!valid) return false;

  await query("UPDATE otp_codes SET consumed_at = NOW() WHERE id = ?", [otp.id]);
  return true;
}
