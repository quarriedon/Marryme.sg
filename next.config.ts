import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Plesk serves from .next/standalone/server.js rather than running
  // `next start` against the full .next/ + node_modules tree — this
  // traces only the files that server actually needs. `public/` and
  // `.next/static/` still have to be copied in after build (Next
  // doesn't do this automatically); see scripts/copy-standalone-assets.mjs
  // and the "postbuild" script in package.json.
  output: "standalone",

  // The Plesk VPS this runs on is memory-constrained and has OOM'd
  // during Turbopack builds before — force a single build worker and
  // disable worker-thread parallelism rather than the CPU-count-based
  // default.
  experimental: {
    cpus: 1,
    workerThreads: false,
  },

  // The photo upload/serve routes read and write an operator-
  // configured directory (UPLOADS_DIR) at runtime — a dynamic file
  // path the output file tracer can't statically resolve, so it
  // falls back to bundling the *entire* project into
  // .next/standalone "to be safe" (source, .git, docs, the lot) and
  // prints a "whole project was traced unintentionally" warning on
  // every build. None of that extra bulk is actually needed at
  // runtime (the compiled server lives under .next/server, not
  // src/), so trim it back out explicitly. The warning itself still
  // prints — it's just Turbopack being noisy about the same dynamic
  // file access that made this exclude list necessary in the first
  // place — but verify with `du -sh .next/standalone` after any
  // future change here that .git/src/mysql/docs haven't crept back in.
  outputFileTracingExcludes: {
    "/*": [".git/**", "src/**", "mysql/**", "scripts/**", "*.md"],
  },
};

export default nextConfig;
