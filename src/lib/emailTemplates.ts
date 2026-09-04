// Copy for the two automated lifecycle emails — see src/lib/email.ts
// for how these are sent. Kept in one file so the wording is easy to
// review and tweak in one place.

function wrapHtml(bodyHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f1e7;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1e7;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#0a0a0d;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 8px;">
                <p style="margin:0;font-style:italic;font-size:20px;color:#e3c887;">MarryMe.sg</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 32px;color:#ede7da;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function welcomeEmail(fullName: string): { subject: string; text: string; html: string } {
  const firstName = fullName.trim().split(/\s+/)[0] || "there";

  const subject = "Welcome to MarryMe.sg — you're a founding member";

  const text = `Hi ${firstName},

Welcome to MarryMe.sg — thank you for being one of our founding members. While we build out the community, you have free access to matching for as long as your founding membership lasts.

We're not about swiping. Every week you'll receive a small, considered set of matches — quality over volume — because we think dating should feel like building a life, not browsing a highlight reel.

Your first batch of matches will be ready soon. You can check on your profile any time from your dashboard.

Warmly,
The MarryMe.sg team`;

  const html = wrapHtml(`
    <p style="margin:0 0 16px;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;">Welcome to MarryMe.sg — thank you for being one of our founding members. While we build out the community, you have free access to matching for as long as your founding membership lasts.</p>
    <p style="margin:0 0 16px;">We're not about swiping. Every week you'll receive a small, considered set of matches — quality over volume — because we think dating should feel like <em>building a life, not browsing a highlight reel</em>.</p>
    <p style="margin:0 0 16px;">Your first batch of matches will be ready soon. You can check on your profile any time from your dashboard.</p>
    <p style="margin:24px 0 0;">Warmly,<br/>The MarryMe.sg team</p>
  `);

  return { subject, text, html };
}

export function incompleteProfileNudgeEmail(profileUrl: string): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = "Finish your profile to start getting matched on MarryMe.sg";

  const text = `Hi there,

You started creating your profile on MarryMe.sg but haven't finished yet — you're just a few steps from your first set of matches.

Complete your profile (photos, a short bio, and a few details about what you're looking for) and we'll take it from there.

Finish your profile: ${profileUrl}

As a founding member you get free access while we build out the community — but we can only start matching you once your profile is complete.

— The MarryMe.sg team`;

  const html = wrapHtml(`
    <p style="margin:0 0 16px;">Hi there,</p>
    <p style="margin:0 0 16px;">You started creating your profile on MarryMe.sg but haven't finished yet — you're just a few steps from your first set of matches.</p>
    <p style="margin:0 0 16px;">Complete your profile (photos, a short bio, and a few details about what you're looking for) and we'll take it from there.</p>
    <p style="margin:0 0 20px;">
      <a href="${profileUrl}" style="display:inline-block;background:#c9a24b;color:#0a0a0d;text-decoration:none;font-weight:bold;padding:10px 20px;border-radius:999px;">Finish your profile</a>
    </p>
    <p style="margin:0 0 16px;">As a founding member you get free access while we build out the community — but we can only start matching you once your profile is complete.</p>
    <p style="margin:24px 0 0;">— The MarryMe.sg team</p>
  `);

  return { subject, text, html };
}
