import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { expressInterest, InterestLimitError } from "@/lib/matching/engine";

/**
 * On-demand entry point for Rule 8: a user expressing interest in one
 * of their curated matches. Runs the mutual-match check immediately
 * (see engine.ts) instead of waiting for the next scheduled run.
 */
export async function POST(request: NextRequest) {
  const authedSupabase = await createServerClient();
  const { data: userData, error: authError } = await authedSupabase.auth.getUser();
  if (authError || !userData.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const matchedUserId = body?.matchedUserId;
  const batchId = body?.batchId;
  if (typeof matchedUserId !== "string" || typeof batchId !== "string") {
    return NextResponse.json(
      { error: "matchedUserId and batchId are required" },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();
    const result = await expressInterest(
      admin,
      userData.user.id,
      matchedUserId,
      batchId
    );
    return NextResponse.json({
      interest: result.interest,
      mutualMatch: result.mutualMatch,
    });
  } catch (err) {
    if (err instanceof InterestLimitError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("express interest failed", err);
    return NextResponse.json(
      { error: "Could not record your interest — please try again." },
      { status: 500 }
    );
  }
}
