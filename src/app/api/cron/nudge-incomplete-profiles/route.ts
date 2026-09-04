import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { sendMail } from "@/lib/email";
import { incompleteProfileNudgeEmail } from "@/lib/emailTemplates";

/**
 * Scheduled entry point for the incomplete-profile nudge — hit this
 * from a cron trigger (Plesk Scheduled Tasks, or `curl` in crontab)
 * on a daily cadence, same pattern as /api/cron/process-matches:
 *
 *   curl -X POST https://marryme.sg/api/cron/nudge-incomplete-profiles \
 *     -H "Authorization: Bearer $CRON_SECRET"
 *
 * "Incomplete" = signed up (POST /api/auth/signup or phone-otp) but
 * never finished the onboarding profile form — full_name (and
 * everything else the form collects: photos, bio, etc.) is only ever
 * set together on that form's first successful submission, so
 * full_name IS NULL is a precise, cheap proxy for "never finished."
 * Only users with an email can be nudged this way (phone-only
 * accounts have nothing to send to). NUDGE_DELAY_HOURS controls how
 * long to wait after signup before nudging (default 24h); the
 * email_events unique constraint — not this route's logic — is what
 * actually prevents nudging the same person twice across repeated
 * cron runs.
 */
export async function POST(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const delayHours = Number(process.env.NUDGE_DELAY_HOURS) || 24;
  const profileUrl = `${(process.env.AUTH_URL ?? "https://marryme.sg").replace(/\/$/, "")}/onboarding/profile`;

  try {
    const candidates = await query<{ id: string; email: string }>(
      `SELECT u.id, u.email
       FROM users u
       WHERE u.email IS NOT NULL
         AND u.full_name IS NULL
         AND u.created_at <= DATE_SUB(NOW(), INTERVAL ? HOUR)
         AND NOT EXISTS (
           SELECT 1 FROM email_events e
           WHERE e.user_id = u.id AND e.email_type = 'incomplete_profile_nudge'
         )`,
      [delayHours]
    );

    let sent = 0;
    for (const candidate of candidates) {
      // Recorded only on a confirmed send, not before — so if SMTP
      // isn't configured yet (or a send fails transiently), this
      // person is nudged on the next cron run instead of being
      // silently skipped forever.
      const { subject, text, html } = incompleteProfileNudgeEmail(profileUrl);
      const ok = await sendMail({ to: candidate.email, subject, text, html });
      if (ok) {
        await query(
          "INSERT INTO email_events (id, user_id, email_type) VALUES (UUID(), ?, 'incomplete_profile_nudge')",
          [candidate.id]
        );
        sent += 1;
      }
    }

    return NextResponse.json({ ok: true, candidates: candidates.length, sent });
  } catch (err) {
    console.error("nudge-incomplete-profiles failed", err);
    return NextResponse.json({ error: "Failed to send nudge emails" }, { status: 500 });
  }
}
