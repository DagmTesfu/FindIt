# FindIt

A mobile-first buying-request and sourcing app for students in Addis Ababa. Students describe an item and budget; an operator confirms interest, sources an option, sends an offer, and tracks the resulting deal.

## Stack

React, TypeScript, Vite, Tailwind CSS, Supabase (PostgreSQL/Auth/private Storage), and a static deployment suitable for Cloudflare Pages. Node 22.12+ or 24 recommended; npm lockfile is committed.

## Run locally

```sh
npm ci
```

Copy `.env.example` to `.env.local`. With blank Supabase settings and `VITE_DEMO_MODE=true`, the app opens a clearly labelled fictional demo. Then:

```sh
npm run dev
```

Demo data persists in browser localStorage under `findit.demo.v1`. The banner switches student/admin views. No real accounts or purchases exist in this mode. Clear that key to reset sample data. Draft forms use sessionStorage scoped to the signed-in user.

## Connect Supabase

1. In a new Supabase project, run `supabase/migrations/202611150001_initial.sql` once in SQL Editor, or apply it using the Supabase CLI. The migration includes tables, permissions, workflow functions, private image storage, and the signup trigger.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Set `VITE_DEMO_MODE=false`. Restart Vite after changing environment variables.
3. In Auth URL Configuration, allow `http://localhost:5173` and `http://localhost:5173/app`, plus the production origin and `/app` callback when deployed. Configure a production email sender before inviting users; Supabase's development sender has delivery restrictions.
4. Sign up through the app and confirm your email. In SQL Editor, promote only your own account using its exact user UUID:

```sql
update public.profiles set role = 'admin' where id = 'YOUR_AUTH_USER_UUID';
```

5. Sign out/in or refresh. Other signups remain students. Never allow clients to set roles or turn off RLS.

The publishable key is the intended client key. Do not use a service-role key, secret key, database password, or personal access token in browser code. No environment credentials are committed.

## Verify

```sh
npm test
npm run build
```

Database tests execute the actual migration in PGlite PostgreSQL with minimal Supabase platform stubs. They check buyer isolation, blocked role escalation, private notes/images, confirmation, protected offer prices, idempotent acceptance, expired offers, and payment/completion rules. They are not a substitute for testing the deployed Supabase Auth and Storage services.

For a live smoke test, use two separate student accounts plus an admin. Create a request as student A, verify B cannot see it, confirm interest, exchange messages, send an offer as admin, accept as A, and record payment and delivery. Refresh each screen and test direct links. Try an expired offer and a cancellation.

## Deploy to Cloudflare Pages

- Connect this GitHub repository.
- Build command: `npm run build`.
- Output directory: `dist`.
- Node version: `24`.
- Set the two Supabase public configuration variables and `VITE_DEMO_MODE=false` in build environment settings.
- Add the deployed URL to Supabase Auth URLs.
- `public/_redirects` supports direct SPA routes. `public/_headers` provides basic browser security headers.

All configuration is injected at build time. Rebuild after environment changes. The output is ordinary static files and can move to another static host with equivalent SPA routing.

## Included

Landing page; email/password signup/sign-in; student request form with private optional photo; draft preservation; student/admin dashboards; filters/search; buyer interest confirmation; request messages; private sourcing notes; expiring itemized offers; atomic acceptance; manual payment and fulfillment tracking; audit records; responsive layouts; explicit loading/error states; CI.

## Pilot boundaries

No payment gateway, automated supplier search, outbound notifications, account recovery screen, or buyer self-service request editing yet. Use messages to clarify a request; cancel and resubmit if its requirements materially change. Readiness is self-reported, not verified purchasing intent. Admin follow-up is manual. Images are limited by file type/size but are not compressed automatically. Pagination and abuse controls are needed before wider public rollout. No claim of live verification is made until the project migration and real account smoke tests have been completed.

See `docs/ARCHITECTURE.md` for boundaries and scaling notes, and `docs/REQUIREMENTS.md` for the first-release scope.
