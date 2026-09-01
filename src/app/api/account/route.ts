import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { deletePhoto } from "@/lib/storage";
import type { UserRow } from "@/types/database";

/**
 * Deletes the signed-in user's account and everything the Privacy
 * Policy commits to deleting alongside it. Every table referencing
 * users.id was built with ON DELETE CASCADE (matches, interests,
 * mutual_matches, messages, memberships, counselling_requests,
 * personality_responses, photo_moderation_log — see mysql/schema.sql)
 * so one DELETE here is enough for the database; the only thing that
 * needs cleaning up separately is the photo files on disk, which
 * MySQL has no way to touch.
 */
export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const user = await queryOne<UserRow>("SELECT photos FROM users WHERE id = ?", [
    session.user.id,
  ]);

  await query("DELETE FROM users WHERE id = ?", [session.user.id]);

  for (const url of user?.photos ?? []) {
    const id = url.split("/").pop();
    if (id) await deletePhoto(id).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
