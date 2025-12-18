# Resume Management AI Application

AI-powered resume builder and job application tracker. Stack: Angular (frontend), Node.js + Express (backend), MySQL (DB), OpenAI for AI features.

## Repository layout
- frontend/ — Angular SPA (to be scaffolded with Angular CLI)
- backend/ — Node.js/Express API (TypeScript recommended)
- docs/ — architecture, decisions, and runbooks
- PRD .md — full product requirements
- TODO.md — phase-split task list

## Getting started (planned)
1. Install Node.js LTS and Angular CLI globally.
2. Backend: install dependencies, set env vars from backend/.env.example, run dev server.
3. Frontend: scaffold Angular app in frontend/, point API base URL to backend.
4. MySQL: create database/user, apply migrations (tool TBD, e.g., Prisma/Knex).

## Phase 0 focus
- Confirm stack and folder structure
- Establish lint/format/test defaults
- Define environment config contract and secrets handling
- Stub auth/security baseline
