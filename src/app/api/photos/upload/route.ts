import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { moderatePhoto } from "@/lib/moderation";
import { InvalidPhotoError, savePhoto, validatePhotoFile } from "@/lib/storage";

/**
 * Accepts one photo at a time (the profile form calls this once per
 * file picked). Nothing is written to the `users.photos` column here
 * — that only happens when the profile form is submitted, same as
 * every other field.
 *
 * A photo that fails automated moderation is NOT rejected outright:
 * it's saved and recorded as `pending_review` (invisible to anyone
 * but its owner and admins — see GET /api/photos/[id]) until an
 * admin approves or rejects it in /admin/photos. This avoids a false
 * positive from Vision permanently blocking someone's only photo,
 * while still keeping anything flagged off other users' screens
 * until a human has looked at it.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("photo");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No photo provided." }, { status: 400 });
  }

  try {
    validatePhotoFile(file.type, file.size);
  } catch (err) {
    if (err instanceof InvalidPhotoError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const moderation = await moderatePhoto(buffer);
  const id = await savePhoto(buffer, file.type);

  if (!moderation.ok) {
    await query(
      "INSERT INTO photos (id, user_id, status, moderation_reason) VALUES (?, ?, 'pending_review', ?)",
      [id, session.user.id, moderation.reason]
    );
    await query(
      "INSERT INTO photo_moderation_log (id, user_id, reason) VALUES (UUID(), ?, ?)",
      [session.user.id, moderation.reason]
    );
    return NextResponse.json({
      id,
      url: `/api/photos/${id}`,
      status: "pending_review",
      message:
        "Your photo has been submitted for review and will appear on your profile once approved. " +
        moderation.publicMessage,
    });
  }

  await query("INSERT INTO photos (id, user_id, status) VALUES (?, ?, 'approved')", [
    id,
    session.user.id,
  ]);
  return NextResponse.json({ id, url: `/api/photos/${id}`, status: "approved" });
}
