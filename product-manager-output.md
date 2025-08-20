# Sparq Connection — Product Management Specification
*Generated: August 20, 2025*

> **Document Owner:** Product Manager (SaaS Founder mindset)  
> **Scope:** MVP → v1.0 planning for a text-first relationship app that strengthens couples’ connection through science-backed prompts, structured “Connection Quests,” journaling, and lightweight insights.  
> **Principles:** Problem-first, safety-first, privacy-first, testable & unambiguous requirements.

---

## Executive Summary

**Elevator Pitch (simple):** Sparq Connection helps couples talk every day—short, science-based prompts and 2‑week guided “Connection Quests” that make the relationship feel closer, safer, and more fun.

**Problem Statement:**  
Couples intend to connect but struggle with consistency, emotional safety, and practical “what to do today.” Apps feel fluffy or too clinical, and most don’t turn bite-sized moments into real habits. Users need simple, safe, repeatable micro-interventions that build trust and intimacy—without feeling like therapy homework or a productivity app.

**Target Audience:**  
- **Primary:** Adults (25–50) in committed relationships (dating, engaged, married), English-first, smartphone users, moderate tech comfort.  
- **Segments / Contexts:**  
  - **Growth‑oriented duos** seeking daily connection rituals.  
  - **Repairing trust** pairs needing calm, structured prompts that reduce conflict triggers.  
  - **Time‑crunched parents/professionals** who want quick wins (≤5 minutes/day).  
  - **Therapist‑adjacent** couples already in counseling who want safe, complementary practice between sessions.

**Unique Selling Proposition:**  
- **Evidence‑based micro-practices** (Gottman, attachment, positive psychology, NLP-tagged prompts) delivered in a friendly, non-clinical voice.  
- **Two-track system:** daily bite-sized questions + 14‑day “Connection Quests” with stories, clear instructions, and day-by-day momentum (followed by 6 lighter days).  
- **Partner-first design:** paired accounts, shared reflections, private journals, respectful safety features, and identity-based positive reinforcement.  
- **Text-first MVP:** no audio/video required—fast to ship, easy to use, low cognitive load.

**Success Metrics (MVP → v1.0):**  
- **Activation:** ≥70% complete onboarding + partner link within 48h.  
- **Engagement:** D7 retention ≥35%; Quest day completion rate ≥60%; Median session length 3–6 min.  
- **Connection Outcomes (self-report):** +20% uplift in “feel closer” survey by Day 14; ≥1 conversation/day started in ≥50% of pairs.  
- **Monetization:** Free → Premium conversion ≥5% in first 30 days; churn <5% MoM.  
- **Safety/Trust:** Privacy complaints <0.5%; zero critical incidents; ≥45 NPS.

---

## Personas (Condensed)

1. **“Busy Builders” (Jess & Mark, 34–42)**  
   - Two kids, demanding jobs; love is solid but routine.  
   - Need quick rituals, low-friction prompts, and tiny wins that add up.  

2. **“Healing Partners” (Ava & Ryan, 28–38)**  
   - Past ruptures / conflict cycles; fear of saying the wrong thing.  
   - Need emotionally safe scaffolding, calm models, and progress they can feel.  

3. **“Growth Nerds” (Sam & Taylor, 22–35)**  
   - Enjoy self-development; already try journals/podcasts.  
   - Want science-backed structure, streaks, and identity-based motivation.

---

## Problem-First Framing

**1) Problem Analysis**  
- Inconsistent connection; no shared ritual; “what do we talk about today?” fatigue.  
- Conversations escalate; partners lack scripts for safety, validation, repair.  
- Tools feel either too casual (no change) or too clinical (too heavy).

**2) Solution Validation**  
- Short, structured, psychologically sound exercises increase adherence and quality of dialogue.  
- A two-track system balances novelty (Quests) with routine (Daily Questions).  
- Private journals + shared reflections protect safety and enable growth without judgment.  
- Alternatives: Paired.com, card decks, therapy worksheets, social content. **Differentiator:** daily + quest cadence, identity framing, explicit safety/clarity in language, text-first speed.

