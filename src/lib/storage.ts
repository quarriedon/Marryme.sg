import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Where uploaded photos live on disk. Deliberately NOT under
 * public/ or .next/ — this repo builds with output: "standalone"
 * (see next.config.ts), which regenerates .next from scratch on
 * every `npm run build`. Anything stored there would be deleted on
 * the next deploy. UPLOADS_DIR must point somewhere that survives
 * rebuilds; on Plesk that means an absolute path outside the git
 * checkout.
 *
 * Required with no runtime fallback (unlike a plain default value,
 * a `path.join(process.cwd(), ...)` fallback here would make Next's
 * output file tracer think the whole project needs to ship inside
 * `.next/standalone` "to be safe", bloating every deploy).
 */
function uploadsDir(): string {
  const configured = process.env.UPLOADS_DIR;
  if (!configured) {
    throw new Error(
      "Missing UPLOADS_DIR environment variable — set it to a persistent " +
        "directory (e.g. ./storage/uploads for local dev; an absolute path " +
        "outside the deployment folder in production)."
    );
  }
  return configured;
}

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const ALLOWED_PHOTO_TYPES = Object.keys(MIME_TO_EXT);
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB

export class InvalidPhotoError extends Error {}

/** Type/size checks cheap enough to run before spending a moderation API call on the file. */
export function validatePhotoFile(mimeType: string, byteLength: number): void {
  if (!MIME_TO_EXT[mimeType]) {
    throw new InvalidPhotoError("Please upload a JPG, PNG, or WebP image.");
  }
  if (byteLength > MAX_PHOTO_BYTES) {
    throw new InvalidPhotoError("Photos must be 5MB or smaller.");
  }
}

/** Saves an already-validated photo buffer to disk and returns the id used to serve it back via GET /api/photos/[id]. */
export async function savePhoto(buffer: Buffer, mimeType: string): Promise<string> {
  const ext = MIME_TO_EXT[mimeType];
  if (!ext) {
    throw new InvalidPhotoError("Please upload a JPG, PNG, or WebP image.");
  }

  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });

  const id = `${crypto.randomUUID()}.${ext}`;
  await writeFile(path.join(dir, id), buffer);
  return id;
}

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Reads a previously saved photo back off disk, or returns null if it doesn't exist. */
export async function readPhoto(
  id: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  // `id` is used as a path segment below — reject anything that could
  // escape uploadsDir() (path traversal) before touching the filesystem.
  if (!/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(id)) return null;

  const ext = id.split(".").pop()!.toLowerCase();
  const contentType = EXT_TO_MIME[ext];
  if (!contentType) return null;

  const filePath = path.join(uploadsDir(), id);
  if (!existsSync(filePath)) return null;

  const buffer = await readFile(filePath);
  return { buffer, contentType };
}

export async function deletePhoto(id: string): Promise<void> {
  if (!/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(id)) return;
  const filePath = path.join(uploadsDir(), id);
  if (existsSync(filePath)) {
    await unlink(filePath);
  }
}
