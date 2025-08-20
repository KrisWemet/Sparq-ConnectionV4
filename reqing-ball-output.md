---
title: Reqing Ball — Requirements Validation Report
description: Audit of implementation vs. Sparq Connection specifications
review-date: 2025-08-20
status: review
---

# Reqing Ball — Requirements Validation Report

## Access Confirmation
- Using the **Sparq Connection** local sources instead:
  - Product Requirements: `/mnt/data/project-documentation/product-manager-output.md`
  - Architecture: `/mnt/data/project-documentation/architecture-output.md`
  - Feature Specs: `/mnt/data/design-documentation/features/` (per-feature docs)
  - UX/Flows: `design-documentation/` suite (user-journey.md in each feature)

> If alternative documents exist, provide paths and I will re-run the audit.

---

## Executive Summary
- **Overall Compliance Score**: **15%** of specified requirements implemented (approx.).
- **Critical Gaps**: **7** P0 areas not met (no complete P0 features; 2 are partial).
- **Improvements Found**: **3** (clean SQL migrations with rollback; tokenized design system; PWA scaffold).
- **Risk Assessment**: **High** — core pairing, quests, billing, safety, and insights are not implemented yet.

### How the score was derived
Counted acceptance-criteria bullets for P0 features in PM spec (20 total). Implemented items detected in code/migrations:
- DQ fetch/submit: **1/3** ✅ (no schedule/curve/history).
- Journals privacy default + CRUD: **1/2** ✅ (no dual prompts, biometric lock, offline sync).
- Soft delete present in schema (constraint-level) but recovery flow not implemented (excluded from score).

---

## Feature-by-Feature Analysis (P0 first)

### Onboarding & Partner Pairing
**Specification Reference**: `design-documentation/features/onboarding-and-partner-pairing/README.md`  
**Implementation Status**: ❌ Missing

**Requirements Compliance**:

| Requirement ID | Specified Behavior | Actual Behavior | Status | Notes |
|---|---|---|---|---|
| PAIR-001 | Create partner invite with 7-day expiry | No `/api/v1/invite` endpoint in code | ❌ | DB has `partner_invites`, but no handler |
| PAIR-002 | Accept invite and form couple | No `/api/v1/invite/accept` | ❌ | `couples` & `couple_members` tables exist |
| PAIR-003 | Reissue expired & prevent duplicate pairing | Not implemented | ❌ | Needs idempotency + conflict checks |

**User Journey Impact**: Entry to app blocked; cannot pair → **Critical**.  
**Edge Cases & Error Handling**: Not present.

---

### Daily Questions (DQ) Engine
**Specification Reference**: `design-documentation/features/daily-questions-engine/README.md`  
**Implementation Status**: ⚠️ Partial

**Requirements Compliance**:

| Requirement ID | Specified Behavior | Actual Behavior | Status | Notes |
|---|---|---|---|---|
| DQ-001 | Serve today’s prompt | `GET /api/v1/dq/today` implemented | ✅ | Uses Supabase join; schema validated with Zod |
| DQ-002 | Submit answer with visibility | `POST /api/v1/dq/answer` implemented | ✅ | Upsert on `(assignment_id, author_user_id)` |
| DQ-003 | Difficulty curve (5 easy→10 med→5 deeper), scheduling & snooze | Not implemented | ❌ | Worker/cron absent; no `/history`, no snooze |

**Performance Metrics**:  
- **Specified**: API p95 < 300ms, reliable local-time delivery.  
- **Actual**: Not measured; scheduling not implemented.  
- **Delta**: Unknown (needs instrumentation).

**User Journey Impact**: Primary task works (answer prompt) but lacks scheduling/consistency → **Major**.  
**Edge Cases**: History pagination, skip handling, idempotency keys for duplicates — partial (answer idempotent), others missing.

---

### Connection Quests (14-day + 6 light)
**Specification Reference**: `design-documentation/features/connection-quests/README.md`  
**Implementation Status**: ❌ Missing (API), ✅ Schema

**Requirements Compliance**:

| Requirement ID | Specified Behavior | Actual Behavior | Status | Notes |
|---|---|---|---|---|
| QUEST-001 | List/select quests | Endpoints absent | ❌ | DB tables `quests`, `quest_days`, `quest_progress` exist |
| QUEST-002 | Fetch Day N content (daily unlock) | Endpoint absent | ❌ | Needs entitlement checks |
| QUEST-003 | Complete day with reflection | Endpoint absent | ❌ | Schema supports `quest_day_completions` |

