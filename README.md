# MarryMe.sg

Singapore matchmaking platform — MVP.

Positioning: dating with real intent, for Singapore's multicultural
communities, with curated (not swipe-feed) matches.

## Stack
- Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- Supabase — auth (email/password + phone OTP now, Singpass later), Postgres, storage
- Hosting: Plesk (Node.js app)

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase keys
npm run dev
```

## Supabase setup
1. Create a project at supabase.com (Singapore region if offered, for latency).
2. Settings → API: copy the Project URL, anon key, and **service role key** into `.env.local`. The service role key powers the matching engine (`src/lib/matching/engine.ts`) — it needs to read and write across every user's rows to build batches and detect mutual interest, which row-level security alone can't do from the browser.
3. SQL Editor: run `supabase/schema.sql` to create `profiles`, `matches`, `interests`, `mutual_matches`, `messages`, `memberships`, and `counselling_requests`, all with row-level security.
4. Authentication → Providers: enable **Email** and **Phone** (you'll need an SMS provider — Twilio is the most common; add your Twilio credentials under Auth → Phone).

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

5. **Set environment variables** in Plesk: Node.js panel → "Custom environment variables" → add the three from `.env.example` with your real Supabase values.

6. In the Plesk Node.js panel, click **NPM Install**, then **Run Build** (`npm run build`), then **Restart App**.

7. Point your domain's DNS at the Plesk server if it isn't already, and enable SSL (Let's Encrypt, free, one click in Plesk).

## What's stubbed vs. real in this MVP
- **Real:** email/password signup+login, phone OTP signup+login, protected `/dashboard` and `/admin` routes, full Supabase schema with row-level security, the matching engine (batch generation, faith filtering, mutual-interest detection, cooling-off), the onboarding profile/preferences form.
- **Stubbed:** messages page (schema and RLS are in place — no send/receive UI or Realtime wiring yet), admin page (no real moderation queue yet), profile photo field is a plain URL input rather than a Supabase Storage upload. Newly onboarded profiles are auto-approved (no manual review queue yet), and there's no gate yet on `/dashboard/matches` requiring an active membership.
- **Deferred to post-MVP:** Singpass login (button is present but disabled — requires relying-party registration with the Singpass developer portal, which takes a few days to get approved), Stripe billing for any paid tier.

## Next steps, roughly in order
1. Wire messaging with Supabase Realtime, gated on an active `mutual_match`.
2. Add Stripe Checkout for `memberships`, and gate `/dashboard/matches` behind an active membership.
3. Build out the admin dashboard: profile approval queue, match batch review/override, counselling request queue, stats.
4. Photo upload to Supabase Storage instead of a raw URL field.
5. Apply for Singpass relying-party access, swap in the real login button.
