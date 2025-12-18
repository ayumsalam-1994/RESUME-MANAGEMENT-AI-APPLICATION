# Product Requirements Document (PRD)

## 1. Executive Summary

This product is an AI-powered Resume Builder and Job Application Tracking web application designed to help job seekers create highly targeted, ATS-friendly resumes and manage their job applications in a single, unified platform.

By combining structured career data, AI-driven resume personalization, job matching insights, and application tracking, the product enables users to improve application quality, stay organized during job searches, and make data-informed decisions to increase interview and offer rates.

The Phase 1 release focuses on resume personalization, job application tracking, and actionable feedback, delivered via a responsive web application built with Angular, Node.js (Express), and MySQL.

---

## 2. Problem Statement

Job seekers face multiple challenges when applying for jobs:

* Resumes must be customized for each job to pass ATS filters
* Tracking multiple job applications across platforms is fragmented and manual
* Users lack clear feedback on how well their resume matches a job description
* Project and experience information is frequently adjusted but difficult to manage consistently

Existing tools typically solve only one part of the problem (resume building or job tracking), forcing users to rely on spreadsheets, notes, and multiple platforms. This product solves the problem holistically by unifying resume generation, AI analysis, and job application tracking in one system.

---

## 3. Goals & Success Metrics

### Product Goals

* Enable fast creation of job-specific, ATS-friendly resumes
* Improve resume-to-job relevance through AI feedback
* Centralize job application tracking and notes
* Increase interview and response rates for users

### Success Metrics

* Time to generate a tailored resume (< 10 seconds)
* Average resume-job match score improvement over time
* Number of resumes generated per user
* Percentage of tracked applications with updated statuses
* User retention across multi-week job searches

---

## 4. User Personas

### Primary Persona: Early to Mid-Career Professional

* Applies to multiple roles across companies
* Frequently adjusts projects and experience
* Needs ATS-optimized resumes
* Wants visibility into application progress

### Secondary Persona: Career Switcher / Upskiller

* Needs skill gap feedback
* Relies on AI suggestions to reframe experience
* Tracks many applications simultaneously

---

## 5. User Journeys & Flows

### Resume Creation Flow

1. User maintains master profile (skills, experience, projects)
2. User adds a job application with job description
3. AI analyzes job description
4. AI generates tailored resume and score
5. User reviews, edits, regenerates sections
6. Resume is saved and linked to job application

### Job Tracking Flow

1. User creates job application entry
2. User applies externally (LinkedIn, website, referral)
3. User updates status and adds notes
4. User tracks interviews, reminders, and outcomes

---

## 6. Functional Requirements

### 6.1 User Profile Management

* Store personal details, education, and links
* Skills categorized, searchable, and reusable

### 6.2 Work Experience Management

* Support multiple roles per company
* Bullet points editable and AI-enhanced
* Optional version history

### 6.3 Project Management

* CRUD operations for projects
* Reordering and archiving support
* Fields:

  * Title, summary, description
  * Role and achievements
  * Tech stack (Angular, Node.js, Express, MySQL)
  * 3–5 images (portfolio preview only)
* Images excluded from ATS resumes

### 6.4 Job Application Targeting

* Store job title and full description
* Multiple applications per user
* Link resume and cover letter to each application

### 6.5 AI Resume Generation

* Job keyword extraction
* Experience and project relevance ranking
* ATS-safe bullet rewriting
* Section-level regeneration
* Resume versioning per application

### 6.6 Resume Quality & Job Match Scoring

* Overall match score
* Breakdown by skills, experience, keywords
* Improvement suggestions

### 6.7 Cover Letter Generation

* AI-generated per job
* Editable by user
* Versioned and stored

### 6.8 Job Application Tracking

* Track company profile, job details, resume used
* Application date, platform, URLs
* Status lifecycle with history
* Notes and feedback

### 6.9 Follow-Up & Reminder System

* Manual reminders tied to applications
* In-app notifications

### 6.10 Interview & Notes Tracking

* Interview rounds and dates
* Outcome tracking
* Free-text notes per round

### 6.11 Analytics Dashboard

