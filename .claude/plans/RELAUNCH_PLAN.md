# RoleFit — Relaunch Plan: Monetization, Onboarding, Tailoring (Planning Only)

> **Status:** Phases 1–5 done. Phase 6 (Tailoring Workspace) is next.
> - Phase 1 (Hygiene): commit `5dbbeda` + IDOR fixes. Still open: rotate `JWT_SECRET`, set up Sentry, confirm DB backups, GCP budget alert.
> - Phase 2 (Email): password reset shipped.
> - Phase 3 (Monetization): ToyyibPay integration, Subscription model, requireActiveSubscription middleware, monthly (RM29) + weekly (RM9) plans, admin features — commit `71d177a`.
> - Phase 4 (Onboarding): resume upload + Gemini AI parse → auto-fills Profile/Experience/Projects/Skills/Certifications. `pdf-parse` v2 class-based API used.
> - Phase 5 (Landing + Demo): public landing page at `/`, gated ATS demo widget, free-tier 1-gen model, DemoUsage rate limiting — see item 5 below for full detail.

## Context

This is the user's first full web app, a personal side project, already built (Angular + Express + MySQL/Prisma + Gemini AI) and previously deployed/working on GCP until free credit ran out. The goal now is to relaunch it as a **paid product** (RM29/month via ToyyibPay), aimed at job seekers who want to quickly tailor a resume — including a "job fair" usage pattern: the seeker preps a tailored resume on their phone using this app, then uploads that resume separately to a company's own application portal (the booth QR belongs to the company, not this app — confirmed, so **no QR/deep-link integration work is needed here**).

Decisions made so far:
- Job Board = personal tracker w/ better UX, not external aggregation or an employer marketplace.
- Payment gateway = **ToyyibPay** (Malaysia-friendly, onboards individuals without SSM registration).
- Booth/QR flow needs **zero engineering** — the company's QR points to the company's own site. This app's job is purely to produce a great tailored resume fast, ideally on mobile, before that hand-off.
- UI library: revisiting Tailwind vs Angular Material below — recommendation changed to **Angular Material** (reasoning in section 2).

This plan reprioritizes around what's actually needed to relaunch and start charging: a paywall, a low-friction onboarding (upload resume → auto-filled, not a blank form), a landing page, and a safe demo — on top of the Tailoring Workspace, which remains the actual product being sold.

---

## 1. New critical features (the real gaps, beyond the original three pillars)

