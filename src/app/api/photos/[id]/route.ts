import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { deletePhoto, readPhoto } from "@/lib/storage";
import type { PhotoRow } from "@/types/database";

/**
 * Serves an uploaded photo. Gated on "signed in" rather than
 * "this is your own photo" — profile photos are meant to be seen by
 * whoever a user is curated/matched with, not just themselves, but
 * we still don't want them world-readable to anonymous scrapers.
 *
 * A photo held in `pending_review` or `rejected` (see
 * src/app/api/photos/upload/route.ts and /admin/photos) is only
 * visible to its owner and admins — that's what actually makes it
 * "invisible" while awaiting manual review, since the serving route
 * is the one place every viewing path goes through.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await params;

  const photoRow = await queryOne<PhotoRow>("SELECT * FROM photos WHERE id = ?", [id]);
  if (photoRow && photoRow.status !== "approved") {
    const isOwner = session.user.id === photoRow.user_id;
    const isAdmin = session.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const photo = await readPhoto(id);
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(photo.buffer), {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

/** Used while a user is still assembling their photo set, before final profile submission. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await params;

  const photoRow = await queryOne<PhotoRow>("SELECT * FROM photos WHERE id = ?", [id]);
  if (photoRow) {
    const isOwner = session.user.id === photoRow.user_id;
    const isAdmin = session.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  await deletePhoto(id);
  await query("DELETE FROM photos WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
