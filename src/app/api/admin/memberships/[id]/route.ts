import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import type { Membership } from "@/types/database";

/** Adjusts an existing membership's expiry — e.g. extending free access or setting when it should convert/expire. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const expiresAt = body?.expiresAt;
  if (typeof expiresAt !== "string" || Number.isNaN(new Date(expiresAt).getTime())) {
    return NextResponse.json({ error: "A valid expiry date is required." }, { status: 400 });
  }

  const membership = await queryOne<Membership>("SELECT id FROM memberships WHERE id = ?", [id]);
  if (!membership) {
    return NextResponse.json({ error: "Membership not found." }, { status: 404 });
  }

  await query("UPDATE memberships SET expires_at = ? WHERE id = ?", [expiresAt, id]);
  return NextResponse.json({ ok: true });
}
