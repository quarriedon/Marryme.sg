import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import type { UserRow } from "@/types/database";

/** Admin approve/reject for a profile pending vetting — see /admin/users/[id]. */
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
  const action = body?.action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const user = await queryOne<Pick<UserRow, "id">>("SELECT id FROM users WHERE id = ?", [id]);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const newStatus = action === "approve" ? "approved" : "suspended";
  await query("UPDATE users SET status = ? WHERE id = ?", [newStatus, id]);

  return NextResponse.json({ ok: true, status: newStatus });
}
