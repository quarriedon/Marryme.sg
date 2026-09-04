import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import type { PhotoRow, UserRow } from "@/types/database";

/**
 * Admin approve/reject for a photo held in `pending_review` (see
 * src/app/api/photos/upload/route.ts). Rejecting also strips the
 * photo's URL from the owner's `users.photos` array so the freed
 * slot can be re-uploaded to, rather than permanently wasting one of
 * their 3 photo slots on something that will never become visible.
 */
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

  const photo = await queryOne<PhotoRow>("SELECT * FROM photos WHERE id = ?", [id]);
  if (!photo) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  const newStatus = action === "approve" ? "approved" : "rejected";
  await query(
    "UPDATE photos SET status = ?, reviewed_at = NOW(), reviewed_by = ? WHERE id = ?",
    [newStatus, session.user.id, id]
  );

  if (action === "reject") {
    const owner = await queryOne<Pick<UserRow, "photos">>(
      "SELECT photos FROM users WHERE id = ?",
      [photo.user_id]
    );
    const remaining = (owner?.photos ?? []).filter((url) => !url.endsWith(`/${id}`));
    if (owner && remaining.length !== (owner.photos ?? []).length) {
      await query("UPDATE users SET photos = ? WHERE id = ?", [
        JSON.stringify(remaining),
        photo.user_id,
      ]);
    }
  }

  return NextResponse.json({ ok: true });
}