**3) Impact Assessment**  
- Measure behavioral consistency (streaks), emotional safety (self-report), intimacy signals (quality of conversations), and long-term habit formation (Quest completions).

---

## Feature Specifications

### 1) Onboarding & Partner Pairing (P0)
- **User Story:** As a new user, I want simple onboarding and to invite my partner, so we can start together quickly.  
- **Acceptance Criteria:**  
  - **Given** I install the app, **when** I sign up with email/password or SSO, **then** my account is created with region/timezone set.  
  - **Given** I’m onboarded, **when** I choose “Invite Partner,” **then** a one-time link/QR is generated and expires after 7 days or upon use.  
  - Edge: If partner doesn’t accept within 7 days, invite can be reissued; if both accounts exist, pairing prevents duplicates.  
- **Priority:** **P0** (foundation).  
- **Dependencies:** Auth (Supabase), Notifications.  
- **Technical Constraints:** Handle unpaired solo mode; timezones; single pair cap per user (MVP).  
- **UX Considerations:** 3–5 step wizard; gentle copy; clear privacy notes.

### 2) Daily Questions (DQ) Engine w/ Modality Tags (P0)
- **User Story:** As a partner, I want 1 daily prompt (5 easy → 10 medium → 5 deeper) so we build connection safely.  
- **Acceptance Criteria:**  
  - Modality tags stored per question (e.g., Gottman, attachment, positive psych, NLP).  
  - Difficulty curve enforced per 20‑day cycle; no “what do you notice…” phrasing; partner‑dialogue oriented.  
  - Push at preferred time; snooze; “answer privately” + “share summary” options.  
  - Edge: If one partner skips, other can still journal; next day schedules correctly.  
- **Priority:** **P0**.  
- **Dependencies:** Content CMS, Notifications, Journaling.  
- **Technical Constraints:** Content versioning; A/B test variants.  
- **UX Considerations:** One-screen prompt → optional example → reply → gentle nudge to share/read partner’s.

### 3) Connection Quests (14-day) + 6 Light Days (P0)
- **User Story:** As a couple, we want guided 14‑day journeys with teaching stories and concrete steps, then 6 lighter days to breathe.  
- **Acceptance Criteria:**  
  - Each day includes: (a) 1–2 min teaching text, (b) clear micro‑task, (c) optional reflection.  
  - Progress saved per partner; day unlocks daily; catch-up allowed; clear end‑of‑Quest summary.  
  - Edge: If a day is missed, streak logic adjusts but doesn’t block progress.  
- **Priority:** **P0**.  
- **Dependencies:** Content CMS, Scheduler, DQ.  
- **Technical Constraints:** Text-first; localization-ready.  
- **UX Considerations:** Progress bar; celebratory micro-animations at milestones; enable “pick next Quest.”

### 4) Private Journals + Dual Prompts (P0)
- **User Story:** As a user, I want a private journal with optional personal‑growth prompt alongside the couple prompt.  
- **Acceptance Criteria:**  
  - Personal prompts appear after DQ/Quest; entries are private by default; sharing is explicit and revocable.  
  - Edge: Offline drafts sync later; redact/lock with passcode/biometric.  
- **Priority:** **P0**.  
- **Dependencies:** Secure storage, Encryption at rest, Auth.  
- **Technical Constraints:** Versioning; soft delete + 30‑day recovery.  
- **UX Considerations:** Minimal friction; calming writing space; export to email/PDF later (P1).

### 5) Shared Reflections & Messaging Lite (P0)
- **User Story:** As partners, we want to selectively share answers or summaries and react with low‑pressure signals.  
- **Acceptance Criteria:**  
  - Share toggle per entry; reactions (❤️ 👍 🙏) and short comments; read receipts are optional and can be disabled.  
  - Edge: If privacy toggled off after sharing, hide entry for partner and show a polite notice.  
