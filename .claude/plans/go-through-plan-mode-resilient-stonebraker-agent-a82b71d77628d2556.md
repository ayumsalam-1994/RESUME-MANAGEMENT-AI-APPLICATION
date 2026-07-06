# Research: Profile links (linkedin/github/portfolio) -> dynamic ProfileLink list

## 1. schema.prisma (backend/prisma/schema.prisma)
- `Profile` model: lines 75-90. Fixed fields `linkedin`, `github`, `portfolio` (all `String?`) at lines 80-82,
  plus `email`, `phone`, `location`, `summary`. Relation: `educations Education[]` (line 89), back-relation to `User` via `userId @unique` with `onDelete: Cascade` (line 88).
- `Education` model (child-table pattern to mirror): lines 93-107. Own autoincrement `id`, FK `profileId Int`,
  scalar fields, timestamps, and `profile Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)` (line 106).
  No `@@unique`/ordering constraints — ordering done in queries (`orderBy: { startDate: 'desc' }`).
- Plan: add `ProfileLink { id, profileId, type String, label String?, url String, order Int? , createdAt, updatedAt, profile Profile @relation(..., onDelete: Cascade) }`
  and `profileLinks ProfileLink[]` on `Profile`, following the exact Education shape (no unique constraint needed; `type` free-text so users can add custom types, with LinkedIn/GitHub/Portfolio as suggested defaults in the frontend only).

## 2/3. Backend controller/routes/service (mirror Education CRUD)
- `backend/src/controllers/profile.controller.ts`: `ProfileUpdateSchema` (lines 6-15) includes `linkedin`/`github`/`portfolio` as `z.string().url().optional()` — these travel inside the single `PUT /profile` body today (see `updateProfile`, lines 48-72), not separate endpoints.
- Education has full CRUD controller functions to mirror: `getUserEducation` (75-87), `addEducation` (90-115, `EducationSchema` lines 17-24), `updateEducation` (118-156, `.partial()` schema), `deleteEducation` (159-179).
- `backend/src/routes/profile.routes.ts`: Education routes at lines 53-57 (`GET/POST /education`, `PUT/DELETE /education/:educationId`), all under `router.use(authenticate)` (line 40). New `ProfileLink` routes should mirror these exactly, e.g. `GET/POST /links`, `PUT/DELETE /links/:linkId`.
- `backend/src/services/profile.service.ts`: Education service methods to mirror 1:1 — `addEducation` (52-72, looks up `profile` by `userId` then creates child row), `updateEducation` (75-90, `findFirst({ id, profile: { userId } })` ownership check then `update`), `deleteEducation` (93-107, same ownership check then `delete`), `getUserEducation` (110-125). `getProfile` (6-24) and `upsertProfile` (27-49) both `include: { educations: {...} }` — will need `profileLinks: { orderBy: ... }` added alongside.

## 4/5. Frontend
- `frontend/src/app/features/profile/profile.component.ts`: linkedin/github/portfolio are plain `formControlName` inputs inside the single Personal Info `profileForm` (template lines 51-64; FormBuilder group lines 564-566; patched from profile at lines 592-594) — submitted via `saveProfile()` → one `PUT /profile` call.
- Education UI is NOT an Angular `FormArray` — it's a plain array (`education: Education[]`, line 536) rendered with `@for` (template ~lines 81-93) with per-item Edit/Delete buttons, a separate `educationForm` (single FormGroup, line 529) reused for both add and edit modes (`isAddingEducation`/`isEditingEducationId` flags, lines 532-533), "+ Add Education" button (155-156) toggling add mode, and `saveEducation`/`saveNewEducation`/`deleteEducationItem`/`cancelEducationEdit` methods (639-717) that call the service then locally splice `this.education` via `setLocalEducations` (757-759). This exact pattern (list + reusable form + add/edit/delete handlers) is what to replicate for links, with a `type` select/input (LinkedIn/GitHub/Portfolio/Custom) + `url` input per row.
- `frontend/src/app/core/services/profile.service.ts`: `Profile` interface has fixed `linkedin?/github?/portfolio?` (lines 12-14); `profileUpdateFields` allowlist (58-66) filters what `updateProfile()` sends in the `PUT /profile` payload (94-123). Education methods to mirror: `addEducation` (126-136), `updateEducation` (138-145), `deleteEducation` (147-151) — thin wrappers around `POST/PUT/DELETE /profile/education...`. New `ProfileLink` interface + `addLink`/`updateLink`/`deleteLink` methods should mirror these, and `linkedin/github/portfolio` should be removed from `Profile`/`profileUpdateFields` once migrated.

