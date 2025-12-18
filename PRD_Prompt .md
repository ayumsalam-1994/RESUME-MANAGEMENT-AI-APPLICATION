You are a Senior Product Manager and Technical Architect.

Create a detailed Product Requirements Document (PRD) for an AI-powered Resume Builder and Job Application Tracking web application with the following vision, constraints, and technical stack.

====================================
PRODUCT OVERVIEW
====================================
The application helps users generate highly targeted, ATS-friendly resumes for specific job applications using AI, and track their job applications end-to-end in one system.

The product focuses on:
- Resume personalization
- Job application tracking
- Insightful feedback to improve job search outcomes

====================================
CORE USE CASES
====================================
1. Maintain a master career profile (single source of truth)
2. Generate customized resumes per job description using AI
3. Track job applications, progress, and outcomes
4. Gain insights into resume quality and job application performance

====================================
CORE FEATURES (PHASE 1)
====================================

1. User Profile Management
   - Personal information (name, contact, LinkedIn, GitHub, portfolio)
   - Education
   - Skills (categorized, taggable, searchable)

2. Work Experience Management
   - Multiple roles per company
   - Bullet points editable and AI-enhanced
   - Version history (optional)

3. Project Management
   - Projects can be added, edited, duplicated, archived, or reordered
   - Each project includes:
     - Project title
     - Short summary (ATS-optimized)
     - Detailed description
     - Role / responsibility
     - Achievements / measurable outcomes
     - Tech stack (Angular, Node.js, Express, MySQL)
     - Project images (upload up to 3–5 images per project)
       - Images used for portfolio preview only
       - Images excluded from ATS resumes

4. Job Application Targeting
   - Job title
   - Full job description storage
   - Multiple job targets per user
   - Each job target linked to:
     - Generated resume
     - Company profile
     - Application metadata

5. AI Resume Generation
   - Job description analysis
   - Keyword extraction and matching
   - Relevance ranking for experience and projects
   - ATS-optimized bullet rewriting
   - Section-level regeneration and manual edits
   - Resume versioning per job application

6. Resume Quality & Job Match Scoring
   - AI-generated score indicating resume match against job description
   - Breakdown by:
     - Skills match
     - Experience relevance
     - Keyword coverage
   - Actionable improvement suggestions

7. Cover Letter Generation
   - AI-generated cover letter per job application
   - Uses stored profile + job description
   - Editable by user
   - Stored and versioned with job application

8. Job Application Tracking
   - Store:
     - Job title
     - Company name and profile (industry, size, notes)
     - Job description
     - Resume and cover letter used
     - Date applied
     - Platform (LinkedIn, company site, referral, email)
     - Application URL
     - Contact person (optional)
     - Notes and interview feedback
     - Status:
       - Draft
       - Applied
       - Interviewing
       - Offer
       - Rejected
       - Withdrawn
   - Status change history / timeline

9. Follow-Up & Reminder System
   - Manual reminders (e.g., follow-up after X days)
   - Reminder notes tied to job applications
   - Simple notification system (in-app)

10. Interview & Notes Tracking
   - Store interview rounds
   - Interview dates and outcomes
   - Free-text notes and feedback
   - Attach notes to job timeline

11. Analytics Dashboard
   - Overview of:
     - Total applications
     - Response rate
     - Interview rate
     - Offer rate
   - Resume effectiveness insights
   - Job status distribution

12. Skill Gap Analysis
   - AI identifies missing or weak skills per job description
   - Comparison against existing skills
   - Highlights improvement areas (no learning content generation required)

13. Resume Export
   - Export resume as PDF
   - A4 format
   - ATS-friendly layout
   - Minimal, professional templates only
   - Resume linked to specific job application

====================================
NON-FUNCTIONAL REQUIREMENTS
====================================
- Resume generation time < 10 seconds
- Secure storage of user data and images
- Scalable backend architecture
- Mobile-responsive UI suitable for desktop and mobile browsers
- Accessible design (basic WCAG compliance)
- Data consistency across resumes and job applications

====================================
TECHNICAL CONSTRAINTS
====================================
Frontend:
- Angular (latest LTS)
- Mobile-first responsive design
- Optimized for mobile and desktop browsers

Backend:
- Node.js with Express
- RESTful API
- Authentication and authorization

Database:
- MySQL (relational)
- Tables for users, resumes, job_applications, companies, projects, images, reminders

AI Integration:
- OpenAI (ChatGPT)
- Prompt chaining:
  - Job analysis
  - Resume tailoring
  - Resume scoring
  - Skill gap detection
- Guardrails to prevent hallucinated experience

PDF Generation:
- HTML → PDF
- Server-side rendering preferred
- A4 sizing with print-safe CSS

====================================
OUT OF SCOPE (PHASE 1)
====================================
- Browser extensions
- Auto job scraping
- Auto-apply functionality
- Native mobile apps

====================================
OUTPUT FORMAT REQUIRED
====================================
Generate a complete PRD with the following sections:
1. Executive Summary
2. Problem Statement
3. Goals & Success Metrics
4. User Personas
5. User Journeys & Flows
6. Functional Requirements (Detailed)
7. Non-Functional Requirements
8. AI System Design (prompt strategy, guardrails)
9. Data Model (high-level entities & relationships)
10. System Architecture (high-level)
11. Security & Privacy Considerations
12. Risks & Mitigations
13. Future Enhancements
14. Out of Scope

Make the PRD detailed enough that a development team using Angular, Node.js, Express, and MySQL can begin implementation without major clarification.