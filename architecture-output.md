---
title: Sparq Connection — Technical Architecture Blueprint
description: Phase 2 system architecture converting PM/UX specs into an implementation-ready blueprint
last-updated: 2025-08-20
version: 1.0.0
status: review
related-files:
  - project-documentation/product-manager-output.md
  - /design-documentation/README.md
---

# Sparq Connection — Technical Architecture Blueprint

## Executive Summary

**Overview.** Sparq Connection is a text‑first relationship app delivering Daily Questions (DQ) and 14‑day Connection Quests with private journaling, selective sharing, and respectful insights. MVP targets web/PWA with push notifications, then expands to native wrappers.

**Key Technical Decisions (MVP).**
- **Frontend:** Next.js 15 (App Router) + React 18, TypeScript, Tailwind, TanStack Query, Zod, PWA with Web Push. Client state via **Zustand** (local UI) + React Query (server state).
- **Backend:** Next.js Route Handlers (serverless on Vercel) exposing **REST+OpenAPI** endpoints. Validation via Zod. Lightweight worker for scheduled notifications.
- **Auth & DB:** **Supabase** (Postgres + Auth + Realtime + Row Level Security). Primary storage for all entities.
- **Storage & CDN:** Supabase Storage (images/files), cached via Supabase CDN.
- **Notifications:** **OneSignal** (web/app push) for reliable, timezone‑aware delivery; fallback email via **SendGrid**.
- **Payments:** **Stripe** subscriptions (Free, Premium, Ultimate) with server‑side webhooks and entitlement mapping.
- **Observability:** Sentry (errors), PostHog (product analytics), OpenTelemetry traces (via Vercel + SDK).
- **Security:** TLS in transit, Postgres at-rest encryption; strict RLS; least‑privileged service roles; secrets via Vercel/ Supabase. Journals private-by-default; optional app‑layer encryption planned (v1.x).

**System Components.**
- Web/PWA Client · API Layer (Route Handlers) · Notification Worker · Postgres (Supabase) · OneSignal · Stripe · SendGrid · Admin CMS (internal) · Analytics/Monitoring

**Constraints & Assumptions.**
- Text‑only content at launch; English; single pairing per user in MVP.
- Push relies on user consent; fallback reminders via email.
- Timezone‑specific scheduling via OneSignal + cron worker.

---

## Architecture for Backend Engineers

### API Style & Conventions
- **REST JSON** with versioned base path `/api/v1`. Request/response validated using Zod. OpenAPI spec auto‑generated from Zod (`zod-to-openapi`) and served at `/api/openapi.json` + Swagger UI in non‑prod.
- **Auth:** Supabase JWT (header `Authorization: Bearer <token>`). Middleware verifies token and hydrates `req.user` `{ userId, email, roles }`.
- **Idempotency:** Use `Idempotency-Key` headers for mutation endpoints where applicable (answers, journal posts).
- **Rate Limiting:** IP+user key via Upstash Redis (100 req/5m per user; 20 req/5m for anon).

### Core Endpoints (MVP)

**Pairing & Accounts**
- `POST /api/v1/invite` → Create partner invite  
  **Body:** `{{ expiresInDays?: number=7 }}`  
  **Res:** `{{ inviteId, link, qrSvg, expiresAt }}`  
  **Auth:** user  
  **RL:** 10/5m  
- `POST /api/v1/invite/accept` → Accept invite  
  **Body:** `{{ inviteId: string }}`  
  **Res:** `{{ coupleId }}`  
  **Auth:** user (other partner)  
  **Errors:** 400 invalid/expired, 409 already-paired

**Daily Questions**
- `GET /api/v1/dq/today` → Fetch today’s prompt for user  
  **Res:** `{{ questionId, title, body, difficulty, tags:[string], example?:string, availableAt, expiresAt }}`
- `POST /api/v1/dq/answer` → Submit answer  
  **Body:** `{{ questionId, visibility: "private"|"shared"|"summary", content: string }}`  
  **Res:** `{{ entryId, shared:boolean }}`
- `GET /api/v1/dq/history?limit=30&cursor=...` → Paginated recent prompts & responses

**Connection Quests**
- `GET /api/v1/quests` → List available quests (entitlement‑filtered)  
- `POST /api/v1/quests/select` → Start a quest for couple  
  **Body:** `{{ questId }}`  
- `GET /api/v1/quests/day/:n` → Fetch day N content  
- `POST /api/v1/quests/day/:n/complete` → Submit reflection & mark complete  
  **Body:** `{{ reflection?: string, visibility?: "private"|"shared" }}`

