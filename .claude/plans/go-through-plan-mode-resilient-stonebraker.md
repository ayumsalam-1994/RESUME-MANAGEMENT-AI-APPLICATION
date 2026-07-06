# Flexible Profile Links + Re-runnable Onboarding with Review — Implementation Plan

> Previous phase (Tailoring Workspace + Job Application Kanban Board) shipped and was verified end-to-end in-browser. This plan covers the next phase, based on real feedback from testing the app on a phone: (1) replace the fixed linkedin/github/portfolio profile fields with a flexible list of links, and (2) make the onboarding resume-upload reachable any time and re-runnable, appending new data with a mandatory review-before-commit step.

## Context

Real usage surfaced two gaps:
1. **Profile URLs are rigid.** `Profile` has exactly three fixed columns (`linkedin`, `github`, `portfolio`). Users may have other link types (Twitter, Behance, a second portfolio, etc.) with no way to add them.
2. **Onboarding's resume upload is a one-shot, hidden feature.** It's only reachable via a post-registration redirect (no persistent nav entry), and it writes straight to the database with zero review — a user can't safely re-run it to pull in more resume content later without either duplicating data or being unable to see what changed.

Both fixes were scoped together because they share one file (`resumeParser.service.ts`) — building the onboarding rework against the old fixed 3-field shape and then reworking it for links would mean touching the same extraction/merge logic twice.

## Decisions (already made)

1. **No data migration for existing linkedin/github/portfolio values.** The columns are just dropped — acceptable pre-launch, no real customers depend on this data.
2. **No automated dedup/similarity detection for onboarding re-runs.** The mandatory review screen is the entire dedup mechanism — user removes what they don't want. Confirmed exception: exact-URL-string dedup for links, and the already-existing `UserSkill` unique-constraint dedup for skills, since both are free/exact rather than fuzzy.
3. **Onboarding review screen is remove-only, not full inline-edit**, to keep the frontend surface small (one list+remove pattern across 6 entity types, not six full CRUD forms). **After commit, destination pages show a temporary highlight on newly-added items** so the user can quickly find and edit anything that needs fixing, using the pages' existing edit UI.
4. **Keep the "onboarding" route/component name as-is** (minimal diff) — only the nav label and on-page copy get reframed as repeatable-use rather than first-time-only.

## Ground truth (verified by reading the actual files)

- `Profile` model: `backend/prisma/schema.prisma:75-90`, fixed fields at 80-82 (`linkedin`, `github`, `portfolio`, all `String?`). `Education` (93-107) is the child-table pattern to mirror exactly: own `id`, FK `profileId`, scalars, timestamps, `onDelete: Cascade`.
- Education CRUD to mirror 1:1: controller `backend/src/controllers/profile.controller.ts` (`getUserEducation` 75-87, `addEducation` 90-115, `updateEducation` 118-156, `deleteEducation` 159-179); routes `backend/src/routes/profile.routes.ts:53-57`; service `backend/src/services/profile.service.ts` (`addEducation` 52-72, `updateEducation` 75-90, `deleteEducation` 93-107, `getUserEducation` 110-125, both `getProfile`/`upsertProfile` at 6-49 `include` educations).
- Frontend mirror target: `frontend/src/app/features/profile/profile.component.ts` — Education is a plain array (not `FormArray`, line ~536) rendered with `@for`, one reusable `educationForm` toggled via `isAddingEducation`/`isEditingEducationId` flags (~532-533), add/edit/delete methods (~639-717). The 3 URL fields today are plain inputs inside the single `profileForm` (template 51-64, group 564-566, patch 592-594).
- `backend/src/services/resumeParser.service.ts` (read in full): `ParsedProfile` interface (10-17, has `linkedin`/`github`/`portfolio`), Gemini prompt shape (123-185, same 3 fields at 129-131), `populateProfile` (203-340, **already a standalone function**, fill-only-if-empty for Profile at 213-230, plain-`create`-always-additive for Education/Experience/Projects/Certifications with **zero dedup today**, Skills already correctly deduped via `skill.upsert` + `userSkill.findUnique` at 312-328), `parseAndPopulate` (345-356, just chains `extractText` → `parseWithGemini` → `populateProfile` with no gap — this is what needs splitting).
- `backend/src/controllers/resumeParser.controller.ts` (read in full): `parseResume` (12-48) validates then calls `parseAndPopulate` directly — writes to DB before any response is ever sent, so there is currently nothing for a review UI to render.
- Route: `backend/src/routes/profile.routes.ts:43` — `router.post('/parse-resume', resumeUpload.single('resume'), parseResume)`.
- Nav: `frontend/src/app/app.html:11-19` has no onboarding link. Only entry points today: `register.component.ts:238` → `login.component.ts:218-219` post-signup redirect relay.
- `backend/src/index.ts:34` — `app.use(express.json())` with **no explicit size limit** (Express default 100kb). A parsed-resume JSON payload sent back for commit is unlikely to exceed this in almost all cases but it's a one-line proactive fix to raise it.
- **Resolved (was an open question): MySQL collation is `utf8mb4_unicode_ci`** (confirmed in every migration file, e.g. `backend/prisma/migrations/20251218033851_init/migration.sql:14`) — case-insensitive. This means `Skill.name`'s uniqueness is already case-insensitive at the DB layer, so the new skill-dedup-precompute logic must also compare case-insensitively (lowercase both sides) to stay consistent with what `populateProfile`'s `skill.upsert` will actually do.
- `backend/scripts/seed-jobs.ts:97-99` sets `linkedin`/`github`/`portfolio` directly in a `prisma.profile.create()` call — **will fail to compile once those columns are dropped**, found during exploration, not in the original request, but must be fixed alongside the schema change.

