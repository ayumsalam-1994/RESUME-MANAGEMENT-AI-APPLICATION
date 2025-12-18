# Backend (API)

Planned stack: Node.js (LTS) + Express, TypeScript, MySQL. Testing with Jest/Vitest, linting with ESLint, formatting with Prettier. Auth via JWT + RBAC.

## Setup (to be implemented)

1. Copy .env.example to .env and fill values.
2. Install dependencies: `npm install` (after package.json is added).
3. Run dev server: `npm run dev` (ts-node-dev/nodemon planned).
4. Run lint/tests: `npm run lint` / `npm test`.

## Environment variables (see .env.example)

- PORT: API port
- DATABASE_URL: MySQL connection string
- OPENAI_API_KEY: OpenAI key for AI features
- JWT_SECRET: signing secret
- NODE_ENV: environment
- FRONTEND_ORIGIN: allowed CORS origin

## Structure (proposed)

- src/index.ts — Express bootstrap
- src/config.ts — validated config loader
- src/routes/\* — route modules
- src/controllers/\* — handlers
- src/services/\* — business logic
- src/db/\* — DB client and migrations
- src/middleware/\* — auth, validation, error handling
- src/types/\* — shared types

## Notes

- Prefer async/await and centralized error handling
- Enforce request validation (e.g., zod/joi) on all routes
- Keep AI prompts and guardrails in dedicated service module
