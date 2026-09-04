import nodemailer from "nodemailer";

/**
 * Transactional email via plain SMTP (Nodemailer) — see the welcome
 * email (src/app/api/onboarding/profile/route.ts) and the incomplete-
 * profile nudge (src/app/api/cron/nudge-incomplete-profiles/route.ts).
 * No external email service required: this is meant to run against
 * the SMTP credentials for admin@marryme.sg from Plesk's Mail panel.
 *
 * Security note: nodemailer has a known high-severity issue where a
 * message's `raw` option (or an attachment/URL sourced from
 * unsanitized input) can be abused for arbitrary file read / SSRF —
 * see https://github.com/advisories/GHSA-p6gq-j5cr-w38f. This app
 * pins nodemailer to the 8.x line specifically because next-auth's
 * own (unused) Nodemailer email-provider peer dependency only allows
 * 7.x/8.x — upgrading to the patched 9.x would fight that peer
 * dependency on every install. The mitigation here is structural
 * instead: sendMail() below only ever accepts to/subject/text/html —
 * never `raw`, `attachments`, or anything sourced from a URL — so the
 * vulnerable code path is simply never reached. Don't add attachments
 * or a `raw` message without re-reading that advisory first.
 */
let transporter: nodemailer.Transporter | null | undefined;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter !== undefined) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn(
      "[email] SMTP_HOST/SMTP_USER/SMTP_PASS are not fully set — emails will " +
        "not be sent. Set these from Plesk's Mail panel (admin@marryme.sg → " +
        "SMTP settings) before launch."
    );
    transporter = null;
    return transporter;
  }

  const port = Number(SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

/**
 * Fire-and-forget-friendly: never throws, returns whether the send
 * actually happened. Callers (onboarding completion, the nudge cron)
 * should not fail their own request just because SMTP isn't
 * configured yet or a single send fails.
 */
export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  const client = getTransporter();
  if (!client) return false;

  try {
    await client.sendMail({
      from: process.env.SMTP_FROM || '"MarryMe.sg" <admin@marryme.sg>',
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return true;
  } catch (err) {
    console.error(`[email] Failed to send "${opts.subject}" to ${opts.to}:`, err);
    return false;
  }
}
