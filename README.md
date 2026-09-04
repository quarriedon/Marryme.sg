# MarryMe.sg

Singapore matchmaking platform — MVP.

Positioning: dating with real intent, for Singapore's multicultural
communities, with curated (not swipe-feed) matches.

## Stack
- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- MySQL (hosted on Plesk) for the database, accessed via `mysql2`
- NextAuth.js (Auth.js v5) for auth — email/password + phone OTP now, Singpass later
- Hosting: Plesk (Node.js app)

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in your MySQL + NextAuth values
npm run dev
```

## MySQL setup
1. In Plesk: Databases → create a MySQL database and a user with full privileges on it. Note the host, port, username, password, and database name.
2. Put those into `.env.local` as `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` — never commit real values, `.env.local` is gitignored.
3. **New database:** run `mysql/schema.sql` in full. **Existing database** (you already ran `schema.sql` before this session's changes): run `mysql/schema.sql` once, then also run each file under `mysql/migrations/` in order — they're additive (`ALTER TABLE ... ADD COLUMN`, `CREATE TABLE IF NOT EXISTS`) and safe to run against data you already have. If you already ran `0002`, you still need to run `0003_photo_review_queue.sql` (adds the `photos` table the admin panel's photo review queue depends on).
4. Requires MySQL 8.0.16+ or MariaDB 10.2+ (for `DEFAULT (UUID())` and `CHECK` constraint support) — check with your host if unsure.
5. There's no row-level security in MySQL — every access rule that used to live in a Supabase RLS policy is now enforced in application code (route handlers under `src/app/api/`, and `src/lib/auth.ts` / `src/lib/matching/engine.ts`). Never query these tables directly from a Client Component.

## Auth setup
- Generate a secret: `npx auth secret`, put it in `.env.local` as `AUTH_SECRET`.
- Set `AUTH_URL` to your real domain once you have one (see `.env.example`).
- Email/password and phone-OTP sign-in are both custom `Credentials` providers in `src/lib/auth.ts`, verifying against the `users` table directly — there's no third-party auth service anymore.
- Phone OTP has no SMS provider wired up yet: `POST /api/auth/send-otp` currently just logs the code to the server console. Wire it to Twilio (or similar) before launch.

## The matching mechanic

Each user gets a batch of up to 5 curated matches at a time (`matches` table). They can express interest in up to 2 per batch (`interests` table); if the interest is mutual, a `mutual_matches` row is created and chat unlocks. A user can only have one active mutual match at a time, and after one ends there's a cooling-off period (placeholder: 14 days) before new batches resume. See `src/lib/matching/engine.ts` for the full rules — each is commented for a non-technical reviewer.

The engine runs two ways:
- **On-demand**, via `POST /api/interests`, whenever a user expresses interest — checks for a mutual match immediately rather than waiting for the next scheduled run.
- **Scheduled**, via `POST /api/cron/process-matches` (protected by the `CRON_SECRET` env var) — expires stale batches and tops up anyone eligible but without a live batch. Point a daily cron job at it:
  ```bash
  curl -X POST https://marryme.sg/api/cron/process-matches \
    -H "Authorization: Bearer $CRON_SECRET"
  ```
  On Plesk: Scheduled Tasks → add a new task running that `curl` command once a day. This is a plain Node route, not a Vercel Cron job or Edge Function, so it works on any host.

Faith is a hard filter, not just a preference: if faith matters to a user, they're only shown faith-compatible candidates (same faith, or mutual openness to another faith); if it doesn't matter to them, they're only shown other users for whom it also doesn't matter. Note this is separate from Religion (`own_faith`) as a profile field — every user states their own religion regardless of whether it matters to them in a partner.

## Photo uploads

Profile photos (1–3, JPG/PNG/WebP, 5MB max each) go through `POST /api/photos/upload`, are screened by `src/lib/moderation.ts`, and are stored on local disk — not in `public/` or `.next/`, and not in Supabase-style object storage (there's no existing storage dependency in this repo, and this avoids adding one).

- **`UPLOADS_DIR`** (required) must point somewhere that survives a rebuild. This repo builds with `output: "standalone"`, which regenerates `.next` from scratch on every `npm run build` — anything stored under `.next` or the deploy folder itself would be deleted on the next deploy. On Plesk, set this to an absolute path outside the git checkout (e.g. `/var/www/marryme-uploads`). For local dev, `./storage/uploads` is fine.
- Photos are served back through `GET /api/photos/[id]` (gated on being signed in, not on being the photo's owner — profile photos are meant to be seen by curated matches) rather than as static files.

**Moderation: Google Cloud Vision**, called directly via `fetch` (no SDK) — see `src/lib/moderation.ts`. Chosen over AWS Rekognition and Azure AI Content Safety because it's the only one of the three that does SafeSearch content moderation *and* face detection in a single plain REST call authenticated with just an API key; Rekognition needs SigV4 request signing (effectively requiring the AWS SDK), and Azure's Content Safety API has no face detection at all.

- **`GOOGLE_CLOUD_VISION_API_KEY`** — without it, uploads skip moderation entirely (a warning is logged on every upload, and every photo is saved as `approved`) rather than blocking uploads in environments that haven't set it up. Set this before launch, or photos are not being screened for inappropriate content or checked for a visible face.
- A photo Vision flags is **not** rejected outright — it's saved and held as `pending_review` (the `photos` table tracks this), invisible to everyone but its owner and admins (enforced in `GET /api/photos/[id]`, the one route every viewing path goes through), until an admin approves or rejects it in `/admin/photos`. Rejecting also frees up the member's photo slot by removing it from their `users.photos` array. Rejections are also logged to `photo_moderation_log` for reviewing abuse patterns later.

## Deploying on Plesk (Node.js)

This uses Next's [`output: "standalone"`](https://nextjs.org/docs/app/api-reference/config/next-config-js/output) build (set in `next.config.ts`), which traces only the files the server actually needs and outputs a self-contained app at `.next/standalone/` — including its own minimal `server.js`. There's no hand-written custom server in this repo anymore; Plesk runs the one Next generates.

1. **Push to GitHub** first (if you haven't already):
   ```bash
   git add .
   git commit -m "Deploy setup"
   git push
   ```

2. **In Plesk:**
   - Go to your domain → **Node.js**.
   - Set "Application Root" to the folder you'll deploy into (e.g. `marryme.sg`).
   - Set "Application Startup File" to `.next/standalone/server.js` (not a root-level `server.js` — Next generates this one itself on build).
   - Under "Application Mode" choose `production`.

3. **Pull the repo onto the server** — either use Plesk's Git extension (Websites & Domains → Git → point it at your GitHub repo, set the deploy path) or clone manually over SSH.

4. **Set environment variables** in Plesk: Node.js panel → "Custom environment variables" → add everything from `.env.example` with your real MySQL and Auth values.

5. In the Plesk Node.js panel, click **NPM Install**, then **Run Build** (`npm run build`).
   - This automatically runs the `postbuild` script (`scripts/copy-standalone-assets.mjs`) afterward, which copies `public/` and `.next/static/` into `.next/standalone/` — **required** for the standalone server to find any CSS, JS, or images at all. Next's standalone output does not include these by default (see the comment in `next.config.ts`); skipping this step is what makes a page come back as unstyled plain HTML with a dead, unhydrated UI (forms that don't respond to submit, buttons that don't do anything — the JS chunks are 404ing too, not just the CSS).
   - If you ever copy these manually instead of relying on `npm run build`, redo it after **every** build — the whole point of the `postbuild` script is to stop this from being a manual, error-prone step.
6. **Restart App** in the Plesk Node.js panel.
7. Point your domain's DNS at the Plesk server if it isn't already, and enable SSL (Let's Encrypt, free, one click in Plesk).

**Low-memory / constrained-host VPS note:** `next.config.ts` sets `experimental.cpus: 1` and `experimental.workerThreads: false` to force a single build worker — those only govern Next's own JS-level build workers, though. Turbopack's native engine runs *two separate* internal thread pools that ignore both settings entirely: Rayon (sizes itself to the visible CPU count) and a Tokio multi-threaded async runtime (same default). On a host with a low OS-level process/thread limit (common on shared/managed hosting with a chrooted or jailed shell), either one trying to spawn that many threads can hit the ceiling — Rayon fails with `EAGAIN` / `ERR_WORKER_INIT_FAILED`, Tokio panics with `OS can't spawn worker thread: Resource temporarily unavailable (os error 11)`. Both surface as confusing, unrelated-looking Turbopack internal errors (e.g. a CSS module chunking failure) rather than a clear "too many threads" message.