---

## Feature A: Flexible Profile Links

### A.1 Schema (`backend/prisma/schema.prisma`)
Remove `linkedin`/`github`/`portfolio` (lines 80-82) from `Profile`. Add:
```prisma
model ProfileLink {
  id        Int      @id @default(autoincrement())
  profileId Int
  type      String   // "LinkedIn" | "GitHub" | "Portfolio" | free-text custom label
  url       String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  profile Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)
}
```
Add `profileLinks ProfileLink[]` to `Profile`. No `label` field — `type` doubles as the display label for both suggested and custom entries. Run `npx prisma migrate dev --name replace_profile_contact_fields_with_links` then `npx prisma generate` first, since every backend file below depends on the regenerated types.

### A.2-A.4 Backend CRUD (mirror Education 1:1)
- `profile.controller.ts`: remove the 3 fields from `ProfileUpdateSchema` (6-15); add `ProfileLinkSchema` (`{ type: z.string().min(1), url: z.string().url() }`) and `getUserLinks`/`addLink`/`updateLink`/`deleteLink` copying `getUserEducation`/`addEducation`/`updateEducation`/`deleteEducation` structure exactly.
- `profile.routes.ts`: add `GET/POST /links`, `PUT/DELETE /links/:linkId`, mirroring the education block (53-57).
- `profile.service.ts`: add `profileLinks: { orderBy: { createdAt: 'asc' } }` to both `getProfile`/`upsertProfile`'s `include`; add `addLink`/`updateLink`/`deleteLink`/`getUserLinks` copying the Education service methods' ownership-check pattern (`findFirst({ id, profile: { userId } })` before update/delete).

### A.5 Seed script fix
`backend/scripts/seed-jobs.ts:97-99`: replace the inline `linkedin`/`github`/`portfolio` fields in the `prisma.profile.create()` call with a follow-up `prisma.profileLink.createMany()` for the same three sample URLs.

### A.6 AI generation + PDF (`backend/src/services/resume.service.ts`)
Three spots, both AI generation paths currently identical:
1. Data fetch (`generateForApplication` ~126, `tailorForApplication` ~349): add `include: { profileLinks: true }` to both `prisma.profile.findUnique` calls.
2. AI output JSON schema (`generateForApplication` ~202-209, `tailorForApplication` ~429-436): replace
   ```json
   "contact": { "location": "string", "phone": "string", "email": "string", "linkedin": "string", "github": "string", "portfolio": "string" }
   ```
   with
   ```json
   "contact": { "location": "string", "phone": "string", "email": "string", "links": [{ "type": "string", "url": "string" }] }
   ```
3. PDF renderer (`generatePDF` ~786-801): replace the `contactLines` array (currently `[location, phone, email, linkedin, github, portfolio].filter(Boolean)`) with logic that appends one `"${type}: ${url}"` string per entry in `contact.links`. No back-compat shim for already-generated resumes with the old shape (confirmed acceptable).

