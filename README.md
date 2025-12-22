# Resume Management AI Application

AI-powered resume builder and job application tracker with Google Gemini integration.

**Stack:** Angular 20 (frontend), Node.js + Express (backend), MySQL (database), Google Gemini AI (resume generation & analysis)

## Features

✅ **Profile Management** - Personal info, education, skills with categorization  
✅ **Experience Tracking** - Work history with AI-enhanced bullet points  
✅ **Project Portfolio** - Projects with tech stack and images  
✅ **Certifications** - Store certification details with attachments  
✅ **Job Applications** - Track applications with company details and status  
✅ **AI Resume Generation** - Tailored resumes using Gemini AI per job description  
✅ **Resume Analysis** - AI-powered fit scoring with actionable suggestions  
✅ **PDF Export** - ATS-friendly resume export  
✅ **Mobile Responsive** - Full mobile-first UI design

## Quick Start

### Prerequisites
- Node.js 18+ LTS
- MySQL 8.0+
- Google Gemini API key ([get one here](https://ai.google.dev/))

### Backend Setup

```bash
cd backend
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env and set:
# - DATABASE_URL (MySQL connection string)
# - GEMINI_API_KEY (your Google Gemini API key)
# - JWT_SECRET (generate a secure random string)

# Run database migrations
npx prisma migrate deploy

# Start development server
npm run dev
```

Backend runs on `http://localhost:3000`

### Frontend Setup

```bash
cd frontend
npm install

# Start development server
ng serve
```

Frontend runs on `http://localhost:4200`

## Production Build

### Backend
```bash
cd backend
npm run build
node dist/index.js
```

### Frontend
```bash
cd frontend
ng build --configuration production
# Deploy dist/resume-ai-frontend to your hosting
```

## Environment Variables

### Backend (.env)
```
PORT=3000
NODE_ENV=production
FRONTEND_ORIGIN=https://yourdomain.com
DATABASE_URL=mysql://user:pass@host:3306/dbname
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
GEMINI_API_KEY=your-api-key
```

### Frontend (environment.ts)
Update `frontend/src/environments/environment.ts` with your production API URL:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.yourdomain.com/api'
};
```

## Project Structure

- `frontend/` — Angular 20 SPA with standalone components
- `backend/` — Node.js/Express REST API with TypeScript
- `docs/` — Architecture docs and completion logs
- `PRD .md` — Product requirements document
- `TODO.md` — Development roadmap

## Database Schema

Using Prisma ORM with 15+ tables:
- User, Profile, Education
- Skill, UserSkill (many-to-many)
- Experience, ExperienceBullet
- Project, ProjectBullet, ProjectImage
- Certification
- Company, JobApplication
- Resume, ResumeVersion

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/profile` - Get user profile
- `GET /api/experiences` - Get work experiences
- `GET /api/projects` - Get projects
- `GET /api/certifications` - Get certifications
- `GET /api/job-applications` - Get job applications
- `POST /api/job-applications/:id/resumes/generate` - Generate AI resume
- `POST /api/job-applications/:id/resumes/:resumeId/analyze` - Analyze resume fit
- `GET /api/job-applications/:id/resumes/:resumeId/pdf` - Export resume as PDF

See individual route files in `backend/src/routes/` for complete API documentation.

## Development Status

**Phase 1 (Completed):**
- ✅ User authentication & authorization
- ✅ Profile, experience, project, certification management
- ✅ Job application tracking
- ✅ AI resume generation with Gemini
- ✅ Resume analysis & scoring
- ✅ PDF export
- ✅ Mobile-responsive UI

**Phase 2 (Planned):**
- ⏳ Cover letter generation
- ⏳ Interview tracking
- ⏳ Reminder system
- ⏳ Analytics dashboard
- ⏳ Skill gap analysis

## License

Private - All Rights Reserved