## 6. All call sites assuming the fixed 3 fields
Backend:
- `backend/src/controllers/profile.controller.ts:9-11` — Zod fields on `ProfileUpdateSchema`.
- `backend/src/services/resumeParser.service.ts:12-14` (`ParsedProfile` interface), `:129-131` (Gemini extraction prompt JSON shape), `:219-221` (merge-into-profile logic, only fills if empty).
- `backend/src/services/resume.service.ts:172` — raw `profile` Prisma record spread into the AI generation payload (whatever fields exist on `Profile` flow through automatically); AI **output** schema hardcodes `contact.linkedin/github/portfolio` twice: lines 202-208 (resume JSON generation) and 429-435 (a second generation path, ~line 423 `userMessage`); PDF renderer consumes it at lines 789-797 (`contact.linkedin, contact.github, contact.portfolio` joined into one contact line).

Frontend:
- `frontend/src/app/features/profile/profile.component.ts:52-63` (inputs), `564-566` (form controls), `592-594` (patch from profile).
- `frontend/src/app/core/services/profile.service.ts:12-14` (interface), `58-66` (update allowlist).
- `frontend/src/app/features/tailoring-workspace/tailoring-workspace.component.ts:728-734` (hardcoded default AI prompt JSON schema — same `contact.linkedin/github/portfolio` shape shown to the user as editable "custom prompt"), `:804-810` (`copyPrompt()` builds a `profileSection` text block enumerating `profile.linkedin/github/portfolio` for a copy-to-clipboard prompt).
- Not real hits (ignore): `job-application.component.ts:178` (unrelated "platform" field, e.g. "LinkedIn, Indeed..."), `landing.component.ts:169` (marketing copy mentioning LinkedIn as a job board).

Also present but non-critical to app logic: `README.md`, `frontend/README.md`, `docs/phase1-*.md`, `PRD*.md`, `PRODUCTION_READY.md`, `DEPLOYMENT.md` (docs mentioning the fields — update for consistency but no functional impact), and `backend/prisma/migrations/20251218033851_init/migration.sql` (historical migration, do not edit — a new migration will be generated for `ProfileLink`).

## Net: places needing real code changes when moving to a dynamic links list
1. Prisma schema — new `ProfileLink` model + relation + migration.
2. Backend: `profile.controller.ts` (remove 3 fields from `ProfileUpdateSchema`; add `LinkSchema` + add/update/delete/list controllers), `profile.routes.ts` (add `/links` routes), `profile.service.ts` (add link CRUD mirroring education; add `profileLinks` to the two `include` blocks).
3. Backend AI/PDF: `resumeParser.service.ts` (extraction prompt + `ParsedProfile` + merge logic — parse a links list instead of 3 fixed fields), `resume.service.ts` (both AI output schemas' `contact` shape + PDF `contactLines` building, x2 generation paths).
4. Frontend: `profile.service.ts` (interface + CRUD methods + drop fields from update allowlist), `profile.component.ts` (replace 3 inputs with repeatable list UI mirroring Education's add/edit/delete pattern), `tailoring-workspace.component.ts` (default prompt schema + `copyPrompt()` profile text block).