- **Priority:** **P0**.  
- **Dependencies:** Journaling, Realtime (Supabase).  
- **Technical Constraints:** Granular permissions; audit log.  
- **UX Considerations:** “Gentle defaults” toward privacy; avoid pressure dynamics.

### 6) Progress & Insights (P0)
- **User Story:** As a couple, we want simple, respectful insights (streaks, themes, time-of-day success) to stay motivated.  
- **Acceptance Criteria:**  
  - Streaks per track (DQ, Quest); weekly recap; modality mix shown without judgment; opt-in sentiment trend.  
  - Edge: If one partner opts out of insights, show aggregated, non-attributable stats.  
- **Priority:** **P0**.  
- **Dependencies:** Analytics, Content tags.  
- **Technical Constraints:** Pseudonymous metrics by default.  
- **UX Considerations:** Encouraging tone; no shaming; identity-safe phrasing.

### 7) Safety, Privacy & Crisis Guardrails (P0)
- **User Story:** As a user, I want clear privacy, respectful language, and access to resources if I feel distressed.  
- **Acceptance Criteria:**  
  - Privacy center (what’s shared vs. private); in‑context reminders near share actions.  
  - Non-clinical crisis banner: “If you’re in immediate danger or thinking of harming yourself, tap here for resources.” (Region-aware links.)  
  - Edge: If specific risk keywords are entered, show a **non-judgmental** inline resource card; never store diagnostic labels.  
- **Priority:** **P0**.  
- **Dependencies:** Legal, Policy, Region data.  
- **Technical Constraints:** No medical advice; resource list is content-managed.  
- **UX Considerations:** Soft, opt-in help; no alarms/accusations; user control preserved.

### 8) Plans & Paywall (Freemium → Premium → Ultimate) (P0)
- **User Story:** As a user, I want clear value at each tier and the ability to upgrade/downgrade easily.  
- **Acceptance Criteria:**  
  - Free: 1 Quest + rotating DQs; Premium: 5 Quests + advanced insights; Ultimate: all Quests + future voice sessions (P2).  
  - Edge: Proration handled; refunds policy presented simply; restore purchases supported.  
- **Priority:** **P0**.  
- **Dependencies:** Stripe, App Store/Play (later), Licensing.  
- **Technical Constraints:** Server-side entitlements; anti-fraud basics.  
- **UX Considerations:** Honest comparison table; non-aggressive prompts.

### 9) Identity Badges (NLP-based, opt‑in) (P1)
- **User Story:** As a user, I want to choose an identity (e.g., “Calm Anchor”) that nudges me toward the partner I want to be.  
- **Acceptance Criteria:**  
  - Select one badge; small reminders across UI; optional weekly reflection “Did you live this today?”  
  - Edge: Switch/disable anytime.  
- **Priority:** **P1**.  
- **Dependencies:** Insights, Profile.  
- **Technical Constraints:** Content moderation for custom labels (defer).  
- **UX Considerations:** Supportive, not performative.

### 10) Date Night Planner & Ideas (P1)
- **User Story:** As a couple, we want easy, budget/time‑aware ideas we can save and schedule.  
- **Acceptance Criteria:**  
  - Filters (budget, at‑home/out, duration); save-to-favorites; gentle reminders.  
  - Edge: If calendar perms denied, allow manual reminders.  
- **Priority:** **P1**.  
- **Dependencies:** Notifications, (optional) Calendar APIs.  
- **Technical Constraints:** Static catalog MVP.  
- **UX Considerations:** Delightful cards; 1‑tap add to plan.

### 11) Goals & Habits Lite (P1)
- **User Story:** As partners, we want a tiny habit (e.g., 1 appreciation/day) with shared visibility.  
- **Acceptance Criteria:**  
  - Define ≤3 habits; track streaks; optional partner nudge.  
  - Edge: Avoid nag loops—cooldown after two missed nudges.  
