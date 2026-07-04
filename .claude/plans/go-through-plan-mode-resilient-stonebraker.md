# Tailoring Workspace + Job Application Kanban Board (Phase 6) — Implementation Plan

## Context

Stages 1-5 of the relaunch (hygiene, email, monetization/ToyyibPay, onboarding auto-fill, landing+demo) are done. The Tailoring Workspace is the actual paid product being sold — today, resume generation/analysis lives as a developer-oriented panel bolted onto each Job Application card: a raw Gemini model-name dropdown, a free-text system-prompt editor, a "Copy Prompt into ChatGPT" manual fallback, a raw-JSON toggle, and separate "Generate AI" / "Analyze Fit" buttons that each cost a full Gemini call. This is functional for the app's builder but not something to hand a paying customer.

This phase replaces that panel with a dedicated, mobile-friendly split-screen workspace, and — per the user's explicit idea — merges resume generation and fit-analysis into a single Gemini call for the primary flow to cut AI cost/latency roughly in half on the dominant path, while keeping a standalone re-analyze action alive for resumes that were imported or hand-edited.

Scope was then expanded once: the flat, filter-dropdown job-application list is being replaced with a **Kanban board** (columns per status, drag-to-move cards), styled after job-tracker apps like eztrackr.app. This directly serves the "user can easily track their jobs" goal, and conveniently reuses infrastructure already in place — `StatusHistory` is already auto-logged on every status change server-side (`jobApplication.service.ts`, backend), just never surfaced in the UI, so moving a card between columns needs zero new backend work beyond the existing update endpoint. Dashboard analytics wiring remains deferred to a later phase.

## Key decisions (already made, not open for re-litigation)

1. **Merge generate+analyze** into one Gemini call for the primary "Tailor My Resume" action. Keep the existing standalone `analyze` endpoint alive as a smaller "Re-check Fit" action for imported/hand-edited resumes.
2. **Scope: Tailoring Workspace + the job-application list's board layout only.** Deeper job-tracking UX (a visible `StatusHistory` timeline per card, dashboard analytics counts) stays deferred to a later phase.
3. **Free-tier users see the analysis too** (score/breakdown/suggestions), since it's computed "for free" as part of their one lifetime generation — framed as an upgrade hook, not paywalled.
4. **Version history: view + restore, capped at 5 versions per job application.** A compact dropdown shows up to the 5 most recent resume versions; the user can restore an older version to become the current/latest one. When a new version would exceed the cap, the oldest version for that application is pruned.
5. **Kanban board fully replaces the flat list.** The status-filter dropdown goes away — status is now visually obvious from column position.
6. **Mobile drag UX**: columns become horizontally swipeable (one column per screen, CSS scroll-snap) with working touch drag-and-drop between columns, plus a "Move to..." dropdown on every card as a fallback so status changes never depend on a precise drag gesture (also serves as a keyboard/accessibility path on desktop).

## Ground-truth findings from the codebase (verified by reading the actual files, not assumed)

