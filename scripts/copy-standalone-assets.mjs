// Next's `output: "standalone"` build traces only the server files it
// actually needs — it does NOT copy `public/` or `.next/static/` into
// `.next/standalone/`, by design (see next.config.ts). Plesk serves
// directly from `.next/standalone/server.js`, so without this step the
// site comes up with 404s on every CSS/JS/image asset — unstyled HTML,
// broken hydration, dead event handlers, all from the same cause.
//
// Plain Node (fs.cpSync), not a shell `cp`, so this runs the same way
// whether Plesk's build step shells out on Linux or someone runs it
// from Windows locally.
import { existsSync, cpSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standaloneDir = join(root, ".next", "standalone");

if (!existsSync(standaloneDir)) {
  console.warn(
    '[copy-standalone-assets] .next/standalone not found — is "output: standalone" set in next.config.ts? Skipping.'
  );
  process.exit(0);
}

const copies = [
  { from: join(root, "public"), to: join(standaloneDir, "public") },
  {
    from: join(root, ".next", "static"),
    to: join(standaloneDir, ".next", "static"),
  },
];

for (const { from, to } of copies) {
  if (!existsSync(from)) {
    console.warn(`[copy-standalone-assets] ${from} does not exist, skipping.`);
    continue;
  }
  cpSync(from, to, { recursive: true });
  console.log(`[copy-standalone-assets] copied ${from} -> ${to}`);
}
