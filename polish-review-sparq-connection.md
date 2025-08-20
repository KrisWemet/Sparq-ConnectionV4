# Polish Review: Sparq Connection — Core App (Today, DQ, Journal)
Date: 2025-08-20
Reviewer: Design Polish Specialist
Design Maturity: 2.5 / 5

## Executive Summary
Sparq’s foundation is solid: a token-driven design system, clean layout grid, and accessible defaults. To reach FANG-level polish, focus on rhythmic spacing, state richness (loading/empty/error), motion choreography, and accessibility depth (labels, landmarks, focus order). Below is a prioritized, actionable roadmap with pixel-accurate adjustments mapped to the current Next.js/Tailwind scaffold.

## Current Excellence
- **Design tokens → Tailwind**: Color variables and neutrals flow cleanly into utility classes, enabling consistent theming.
- **Base components**: Button/Card primitives are sensible, readable, and responsive.
- **PWA scaffolding**: Service worker and manifest create room for perceived performance wins.
- **Form affordances**: Answer text area enforces clear interaction focus with visible focus ring.

## Critical Path to Excellence

### 🔴 Priority 1: Must Fix
1. **Form Semantics & A11y**
   - **Issue**: DQ visibility radios are unlabeled group; not keyboard-grouped.
   - **Fix**: Wrap radios in `<fieldset>` with a `<legend class="sr-only">Visibility</legend>` and add `aria-describedby="vis-help"` helper text.
   - **Exact**: Replace container with:
     ```tsx
     <fieldset className="flex flex-wrap items-center gap-4" aria-describedby="vis-help">
       <legend className="sr-only">Visibility</legend>
       {/* radio labels... */}
     </fieldset>
     <p id="vis-help" className="text-neutral-500 text-xs">You can change this later.</p>
     ```
2. **Touch Targets & Hit Area**
   - **Issue**: Radio + label taps may fall below 44×44px on mobile.
   - **Fix**: Apply `.py-2 px-2` to labels; ensure `min-h-[44px]` on button and interactive list items.
3. **Focus Management**
   - **Issue**: After “Save”, no confirmation focus; screen readers may miss success.
   - **Fix**: Add `role="status" aria-live="polite"` confirmation region and focus the toast/success chip.
   - **Exact**: Place after action row:
     ```tsx
     <div role="status" aria-live="polite" className="sr-only" id="save-status" />
     ```
     Update on success: `document.getElementById('save-status')!.textContent = 'Saved';`

### 🟡 Priority 2: Should Fix
1. **Vertical Rhythm & Grid**
   - **Issue**: Mixed 12/16/20px gaps reduce scanability.
   - **Fix**: Standardize to **8px base** scale. Use:
     - Intra-group gap: **8px (gap-2)**
     - Between sections inside card: **16px (space-y-4)**
     - Between major blocks (header ↔ form ↔ footer): **24px (space-y-6)**
2. **Typography Hierarchy**
   - **Issue**: Body copy and helper text are close in tone.
   - **Fix**: Set body to `text-[15px]/[22px]` and helper to `text-[13px]/[18px]` with `text-neutral-600`.
   - **Exact**:
     - H2: `text-xl font-semibold tracking-[-0.01em]`
     - Body: `text-[15px] leading-[22px]`
     - Small: `text-[13px] leading-[18px]`
3. **Button States & Density**
   - **Issue**: Primary button lacks rich states; shadow jump feels abrupt.
   - **Fix**: Add transitions `transition-shadow transition-transform` with `duration-200` and `hover:-translate-y-[1px]`.
   - **Exact**:
     - Default: `shadow-md`
     - Hover: `shadow-lg -translate-y-[1px]`
     - Active: remove translate; add `ring-2 ring-brand-dark/20` for accessible feedback.
4. **Empty, Loading, Error States**
   - **Issue**: Loading pulse is generic; no empty/success reinforcement.
   - **Fix**: Implement **skeletons shaped like final content** and friendly empty copy.
   - **Exact**:
     - Skeleton: three lines `h-4 rounded` (60%, 90%, 70% widths) + textarea placeholder `h-28` with `animate-pulse`.
