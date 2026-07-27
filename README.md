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
2. Settings → API: copy the Project URL and anon key into `.env.local`.
3. SQL Editor: run `supabase/schema.sql` to create `profiles`, `matches`, `messages` tables with row-level security.
4. Authentication → Providers: enable **Email** and **Phone** (you'll need an SMS provider — Twilio is the most common; add your Twilio credentials under Auth → Phone).

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
- **Real:** email/password signup+login, phone OTP signup+login, protected `/dashboard` and `/admin` routes, Supabase schema with row-level security.
- **Stubbed (mock data, wire up next):** the matches list (currently hardcoded — replace with a query against `matches`/`profiles` once you have real members), messages page (no send/receive wired yet), admin page (no real moderation queue yet).
- **Deferred to post-MVP:** Singpass login (button is present but disabled — requires relying-party registration with the Singpass developer portal, which takes a few days to get approved), Stripe billing for any paid tier.

## Next steps, roughly in order
1. Wire the matches page to a real Supabase query + a simple admin-assigned matching flow.
2. Build out the profile creation form (photo upload to Supabase Storage).
3. Wire messaging with Supabase Realtime.
4. Apply for Singpass relying-party access, swap in the real login button.
5. Add Stripe once you're ready to charge for premium tiers.