- `Resume` model (`backend/prisma/schema.prisma:249-264`): `id, userId, jobApplicationId?, content (Text/JSON string), version, matchScore (Float?), scoreBreakdown (Text/JSON string?), suggestions (Text?), createdAt, updatedAt`. **No `missingSkills` column exists** — confirmed by direct read. Needs to be added.
- `generateForApplication` (`resume.service.ts:98-307`) and `analyzeResume` (`resume.service.ts:503-591`) are two fully separate Gemini calls today, but **already share the same `subscription.aiGenerations` quota counter** — confirmed via `checkAndIncrementAiQuota` (`resume.service.ts:48-59`) and `resolveGenerationAccess`/`markGenerationUsed` (`resume.service.ts:16-46`). So merging saves an actual Gemini API call and latency, not additional quota headroom.
- `requireAiAccess` allows one free-tier lifetime generation OR an active subscriber; `requireActiveSubscription` (used today by `analyze` and PDF export) is subscriber-only. (`backend/src/middleware/subscription.middleware.ts:13-53`)
- Frontend `Resume` interface (`frontend/src/app/core/services/jobApplication.service.ts:38-44`) is missing `matchScore`/`scoreBreakdown`/`suggestions` entirely — confirmed by direct read; today's component reads them via untyped `any`. Needs fixing as part of this work.
- Reusable resume-rendering markup: `frontend/src/app/features/job-application/job-application.component.ts:229-273` (summary/skills/experience/projects). Reusable analysis-rendering markup: same file, `:278-310` (score badge/breakdown/suggestions).
- Reusable split-grid layout: `frontend/src/app/features/landing/landing.component.ts` `.demo-inputs` (~`:410-415`, `grid-template-columns:1fr 1fr`, collapses to `1fr` at `@media (max-width:768px)` ~`:552`) and `.kw-grid` missing-keyword chip pattern (~`:122-138`, `:463`).
- AI disclaimer copy already exists and is legally reviewed: `frontend/src/app/features/legal/terms.component.ts:25` — *"Resume content is generated by Google Gemini AI. We do not guarantee accuracy. You are responsible for reviewing all AI-generated content before submitting it to any employer."* Reuse verbatim.
- `AuthService.getUserRole()` (`auth.service.ts:115-124`) and `getSubscriptionStatus()` (`auth.service.ts:139-141`, returns an Observable) are reusable for admin-gating the debug panel and showing quota usage in the workspace header.
- No `:id`-based routed feature exists yet in `app.routes.ts` — this is the first. Standard `ActivatedRoute` usage applies; no existing convention to break.
- `JobApplication.status` (`backend/prisma/schema.prisma:225-246`) is a free-text `String`, default `"draft"`, with allowed values documented in a comment: `draft, applied, interviewing, offer, rejected, withdrawn` — not a Prisma enum, but a fixed, known set that maps 1:1 to Kanban columns with no schema change needed.
- `StatusHistory` model **already exists** (`schema.prisma:329-337`) and is **already auto-logged**: `jobApplication.service.ts`'s `updateJobApplication` writes a new `StatusHistory` row whenever `status` changes (confirmed in prior exploration), and both list/get already eager-load `statusHistory` ordered by `changedAt desc`. So a Kanban drag-to-move needs no new backend logic — it just calls the existing `PUT /:applicationId` update endpoint with a new `status`, and history logging is already a side effect of that call.
- `frontend/package.json` has `@angular/core: ^20.3.0` but **no `@angular/cdk` dependency today** — needs to be added (matching major version) for `DragDropModule`/`cdkDropList`/`cdkDrag`.

## 0. Job Application Kanban Board

Replaces `frontend/src/app/features/job-application/job-application.component.ts`'s flat card-list + status-filter-dropdown entirely. No backend or schema changes needed — the existing `PUT /:applicationId` endpoint (and its already-in-place `StatusHistory` auto-logging) is reused as-is for every status change.

**Dependency**: add `@angular/cdk` at a version matching `@angular/core: ^20.3.0`, for `DragDropModule` (`cdkDropList`, `cdkDrag`, `cdkDropListConnectedTo`).

