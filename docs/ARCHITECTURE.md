# FindIt architecture

## Boundaries

- `src/domain`: business types and shared input validation. No React or database dependencies beyond Zod.
- `src/data/repository.ts`: typed application-facing storage contract.
- `src/data/supabase.ts`: Supabase adapter, private uploads, and workflow RPC calls.
- `src/data/demo.ts`: browser-local demo adapter. Explicit opt-in; not a production backend.
- `src/app-context.tsx`: session, loaded records, refresh, and mutation feedback.
- `src/pages`: request form and request/deal detail workflows.
- `src/components`: reusable fields and presentation elements.
- `supabase/migrations`: versioned PostgreSQL schema, RLS, storage rules, and atomic workflow functions.
- `tests`: actual migration execution and security/workflow regression checks using PGlite, plus input validation.

The UI talks to a Repository. A future custom API can replace Supabase by implementing that interface. Database models are relational PostgreSQL; platform-specific auth/storage integration is isolated in the migration and adapter. This does not mean migration is automatic: session handling and storage would need replacement.

## Integrity and permissions

Profiles start as buyers regardless of signup metadata. Only a trusted database owner can bootstrap admins. Authenticated clients cannot directly update requests, profiles, offers, or deals. State changes use security-definer functions with a fixed empty search path and explicit authorization checks. Parent request locks serialize offer creation, cancellation, and acceptance. Unique constraints ensure one deal per request/offer. Accepted offer fields cannot be edited through the client API. Amounts use PostgreSQL numeric, not floating point, for persisted prices.

Buyers see only their requests and related messages/offers/deals. Sourcing notes and audit logs are admin-only. Images use a private bucket and time-limited signed URLs. Publishable keys are safe in browser bundles only because RLS and column grants enforce access. Never put service-role keys in any VITE_ variable.

## Demo versus live

Demo is explicitly enabled with VITE_DEMO_MODE=true and no Supabase credentials. It uses fictional samples and a role switch for inspection. It is not an authentication system. Live mode is selected when both Supabase variables exist; failures never silently turn into demo data. The demo adapter mirrors the core flow, but PostgreSQL is the source of truth for production integrity.

## Initial operating model

Admin sourcing, buyer follow-up, payment verification, and delivery are manual. Updates refresh every 30 seconds while the page is visible and after mutations. There is no external notification provider yet: operators must contact buyers manually. The buyer’s contact is private. No card or mobile-money data is collected.

## Scaling deliberately

Before a larger launch, replace whole-workspace snapshot reads with paginated per-feature queries and fetch conversation history on demand. Add rate limits/CAPTCHA, notification delivery with retries, account recovery, request editing with versioning, observed error monitoring, backup/restore procedures, and operator reporting. Split large page components further when features grow; keep business invariants in the database/API rather than duplicating them across views. Images currently accept up to 5 MB; add client-side compression before expanding usage. The app is a small pilot, not an unlimited marketplace.

## Changes

Add new SQL migrations instead of modifying an applied migration. Write regression tests for authorization or workflow changes. Comments explain why an invariant exists; names and types explain routine implementation. Never edit dependencies in node_modules. Keep environment files untracked.