- **Priority:** **P1**.  
- **Dependencies:** Notifications, Insights.  
- **Technical Constraints:** Simple counters first.  
- **UX Considerations:** Rewards → confetti micro‑animation; no shame text.

### 12) Content CMS (internal) (P1)
- **User Story:** As the team, we need to create/curate DQs, Quests, modality tags, and resources safely.  
- **Acceptance Criteria:**  
  - Versioning, draft → publish; rollback; audit trail.  
  - Edge: Failsafe default content if CMS unreachable.  
- **Priority:** **P1**.  
- **Dependencies:** Admin auth, Database.  
- **Technical Constraints:** Role-based access; seed data scripts.  
- **UX Considerations:** Internal tool.

### 13) AI Voice Coach Sessions (Ultimate) (P2)
- **User Story:** As premium users, we want optional short voice sessions for deeper guidance.  
- **Acceptance Criteria:**  
  - Timeboxed; scripted safety rails; explicit disclaimers.  
  - Edge: If risk phrases detected, surface resources and halt session.  
- **Priority:** **P2**.  
- **Dependencies:** TTS/ASR vendors; Legal.  
- **Technical Constraints:** Cost controls; latency.  
- **UX Considerations:** Ship after strong text MVP.

---

## Requirements Documentation

### 1) Functional Requirements

**Key User Flows (MVP):**  
1. **Signup & Pairing:** Sign up → invite partner → accept → set quiet hours & preferred prompt time.  
2. **Daily Question:** Receive push → open prompt → optional example → answer → choose share/private → optional journal prompt → done.  
3. **Connection Quest:** Select Quest → Day N teaching → micro-task → reflect → progress saved; summary at Day 14 + 6 light days.  
4. **Shared Reflection:** Read partner’s shared note → react/comment → (optional) schedule a mini-activity.  
5. **Insights:** View streaks and recap → optional identity check-in.  
6. **Plan Upgrade:** View plans → purchase → entitlements applied immediately.

**State Management Needs:**  
- Account & pairing state; content schedule state; progress per track; journaling privacy flags; notifications state; entitlement state.

**Data Validation Rules:**  
- Emails valid + verified; one active pairing unless explicitly unpaired.  
- Shared items must have explicit “share=true”; default = private.  
- Content IDs must exist and be “published” in CMS; region for resource links set.

**Integration Points:**  
- **Supabase:** Auth, DB, Realtime.  
- **Stripe:** Subscriptions & entitlements.  
- **Push Notifications:** Platform native.  
- **(Optional) Calendar:** Read/write reminders (P1).

### 2) Non-Functional Requirements

- **Performance:** P95 screen-to-interaction < 1.2s on mid-tier phones; payloads < 200KB typical.  
- **Availability:** 99.5% monthly (MVP); graceful offline for journaling & prompt reading.  
- **Scalability:** Designed for 50k concurrent users; partitioned content reads; CDN cache for static content.  
- **Security & Privacy:**  
  - OAuth/email auth; salted hashing; encryption at rest for journal content.  
  - Role-based admin; audit logs; PII minimization; regional resource mapping.  
  - Clear disclaimers: app is not therapy; emergency resources surfaced respectfully.  
- **Compliance:** GDPR-ready data export/delete; WCAG 2.1 AA; COPPA not targeted.  
- **Observability:** Structured logs; metrics (activation, retention, completion); alerting on error budgets.

### 3) User Experience Requirements

- **Information Architecture:** Home (Today) → DQ → Quest → Journal → Partner → Insights → Plans → Settings/Privacy.  
- **Progressive Disclosure:** Tooltips/examples only when needed; “Why this question?” expands details + modality tag.  
- **Error Prevention:** Confirm before sharing; autosave drafts; duplicate-invite guardrails.  
- **Feedback Patterns:** Tiny haptics; confetti at milestones; weekly recap with 1 actionable tip.

---