**Journals, Sharing & Reactions**
- `POST /api/v1/journal` → Create journal entry  
  **Body:** `{{ source: "dq"|"quest"|"free", content:string, visibility, tags?:string[] }}`  
- `PATCH /api/v1/journal/:id` → Update content/visibility (revocable sharing)  
- `DELETE /api/v1/journal/:id` → Soft delete (30‑day recoverable)  
- `POST /api/v1/share/:entryId/react` → Add reaction  
  **Body:** `{{ emoji: "❤️"|"👍"|"🙏" }}`  
- `POST /api/v1/share/:entryId/comment` → Add short comment

**Insights**
- `GET /api/v1/insights/weekly` → Streaks, completions, modality mix  
- `POST /api/v1/insights/opt` → `{ optInSentiment:boolean }`

**Plans & Billing**
- `GET /api/v1/plans` → List plan features  
- `POST /api/v1/billing/checkout` → Stripe Checkout session  
  **Body:** `{{ plan: "free"|"premium"|"ultimate" }}`  
- `POST /api/v1/billing/webhook` → Stripe webhook (server‑to‑server)  
- `GET /api/v1/entitlements` → Current entitlements

**Safety & Resources**
- `GET /api/v1/resources/crisis?region=CA-AB` → Region‑aware list  
- `POST /api/v1/safety/flag` → Client‑side keyword flag event (debounced, non‑storage)

**Notifications**
- `POST /api/v1/notifications/subscribe` → Register OneSignal token & preferences  
  **Body:** `{{ token, platform: "web"|"ios"|"android", timePrefs: {{ hour, minute, tz }}, quietHours?: {{ start, end, tz }} }}`

**Error Format**
```json
{{
  "error": {{
    "code": "RESOURCE_NOT_FOUND",
    "message": "Quest not found",
    "details": {{}}
  }}
}}
```

### Business Logic Organization
- **Layers:** Route Handler → Service (domain logic) → Repository (DB via Supabase client) → Mappers/DTOs → Zod Schemas.
- **Modules:** `auth`, `pairing`, `dq`, `quests`, `journal`, `share`, `insights`, `billing`, `notifications`, `safety`, `admin`.

### Database Schema (Supabase Postgres)

**Key Entities & DDL (simplified).**

```sql
-- Users provisioned by Supabase Auth; mirror minimal profile
create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Couple pairing
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

create table public.couple_members (
  couple_id uuid references couples(id) on delete cascade,
  user_id uuid references user_profiles(user_id) on delete cascade,
  role text check (role in ('member','admin')) default 'member',
  primary key (couple_id, user_id)
);

-- Partner invites
create table public.partner_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid references user_profiles(user_id) on delete cascade,
  invite_code text unique not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz default now()
);

-- Content catalog
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  difficulty int check (difficulty between 1 and 3), -- 1 easy, 2 medium, 3 deeper
  tags text[] default '{{}}',
  modality_tags text[] default '{{}}',
  version int not null default 1,
  published boolean default true
);

create table public.quests (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text not null,
  days int not null default 14,
  light_days int not null default 6,
  published boolean default true
);

create table public.quest_days (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid references quests(id) on delete cascade,
  day_index int not null, -- 1..n
  teaching text not null,
  task text not null,
  example text,
  unique (quest_id, day_index)
);

-- Scheduling state
create table public.user_schedules (
  user_id uuid primary key references user_profiles(user_id) on delete cascade,
  dq_hour int, dq_minute int, tz text,
  quiet_start time, quiet_end time,
  updated_at timestamptz default now()
);

-- Journal entries (private by default)
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade,
  author_user_id uuid references user_profiles(user_id) on delete cascade,
  source text check (source in ('dq','quest','free')) not null,
  content text not null,
  visibility text check (visibility in ('private','shared','summary')) not null default 'private',
  tags text[] default '{{}}',
  is_deleted boolean default false,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Shared interactions
create table public.entry_reactions (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references journal_entries(id) on delete cascade,
  reactor_user_id uuid references user_profiles(user_id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now()
);

create table public.entry_comments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references journal_entries(id) on delete cascade,
  commenter_user_id uuid references user_profiles(user_id) on delete cascade,
  body text not null check (char_length(body) <= 500),
  created_at timestamptz default now()
);

-- Quest progress
create table public.quest_progress (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade,
  quest_id uuid references quests(id) on delete cascade,
  current_day int default 1,
  started_at timestamptz default now(),
  completed_at timestamptz,
  unique (couple_id, quest_id)
);

create table public.quest_day_completions (
  id uuid primary key default gen_random_uuid(),
  progress_id uuid references quest_progress(id) on delete cascade,
  day_index int not null,
  reflection text,
  visibility text check (visibility in ('private','shared','summary')) default 'private',
  completed_at timestamptz default now(),
  unique (progress_id, day_index)
);

-- DQ schedule & answers
create table public.dq_assignments (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade,
  question_id uuid references questions(id),
  available_at timestamptz not null,
  expires_at timestamptz not null
);

create table public.dq_answers (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references dq_assignments(id) on delete cascade,
  author_user_id uuid references user_profiles(user_id) on delete cascade,
  content text not null,
  visibility text check (visibility in ('private','shared','summary')) default 'private',
  created_at timestamptz default now(),
  unique (assignment_id, author_user_id)
);

-- Insights snapshots (pseudonymous)
create table public.insight_snapshots (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade,
  week_start date not null,
  dq_completed int default 0,
  quest_days_completed int default 0,
  streak_dq int default 0,
  streak_quest int default 0,
  modality_mix jsonb default '{{}}'::jsonb,
  created_at timestamptz default now(),
  unique (couple_id, week_start)
);

-- Plans & entitlements
create table public.entitlements (
  user_id uuid references user_profiles(user_id) on delete cascade,
  plan text check (plan in ('free','premium','ultimate')) not null,
  active boolean default true,
  renewed_at timestamptz default now(),
  expires_at timestamptz,
  primary key (user_id, plan)
);

-- Crisis resources
create table public.crisis_resources (
  id uuid primary key default gen_random_uuid(),
  region text not null, -- e.g., 'CA-AB'
  label text not null,
  url text,
  phone text,
  notes text,
  active boolean default true
);

-- Indexing examples
create index idx_journal_couple_created on public.journal_entries(couple_id, created_at desc);
create index idx_dq_available_at on public.dq_assignments(available_at);
create index idx_progress_couple on public.quest_progress(couple_id);
```