**User Journey Impact**: Feature inaccessible → **Critical**.

---

### Private Journals + Dual Prompts
**Specification Reference**: `design-documentation/features/private-journals-and-dual-prompts/README.md`  
**Implementation Status**: ⚠️ Partial

**Requirements Compliance**:

| Requirement ID | Specified Behavior | Actual Behavior | Status | Notes |
|---|---|---|---|---|
| JRNL-001 | Private journal entries by default | Implemented via `POST /api/v1/journal` | ✅ | `visibility` defaults to private in DB |
| JRNL-002 | Dual prompts + offline drafts + biometric lock | Not implemented | ❌ | Offline-only SW exists; no drafts/lock |
| JRNL-003 | Revocable sharing | `PATCH /api/v1/journal/:id` updates visibility | ✅ | Revocation implied; partner read via RLS |

**User Journey Impact**: Journaling works; dual-prompt & offline-draft gap → **Major**.  
**Edge Cases**: Soft delete implemented; 30-day recovery flow missing.

---

### Shared Reflections & Messaging Lite
**Specification Reference**: `design-documentation/features/shared-reflections-lite/README.md`  
**Implementation Status**: ❌ Missing (API), ✅ Schema

| Requirement ID | Specified Behavior | Actual Behavior | Status | Notes |
|---|---|---|---|---|
| SHARE-001 | Share toggle per entry | No dedicated endpoint; visibility update exists | ⚠️ | Needs explicit share API & activity feed |
| SHARE-002 | Reactions & short comments | Endpoints absent | ❌ | Tables exist (`entry_reactions`, `entry_comments`) |
| SHARE-003 | Privacy toggle after share hides entry with notice | Not implemented | ❌ | Requires event + feed syncing |

**Impact**: Social loop absent → **Major**.

---

### Progress & Insights
**Specification Reference**: `design-documentation/features/progress-and-insights/README.md`  
**Implementation Status**: ❌ Missing (API/UI), ✅ Schema

| Requirement ID | Specified Behavior | Actual Behavior | Status | Notes |
|---|---|---|---|---|
| INS-001 | Weekly recap & streaks | No endpoint/UI | ❌ | `insight_snapshots` table exists |
| INS-002 | Opt-in sentiment trend | No endpoint/UI | ❌ | Requires NLP pipeline + opt flag |

**Impact**: Motivation layer missing → **Major**.

---

### Safety, Privacy & Crisis Guardrails
**Specification Reference**: `design-documentation/features/safety-privacy-and-crisis-guardrails/README.md`  
**Implementation Status**: ❌ Missing (API/UI), ✅ Schema

| Requirement ID | Specified Behavior | Actual Behavior | Status | Notes |
|---|---|---|---|---|
| SAFE-001 | Privacy center & in-context reminders | Not implemented | ❌ | UX spec present |
| SAFE-002 | Crisis banner & region-aware resources | Not implemented | ❌ | `crisis_resources` table only |
| SAFE-003 | Inline resource card on risk phrases | Not implemented | ❌ | Needs client NLP + policy hooks |

**Impact**: High user risk if launched without this → **Critical**.

---

### Plans & Paywall
**Specification Reference**: `design-documentation/features/plans-and-paywall/README.md`  
**Implementation Status**: ❌ Missing (API/UI)

| Requirement ID | Specified Behavior | Actual Behavior | Status | Notes |
|---|---|---|---|---|
| BILL-001 | Plan comparison & checkout | No endpoints/UI | ❌ | Stripe not wired |
| BILL-002 | Proration/refunds/restore | Not implemented | ❌ | Needs webhooks + entitlements sync |

**Impact**: Monetization blocked → **Critical**.

---

## Gap Analysis Dashboard

### 🔴 Critical Misses (P0 - Must Fix)
- **Pairing API**: `/api/v1/invite`, `/invite/accept` — Blocks first-run UX. **Impact**: Users cannot use app. **Effort**: Medium.
- **Quests API**: List/select/day fetch/complete — Core value prop missing. **Impact**: High churn. **Effort**: Medium-High.
- **Plans/Billing**: Checkout + webhook — Cannot monetize. **Impact**: Revenue blocked. **Effort**: Medium.
- **Safety & Crisis**: No runtime guardrails/resources — Risky. **Impact**: Safety exposure. **Effort**: Medium.
- **Insights**: No progress feedback — Motivation loss. **Impact**: Retention risk. **Effort**: Medium.