## Success Metrics & Analytics

- **Activation:** Onboarding completion %; partner link acceptance %.  
- **Engagement:** D1/D7/D30 retention; DAU/WAU; DQ open rate & completion; Quest day completion; journal usage rate.  
- **Connection Impact (self-report):** Pre/Post Quest micro‑survey (“felt closer?”, “felt safe?”).  
- **Monetization:** Free→Premium conversion; MRR; churn; ARPU.  
- **Safety & Trust:** Privacy toggle usage; resource card views; support tickets.

---

## Risks & Mitigations

- **Emotional Harm/Triggering:** Use gentle language, opt-in examples, clear exits, resource surfacing.  
- **Partner Power Dynamics:** Privacy-first defaults; no mandatory read receipts; disable “nag” loops.  
- **Content Drift/Quality:** CMS with review workflow; user feedback loops; A/B testing.  
- **Over-scope:** Text-first MVP; defer voice & heavy AI until strong retention.  
- **Data Sensitivity:** Encrypt journals; minimal PII; transparent privacy education.

---

## Critical Questions Checklist (MVP Readiness)

- [x] **Existing solutions we improve upon?** Yes—Paired.com, card decks; we offer two-track cadence + identity framing + explicit safety.  
- [x] **Minimum viable version?** Onboarding/Pairing, DQ Engine, 1 Connection Quest, Journaling, Shared Reflections Lite, Insights Lite, Paywall.  
- [x] **Risks or unintended consequences?** Emotional triggers, privacy leaks, pressure dynamics—mitigations above.  
- [x] **Platform-specific needs?** Mobile-first web/PWA; push via web + native wrappers later; timezone-safe schedulers.

---

## Assumptions (for this spec)

- Text-only content at launch; audio/video later.  
- English-only initially; region-aware crisis resources.  
- Single-pair per user in MVP; group features out of scope.  
- Pricing: Free, Premium, Ultimate; exact price points TBD via testing.

---

## Backlog Summary (Priority Buckets)

**P0 (MVP):** Onboarding/Pairing; DQ Engine; 1–2 Quests; Journaling; Shared Reflections Lite; Insights Lite; Safety/Privacy; Paywall.  
**P1:** Identity Badges; Date Night Planner; Goals/Habits Lite; Content CMS; Export journal (PDF/Email); Calendar opt‑in.  
**P2:** AI Voice Coach; multilingual; therapist portal; deeper analytics & ML personalization; advanced moderation.

---

## Acceptance Test Matrix (Samples)

| Feature | Given | When | Then |
|---|---|---|---|
| Pairing | Valid invite link | Partner taps link | Accounts pair; both see success; link invalidated |
| DQ | It’s scheduled time | User opens notification | Sees prompt → answer → share/private saved |
| Quest | Day N unlocked | User completes task | Progress = N/14; next day locked until next day |
| Journal Privacy | Entry was shared | User toggles private | Partner loses access; “entry unavailable” notice |
| Insights | Week ends Sun 23:59 | User opens app Mon | Sees recap with streaks + 1 tip |

---

## Release Plan (High Level)

- **Alpha (Internal):** 1 Quest, DQ engine, journaling, pairing, insights lite.  
- **Beta (Invite):** 3–5 Quests, safety center, paywall, identity badges A/B.  
- **v1.0 Public:** Polished onboarding, 5+ Quests, goals/habits lite, planner, export.

---

## Traceability to Business Objectives

- **Increase relationship health at scale:** Daily adherence and Quest completion.  
- **Efficient monetization:** Tiered value ladder, upsell hooks via impact moments.  
- **Low-cost ops:** Text-first, CMS-driven; defer heavy AI until PMF.

---

## Final Notes

- All copy must be **clear, actionable, and psychologically safe.**  
- Every prompt includes a tiny example *only if helpful* and never shaming.  
- **This document is unambiguous, testable, and feasible** for a text-first MVP, and expandable once PMF is demonstrated.