**RLS (high‑level).**
- `user_profiles`: user can read/update own profile; admin can read all.
- `couple_members`: user can read rows where `user_id = auth.uid()`; create on pairing; delete on unpair.
- `journal_entries`: author can CRUD own; partner **read only** when `visibility != 'private'` and `couple_id` matches.
- `dq_answers`: same pattern as journal.
- `insight_snapshots`: couple members read aggregated rows for their couple.

### Migrations & Seeding
- Use Supabase migrations (`supabase db diff`). Seed: at least 1 Quest (14+6), 30 DQs with modality/difficulty, regional crisis resources (CA‑AB, CA‑BC, US‑*).

### Notifications & Scheduling
- Store user time prefs in `user_schedules`. Nightly job generates next‑day DQ assignments per couple (respecting difficulty cadence). OneSignal segments per couple/user deliver pushes at local time.
- Worker runs: `cron */5 * * * *` to backfill missed schedules & send fallback emails (SendGrid) when no push token.

---

## Architecture for Frontend Engineers

### Client Stack
- **Next.js 15** (App Router) with Server Components where beneficial; Route Handlers for API in same repo.
- **TypeScript**, **Tailwind**, **Zustand** (UI state), **TanStack Query** (network/cache), **Zod** (schema validation), **Headless UI/Radix** for a11y components as needed.
- **PWA**: Service Worker (Workbox) for offline reads (prompts, journal drafts), Web Push via OneSignal SDK.

### Structure & Patterns
```
/app
  /(marketing)
  /(app)/today
  /(app)/quests/[slug]/day/[n]
  /(app)/journal
  /(app)/insights
  /(app)/settings
  api/ (route handlers)
/lib (api client, zod schemas, auth helpers)
/stores (zustand stores)
/components (ui, forms, cards, modals)
/styles (globals.css, tokens.css)
```
- **Data Fetching:** React Query hooks `useDQToday()`, `useQuestDay()`, etc. Cache keys include `{{userId,coupleId}}`.
- **Error Handling:** Error boundaries per route; toasts for recoverable errors; inline form errors from Zod parse.
- **Accessibility:** Keyboard navigation, focus management, `prefers-reduced-motion`, AA contrast via design tokens.
- **Performance:** Lazy load admin/cms code; image optimization; script splitting; prefetch next quest day.

### Routing & Nav
- Home “Today” hub with DQ card, Quest progress, and journal shortcut.
- Protected routes enforce auth; redirect unauthenticated → onboarding.

---

## QA Engineering Guide

