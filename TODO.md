# To-Do List

## Phase 0
- [ ] Architecture & repo setup
  - Confirm Angular/Node/Express/MySQL stack, set up repo scaffolding, env/config structure, lint/format/test tooling.
- [ ] Auth & security baseline
  - Design and stub authentication/authorization (JWT, RBAC), password storage, session handling, and basic security controls.

## Phase 1
- [ ] User profile core
  - Implement user profile data (personal, education, links) and skill taxonomy (categories/tags/search) APIs and UI forms.
- [ ] Experience management
  - CRUD for companies/roles with AI-assisted bullet editing and optional version history; link to user profile.
- [ ] Project management
  - CRUD/reorder/archive projects with fields (title, summary, description, role, achievements, tech stack), image upload (3–5, exclude from ATS resumes).
- [ ] Job target storage
  - Store job targets (title, full JD) and link to user; support multiple per user.
- [ ] AI resume generation
  - Implement JD analysis, keyword extraction, relevance ranking, ATS-safe rewriting, section-level regeneration, per-application resume versioning.
- [ ] Resume scoring
  - AI-generated match score with breakdown (skills, experience, keywords) and improvement suggestions.
- [ ] Cover letters
  - Generate, edit, and store versioned cover letters per job application using profile + JD.
- [ ] PDF export
  - Server-side HTML→PDF A4 export with ATS-friendly minimal templates linked to applications.

## Phase 2
- [ ] Application tracking
  - Application records with company profile, platform, URLs, resume/cover letter used, status lifecycle/history, notes/feedback.
- [ ] Reminders & interviews
  - Manual reminders with notes/notifications; interview rounds with dates, outcomes, and attached notes in timeline.
- [ ] Analytics dashboard
  - Metrics for total apps, response/interview/offer rates, status distribution, resume effectiveness insights.
- [ ] Skill gap analysis
  - AI comparison of JD vs user skills to highlight missing/weak skills (no learning content).

## Phase 3
- [ ] Hardening & NFRs
  - Performance target (<10s resume gen), accessibility, responsive/mobile-first polish, data consistency checks, scalability review.
- [ ] Security & privacy
  - RBAC enforcement, data isolation per user, secret handling, storage for images, ensure no training on user data.
