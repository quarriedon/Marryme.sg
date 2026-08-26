import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runScheduledMatching } from "@/lib/matching/engine";

/**
 * Scheduled entry point for Rule 8 of the matching engine — hit this
 * from a cron trigger (e.g. a Plesk scheduled task or `curl` in
 * crontab) on a daily cadence:
 *
 *   curl -X POST https://marryme.sg/api/cron/process-matches \
 *     -H "Authorization: Bearer $CRON_SECRET"
 *
 * Not a Vercel Cron / Edge Function — this is a plain Node route so
 * it works on the generic Plesk host described in the README.
 */
export async function POST(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const result = await runScheduledMatching(supabase);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("process-matches failed", err);
    return NextResponse.json(
      { error: "Failed to process matches" },
      { status: 500 }
    );
  }
}
