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

  // The photo upload/serve routes (and account deletion, which also
  // cleans up photo files) read and write an operator-configured
  // directory (UPLOADS_DIR) at runtime — a dynamic file path the
  // output file tracer can't statically resolve, so for every route
  // that touches it, it falls back to bundling the *entire* project
  // into .next/standalone "to be safe" (source, .git, docs, CI
  // config, the lot) and prints a "whole project was traced
  // unintentionally" warning. None of that extra bulk is actually
  // needed at runtime (the compiled server lives under .next/server,
  // not src/), so trim it back out explicitly — by exact name, not
  // just a few extensions, since this fallback isn't selective about
  // *what* extra bulk it pulls in: anything missing from this list
  // leaks straight through. If you add a new top-level file or
  // folder to the repo (another script, another doc, a new config
  // file), add it here too, and verify with `find .next/standalone
  // -maxdepth 1` after any change here — don't just check `du -sh`,
  // since a leaked file can be small enough not to move the size
  // needle at all while still being wrong to ship (this is exactly
  // how `.github/workflows/` leaked in unnoticed once before).
  outputFileTracingExcludes: {
    "/*": [
      ".env.example",
      ".git/**",
      ".github/**",
      ".gitignore",
      "*.md",
      "eslint.config.mjs",
      "mysql/**",
      "next-env.d.ts",
      "next.config.ts",
      "postcss.config.mjs",
      "scripts/**",
      "src/**",
      "tsconfig.json",
      "tsconfig.tsbuildinfo",
    ],
  },
};

export default nextConfig;
