/**
 * Runs once when a new Next.js server instance starts, before it
 * handles any requests — see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md.
 * This is the right place for one-time startup checks; as more get
 * added (e.g. verifying the MySQL pool can connect), add them here
 * rather than scattering ad-hoc checks across individual routes.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { ensureUploadsDir } = await import("@/lib/storage");
  try {
    await ensureUploadsDir();
  } catch (err) {
    // Already logged with detail inside ensureUploadsDir() — this
    // second line just makes it unmistakable in a fresh server's
    // startup log that photo uploads will fail until it's fixed.
    console.error(
      "[startup] UPLOADS_DIR is not usable — photo uploads will fail until this is fixed:",
      err instanceof Error ? err.message : err
    );
  }
}
