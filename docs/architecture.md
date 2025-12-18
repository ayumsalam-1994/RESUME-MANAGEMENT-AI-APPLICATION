# Architecture Overview (Draft)

## Frontend
- Angular SPA (mobile-first), consumes REST API
- Auth via JWT; attach access token to API requests; refresh flow handled centrally
- Print-safe resume view for PDF export

## Backend
- Express API (TypeScript)
- Routes grouped by domain: auth, profile, experience, projects, job targets, applications, AI services, analytics
- Middleware: CORS, auth (JWT), request validation, error handler, rate limiting (future)
- AI integration via OpenAI; guardrails to avoid fabricated experience

## Database (MySQL)
- Core entities: user, skill, experience, project, project_image, resume, resume_version, job_application, company, interview, reminder
- Relationships: user owns resumes/projects/applications; job_application links to resume_version and company

## PDF generation
- Server-side HTML to PDF (A4) with print-safe CSS; exclude project images for ATS resumes

## Configuration
- Env variables validated at startup; secrets loaded from process.env
- CORS restricted to configured frontend origin

## Security baseline
- Password hashing (bcrypt), JWT access/refresh tokens, optional roles for RBAC
- Input validation on all routes
- No training AI on user data; data isolation per user
