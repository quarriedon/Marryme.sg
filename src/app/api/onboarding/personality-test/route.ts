import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Answers are required." }, { status: 400 });
  }

  await query(
    `INSERT INTO personality_responses (user_id, answers)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE answers = VALUES(answers), completed_at = CURRENT_TIMESTAMP`,
    [session.user.id, JSON.stringify(body)]
  );

  return NextResponse.json({ ok: true });
}