* Application, interview, and offer metrics
* Resume effectiveness insights

### 6.12 Skill Gap Analysis

* AI comparison of job requirements vs user skills
* Highlight missing or weak skills

### 6.13 Resume Export

* PDF export
* A4, ATS-friendly
* Minimal professional templates

---

## 7. Non-Functional Requirements

* Resume generation < 10 seconds
* Secure authentication and authorization
* Scalable backend architecture
* Responsive UI for desktop and mobile browsers
* Data consistency across modules

---

## 8. AI System Design

### Prompt Strategy

* Step 1: Job description analysis
* Step 2: Keyword and skill extraction
* Step 3: Resume rewriting and ranking
* Step 4: Scoring and skill gap detection

### Guardrails

* No fabricated experience
* Rewrite only from existing data
* ATS-safe formatting enforcement

---

## 9. Data Model (High-Level)

Key entities:

* User
* Skill
* Experience
* Project
* ProjectImage
* Resume
* ResumeVersion
* JobApplication
* Company
* Interview
* Reminder

Relationships:

* User has many resumes, projects, job applications
* JobApplication links to one resume and company

---

## 10. System Architecture

* Frontend: Angular SPA (mobile-first)
* Backend: Node.js + Express REST API
* Database: MySQL
* AI: OpenAI (ChatGPT)
* Storage: Object storage for images
* PDF: Server-side HTML to PDF

---

## 11. Security & Privacy Considerations

* Encrypted passwords
* Secure token-based authentication
* Role-based access control
* Data isolation per user
* No training AI on user data

---

## 12. Risks & Mitigations

| Risk                | Mitigation               |
| ------------------- | ------------------------ |
| AI hallucination    | Strict prompt guardrails |
| ATS incompatibility | Minimal HTML, no images  |
| Feature scope creep | Clear Phase 1 boundaries |

---

## 13. Future Enhancements

* Job scraping
* Browser extension
* Native mobile apps
* Learning content recommendations
* Recruiter-facing views

---

## 14. Out of Scope (Phase 1)

* Auto-apply
* Browser extensions
* Job scraping
* Native mobile applications
# Product Requirements Document (PRD)

## 1. Executive Summary

This product is an AI-powered Resume Builder and Job Application Tracking web application designed to help job seekers create highly targeted, ATS-friendly resumes and manage their job applications in a single, unified platform.

By combining structured career data, AI-driven resume personalization, job matching insights, and application tracking, the product enables users to improve application quality, stay organized during job searches, and make data-informed decisions to increase interview and offer rates.

The Phase 1 release focuses on resume personalization, job application tracking, and actionable feedback, delivered via a responsive web application built with Angular, Node.js (Express), and MySQL.

---

## 2. Problem Statement

Job seekers face multiple challenges when applying for jobs:

* Resumes must be customized for each job to pass ATS filters
* Tracking multiple job applications across platforms is fragmented and manual
* Users lack clear feedback on how well their resume matches a job description
* Project and experience information is frequently adjusted but difficult to manage consistently

Existing tools typically solve only one part of the problem (resume building or job tracking), forcing users to rely on spreadsheets, notes, and multiple platforms. This product solves the problem holistically by unifying resume generation, AI analysis, and job application tracking in one system.

---

## 3. Goals & Success Metrics

### Product Goals

* Enable fast creation of job-specific, ATS-friendly resumes
* Improve resume-to-job relevance through AI feedback
* Centralize job application tracking and notes
* Increase interview and response rates for users

### Success Metrics

* Time to generate a tailored resume (< 10 seconds)
* Average resume-job match score improvement over time
* Number of resumes generated per user
* Percentage of tracked applications with updated statuses
* User retention across multi-week job searches

---

## 4. User Personas

### Primary Persona: Early to Mid-Career Professional

* Applies to multiple roles across companies
* Frequently adjusts projects and experience
* Needs ATS-optimized resumes
* Wants visibility into application progress

### Secondary Persona: Career Switcher / Upskiller

* Needs skill gap feedback
* Relies on AI suggestions to reframe experience
* Tracks many applications simultaneously

---

