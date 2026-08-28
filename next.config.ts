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
};

export default nextConfig;