### A.7 Onboarding extraction (Feature-A-relevant part of `resumeParser.service.ts`)
- `ParsedProfile` (10-17): remove `linkedin`/`github`/`portfolio`, add `links?: Array<{ type: string; url: string }>`.
- Gemini prompt (123-185): replace the 3 fixed string fields with a `links` array in the schema, plus a rule: "Classify each URL as type LinkedIn/GitHub/Portfolio when obviously matching, otherwise use a short descriptive type (e.g. 'Twitter')."
- `populateProfile` (213-223 profile-fields section): drop the linkedin/github/portfolio fill-if-empty lines; add a loop creating one `ProfileLink` per parsed link, skipping if a `ProfileLink` with the identical `url` already exists for that `profileId` (exact-string dedup, the one narrow exception).

### A.8 Frontend service (`frontend/src/app/core/services/profile.service.ts`)
Remove `linkedin`/`github`/`portfolio` from the `Profile` interface and `profileUpdateFields` allowlist (58-66); add `ProfileLink` interface and `addLink`/`updateLink`/`deleteLink`/`getUserLinks` methods mirroring the Education wrappers (126-151).

### A.9 Frontend component (`frontend/src/app/features/profile/profile.component.ts`)
Remove the 3 URL inputs (template 51-64, form group 564-566, patch 592-594). Add a "Links" section right after Personal Info, structured exactly like Education (list + one reusable `linkForm` + `isAddingLink`/`isEditingLinkId` flags + add/edit/delete methods copied from the Education equivalents):
- `type` renders as a `<select>` with LinkedIn/GitHub/Portfolio/Custom; choosing "Custom" reveals a sibling free-text input whose value gets copied into `type` on submit.
- `url` input with a basic `https?://` pattern validator.

---

## Feature B: Re-runnable Onboarding with Review-Before-Commit

### B.1 Endpoint split
- `POST /profile/parse-resume` — **same path, new behavior**: parse-only (`extractText` + `parseWithGemini` + skill-dedup precompute), returns the structured parsed JSON, **no DB write**. Smallest-diff option since the URL and semantics ("parse") don't change.
- `POST /profile/commit-resume-data` — **new endpoint**, JSON body (no multer), accepts the possibly-edited/filtered parsed data, calls `populateProfile` directly, returns the aggregate-count result **plus the actual created record IDs** (needed for the highlight feature — see B.5a).

### B.2 Backend service changes (`resumeParser.service.ts`)
- New `precomputeSkillStatus(userId, skills: string[])`: one `prisma.userSkill.findMany({ where: { userId }, include: { skill: true } })` call, then in-memory **case-insensitive** (`.toLowerCase()`) comparison against parsed skill names — matches the DB's `utf8mb4_unicode_ci` collation exactly. Returns `{ new: string[], alreadyHave: string[] }`.
- New `parseOnly(buffer, mimeType, userId)`: `extractText` → `parseWithGemini` → `precomputeSkillStatus`, returns the full structured object (profile incl. `links`, education[], experience[], projects[], `skills: {new, alreadyHave}`, certifications[]) with no DB writes.
- `populateProfile` (203-340): keep as the reused commit engine; two additions:
  1. `ParseResult` interface (61-68) gains ID arrays alongside the existing counts: `educationIds`, `experienceIds`, `projectIds`, `certificationIds`, `newUserSkillIds`, `linkIds` (all `number[]`) — push each created record's `id` into the matching array right where it's already created in the existing for-loops.
  2. Add the `ProfileLink` creation loop from A.7 (exact-URL dedup).
- Delete `parseAndPopulate` (345-356) — its two halves are now independently reachable via `parseOnly` and `populateProfile`.
- `backend/src/index.ts:34`: bump `express.json()` to an explicit higher limit (e.g. `express.json({ limit: '2mb' })`) as a cheap proactive safeguard for the commit payload.

### B.3 Backend controller (`resumeParser.controller.ts`)
- `parseResume`: keep all existing auth/file/type/size validation (12-35), change the call to `parseOnly(...)`, response becomes `{ message, parsed }`.
- New `commitParsedResume`: auth check, loose Zod validation of the body shape (just enough to reject malformed payloads, not to re-validate resume content quality), calls `populateProfile(userId, body)`, responds `{ message, result }` (now including the ID arrays from B.2).

### B.4 Routes (`profile.routes.ts`)
```ts
router.post('/parse-resume', resumeUpload.single('resume'), parseResume); // now parse-only
router.post('/commit-resume-data', commitParsedResume); // new, JSON body
```

