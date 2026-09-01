import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deletePhoto, readPhoto } from "@/lib/storage";

/**
 * Serves an uploaded photo. Gated on "signed in" rather than
 * "this is your own photo" — profile photos are meant to be seen by
 * whoever a user is curated/matched with, not just themselves, but
 * we still don't want them world-readable to anonymous scrapers.
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
  await deletePhoto(id);
  return NextResponse.json({ ok: true });
}
