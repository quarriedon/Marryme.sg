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
// Rayon isn't the only thread pool in the native binary — it also
// runs a Tokio multi-threaded runtime, which spawns its own OS
// threads independently of Rayon's. Capping only Rayon left Tokio
// free to hit the same OS thread/process ceiling on its own
// ("OS can't spawn worker thread: Resource temporarily unavailable
// (os error 11)", a Tokio worker panic). TOKIO_WORKER_THREADS is a
// real, intentionally-supported env var in this binary (confirmed
// via `strings` on @next/swc-*), not a guess.
//
// Defaults to 1 thread each; respects an operator-set value so a
// future, less-constrained host can raise it without editing this file.
process.env.RAYON_NUM_THREADS ??= "1";
process.env.RAYON_RS_NUM_CPUS ??= "1";
process.env.TOKIO_WORKER_THREADS ??= "1";

import { spawnSync } from "node:child_process";

const result = spawnSync("next", ["build"], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