**Testable Boundaries & Contracts**
- API contracts validated against OpenAPI during CI (Dredd/Prism).
- Zod schemas unit‑tested for happy/edge cases.
- RLS integration tests (using Supabase test role).

**Key Scenarios**
- Pairing: invite create/accept; duplicate pairing prevention; expired invite handling.
- DQ cadence: 5 easy → 10 medium → 5 deeper; timezone delivery; snooze; skip behavior.
- Journaling: privacy toggles, share revoke; soft delete + recovery; offline drafts sync.
- Quests: daily unlock, catch‑up, summary; day completion idempotency.
- Insights: weekly aggregation; opt‑in sentiment; partner opt‑out aggregation.
- Billing: plan upgrade/downgrade; webhook entitlement sync; restore purchase flow.
- Notifications: subscription register/unregister; quiet hours; push fallback to email.

**Performance Benchmarks**
- P95 TTFI < 1.2s on Moto G/Simulated; API p95 < 300ms for common reads.
- Lighthouse PWA score ≥ 90; Core Web Vitals: LCP < 2.5s, CLS < 0.1.

**Security Testing**
- Auth bypass attempts; RLS policy enforcement; IDOR checks on journal/share endpoints.
- Webhook signature verification (Stripe); CORS policies; rate‑limit evasion.

---

## Security Architecture

**Authentication & Authorization**
- Supabase Auth JWT; `user` and `admin` roles. Couple membership is the authorization pivot.
- Route middleware enforces: must belong to `couple_id` for any couple‑scoped resource. No numeric IDs exposed; use UUIDv4.

**Data Protection**
- **At Rest:** Postgres encryption; Storage bucket policies. Journals default private; shared entries revocable.
- **In Transit:** HTTPS everywhere; HSTS; TLS 1.2+.
- **App‑Layer Encryption (Planned v1.x):** Optional AES‑GCM per‑entry with per‑user key (WebCrypto); keys sealed by server KMS. Not required for MVP.

**Input Validation & Sanitization**
- Zod schemas for body/query; HTML rendered via safe markdown subset; XSS defense: escape & Content Security Policy (CSP).

**Headers & CORS**
- `helmet` equivalent for Next (via middleware): CSP, X‑Frame‑Options, Referrer‑Policy, Permissions‑Policy. CORS restricted to first‑party origins.

**Secrets & Keys**
- Managed via Vercel Envs / Supabase secrets. Rotate on schedule; never commit.

**Threat Modeling (MVP)**
- IDOR on shared entries → enforce couple scoping + RLS.
- Abuse of push → rate limit + origin checks.
- Webhook forgery → verify Stripe signature + idempotency keys.

---

## Performance Architecture

**Caching**
- HTTP caching for published content (questions, quest days) with ETag/`s-maxage` on Vercel Edge.
- React Query client cache with background revalidation.
- Redis (Upstash) for rate limits and ephemeral invite lookups.

**Database Optimization**
- Composite indexes on `(couple_id, created_at)`, `(available_at)`.  
- Avoid N+1 via batch queries; use Postgres `jsonb` for modality mixes.

**Asset Delivery**
- Supabase CDN for media; images responsive via Next/Image.

**Monitoring & Alerting**
- Sentry alerts on error budgets; PostHog for funnels/retention; Uptime check for `/api/health` (200 + db ping).

---

## Infrastructure & DevOps

**Hosting**
- **Vercel** for frontend + serverless API.  
- **Supabase** for Postgres/Auth/Storage/Realtime.  
- **OneSignal** for push. **Stripe** for billing. **SendGrid** for email.

**Environments**
- `dev`, `staging`, `prod` with separate Supabase projects and Stripe keys. Feature flags via PostHog or simple env gate.

**CI/CD**
- GitHub Actions (or Vercel + Supabase integration):
  - Lint/Typecheck/Unit tests
  - Generate & validate OpenAPI
  - E2E (Playwright) on staging
  - Migrations apply on staging → smoke tests → prod promote

**Background Jobs**
- Vercel Cron to run notification worker endpoints. Optionally deploy a lightweight Node worker on Fly.io/Render if longer runtimes needed.

**Backups & DR**
- Supabase automated daily backups + PITR. Verify restore drills quarterly.

---

## Data Architecture (Detailed)

### Entities (Selected)

**UserProfile**
- `user_id: uuid (pk)`; `email: text`; `display_name?: text`

**Couple**
- `id: uuid (pk)`; members in `couple_members`

**PartnerInvite**
- `id: uuid`; `invite_code: text uniq`; `expires_at`; `consumed_at`

**Question**
- `id: uuid`; `title`; `body`; `difficulty (1..3)`; `modality_tags: text[]`; `version`