### a) Monetization — paywall via ToyyibPay
- New table `Subscription`: `id, userId, status (pending|active|expired|cancelled), amount, currency ("MYR"), provider ("toyyibpay"), providerBillCode, startsAt, expiresAt, createdAt`. One row per billing period — no separate `Plan` table needed yet for a single RM29/month tier; add one later only if you introduce a second tier.
- Backend: `payment.service.ts` — create a ToyyibPay "bill" (their term for a payment request) when a user clicks subscribe, redirect them to the hosted ToyyibPay payment page, and handle their callback to mark the `Subscription` as active. ToyyibPay calls your backend with a callback URL after payment — verify it server-side (don't trust a client-side "success" redirect alone).
- Middleware `requireActiveSubscription`: checks `expiresAt > now()` on each request to paid endpoints. No cron job needed — checking live on request is simpler and sufficient at this scale.
- Decide the free/paid line (proposed, adjust as you like): account creation + resume upload/parse + profile editing = free (this is what hooks people in); actually **generating/exporting a tailored resume** = paid. This means the funnel is: sign up free → see your data auto-filled → hit a paywall right at "tailor for this job."

### b) Onboarding revamp — Resume Upload & AI-Parse
This is the actual fix for "I don't want users spending too long setting up." Today, a new user has to manually fill Profile, then Experience, then Projects, then Certifications as separate forms — that's the slow part you want to remove.
- New flow: after signup, the **first screen is "upload your resume"** (PDF/DOCX, reuses the existing `multer` upload setup).
- New backend piece: `resumeParser.service.ts` — extract raw text from the upload (`pdf-parse` for PDF, `mammoth` for DOCX), send that text to Gemini with an extraction prompt ("pull out contact info, summary, work experience, projects, skills, certifications as JSON matching this shape: ..."), then write the result into the **existing** Profile/Experience/Project/Skill/Certification tables via the **existing** creation services — no schema change needed here.
- User then sees their profile already populated and just reviews/edits, instead of starting from blank forms. This is the single highest-value feature for both your stated onboarding goal and the job-fair (mobile, time-pressured) scenario.

### c) Landing page
Public route, no login required. Explains the product, shows pricing (RM29/month), has a "Try Demo" and "Sign Up" call to action. Pure frontend work, no backend changes.

### d) Demo / trial (must be abuse-resistant)
The real abuse risk isn't "someone uses the app for free" — it's that every resume generation/analysis is a **paid Gemini API call**, so an unauthenticated demo is a direct way for someone to run up your AI bill.
- Proposed design: anonymous visitor can upload a resume and try **one real tailoring** for free, gated by:
  - A server-side `DemoUsage` record keyed by a hashed IP + a browser cookie (not tied to a `User` — there's no account yet), capping it to e.g. 1–2 generations per device per rolling 24–48h.
  - Google reCAPTCHA v3 on the demo endpoint to block scripted/bot abuse.
  - A hard cap on input length (resume text / job description length) so a single call can't balloon token cost.
- This reuses your existing `generateForApplication`/`analyzeResume` logic — it's the same feature, just reachable without login and behind extra throttling instead of a subscription check.

---

## 2. Your direct questions, answered

**"Am I going to be creating tables a lot? I don't understand `db push`."**

Yes — and that's normal, not a sign of doing something wrong. Every time you add a new feature that needs new data (like `Subscription` or `DemoUsage` above), you:
1. Edit `schema.prisma` to add the new model.
2. Run `npx prisma migrate dev --name add_subscription` (or whatever you're adding).
3. Prisma writes the actual SQL for you into a new timestamped file under `prisma/migrations/`, and applies it to your local MySQL.

Think of each migration file as a changelog entry for your database structure — similar to a git commit, but for table shape instead of code. You're not hand-writing `CREATE TABLE` statements; Prisma generates them. You already have 5 of these from past work, so you're already doing this correctly — just keep using `migrate dev` for every new model going forward.

`db push` is a shortcut that applies your schema directly to the database **without** writing one of those changelog files. It's meant for very early, throwaway prototyping where you don't care about history yet. Since you already have real migration history, **don't use `db push` now** — mixing it in would make your migration history disagree with your actual database structure (called "drift"), which gets confusing to debug later. Stick with `migrate dev` every time.

**"Is Angular Material enough? Do I need Tailwind?"**

Switching my recommendation: **use Angular Material, skip Tailwind for now.** Reasoning:
- The actual exported resume (the PDF a job seeker uploads to a company) is generated **server-side by PDFKit**, not by your Angular frontend at all. So the "need pixel-precise custom resume templates in the frontend" argument I made earlier doesn't really apply — that styling concern lives in `resume.service.ts`/PDFKit, completely separate from whatever UI library you pick.
- What the frontend library actually needs to do well now is: forms (signup, profile editing), dialogs/snackbars (payment success/failure, errors), and being usable on a phone (job-fair scenario) — Angular Material is built for exactly this and gives you working accessibility/responsiveness for free.
- You said you're trying to master the core stack first — adding Tailwind's own config/build step is one more thing to learn that isn't necessary for any of your actual requirements right now.
- The Tailoring Workspace's split-screen layout is just a CSS flexbox/grid concern — plain CSS/SCSS handles that fine regardless of which component library sits underneath it.

So: Angular Material for components, plain SCSS for the custom split-screen layout. No Tailwind.

---

## 3. Carried over from the original review (still valid, just reprioritized below)

- **Security findings** (uploads/ committed to git, refresh token usable as access token, tokens in localStorage, no login rate-limiting, no helmet, 7-day JWT default) — now more urgent than before since this app is about to handle real payments and be publicly marketed, not just personally used. See prior findings; nothing has changed about them.
- **Dependency vulnerabilities** — confirmed `npm audit fix` (no `--force`) resolves all 16 frontend + 1 backend vulnerability. Do this before relaunch.
- **Migrations** — answered above; you're already doing it right.
- Resume export is currently PDF-only via PDFKit. Worth knowing: some company application portals require `.docx` specifically — flagging as a later nice-to-have, not urgent now.

---

## 4. UI assessment (checked the actual code, not guessed)

Current UI is serviceable, not embarrassing: consistent purple/gradient look, working responsive breakpoints, real reactive forms with validation. The structural weakness is no shared theme — colors/shadows are hardcoded per component file instead of centralized — which is exactly what Angular Material adoption fixes later. **Don't do a visual/branding polish pass yet** — most current screens will be restructured by the features below anyway, so polishing them now would be wasted work.

Two things found that are correctness/trust bugs, not polish, and should be fixed immediately regardless of sequencing:
- `frontend/src/app/features/auth/login.component.ts:15` prints `admin@gmail.com, Admin123!` directly on the public login page — a real seeded admin account (`backend/scripts/seed-jobs.ts:79`) advertised to any visitor. Must not ship.
- `frontend/src/app/features/dashboard/dashboard.component.ts:48-57` labels "AI Resume Builder" and "Analytics" as "Coming Soon" even though AI resume generation already works (it's reachable from the Job Applications screen) — confusing mismatch, cheap to fix.

Also confirmed: there is currently **no public landing page** — `app.routes.ts` redirects `/` straight into the auth-guarded `/dashboard`. Consistent with building a real landing page in this plan.

---

## 5. Admin role & minimal admin page

The RBAC foundation already exists and is unused: `User.role` field + `authorize(...roles)` middleware (`backend/src/middleware/auth.middleware.ts:45`). Wiring it up is cheap. Priority reason: this is your first payment-gateway integration, and webhook integrations reliably break in unpredictable ways on day one (callback misconfigured, ToyyibPay's call arriving before your endpoint is ready, etc.) — when that happens you need a way to confirm "did this person actually pay?" and manually fix their `Subscription` without a code deploy.

Keep scope minimal for v1:
- User list: email, signup date, current subscription status/expiry.
- Manual subscription override: activate / extend / cancel a given user's `Subscription` row.
- Basic counts: total users, active subscribers, revenue this billing period, demo attempts today.
- Gate the page with a new `adminGuard` (frontend) mirroring the existing `authGuard`, plus `authorize('admin')` (backend) on the admin API routes.
- Promote yourself to admin via a one-off SQL update or a small script (like the existing `check-users.ts`/`seed-jobs.ts` pattern) — not a public signup toggle.

This belongs inside the Monetization Backbone phase below, not later — it's the safety net for that phase, not a separate feature.

---

## 6. Production-readiness gaps (beyond the original review)

**Hard blockers — don't take real payments without these:**
- **Password reset.** Doesn't exist today (the docs even list it as a TODO). A paying user with no recovery path is a support disaster waiting to happen.
- **Terms of Service / Privacy Policy / Refund Policy pages.** You're storing real personal data (names, phone numbers, employment history) under Malaysia's PDPA, and a payment gateway/visible refund policy is expected by users and likely by ToyyibPay's onboarding.
- **A usage cap on AI generation per billing period.** Today's only throttle is a 60-second cooldown — nothing stops one RM29/month subscriber from generating hundreds of resumes and erasing your margin on Gemini costs.
- **Error tracking** (e.g. a free Sentry project). Right now, if a payment webhook or a Gemini call fails in production, you find out only if a user complains.
- **Confirmed database backups.** Once strangers' paid data is in the DB, data loss can't be an acceptable outcome.
- **An authorization/ownership audit pass** on existing controllers — confirm every `:id` route checks the resource belongs to the requesting `userId`, not just that it exists. Likely fine today (everything is JWT-scoped) but worth deliberately verifying before strangers' paid data is on the line.

**Should-have soon after launch:**
- Uptime monitoring on the existing `/health` endpoint (it exists, just isn't watched externally yet).
- Email infrastructure (pick one provider — Resend/SES/etc.) used for both password reset and payment receipts/renewal reminders — build it once, since both needs share the same plumbing.
- File upload validation (size cap, real MIME-type check rather than trusting the extension) for the new resume-parsing upload path.
- A short "please review AI-generated content before submitting" disclaimer in the Tailoring Workspace — a hallucinated detail on a real job application has real consequences for the user.

**Can wait:** self-service subscription cancellation UI, payment retry/dunning, `.docx` export.

---

## 7. Revised sequencing (money-and-relaunch first)

1. **Hygiene + redeploy prep:** gitignore `uploads/`, `npm audit fix` both packages, fix JWT access-token default, add `helmet` + login rate-limiting, remove the hardcoded admin-credential hint from the login page, fix the misleading "Coming Soon" dashboard labels, do the authorization/ownership audit pass, set up error tracking, confirm DB backups are enabled. Also: check what's actually running/billed on GCP (Cloud Run scales to zero when idle and is cheap; if you're using Cloud SQL it bills 24/7 even with no traffic) and set a GCP budget alert before turning things back on.
2. **Email infrastructure:** pick a provider once, ship password reset and payment-receipt/renewal emails off the same plumbing.
3. **Monetization backbone:** `Subscription` model + ToyyibPay integration + `requireActiveSubscription` middleware + per-period usage cap + minimal admin page (section 5) + legal pages (ToS/Privacy/Refund) + a basic pricing/checkout page.
4. **Onboarding revamp:** Resume Upload & AI-Parse feature, replacing "fill 4 separate forms" as the first thing a new user does, with file-upload validation hardening.
5. **Landing page + Demo:** ✅ DONE — gated multi-step demo experience implemented.
   - `LandingComponent` (`frontend/src/app/features/landing/`) — public route at `/`, replaces the old redirect-to-dashboard. Includes nav bar, hero, ATS demo widget, How It Works, features grid, pricing (Free / RM9 7-day / RM29 monthly), footer.
   - **Step 1 (The Hook):** anonymous visitor pastes resume text + job description → `POST /api/demo/analyze` → returns ATS score ring (red/orange/green), matched/missing keyword chips, verdict. Rate-limited by hashed IP via `DemoUsage` table (default 1 check/day; `DEMO_CHECKS_PER_DAY` env var overrides for testing).
   - **Step 2 (The Gate):** "Fix My Resume" CTA routes unauthenticated users to `/register`.
   - **Step 3 (Free Tier):** after registration, `tier = "free"`, `freeGenerationUsed = false` — user gets exactly 1 AI resume generation via `requireAiAccess` middleware (allows free-tier first gen OR active subscription).
   - **Step 4 (Paywall):** after the free generation, subsequent calls to the generate endpoint require an active subscription. Export PDF and Analyze Fit are subscription-only from the start (`requireActiveSubscription`).
   - **Backend:** `demo.service.ts` (ATS score via Gemini + IP rate-limit check), `demo.controller.ts` (records usage only on successful Gemini response — failed calls don't consume the quota), `demo.routes.ts`, registered at `/api/demo`.
   - **Models added:** `DemoUsage` (IP hash + timestamp, indexed), `tier` + `freeGenerationUsed` columns on `User`. Migration: `20260702114432_add_demo_usage_and_free_tier`.
   - **Payment:** `payment.service.ts` extended with `SubscriptionPlan = "monthly" | "weekly"`. Successful ToyyibPay callback now sets `User.tier = "subscriber"`.
   - **AI model:** all tiers use `gemini-3.1-flash-lite` (configurable via `GEMINI_MODEL_PRO` / `GEMINI_MODEL_FREE` env vars).
   - **Still deferred from original plan:** reCAPTCHA v3 (not yet wired), support/contact page.
6. **Tailoring Workspace:** the core paid feature — split-screen JD/resume view, reusing the existing match-score/suggestions fields, section-level regeneration, plus the "review before use" disclaimer.
7. **Mobile responsiveness pass** across onboarding, demo, and the Tailoring Workspace specifically (this is the job-fair usage context).
8. **Angular Material adoption**, incrementally, starting with the screens above.
9. **Later (you said this explicitly can wait):** Job Board UX polish — filters, Kanban, auto `StatusHistory` logging.
10. **Defer / optional:** cover letters, interview/reminder UI, `.docx` export, self-service cancellation, payment dunning.

---

## Verification

- After `npm audit fix`: re-run `npm audit` in both packages to confirm 0 remain, and `ng build` to confirm the frontend still builds.
- After adding `Subscription`: do one full manual payment loop against ToyyibPay's sandbox (if they offer one) before going live, confirming the callback correctly flips status to `active`, and confirm the admin override actually works as a fallback.
- After the resume-parse feature: upload a real PDF resume and confirm the auto-filled Profile/Experience/Project/Skill sections match the source document before treating onboarding as "done."
- After demo launch: manually verify the rate limit actually blocks a second attempt from the same device, and that reCAPTCHA is wired to the right key (test vs production keys are different).
- After password reset: send a real reset email to yourself end-to-end before relying on it for a real user.
- After the authorization audit: confirm with a second test account that it cannot read/modify the first account's resumes, job applications, or profile via direct API calls.
