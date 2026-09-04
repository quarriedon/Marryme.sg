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

  // The build's own "Running TypeScript" step OOM'd on that same
  // host (Next.js build worker exited with SIGABRT — V8's own signal
  // when it aborts on a JS heap allocation failure) even after the
  // above. That step is redundant here anyway: `npx tsc --noEmit` is
  // already run as a separate verification step before every push in
  // this project's workflow, so type errors are still caught — this
  // just stops the build itself from re-doing that memory-hungry
  // check a second time on a host that can't afford it. If you ever
  // build without running `tsc --noEmit` first, a type error could
  // ship silently — don't rely on this flag as your only type check.
  typescript: {
    ignoreBuildErrors: true,
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
