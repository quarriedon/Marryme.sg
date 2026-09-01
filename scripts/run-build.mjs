// Cross-platform wrapper around `next build` (a Node script, not
// shell env-var syntax, for the same reason as copy-standalone-assets.mjs
// — npm scripts run on whatever shell the host has).
//
// Turbopack's native engine uses Rayon for its own internal thread
// pool, entirely separate from next.config.ts's experimental.cpus /
// workerThreads (those only govern Next's own JS-level build
// workers). On hosts with a low OS-level process/thread ulimit —
// some shared/managed hosting accounts, chrooted shells — Rayon
// sizing its pool to the number of visible CPUs can exceed that
// limit and crash with EAGAIN / ERR_WORKER_INIT_FAILED, which
// manifests as an unrelated-looking Turbopack internal error rather
// than a clear "too many threads" message.
//
// Defaults to 1 thread; respects an operator-set value so a future,
// less-constrained host can raise it without editing this file.
process.env.RAYON_NUM_THREADS ??= "1";
process.env.RAYON_RS_NUM_CPUS ??= "1";

import { spawnSync } from "node:child_process";

const result = spawnSync("next", ["build"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