`npm run build` runs through `scripts/run-build.mjs`, which sets `RAYON_NUM_THREADS=1`, `RAYON_RS_NUM_CPUS=1`, and `TOKIO_WORKER_THREADS=1` before invoking `next build` to cap all of them — safe on any host (only limits parallelism, never correctness), and it won't override a variable you've already set yourself, so a future, less-constrained host can raise them. If a build still fails after this with a *different* native thread/process error, the pattern is the same: check which env var the specific Rust thread pool reads (`strings node_modules/@next/swc-*/*.node | grep -i thread` is how these three were found) and add it to `run-build.mjs`. If it's genuine memory exhaustion rather than a thread-count ceiling, the error won't mention threads/processes at all — check the actual memory limit Plesk enforces on the Node.js application (separate from the VPS's total RAM) and raise it if possible. As a last resort, `next build --webpack` avoids Turbopack's native thread pools entirely (slower, but a real fallback if this specific host's thread ceiling turns out to be lower than any of these pools can be configured down to).

**If the host's process/thread ceiling is below what any of these env vars can reach** (for example, a CloudLinux LVE account limit that's invisible to `ulimit` and enforced at the kernel level) — capping Rayon and Tokio to 1 thread each still spawns more than one OS thread/process at a time during a build (Node itself, the `next-swc` native addon, and the worker threads/processes it forks all count against the ceiling), so a build can keep failing with the same `EAGAIN` / `os error 11` even at the lowest possible settings. If that's the case, stop building on the Plesk host entirely — build the app somewhere without that ceiling, and deploy only the already-compiled output:

1. **Build locally or in CI**, using the exact same Node major version as the Plesk app (check Plesk's Node.js panel for the version currently selected) so any platform-specific native binaries match:
   ```bash
   npm ci
   npm run build   # produces .next/standalone/, .next/static/, and runs postbuild
   ```
   This runs on your own machine or a CI runner (GitHub Actions, etc.) — nothing here touches the Plesk host's thread/process limits, because Turbopack never runs there.
2. **Copy three things to the server**, preserving this layout under your Application Root:
   - `.next/standalone/` → the whole directory, including the `server.js` Next generated and the `public/` + `.next/static/` files `scripts/copy-standalone-assets.mjs` already merged into it during `postbuild`. Nothing else needs copying manually — that script's whole job is to make `.next/standalone/` self-contained.
   - `node_modules/` is **not** needed separately — `output: "standalone"` traces and includes only the runtime dependencies actually used, already inside `.next/standalone/node_modules/`.
   - You do **not** need to copy `src/`, `.git/`, or any dev dependency — none of it is required to run the built app.
   - A simple way to move it: `rsync -avz --delete .next/standalone/ user@server:/path/to/app-root/` (or zip it and upload through Plesk's File Manager if you don't have SSH `rsync` access).
3. **In Plesk's Node.js panel**, set "Application Startup File" to `server.js` (now at the root of what you uploaded, since you uploaded the *contents* of `.next/standalone/`, not the folder itself) and skip **NPM Install** and **Run Build** entirely — there's nothing to install or build on the server anymore, only `node server.js` to run.
4. **Set the same environment variables** as before (Plesk Node.js panel → Custom environment variables) — the compiled app still reads `MYSQL_*`, `AUTH_SECRET`, `AUTH_URL`, `UPLOADS_DIR`, etc. at runtime, same as any other deploy.
5. **Restart App** in the Plesk Node.js panel.
6. For future changes: repeat step 1 on your machine/CI, then re-sync `.next/standalone/` to the server and restart — there's no `git pull` + `Run Build` cycle on the host anymore, since the host never builds anything.

This trades a one-click "pull and build on the server" workflow for a manual (or CI-automated) upload step, but it fully avoids Turbopack's native thread pools on a host where they can't be brought under the account's ceiling no matter how low the pool sizes are set.

**Reverse proxy note:** Plesk's Node.js hosting sits behind its own reverse proxy (nginx/Apache) in front of the Node app. NextAuth needs to see the real public host and protocol to set cookies and validate sign-in correctly — `trustHost: true` is set in `src/lib/auth.ts` for this, and `AUTH_URL` should be set to your real `https://` domain in the environment variables. If login ever silently does nothing again (no error, no redirect) after this is all working, check that the proxy is forwarding `X-Forwarded-Host` / `X-Forwarded-Proto` correctly — a mismatch there is the next most likely cause after a static-asset problem.

## Admin panel

`/admin` and everything under it is gated on `role = 'admin'` (see `src/app/admin/layout.tsx` — set a user's role directly in the database; there's no UI for promoting someone to admin yet). Four sections:

- **Signups** (`/admin`) — every profile, most recent first, with contact info, community, status, membership tier, and a flag for any photos awaiting review.
- **Photo review** (`/admin/photos`) — every photo currently held as `pending_review` (flagged by Google Vision at upload — see Photo uploads above), with the flagged reason and Approve/Reject actions. Approving makes it visible on the member's profile; rejecting keeps it hidden permanently and frees up their photo slot.
- **Matches** (`/admin/matches`) — search a member, see their current curated batch (with interest/reciprocal-interest indicators), remove or add a candidate, or force a mutual match between two members directly (bypasses the reciprocal-interest requirement, still respects the one-active-mutual-match-at-a-time rule). For support cases where the algorithm's suggestion needs a human correction.
- **Memberships** (`/admin/memberships`) — every membership row (tier, started, expires), a form to grant one to any member by email, and an inline editor to adjust an existing expiry (e.g. extending free access, or setting when it should convert to paid).

Founding-member access is granted automatically the first time a new user completes onboarding (see `FOUNDING_ACCESS_ENABLED` / `FOUNDING_ACCESS_DAYS` in `.env.example`) — this is what makes the homepage's "Founding members get free access" banner actually true rather than just copy. `FOUNDING_ACCESS_DAYS` (default 180) is a placeholder grant length; adjust it, or edit individual members' expiry in `/admin/memberships`, once you've decided the real founding-access window.

## What's stubbed vs. real in this MVP
- **Real:** email/password signup+login and phone OTP signup+login (via NextAuth Credentials providers against MySQL), protected `/dashboard` and `/admin` routes (via role checks), the full MySQL schema, the matching engine (batch generation, faith filtering, mutual-interest detection, cooling-off) plus an admin override on top of it, the full onboarding profile form (identity, religion, community, relationship intent, optional details, photo upload with moderation and manual review, consent), a 12-question personality test, the "My Profile" activity page, account deletion with full cascade, a real admin panel (signup feed, photo review queue, match override, membership tracking), and founding-member free access auto-granted on signup.
- **Stubbed:** messages page (schema is in place — no send/receive UI or real-time wiring yet), phone OTP codes log a warning and skip actually sending an SMS until an SMS provider is configured — see the Auth setup section above. Newly onboarded profiles are auto-approved at the account level (no manual review queue for the *profile* — only individual flagged *photos* go through manual review), and there's no gate yet on `/dashboard/matches` requiring an active membership (membership rows are tracked, but nothing currently checks them before showing matches). `/privacy` and `/terms` are placeholder pages flagging that real legal copy is needed, not actual policies — don't treat them as launch-ready.
- **Deferred to post-MVP:** Singpass login (button is present but disabled — requires relying-party registration with the Singpass developer portal, which takes a few days to get approved), Stripe billing for any paid tier (memberships are tracked but not charged), verifying an email address added after a phone-only signup (no outbound email/SMTP provider is wired up — it's stored but unverified).

## Next steps, roughly in order
1. Wire messaging with real-time updates (polling or a small WebSocket/SSE layer, since Supabase Realtime is gone), gated on an active `mutual_match`.
2. Wire `POST /api/auth/send-otp` to a real SMS provider (Twilio or similar) instead of console-logging the code.
3. Set `GOOGLE_CLOUD_VISION_API_KEY` so photo moderation actually runs (currently skipped with a warning).
4. Get real legal copy into `/privacy` and `/terms` before launch.
5. Add Stripe Checkout for `memberships`, and gate `/dashboard/matches` behind an active membership.
6. Add a UI for promoting a user to `role = 'admin'` — right now that's a direct database update (`UPDATE users SET role = 'admin' WHERE email = ?`).
7. Expand the admin dashboard further: counselling request queue, stats/analytics.
8. Apply for Singpass relying-party access, swap in the real login button.
