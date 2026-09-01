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
3. **New database:** run `mysql/schema.sql` in full. **Existing database** (you already ran `schema.sql` before this session's changes): run `mysql/schema.sql` once, then also run each file under `mysql/migrations/` in order — they're additive (`ALTER TABLE ... ADD COLUMN`, `CREATE TABLE IF NOT EXISTS`) and safe to run against data you already have.
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

- **`GOOGLE_CLOUD_VISION_API_KEY`** — without it, uploads skip moderation entirely (a warning is logged on every upload) rather than blocking uploads in environments that haven't set it up. Set this before launch, or photos are not being screened for inappropriate content or checked for a visible face.
- Rejections (not the images) are logged to `photo_moderation_log` for reviewing abuse patterns later.

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

**Low-memory VPS note:** `next.config.ts` sets `experimental.cpus: 1` and `experimental.workerThreads: false` to force a single build worker — Turbopack's default parallelism (roughly one worker per CPU core) is what was OOM-killing builds on this box before. If builds still OOM, check the actual memory limit Plesk enforces on the Node.js application (separate from the VPS's total RAM) and raise it if possible; a single-worker build still needs a reasonable minimum (roughly 1–1.5GB free) to complete.

**Reverse proxy note:** Plesk's Node.js hosting sits behind its own reverse proxy (nginx/Apache) in front of the Node app. NextAuth needs to see the real public host and protocol to set cookies and validate sign-in correctly — `trustHost: true` is set in `src/lib/auth.ts` for this, and `AUTH_URL` should be set to your real `https://` domain in the environment variables. If login ever silently does nothing again (no error, no redirect) after this is all working, check that the proxy is forwarding `X-Forwarded-Host` / `X-Forwarded-Proto` correctly — a mismatch there is the next most likely cause after a static-asset problem.

## What's stubbed vs. real in this MVP
- **Real:** email/password signup+login and phone OTP signup+login (via NextAuth Credentials providers against MySQL), protected `/dashboard` and `/admin` routes (via `proxy.ts` + role checks), the full MySQL schema, the matching engine (batch generation, faith filtering, mutual-interest detection, cooling-off), the full onboarding profile form (identity, religion, community, relationship intent, optional details, photo upload with moderation, consent), a 12-question personality test, the "My Profile" activity page, and account deletion with full cascade.
- **Stubbed:** messages page (schema is in place — no send/receive UI or real-time wiring yet), admin page (no real moderation queue yet), phone OTP codes and photo moderation both log warnings and either skip or hold until their respective providers (SMS, Google Vision) are configured — see the Photo uploads and Auth setup sections above. Newly onboarded profiles are auto-approved (no manual review queue yet), and there's no gate yet on `/dashboard/matches` requiring an active membership. `/privacy` and `/terms` are placeholder pages flagging that real legal copy is needed, not actual policies — don't treat them as launch-ready.
- **Deferred to post-MVP:** Singpass login (button is present but disabled — requires relying-party registration with the Singpass developer portal, which takes a few days to get approved), Stripe billing for any paid tier, verifying an email address added after a phone-only signup (no outbound email/SMTP provider is wired up — it's stored but unverified).

## Next steps, roughly in order
1. Wire messaging with real-time updates (polling or a small WebSocket/SSE layer, since Supabase Realtime is gone), gated on an active `mutual_match`.
2. Wire `POST /api/auth/send-otp` to a real SMS provider (Twilio or similar) instead of console-logging the code.
3. Set `GOOGLE_CLOUD_VISION_API_KEY` so photo moderation actually runs (currently skipped with a warning).
4. Get real legal copy into `/privacy` and `/terms` before launch.
5. Add Stripe Checkout for `memberships`, and gate `/dashboard/matches` behind an active membership.
6. Build out the admin dashboard: profile approval queue, match batch review/override, counselling request queue, stats.
7. Apply for Singpass relying-party access, swap in the real login button.