**Layout**:
- One column per status value, in a fixed order: `Draft → Applied → Interviewing → Offer → Rejected → Withdrawn`. Column header shows the status label + a live count of cards in it.
- Each column is a `cdkDropList`, all six connected via `cdkDropListConnectedTo` so a card can be dragged from any column into any other.
- **Card content** (kept compact, since Kanban cards need to scan quickly): job title, company name, date applied (if set), platform (small text/icon), a **"Tailor →"** link/button that navigates to `/applications/:id/tailor` (this replaces where the old flat-list plan had put the button), and a small overflow (⋮) menu for Edit/Delete — keeps the primary card surface uncluttered.
- **Drag-and-drop**: on `cdkDropListDropped`, if the card's column changed, call the existing `updateApplication(id, { status: newColumnStatus })` — this alone triggers the existing backend `StatusHistory` logging, no new endpoint needed.
- **"Move to..." fallback**: every card also has a compact status `<select>`/dropdown (or menu) that calls the same `updateApplication` — works identically to a drag, serves as the primary interaction path on mobile and as a keyboard-accessible alternative on desktop.
- **Mobile (`<768px`)**: columns become horizontally swipeable via CSS `scroll-snap-type: x mandatory`, one column filling the viewport width at a time, with small tab/pill buttons above the board (one per status) to jump directly to a column without swiping through all six. Drag-and-drop still works via CDK's touch support within the visible column; the "Move to..." dropdown remains available as the reliable fallback per decision 6.
- **New application / Edit**: the existing create/edit reactive form (today's `application-card.add-form`) is reused as-is, opened in a modal/dialog overlay instead of inline in the list, since there's no natural "inline" position in a column-based board. New applications are created with `status: 'draft'` and land in the Draft column.

**Styling**: reuse the existing status-color mapping already defined per status (`job-application.component.ts` status-badge colors) as each column's accent color, and the existing card visual style (white bg, left status-color border, `border-radius`, box-shadow) from today's `.application-card`.

## 1. Backend changes

### 1.1 Prisma migration
Add one additive nullable column to `Resume`:
```prisma
missingSkills String? @db.Text // JSON array string
```
Needed because the missing-skills chip UI needs structured data — folding it into free-text `suggestions` (as today's `analyzeResume` does) isn't reliably parseable back out.

### 1.2 `backend/src/services/resume.service.ts`

**New: `tailorForApplication(userId, applicationId, jobDescriptionOverride?, customPrompt?, modelName?)`**
- Same data-fetching shape as `generateForApplication` (`:121-143`), but this time actually includes `userSkills` in the prompt payload (today's `generateForApplication` fetches `userSkills` but never sends them to Gemini — a latent bug; fix lands only in this new path, the old endpoint is left untouched to avoid regression risk on code that's being phased out).
- One merged JSON output schema returning both resume fields (name/contact/summary/skills/projects/experience/education/certifications) and analysis fields (`matchScore`, `scoreBreakdown{skills,experience,projects,summary}`, `missingSkills[]`, `suggestions`) in a single `generateContent()` call.
- Single `prisma.resume.create()` sets `content`, `version`, `matchScore`, `scoreBreakdown`, `missingSkills`, `suggestions` all at once (today, creation and analysis are two separate writes).
- **Version cap enforcement**: before creating the new version, count existing versions for `(userId, applicationId)`; if count `>= 5`, delete the oldest version (lowest `version` number) so the new one still fits within 5.
- Quota/cooldown: reuses `resolveGenerationAccess`/`markGenerationUsed` and the existing `lastGenerationTime` cooldown map (60s) — shared with the legacy `generateResume` endpoint so a user can't bypass the throttle by alternating between old and new endpoints.

**New: `regenerateResumeSection(userId, applicationId, resumeId, section, index?, modelName?)`**
- `section` ∈ `summary | skills | experience | projects` (Education/Certifications excluded — factual fields, low AI value).
- Rejects with a 409-style error if `resumeId` isn't the current latest version (prevents mutating history).
- New dedicated cooldown map `lastSectionRegenTime`, 30s window (shorter than full generate, since it's meant to feel fast/iterative).
- Quota: reuses `checkAndIncrementAiQuota` — subscriber-only, flat 1 unit per call (no free-tier section regen; free tier's one generation already includes analysis as their upgrade hook, refinement is a subscriber feature).
- Sends the resume's own current JSON section (not a re-query of the original Experience/Project DB rows, since imported/edited resumes may have drifted) plus job description and full resume content for consistency.
- Patches only the targeted field in place — **does not create a new version**, does not touch `matchScore`/`scoreBreakdown`/`suggestions`/`missingSkills` (those become "possibly stale" until a Re-check Fit).

**New: `restoreResumeVersion(userId, applicationId, resumeId)`**
- Clones the target older version's `content`, `matchScore`, `scoreBreakdown`, `missingSkills`, `suggestions` into a brand-new version row (next version number) — since the content is unchanged from when that analysis ran, the scores are still valid to carry over.
- Applies the same 5-version cap/prune logic as `tailorForApplication`.
- No Gemini call — no quota/cooldown gating needed, just `authenticate` + ownership check (in practice subscriber-only anyway, since free tier never accumulates multiple versions).

**Unchanged:** `getResumesForApplication`, `getResume`, `deleteResume`, `importResume`, `generatePDF`, `analyzeResume`, `generateForApplication` (kept reachable for the admin/debug panel and the "Re-check Fit" action).

### 1.3 New endpoint contracts (`backend/src/controllers/resume.controller.ts`, `backend/src/routes/jobApplication.routes.ts`)

| Method | Path | Guard | Purpose |
|---|---|---|---|
| POST | `/:applicationId/resumes/tailor` | `requireAiAccess` | merged generate+analyze |
| POST | `/:applicationId/resumes/:resumeId/sections/regenerate` | `requireActiveSubscription` | section-level regen |
| POST | `/:applicationId/resumes/:resumeId/restore` | `authenticate` | restore an older version as new latest |

`tailor` request: `{ jobDescription?, customPrompt?, model? }` → response `201` with the full new `Resume` row (content + matchScore + scoreBreakdown + missingSkills + suggestions).
`sections/regenerate` request: `{ section, index? }` → response `200` `{ id, content, updatedAt }`.
`restore` request: none → response `200` with the newly-created version's full `Resume` row.

**Unchanged endpoints:** `resumes/generate` (kept for the admin/debug panel), `resumes/import`, `GET resumes`, `GET resumes/:resumeId`, `DELETE resumes/:resumeId`, `resumes/:resumeId/export` (`requireActiveSubscription`), `resumes/:resumeId/analyze` (`requireActiveSubscription`, this is "Re-check Fit").

### 1.4 Quota / cooldown matrix

| Action | Guard | Quota | Cooldown |
|---|---|---|---|
| Tailor (merged) | `requireAiAccess` | 1 unit | 60s, shared `lastGenerationTime` map |
| Re-check Fit (standalone analyze) | `requireActiveSubscription` | 1 unit | 60s, existing `lastAnalysisTime` map |
| Section regen | `requireActiveSubscription` | 1 unit | 30s, new `lastSectionRegenTime` map |
| Restore | `authenticate` only | none | none |
| Legacy generate (debug panel) | `requireAiAccess` | 1 unit | 60s, shared `lastGenerationTime` map |

## 2. Frontend changes

### 2.1 Routing (`frontend/src/app/app.routes.ts`)
```ts
{
  path: 'applications/:id/tailor',
  loadComponent: () => import('./features/tailoring-workspace/tailoring-workspace.component').then(m => m.TailoringWorkspaceComponent),
  canActivate: [authGuard]
}
```

### 2.2 `frontend/src/app/core/services/jobApplication.service.ts`
- Fix `Resume` interface: add `matchScore: number | null`, `scoreBreakdown: string | null`, `missingSkills: string | null`, `suggestions: string | null`.
- Add `tailorResume()`, `regenerateSection()`, `restoreResumeVersion()` following the existing `firstValueFrom(http...)` convention (`:141-171`). Existing methods (`listResumes`, `generateResume`, `importResume`, `analyzeResume`, `downloadResumePDF`, `deleteResume`) stay unchanged.

### 2.3 New `TailoringWorkspaceComponent` (`frontend/src/app/features/tailoring-workspace/tailoring-workspace.component.ts`)

Standalone, signals-based (matching `JobApplicationService`'s pattern).

- **Header**: job title/company/status badge (reuse status-pill styling), back link, quota-usage hint from `AuthService.getSubscriptionStatus()`.
- **Action bar**: primary **"Tailor My Resume"** button (calls `tailorResume`); **version-history dropdown** (up to 5 entries, each with a **Restore** action); **"Re-check Fit"** secondary button (surfaced when `matchScore == null`, i.e. imported resumes, or after a section regen makes the score stale); **Export PDF** button.
- **Split-screen body** (reusing the `.demo-inputs` grid pattern, collapsing to one column at 768px):
  - Left: read-only Job Description.
  - Right: resume preview (reusing existing rendering markup), each regenerable block (Summary, Skills, each Experience/Project entry) with an inline **"Regenerate ↻"** button scoped to a per-block busy state.
- **Fit Analysis card**: pinned near the top of the right pane — score badge, breakdown, suggestions, plus a new missing-skills chip row (reusing the landing page's chip styling). A client-side "dirty" flag (set after any section regen, cleared after the next Tailor/Re-check) drives a "Score may be outdated — Re-check Fit" nudge.
- **Disclaimer**: the terms.component.ts wording, persistent near the action bar and repeated by the Export button.
- **Mobile**: same two-tier `768px`/`480px` breakpoint convention as every other feature component.
- **Debug/admin panel** (rendered only if `AuthService.getUserRole() === 'admin'`): collapsed by default, relocates the model picker, custom-prompt editor, Copy Prompt, Import Resume, and raw-JSON toggle from the old panel — preserves these working dev tools without exposing them to paying users.

### 2.4 `frontend/src/app/features/job-application/job-application.component.ts` changes
Rebuilt as the Kanban board described in **Section 0** above. The entire `resume-panel` block (`:157-318`) and its backing state/methods (`resumesByApp`, `resumePanels`, `generateResume`, `analyzeResume`, `copyPrompt`, etc.) are removed — that functionality now lives in the Tailoring Workspace, reached via each card's **"Tailor →"** link. The status-filter dropdown (`:29-38`) is removed since column position now conveys status. The create/edit reactive form is preserved but moved into a modal/dialog.

## 3. Sequencing

1. **Kanban board** (Section 0) first — zero backend risk (reuses the existing update endpoint and already-in-place `StatusHistory` logging), highly visible UX win, and it's the screen every other piece (the "Tailor →" link) hangs off of. Add `@angular/cdk`, build the board with the "Move to..." dropdown fallback before drag-and-drop polish, then layer in drag-and-drop, then the mobile snap-scroll/tab treatment.
2. Prisma migration (`missingSkills` column) — fast, additive, unblocks everything else in the Tailoring Workspace.
3. Backend `tailorForApplication` + controller + route, curl-tested in isolation before any UI work (highest-risk, most novel piece).
4. Basic workspace shell: route + component skeleton wired to `tailorResume`/`listResumes`/`getApplication`, split-screen + fit-analysis card, no section regen or version dropdown yet (always show newest) — gets to a demoable end-to-end MVP fast. Wire the Kanban card's "Tailor →" link to it here.
5. Section regeneration: backend endpoint + version-guard, then frontend per-section buttons and "score may be outdated" hint.
6. Version-history dropdown + restore endpoint + 5-version cap/pruning logic (both in `tailorForApplication` and `restoreResumeVersion`).
7. PDF export + AI disclaimer wiring (endpoint already exists; sequenced late so it's verified against the final, post-section-regen resume shape).
8. Debug/admin panel relocation (model picker, prompt editor, copy-prompt, import, raw toggle) — moved once the primary flow is proven, so a working fallback exists throughout development.
9. Strip the last remnants of the old inline resume-panel code once the workspace covers every capability it offered.

## 4. Verification plan

0. **Kanban board**: dragging a card to a different column persists the new status (reload confirms it) and creates a new `StatusHistory` row; the "Move to..." dropdown produces the same result without a drag; creating a new application lands it in Draft; on a viewport <768px, columns snap-scroll one at a time, the status-pill tabs jump directly to a column, and both drag and the dropdown fallback still work; each card's "Tailor →" link opens the correct application's workspace.
1. **Merged call**: create an application with a job description, call the tailor endpoint, confirm a single `201` response containing content + matchScore + scoreBreakdown + suggestions + missingSkills, and confirm via logs that exactly one Gemini call was made.
2. **Quota correctness across all three AI actions**: free-tier flips `freeGenerationUsed` after one tailor call and is blocked on a second; subscriber's `aiGenerations` increments by exactly 1 per tailor call, +1 per Re-check Fit, +1 per section regen (3 total after one of each).
3. **Free-tier sees analysis**: after their one tailor call, confirm score/breakdown/suggestions/missing-skills chips render with no paywall gate.
4. **Section regen doesn't create a spurious version**: version number and row count unchanged after a section regen; only `content`/`updatedAt` change.
5. **Section-regen version guard**: attempting section regen on a non-latest version is rejected.
6. **Standalone Re-check Fit** works on an imported resume (no tailor call happened).
7. **Version cap**: after 6 tailor/restore calls on one application, confirm only 5 versions remain and the oldest was pruned.
8. **Restore**: restoring an older version creates a new version with that content and its original scores intact.
9. **Cooldowns**: verify 60s tailor cooldown, 30s section-regen cooldown, and that a tailor call immediately after a section regen is not falsely throttled (proves separate cooldown maps).
10. **Mobile**: workspace collapses to a single column at 768px (JD above resume), tightens further at 480px, no horizontal scroll, 44px touch targets.
11. **Old panel removal**: Kanban cards still support Edit/Delete via the overflow menu with no console errors; the "Tailor →" link deep-links to the correct application's workspace.
12. **Debug panel gating**: non-admin users see no model picker/prompt editor/copy-prompt/import/raw-toggle anywhere in the workspace; admins do, and the legacy actions still function.
13. **PDF export**: exported PDF reflects the latest patched content (post section-regen), not a stale version.

## Notes / deferred items (not part of this phase)

- Structured-output hardening (Gemini SDK's native `responseMimeType`/`responseSchema` instead of regex-stripping ```json fences) is worth evaluating during implementation of the larger merged schema, but isn't blocking for v1 — the existing regex approach can ship the first cut.
- In-memory cooldown Maps (all three) don't survive a restart or scale past one backend instance — a pre-existing limitation, not introduced by this work; flag if/when the backend ever runs more than one instance.
- The exported PDF still uses today's single hardcoded PDFKit template — out of scope here, but worth revisiting given this is the core paid feature.
- Job-tracking UX (StatusHistory timeline, dashboard analytics) remains a cheap, ready-to-build follow-up for a later phase — the data is already being logged, just not surfaced.
