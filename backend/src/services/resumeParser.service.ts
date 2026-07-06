import { PDFParse } from "pdf-parse";
import { extractRawText } from "mammoth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../db/prisma.js";
import { config } from "../config.js";

// ---------------------------------------------------------------------------
// Types returned by Gemini extraction
// ---------------------------------------------------------------------------
interface ParsedProfile {
  phone?: string;
  links?: Array<{ type: string; url: string }>;
  location?: string;
  summary?: string;
}

interface ParsedEducation {
  institution: string;
  degree: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
}

interface ParsedExperience {
  company: string;
  position: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  bullets?: string[];
}

interface ParsedProject {
  title: string;
  summary?: string;
  description?: string;
  role?: string;
  techStack?: string[];
  startDate?: string;
  endDate?: string;
  url?: string;
  bullets?: string[];
}

interface ParsedResume {
  profile: ParsedProfile;
  education: ParsedEducation[];
  experience: ParsedExperience[];
  projects: ParsedProject[];
  skills: string[];
  certifications: Array<{ title: string; description?: string }>;
}

// Shape returned to the frontend for review, before anything is committed.
// Skills are split into "new" (actionable) vs "alreadyHave" (a no-op if added)
// so the review screen only needs to show the former.
export interface ParsedResumePreview {
  profile: ParsedProfile;
  education: ParsedEducation[];
  experience: ParsedExperience[];
  projects: ParsedProject[];
  skills: { new: string[]; alreadyHave: string[] };
  certifications: Array<{ title: string; description?: string }>;
}

export interface ParseResult {
  educationAdded: number;
  experienceAdded: number;
  projectsAdded: number;
  skillsAdded: number;
  certificationsAdded: number;
  linksAdded: number;
  profileUpdated: boolean;
  educationIds: number[];
  experienceIds: number[];
  projectIds: number[];
  certificationIds: number[];
  newUserSkillIds: number[];
  linkIds: number[];
}

// ---------------------------------------------------------------------------
// Date parsing helper — handles "Jan 2022", "2022", "Present", ISO strings
// ---------------------------------------------------------------------------
function parseDate(raw: string | undefined | null): Date | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s || /present|current|now/i.test(s)) return null;

  // Already ISO-like: "2022-01-15" or "2022-01"
  if (/^\d{4}-\d{2}/.test(s)) return new Date(s);

  // Year only: "2022"
  if (/^\d{4}$/.test(s)) return new Date(`${s}-01-01`);

  // "Jan 2022" or "January 2022"
  const monthYear = s.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthYear) return new Date(`${monthYear[1]} 1, ${monthYear[2]}`);

  // Fallback: let JS try
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// ---------------------------------------------------------------------------
// Step 1 — Extract plain text from the uploaded file buffer
// ---------------------------------------------------------------------------
export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  if (mimeType === "application/pdf") {
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    await parser.destroy();
    return data.text;
  }

  if (mimeType === DOCX) {
    const result = await extractRawText({ buffer });
    return result.value;
  }

  throw new Error(`Unsupported file type: ${mimeType}. Upload a PDF or DOCX file.`);
}