### 🟡 Partial Implementations (P1 - Should Fix)
- **DQ Engine**: Add schedule/curve/history; snooze; local-time delivery; idempotent semantics across retries.
- **Journals**: Dual prompts, offline drafts with sync, 30‑day recovery UI, biometric/passcode lock.
- **Shared Reflections**: Reactions/comments endpoints, share activity, revocation notice UX.

### 🟢 Executed to Spec
- **Schema Coverage**: Postgres schema aligns with architecture for MVP entities.
- **Design System**: Tokens, components, and platform guidelines established.
- **PWA Skeleton**: Service worker + manifest in place.

### 🌟 Above & Beyond (Improvements)
- **Migrations with Rollbacks**: Clear up/down SQL plus comments — speeds safe deploys. (Documented: Yes)
- **OpenAPI Stub**: Early contract file provides a handoff anchor. (Documented: Yes)
- **Tokenized Tailwind Bridge**: CSS variables generated from tokens for future theming. (Documented: Yes)

---

## Architecture Compliance

**Specified vs. Actual**  
- **Data Flow**: **Yes/Partial** — DB schema & RLS align; missing workers for scheduling and analytics pipelines.  
- **Component Structure**: **Yes** — Route Handlers + service/repo pattern scaffolded.  
- **Integration Points**: **No** — Stripe, OneSignal, SendGrid not wired in code.  
- **Security Model**: **Partial** — RLS policies present; JWT validation in `requireAuth()` is placeholder; headers/CSP added on frontend.  
- **Scalability**: **Partial** — Indexes present; rate limiting (Upstash) not implemented; no background worker.

---

## Non-Functional Requirements Audit

| Category | Requirement | Target | Actual | Pass/Fail | Notes |
|---|---|---|---|---|---|
| Performance | API p95 | <300ms | Not measured | ❌ | Add tracing + synthetic tests |
| Performance | TTFI (Moto G) | <1.2s | Not measured | ❌ | Lighthouse/CI needed |
| Accessibility | WCAG Level | AA | Baseline tokens + focus | ⚠️ | Needs audits per screen |
| Security | Auth Method | Supabase JWT + RLS | JWT check placeholder | ❌ | Implement verification |
| Security | Rate Limiting | 100 req/5m | Not implemented | ❌ | Add Upstash middleware |
| Reliability | Backups | PITR | Config via Supabase | ⚠️ | Verify and document DR drills |
| Observability | Monitoring | Sentry + OTel | Not wired | ❌ | Add SDKs and alerts |

---

## Recommendations Priority Matrix

**Immediate Actions (Week 1)**
1. Implement pairing endpoints and UI; add idempotency & conflict checks.
2. Replace `requireAuth()` placeholder with real Supabase JWT verification; add rate limiting.

**Short-term Fixes (Month 1)**
1. DQ scheduling worker (difficulty cadence, timezone delivery) + `/history` endpoint.
2. Quests API (list/select/day/complete) + Today hub integration.
3. Stripe checkout + webhook → entitlements; paywall UI.
4. Safety: crisis resources endpoint + privacy center; surface in UI.

**Backlog Candidates (Future)**
1. Journals: offline drafts sync & recovery UI; biometric lock.
2. Shared Reflections: reactions/comments, revocation notices.
3. Insights service: weekly aggregation job + charts; opt-in sentiment.

---

## Validation Metadata
- **Review Date**: 2025-08-20
- **App Version**: scaffold (no release tag)
- **Documents Version**: latest generated in this workspace (see file frontmatter)
- **Testing Environment**: static code & schema audit (no live env)
- **Assumptions Made**:
  - Only files in `/mnt/data` were considered.
  - Performance metrics require a running environment; marked “Not measured”.
  - “Implemented” means present in code with plausible behavior; not execution-verified here.

---

### Traceability Appendix (Paths)
- Feature folders under `design-documentation/features/*` each contain: README (brief), user-journey.md, screen-states.md, interactions.md, accessibility.md, implementation.md.
- Backend endpoints implemented under `/mnt/data/sparq-backend/src/app/api/v1/...`
- Frontend feature implementation under `/mnt/data/sparq-frontend/src/...`