**DQAssignment**
- Couples receive rotating assignments respecting difficulty cadence; `available_at`, `expires_at`

**DQAnswer / JournalEntry**
- `visibility: enum('private','shared','summary')` with revocation allowed

**Quest / QuestDay / QuestProgress / QuestDayCompletion**
- Day‑locked content, reflection storage, summary generation

**Entitlement**
- Derived from Stripe subscriptions; enforced in API (`/quests` list, etc.)

**InsightSnapshot**
- Weekly aggregates for couple (no raw text content)

### Index Strategy
- Time‑series tables index on `created_at` / `completed_at`.  
- Unique constraints for idempotency (e.g., `dq_answers (assignment_id, author_user_id)`).  
- Partial indexes for active resources (`where is_deleted=false`).

---

## API Schemas (Zod/JSON)

**Example — Create Journal Entry (request/response):**
```ts
// request
const CreateJournalReq = z.object({
  source: z.enum(['dq','quest','free']),
  content: z.string().min(1).max(5000),
  visibility: z.enum(['private','shared','summary']).default('private'),
  tags: z.array(z.string()).max(10).optional()
});
// response
const CreateJournalRes = z.object({
  entryId: z.string().uuid(),
  visibility: z.enum(['private','shared','summary'])
});
```

**Example — Today’s DQ:**
```json
{
  "questionId": "e4c8e2d6-1f0c-4b3f-9e1a-4f44a2c9e0ab",
  "title": "Small win check-in",
  "body": "What’s one small thing your partner did this week you appreciated?",
  "difficulty": 1,
  "tags": ["gratitude","positive-psych"],
  "example": "I loved how you prepped coffee yesterday—it made my morning easier.",
  "availableAt": "2025-08-19T09:00:00-06:00",
  "expiresAt": "2025-08-20T08:59:59-06:00"
}
```

**Error Schema:**
```ts
const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional()
  })
});
```

---

## Integration Architecture

**Stripe**
- Checkout/Customer Portal hosted pages. Webhook → update `entitlements`. Idempotency keys for webhook processing.

**OneSignal**
- Store device tokens per user; segments by couple/user; schedule notifications by local time; respect quiet hours.

**SendGrid**
- Transactional emails: onboarding invite, weekly recap, fallback DQ reminder.

**Admin CMS**
- Internal Next.js route group `/admin` (protected by role) for managing questions, quests, crisis resources. Future: separate admin app if needed.

---

## Risks & Mitigations

- **Timezone scheduling complexity** → Offload to OneSignal; keep DB record for audit; fallback email.  
- **Privacy regressions** → RLS + integration tests; privacy center UX; explicit toggles with confirmations.  
- **Content quality drift** → CMS workflows; versioning; A/B tests gated to safe variants.  
- **Vendor lock-in** → Abstract notification + billing integrations; keep domain services vendor‑agnostic.  
- **Push opt‑out** → Email fallback; in‑app “Today” hub summaries.

---

## Team Handoff Checklists

### Backend
- [ ] Tables & RLS applied in Supabase
- [ ] OpenAPI generated & published
- [ ] Route handlers scaffolded per modules
- [ ] Stripe/OneSignal/SendGrid keys in env & tested
- [ ] Cron worker deployed

### Frontend
- [ ] API client & Zod schemas wired
- [ ] Auth guard & protected routes
- [ ] PWA service worker & push permission flow
- [ ] Error boundaries & toasts
- [ ] A11y checks (focus, contrast, keyboard)

### QA
- [ ] Test plans for each module
- [ ] Load & concurrency tests for hot paths
- [ ] RLS/IDOR test suite
- [ ] Webhook signature tests

### Security
- [ ] CSP/CORS hardened
- [ ] Secrets rotated & scoped
- [ ] Threat model doc updated per release
- [ ] Pen‑test window scheduled (pre‑GA)

---

## Appendices

### Env Vars (sample)
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
ONESIGNAL_APP_ID=
ONESIGNAL_API_KEY=
SENDGRID_API_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### HTTP Status Codes (convention)
- 200 OK, 201 Created, 204 No Content
- 400 Validation error, 401 Unauthorized, 403 Forbidden, 404 Not Found
- 409 Conflict (duplicate pairing), 422 Unprocessable (business rule)
- 429 Too Many Requests, 500 Internal Error

---

*This architecture is aligned to the Product Manager and UX specs and is immediately actionable for engineering teams. Future iterations: client‑side encrypted journals, native mobile wrappers, advanced personalization.*