// ---------------------------------------------------------------------------
// Step 2 — Ask Gemini to structure the raw text into our schema shape
// ---------------------------------------------------------------------------
async function parseWithGemini(text: string): Promise<ParsedResume> {
  if (!config.geminiKey) throw new Error("Gemini API key not configured.");

  const genAI = new GoogleGenerativeAI(config.geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are a resume parser. Extract structured data from the resume text below and return ONLY valid JSON with no markdown.

Output this exact JSON shape (omit fields that are not present in the resume):
{
  "profile": {
    "phone": "string",
    "links": [{ "type": "LinkedIn | GitHub | Portfolio | <custom short label>", "url": "string (full URL)" }],
    "location": "string (city, country)",
    "summary": "string (professional summary or objective)"
  },
  "education": [
    {
      "institution": "string",
      "degree": "string (e.g. Bachelor of Science)",
      "field": "string (e.g. Computer Science)",
      "startDate": "string (Month YYYY or YYYY)",
      "endDate": "string (Month YYYY, YYYY, or 'Present')",
      "current": false,
      "description": "string (optional extra detail)"
    }
  ],
  "experience": [
    {
      "company": "string",
      "position": "string",
      "location": "string",
      "startDate": "string (Month YYYY or YYYY)",
      "endDate": "string (Month YYYY, YYYY, or 'Present')",
      "current": false,
      "description": "string",
      "bullets": ["string", "..."]
    }
  ],
  "projects": [
    {
      "title": "string",
      "summary": "string (one line)",
      "description": "string",
      "role": "string",
      "techStack": ["string", "..."],
      "startDate": "string",
      "endDate": "string",
      "url": "string",
      "bullets": ["string", "..."]
    }
  ],
  "skills": ["string", "..."],
  "certifications": [
    { "title": "string", "description": "string" }
  ]
}

Rules:
- Return ONLY the JSON object, no markdown fences, no explanation.
- For dates marked "Present" or "Current", set endDate to "Present" and current to true.
- skills should be individual skill names (e.g. "Python", "React", "AWS"), not categories.
- If a section is absent from the resume, use an empty array [].
- profile fields are optional — omit rather than returning null.
- Classify each URL/handle found in contact or social-links info as type "LinkedIn", "GitHub", or "Portfolio" when it obviously matches, otherwise use a short descriptive type (e.g. "Twitter", "Behance").

Resume text:
${text.slice(0, 12000)}`;

  const response = await model.generateContent(prompt);
  const raw = response.response.text().trim();

  // Strip any accidental markdown fences
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();

  try {
    return JSON.parse(cleaned) as ParsedResume;
  } catch {
    throw new Error("Gemini returned non-JSON output for resume parsing. Please try again.");
  }
}

// ---------------------------------------------------------------------------
// Step 3 — Write the parsed data into the existing DB tables
// ---------------------------------------------------------------------------
export async function populateProfile(userId: number, parsed: ParsedResume): Promise<ParseResult> {
  const result: ParseResult = {
    educationAdded: 0,
    experienceAdded: 0,
    projectsAdded: 0,
    skillsAdded: 0,
    certificationsAdded: 0,
    linksAdded: 0,
    profileUpdated: false,
    educationIds: [],
    experienceIds: [],
    projectIds: [],
    certificationIds: [],
    newUserSkillIds: [],
    linkIds: []
  };

  // --- Profile fields: only fill in fields that are currently empty ---
  const profileUpdate: Record<string, string> = {};
  const existing = await prisma.profile.findUnique({ where: { userId } });

  const p = parsed.profile ?? {};
  if (p.phone    && !existing?.phone)    profileUpdate.phone    = p.phone;
  if (p.location && !existing?.location) profileUpdate.location = p.location;
  if (p.summary  && !existing?.summary)  profileUpdate.summary  = p.summary;

  const profile = await prisma.profile.upsert({
    where: { userId },
    update: profileUpdate,
    create: { userId, ...profileUpdate }
  });
  result.profileUpdated = Object.keys(profileUpdate).length > 0;

  // --- Links: additive, but skip exact-URL duplicates ---
  for (const link of p.links ?? []) {
    if (!link?.url) continue;
    const existingLink = await prisma.profileLink.findFirst({
      where: { profileId: profile.id, url: link.url }
    });
    if (!existingLink) {
      const created = await prisma.profileLink.create({
        data: { profileId: profile.id, type: link.type || "Link", url: link.url }
      });
      result.linkIds.push(created.id);
      result.linksAdded++;
    }
  }

  // --- Education ---
  for (const edu of parsed.education ?? []) {
    if (!edu.institution || !edu.degree) continue;
    const startDate = parseDate(edu.startDate) ?? new Date("2000-01-01");
    const endDate = parseDate(edu.endDate);
    const createdEdu = await prisma.education.create({
      data: {
        profileId: profile.id,
        institution: edu.institution,
        degree: edu.degree,
        field: edu.field ?? null,
        startDate,
        endDate: endDate ?? null,
        current: edu.current ?? !endDate,
        description: edu.description ?? null
      }
    });
    result.educationIds.push(createdEdu.id);
    result.educationAdded++;
  }

  // --- Experience ---
  for (const exp of parsed.experience ?? []) {
    if (!exp.company || !exp.position) continue;
    const startDate = parseDate(exp.startDate) ?? new Date();
    const endDate = parseDate(exp.endDate);
    const experience = await prisma.experience.create({
      data: {
        userId,
        company: exp.company,
        position: exp.position,
        location: exp.location ?? null,
        startDate,
        endDate: endDate ?? null,
        current: exp.current ?? !endDate,
        description: exp.description ?? null
      }
    });

    for (let i = 0; i < (exp.bullets ?? []).length; i++) {
      const content = exp.bullets![i];
      if (content?.trim()) {
        await prisma.experienceBullet.create({
          data: { experienceId: experience.id, content: content.trim(), order: i }
        });
      }
    }
    result.experienceIds.push(experience.id);
    result.experienceAdded++;
  }

  // --- Projects ---
  for (let order = 0; order < (parsed.projects ?? []).length; order++) {
    const proj = parsed.projects[order];
    if (!proj.title) continue;
    const project = await prisma.project.create({
      data: {
        userId,
        title: proj.title,
        summary: proj.summary ?? null,
        description: proj.description ?? null,
        role: proj.role ?? null,
        techStack: proj.techStack?.length ? JSON.stringify(proj.techStack) : null,
        startDate: parseDate(proj.startDate) ?? null,
        endDate: parseDate(proj.endDate) ?? null,
        url: proj.url ?? null,
        order
      }
    });

    for (let i = 0; i < (proj.bullets ?? []).length; i++) {
      const content = proj.bullets![i];
      if (content?.trim()) {
        await prisma.projectBullet.create({
          data: { projectId: project.id, content: content.trim(), order: i }
        });
      }
    }
    result.projectIds.push(project.id);
    result.projectsAdded++;
  }

  // --- Skills (upsert global Skill, then link to user) ---
  for (const skillName of parsed.skills ?? []) {
    if (!skillName?.trim()) continue;
    const name = skillName.trim();
    const skill = await prisma.skill.upsert({
      where: { name },
      update: {},
      create: { name }
    });
    // Skip if user already has this skill
    const existing = await prisma.userSkill.findUnique({
      where: { userId_skillId: { userId, skillId: skill.id } }
    });
    if (!existing) {
      const createdUserSkill = await prisma.userSkill.create({ data: { userId, skillId: skill.id } });
      result.newUserSkillIds.push(createdUserSkill.id);
      result.skillsAdded++;
    }
  }

  // --- Certifications ---
  for (const cert of parsed.certifications ?? []) {
    if (!cert.title?.trim()) continue;
    const createdCert = await prisma.certification.create({
      data: { userId, title: cert.title.trim(), description: cert.description ?? null }
    });
    result.certificationIds.push(createdCert.id);
    result.certificationsAdded++;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Splits parsed skills into "new" (would actually create a UserSkill row) vs
// "alreadyHave" (a no-op if added) — compared case-insensitively to match
// this DB's utf8mb4_unicode_ci collation, so the review screen's bucketing
// agrees with what populateProfile's skill.upsert will actually do.
// ---------------------------------------------------------------------------
async function precomputeSkillStatus(
  userId: number,
  skills: string[]
): Promise<{ new: string[]; alreadyHave: string[] }> {
  const existingUserSkills = await prisma.userSkill.findMany({
    where: { userId },
    include: { skill: true }
  });
  const existingNames = new Set(existingUserSkills.map((us) => us.skill.name.toLowerCase()));

  const newSkills: string[] = [];
  const alreadyHave: string[] = [];
  const seen = new Set<string>();
  for (const raw of skills ?? []) {
    const name = raw?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (existingNames.has(key)) {
      alreadyHave.push(name);
    } else {
      newSkills.push(name);
    }
  }
  return { new: newSkills, alreadyHave };
}

// ---------------------------------------------------------------------------
// Public entry point — parse only, no DB writes. The frontend renders the
// result for the user to review/edit/remove before calling populateProfile
// (via the separate commit endpoint) with the (possibly filtered) data.
// ---------------------------------------------------------------------------
export async function parseOnly(
  buffer: Buffer,
  mimeType: string,
  userId: number
): Promise<ParsedResumePreview> {
  const text = await extractText(buffer, mimeType);
  if (text.trim().length < 50) {
    throw new Error("Could not extract enough text from the file. Make sure the PDF is not scanned/image-based.");
  }
  const parsed = await parseWithGemini(text);
  const skills = await precomputeSkillStatus(userId, parsed.skills ?? []);

  return {
    profile: parsed.profile ?? {},
    education: parsed.education ?? [],
    experience: parsed.experience ?? [],
    projects: parsed.projects ?? [],
    skills,
    certifications: parsed.certifications ?? []
  };
}