5. **Motion Choreography**
   - **Issue**: State changes are abrupt; global timing not standardized.
   - **Fix**: Use timing system:
     - Micro (hover/focus): **120ms ease-out** (`cubic-bezier(0.2, 0, 0, 1)`)
     - UI transitions: **220ms standard** (`cubic-bezier(0.4, 0, 0.2, 1)`)
     - Page transitions/modals: **360ms ease-in-out**
   - **Implementation**: Add Tailwind utilities via `transition-[colors,opacity,transform] duration-200 ease-out` to interactive elements.

### 🟢 Priority 3: Could Enhance
1. **Card Depth & Light Source**
   - **Recommendation**: Use layered shadows for natural depth:
     - `shadow-[0_10px_24px_rgba(0,0,0,0.10),0_2px_4px_rgba(0,0,0,0.06)]`
2. **Textarea Readability**
   - **Recommendation**: Increase to `min-h-[160px]`, set `placeholder:text-neutral-400`, and constrain line length `max-w-[65ch]` inside card.
3. **Microcopy Clarity**
   - **Recommendation**: Change **Save** → context-aware:
     - Private: “Save privately”
     - Shared: “Share with partner”
     - Summary: “Save summary”
4. **Progressive Disclosure**
   - **Recommendation**: Collapse advanced options (visibility explanation, tags) behind a “More options” disclosure with graceful motion.

## Detailed Recommendations

### Visual Polish
- **Spacing scale**: Adopt 8px base throughout. Replace arbitrary paddings with `p-6` (24px) for cards, `space-y-6` between primary sections.
- **Corner radii**: Standardize to `rounded-2xl` (24px) on primary cards, `rounded-xl` (16px) on inputs and buttons.
- **Borders**: Replace `border-neutral-300` with `border-neutral-200` for inputs; add `focus-within:ring-2 ring-brand-primary` wrapper to group fields.
- **Contrast**: Use `brand.dark` for small interactive text and icons to ensure **≥4.5:1** contrast on white backgrounds.
- **Icons**: Normalize to 1.5px stroke weight; maintain consistent bounding boxes (e.g., 20×20 for inline, 24×24 for buttons).

### Interaction Polish
- **Hover states**: Buttons—add subtle elevation and `-translate-y-[1px]`; links—underline-on-hover with `decoration-[1.5px]` for crispness.
- **Focus states**: Replace default outline with tokenized ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2`.
- **Form validation**: On submit error, set `aria-invalid="true"`, attach `aria-describedby` to an inline helper `id="answer-error"` and programmatically focus the textarea.
- **Optimistic UI**: On save, disable controls, show inline success chip (“Saved ✓”) for 1.6s; update aria-live region.

### Content Polish
- **Headings**: Clarify hierarchy: Page title `text-2xl`, Card title `text-xl`, Section labels `text-sm font-medium`.
- **Copy tone**: Empathetic and concise: “Write a quick note about today’s prompt—share now or keep it private.”
- **Empty states**: Provide helpful actions—“No question yet. Check back at 9:00 AM or set your reminder time in Settings.”

### Accessibility Enhancements
- **Landmarks**: Wrap main content in `<main role="main">`; add `<nav>` landmarks where applicable.
- **Keyboard order**: Ensure tab order follows visual reading order; add `skip to content` link.
- **Touch targets**: Enforce `min-h-[44px] min-w-[44px]` on tappable items; increase checkbox/radio label padding on touch devices.
- **Reduced motion**: Gate all motion with `@media (prefers-reduced-motion: reduce)`; provide non-animated fallbacks.

### Performance Perception
- **Skeleton accuracy**: Mirror final layout skeletons to reduce layout shift (CLS).
- **Prefetch**: Prefetch next quest-day route on idle with `router.prefetch` once quests ship.
- **Image policy**: If avatars or badges appear later, use `next/image` with proper `sizes` for DPR scaling.

## Implementation Sequence
1. **Quick wins (day 1–2)**
   - Fieldset/legend for visibility radios; aria-live success; min touch targets; consistent spacing (`space-y-6`); textarea `min-h-[160px]`.
2. **Systematic (week 1)**
   - Global motion tokens and Tailwind utilities; layered shadow tokens; focus-visible ring standardization; skeleton components.
3. **Future enhancements (post-MVP)**
   - Disclosure for advanced options; optimistic UI patterns generalized; iconography audit; microcopy systemization.

## References & Inspiration
- **Material 3**: Focus rings & motion durations for web
- **Apple HIG**: Touch target guidance (44×44) and clarity
- **Polaris (Shopify)**: Skeleton patterns and spacing rhythm