## 5. User Journeys & Flows

### Resume Creation Flow

1. User maintains master profile (skills, experience, projects)
2. User adds a job application with job description
3. AI analyzes job description
4. AI generates tailored resume and score
5. User reviews, edits, regenerates sections
6. Resume is saved and linked to job application

### Job Tracking Flow

1. User creates job application entry
2. User applies externally (LinkedIn, website, referral)
3. User updates status and adds notes
4. User tracks interviews, reminders, and outcomes

---

## 6. Functional Requirements

### 6.1 User Profile Management

* Store personal details, education, and links
* Skills categorized, searchable, and reusable

### 6.2 Work Experience Management

* Support multiple roles per company
* Bullet points editable and AI-enhanced
* Optional version history

### 6.3 Project Management

* CRUD operations for projects
* Reordering and archiving support
* Fields:

  * Title, summary, description
  * Role and achievements
  * Tech stack (Angular, Node.js, Express, MySQL)
  * 3–5 images (portfolio preview only)
* Images excluded from ATS resumes

### 6.4 Job Application Targeting

* Store job title and full description
* Multiple applications per user
* Link resume and cover letter to each application

### 6.5 AI Resume Generation

* Job keyword extraction
* Experience and project relevance ranking
* ATS-safe bullet rewriting
* Section-level regeneration
* Resume versioning per application

### 6.6 Resume Quality & Job Match Scoring

* Overall match score
* Breakdown by skills, experience, keywords
* Improvement suggestions

### 6.7 Cover Letter Generation

* AI-generated per job
* Editable by user
* Versioned and stored

### 6.8 Job Application Tracking

* Track company profile, job details, resume used
* Application date, platform, URLs
* Status lifecycle with history
* Notes and feedback

### 6.9 Follow-Up & Reminder System

* Manual reminders tied to applications
* In-app notifications

### 6.10 Interview & Notes Tracking

* Interview rounds and dates
* Outcome tracking
* Free-text notes per round

### 6.11 Analytics Dashboard

* Application, interview, and offer metrics
* Resume effectiveness insights

### 6.12 Skill Gap Analysis

* AI comparison of job requirements vs user skills
* Highlight missing or weak skills

### 6.13 Resume Export

* PDF export
* A4, ATS-friendly
* Minimal professional templates

---

## 7. Non-Functional Requirements

* Resume generation < 10 seconds
* Secure authentication and authorization
* Scalable backend architecture
* Responsive UI for desktop and mobile browsers
* Data consistency across modules

---

## 8. AI System Design

### Prompt Strategy

* Step 1: Job description analysis
* Step 2: Keyword and skill extraction
* Step 3: Resume rewriting and ranking
* Step 4: Scoring and skill gap detection

### Guardrails

* No fabricated experience
* Rewrite only from existing data
* ATS-safe formatting enforcement

---

## 9. Data Model (High-Level)

Key entities:

* User
* Skill
* Experience
* Project
* ProjectImage
* Resume
* ResumeVersion
* JobApplication
* Company
* Interview
* Reminder

Relationships:

* User has many resumes, projects, job applications
* JobApplication links to one resume and company

---

## 10. System Architecture

* Frontend: Angular SPA (mobile-first)
* Backend: Node.js + Express REST API
* Database: MySQL
* AI: OpenAI (ChatGPT)
* Storage: Object storage for images
* PDF: Server-side HTML to PDF

---

## 11. Security & Privacy Considerations

* Encrypted passwords
* Secure token-based authentication
* Role-based access control
* Data isolation per user
* No training AI on user data

---

## 12. Risks & Mitigations

| Risk                | Mitigation               |
| ------------------- | ------------------------ |
| AI hallucination    | Strict prompt guardrails |
| ATS incompatibility | Minimal HTML, no images  |
| Feature scope creep | Clear Phase 1 boundaries |

---

## 13. Future Enhancements

* Job scraping
* Browser extension
* Native mobile apps
* Learning content recommendations
* Recruiter-facing views

---

## 14. Out of Scope (Phase 1)

* Auto-apply
* Browser extensions
* Job scraping
* Native mobile applications
