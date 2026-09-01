import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { moderatePhoto } from "@/lib/moderation";
import { InvalidPhotoError, savePhoto, validatePhotoFile } from "@/lib/storage";

/**
 * Accepts one photo at a time (the profile form calls this once per
 * file picked), runs it through moderation, and returns an id the
 * client adds to its local photos array. Nothing is written to the
 * `users.photos` column here — that only happens when the profile
 * form is submitted, same as every other field.
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
  if (!moderation.ok) {
    await query(
      "INSERT INTO photo_moderation_log (id, user_id, reason) VALUES (UUID(), ?, ?)",
      [session.user.id, moderation.reason]
    );
    return NextResponse.json({ error: moderation.publicMessage }, { status: 400 });
  }

  const id = await savePhoto(buffer, file.type);
  return NextResponse.json({ id, url: `/api/photos/${id}` });
}
