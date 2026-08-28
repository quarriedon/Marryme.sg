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
3. Run `mysql/schema.sql` against that database (via Plesk's phpMyAdmin, or `mysql -h HOST -u USER -p DATABASE < mysql/schema.sql`) to create `users`, `otp_codes`, `matches`, `interests`, `mutual_matches`, `messages`, `memberships`, and `counselling_requests`. Requires MySQL 8.0.16+ or MariaDB 10.2+ (for `DEFAULT (UUID())` and `CHECK` constraint support) — check with your host if unsure.
4. There's no row-level security in MySQL — every access rule that used to live in a Supabase RLS policy is now enforced in application code (route handlers under `src/app/api/`, and `src/lib/auth.ts` / `src/lib/matching/engine.ts`). Never query these tables directly from a Client Component.

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

Faith is a hard filter, not just a preference: if faith matters to a user, they're only shown faith-compatible candidates (same faith, or mutual openness to another faith); if it doesn't matter to them, they're only shown other users for whom it also doesn't matter.

## Deploying on Plesk (Node.js)

1. **Push to GitHub** first:
   ```bash
   git init
   git add .
   git commit -m "MarryMe.sg MVP"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **In Plesk:**
   - Go to your domain → **Node.js**.
   - Set "Application Root" to the folder you'll deploy into (e.g. `marryme.sg`).
   - Set "Application Startup File" to `server.js` (see step 3 — Next.js needs a small custom server on Plesk, since Plesk expects a single entry file rather than `next start`).
   - Under "Application Mode" choose `production`.

3. **Add a `server.js`** (already included in this project) so Plesk's Node.js manager has a single file to launch:
   ```js
   const { createServer } = require("http");
   const next = require("next");
   const app = next({ dev: false });
   const handle = app.getRequestHandler();
   app.prepare().then(() => {
     createServer((req, res) => handle(req, res)).listen(process.env.PORT || 3000);
   });
   ```

4. **Pull the repo onto the server** — either use Plesk's Git extension (Websites & Domains → Git → point it at your GitHub repo, set the deploy path) or clone manually over SSH.

5. **Set environment variables** in Plesk: Node.js panel → "Custom environment variables" → add everything from `.env.example` with your real MySQL and Auth values.

6. In the Plesk Node.js panel, click **NPM Install**, then **Run Build** (`npm run build`), then **Restart App**.

7. Point your domain's DNS at the Plesk server if it isn't already, and enable SSL (Let's Encrypt, free, one click in Plesk).

## What's stubbed vs. real in this MVP
- **Real:** email/password signup+login and phone OTP signup+login (via NextAuth Credentials providers against MySQL), protected `/dashboard` and `/admin` routes (via `proxy.ts` + role checks), the full MySQL schema, the matching engine (batch generation, faith filtering, mutual-interest detection, cooling-off), the onboarding profile/preferences form.
- **Stubbed:** messages page (schema is in place — no send/receive UI or real-time wiring yet), admin page (no real moderation queue yet), profile photo field is a plain URL input rather than a real upload, phone OTP codes are logged to the server console instead of sent via SMS. Newly onboarded profiles are auto-approved (no manual review queue yet), and there's no gate yet on `/dashboard/matches` requiring an active membership.
- **Deferred to post-MVP:** Singpass login (button is present but disabled — requires relying-party registration with the Singpass developer portal, which takes a few days to get approved), Stripe billing for any paid tier.

## Next steps, roughly in order
1. Wire messaging with real-time updates (polling or a small WebSocket/SSE layer, since Supabase Realtime is gone), gated on an active `mutual_match`.
2. Wire `POST /api/auth/send-otp` to a real SMS provider (Twilio or similar) instead of console-logging the code.
3. Add Stripe Checkout for `memberships`, and gate `/dashboard/matches` behind an active membership.
4. Build out the admin dashboard: profile approval queue, match batch review/override, counselling request queue, stats.
5. Photo upload to object storage instead of a raw URL field.
6. Apply for Singpass relying-party access, swap in the real login button.