### B.5 Frontend (`frontend/src/app/features/onboarding/onboarding.component.ts`)
- `Stage`: add `'review'` between `'processing'` and `'done'`.
- `upload()` (375-414): on success, store the parsed payload in a `parsedData` signal and move to `'review'` instead of `'done'`.
- **New `'review'` stage**: one card list per entity type (Profile fields incl. links / Education / Experience+bullets / Projects+bullets / Skills / Certifications), **remove-only** — each item has just a Remove (×) button that splices it from the local in-memory array (no edit UI, per decision 3). Skills render only the `new` bucket (never `alreadyHave`). A per-section count, plus a "Discard / Start Over" link (extends existing `reset()`) and a top-level "Add to My Profile" button that reassembles the (filtered) arrays into the commit shape and POSTs to `/profile/commit-resume-data`.
- On commit success: call the new highlight service (B.5a) with the returned ID arrays, then proceed to the existing `'done'` stage (unchanged shape/copy).

### B.5a New: temporary "recently added" highlight (per refined decision 3)
- New `frontend/src/app/core/services/recently-added.service.ts`: a small signal-based store, `Record<EntityType, Set<number>>` with `markAdded(type, ids)`, `isNew(type, id): boolean`, `clear(type)`.
- `OnboardingComponent`'s commit-success handler calls `markAdded('education', result.educationIds)` etc. for every entity type in the response.
- Destination pages (`profile.component.ts` for Education/Links/profile fields, `experience.component.ts`, `project.component.ts`, `certification.component.ts`) each inject the service, check `isNew(type, item.id)` when rendering their `@for` list, and apply a highlight CSS class (e.g. a colored left-border + small "New" badge) to matching items. Each component calls `clear(type)` in `ngOnDestroy` so the highlight is visible for that one visit after import, then disappears — a genuinely "temporary" indicator, not a persistent flag.
- Skills: track `newUserSkillIds` (the `UserSkill.id`, not `Skill.id`) since that's the per-user row the Profile page's skill list actually renders.

### B.6 Nav entry point (`frontend/src/app/app.html`)
Add `<a routerLink="/onboarding" ...>Import Resume</a>` to the authenticated nav (11-19), placed after "Certifications" and before "Jobs".

### B.7 On-page copy tweak
Update the onboarding component's headline/subtitle (currently first-time-only framing, e.g. "Welcome to RoleFit... we'll fill your profile in seconds") to something re-run-neutral, e.g. "Import a resume to add new details to your profile" — cheap, meaningfully improves the repeat-use experience. Route/component name stays `onboarding`/`OnboardingComponent` (decision 4, minimal diff).

---

## Sequencing

1. A.1 schema + migration + `prisma generate`.
2. A.2-A.6 backend (controller/route/service/seed-script fix/resume.service.ts + PDF).
3. A.7 — the Feature-A-relevant part of `resumeParser.service.ts` (ParsedProfile/prompt/links-merge).
4. A.8-A.9 frontend (profile service + profile.component.ts link UI).
5. B.2-B.4 backend (parse/commit split, skill precompute, ID-tracking, express.json limit) — built against the already-updated links shape from step 3.
6. B.5-B.7 frontend (review stage, highlight service, nav link, copy tweak).

Reasoning for A-before-B: `resumeParser.service.ts`'s extraction/merge logic and the review screen's link UI both need to target the final `ProfileLink` shape — building B first would mean reworking this file and UI twice.

## Verification

**Feature A:**
1. Add a LinkedIn link, a GitHub link, and a Custom-type link (e.g. "Twitter") on `/profile`; refresh; confirm all three persist with correct type labels.
2. Edit a link's URL and delete another; confirm both operations apply correctly and survive refresh.
3. Generate a tailored resume for an existing job application; open the PDF and confirm the contact section lists each link as `Type: url`.

**Feature B:**
1. Reach onboarding via the new "Import Resume" nav link (not just post-registration) at any time.
2. Upload a resume; confirm it lands on the review screen with **nothing yet in the DB** (spot-check `/profile`/`/experience`/`/projects` in another tab before clicking commit).
3. Remove one Experience entry on the review screen, then commit; confirm the removed entry never appears in `/experience`, and that `/experience` shows a temporary highlight on the newly-added entries that were kept, which disappears after navigating away and back.
4. Re-run the same upload with the same resume file: confirm Experience/Projects/Certifications duplicate (expected, dedup intentionally descoped), while Skills and Links with identical values do **not** duplicate.
5. Confirm "Discard / Start Over" fully resets state and a subsequent run works cleanly.
6. Confirm a large-ish parsed payload (resume with many bullets) doesn't hit the `express.json()` size limit on commit.
