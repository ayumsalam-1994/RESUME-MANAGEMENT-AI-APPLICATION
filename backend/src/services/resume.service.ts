import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../db/prisma";
import { config } from "../config";
import PDFDocument from "pdfkit";

export class ResumeService {
  private genAI?: GoogleGenerativeAI;
  private model?: any;
  private lastGenerationTime: Map<number, number> = new Map(); // userId -> timestamp
  private lastAnalysisTime: Map<number, number> = new Map(); // userId -> timestamp for analysis
  private readonly RATE_LIMIT_MS = 60000; // 1 minute in milliseconds

  private initializeGemini(modelName?: string) {
    if (!config.geminiKey) {
      throw new Error("Gemini API key is missing. Set GEMINI_API_KEY in your environment.");
    }
    if (!this.genAI) {
      this.genAI = new GoogleGenerativeAI(config.geminiKey);
    }
    const selected = modelName || "gemini-2.5-flash";
    this.model = this.genAI.getGenerativeModel({ model: selected });
  }

  async getResumesForApplication(userId: number, applicationId: number) {
    const app = await prisma.jobApplication.findFirst({
      where: { id: applicationId, userId }
    });
    if (!app) throw new Error("Job application not found");

    const resumes = await prisma.resume.findMany({
      where: { userId, jobApplicationId: applicationId },
      orderBy: { version: "desc" }
    });
    return resumes;
  }

  async getResume(resumeId: number, userId: number) {
    const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId } });
    if (!resume) throw new Error("Resume not found");
    return resume;
  }

  async generateForApplication(userId: number, applicationId: number): Promise<any>;
  async generateForApplication(userId: number, applicationId: number, jobDescriptionOverride?: string, customPrompt?: string): Promise<any>;
  async generateForApplication(userId: number, applicationId: number, jobDescriptionOverride?: string, customPrompt?: string, modelName?: string): Promise<any>;
  async generateForApplication(userId: number, applicationId: number, jobDescriptionOverride?: string, customPrompt?: string, modelName?: string) {
    this.initializeGemini(modelName);

    // Rate limiting check
    const now = Date.now();
    const lastGeneration = this.lastGenerationTime.get(userId);
    
    if (lastGeneration) {
      const timeSinceLastGeneration = now - lastGeneration;
      const remainingTime = this.RATE_LIMIT_MS - timeSinceLastGeneration;
      
      if (remainingTime > 0) {
        const secondsRemaining = Math.ceil(remainingTime / 1000);
        throw new Error(`Rate limit exceeded. Please wait ${secondsRemaining} seconds before generating another resume.`);
      }
    }

    // Gather user data
    const [user, profile, experiences, projects, application, userSkills] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.profile.findUnique({ where: { userId } }),
      prisma.experience.findMany({
        where: { userId },
        include: { bullets: { orderBy: { order: "asc" } } },
        orderBy: { startDate: "desc" }
      }),
      prisma.project.findMany({
        where: { userId, archived: false },
        include: {
          images: { orderBy: { order: "asc" } },
          bullets: { orderBy: { order: "asc" } }
        },
        orderBy: { order: "asc" }
      }),
      prisma.jobApplication.findFirst({ where: { id: applicationId, userId } }),
      prisma.userSkill.findMany({
        where: { userId },
        include: { skill: true },
        orderBy: { createdAt: "asc" }
      })
    ]);

    if (!user || !application) {
      throw new Error("Required data missing");
    }

    const jobDescription = jobDescriptionOverride || application.jobDescription;
    if (!jobDescription) {
      throw new Error("Job description is required to generate a resume");
    }

    // Use custom prompt if provided, otherwise use default
    const defaultSystemPrompt = "You are an expert ATS resume writer. Produce a concise, ATS-safe resume JSON based on the user's profile and the job description. Avoid images, tables, and fancy formatting. Use month-year date strings (e.g., Jan 2024). Respond ONLY with valid JSON, wrapped in ```json...``` if needed.";
    const system = customPrompt || defaultSystemPrompt;

    const userPayload = {
      application: {
        jobTitle: application.jobTitle,
        jobDescription,
        platform: application.platform,
        url: application.applicationUrl
      },
      user: {
        name: user.name,
        email: user.email
      },
      profile,
      experiences: experiences.map((e: any) => ({
        company: e.company,
        position: e.position,
        location: e.location,
        startDate: e.startDate,
        endDate: e.endDate,
        current: e.current,
        description: e.description,
        bullets: e.bullets.map((b: any) => b.content)
      })),
      projects: projects.map((p: any) => ({
        title: p.title,
        summary: p.summary,
        description: p.description,
        role: p.role,
        techStack: p.techStack,
        startDate: p.startDate,
        endDate: p.endDate,
        url: p.url,
        bullets: (p.bullets || []).map((b: any) => b.content)
      }))
    };

    const userMessage = JSON.stringify({
      instructions: {
        outputFormat: {
          type: "json",
          schema: {
            name: "string",
            contact: {
              location: "string",
              phone: "string",
              email: "string",
              linkedin: "string",
              github: "string",
              portfolio: "string"
            },
            summary: "string",
            skills: "string[]",
            projects: [
              {
                title: "string",
                start: "string",
                end: "string",
                bullets: "string[]",
                tech: "string[]"
              }
            ],
            experience: [
              {
                company: "string",
                role: "string",
                start: "string",
                end: "string",
                bullets: "string[]"
              }
            ],
            education: [
              {
                degree: "string",
                field: "string",
                institution: "string",
                start: "string",
                end: "string"
              }
            ],
            certifications: [
              {
                title: "string"
              }
            ]
          }
        },
        style: {
          atsSafe: true,
          avoidFirstPerson: true,
          focusOnImpact: true,
          bulletCount: 4
        }
      },
      data: userPayload
    });

    try {
      const fullPrompt = `${system}\n\n${userMessage}`;
      
      // console.log("=== GEMINI API CALL ===");
      // console.log("Model:", this.model);
      // console.log("System Prompt:", system);
      // console.log("User Payload Data:", JSON.stringify(userPayload, null, 2));
      // console.log("Full Instructions:", JSON.stringify(JSON.parse(userMessage), null, 2));
      // console.log("========================");
      
      const response = await this.model!.generateContent(fullPrompt);

      const responseText = response.response.text();

      // Extract JSON from response (handle markdown-wrapped JSON)
      let content = responseText;
      const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch && jsonMatch[1]) {
        content = jsonMatch[1].trim();
      }

      // Validate it's valid JSON
      try {
        JSON.parse(content);
      } catch {
        throw new Error("Generated content is not valid JSON. Please try again or use the Copy Prompt button to refine manually.");
      }

      // Versioning: next version number
      const latest = await prisma.resume.findFirst({
        where: { userId, jobApplicationId: applicationId },
        orderBy: { version: "desc" },
        select: { version: true }
      });
      const nextVersion = (latest?.version ?? 0) + 1;

      const resume = await prisma.resume.create({
        data: {
          userId,
          jobApplicationId: applicationId,
          content,
          version: nextVersion
        }
      });

      // Update last generation timestamp after successful creation
      this.lastGenerationTime.set(userId, Date.now());

      return resume;
    } catch (err: any) {
      const msg = err?.message || "Unknown error generating resume with Gemini API";
      throw new Error(`Resume generation failed: ${msg}. Please use the Copy Prompt button to generate manually.`);
    }
  }

  async deleteResume(resumeId: number, userId: number) {
    const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId } });
    if (!resume) throw new Error("Resume not found");

    await prisma.resume.delete({ where: { id: resumeId } });
    return { success: true };
  }

  async importResume(userId: number, applicationId: number, content: string) {
    // Verify application ownership
    const app = await prisma.jobApplication.findFirst({
      where: { id: applicationId, userId }
    });
    if (!app) throw new Error("Job application not found");

    // Validate JSON
    let parsed: any;
    try {
      parsed = typeof content === 'string' ? JSON.parse(content) : content;
    } catch {
      throw new Error("Invalid JSON format");
    }

    // Basic validation of required fields
    if (!parsed.summary && !parsed.experience && !parsed.projects) {
      throw new Error("Resume must contain at least summary, experience, or projects");
    }

    // Get next version
    const latest = await prisma.resume.findFirst({
      where: { userId, jobApplicationId: applicationId },
      orderBy: { version: "desc" },
      select: { version: true }
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    // Store as string
    const resume = await prisma.resume.create({
      data: {
        userId,
        jobApplicationId: applicationId,
        content: typeof content === 'string' ? content : JSON.stringify(content),
        version: nextVersion
      }
    });

    return resume;
  }

  async generatePDF(resumeContent: any): Promise<Buffer> {
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      bufferPages: true
    });

    const buffer: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => buffer.push(chunk));

    const pageWidth = 595; // A4 width in points
    const contentWidth = pageWidth - 100; // Left and right margins of 50
    const margin = 50;

    // Helpers
    const drawLine = () => {
      doc.strokeColor("#666666").moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
    };

    const sectionHeader = (text: string, rightText?: string) => {
      doc.fontSize(14).font("Times-Bold").fillColor("#000000");
      const startY = doc.y;
      doc.text(text, margin, startY, { continued: !!rightText });
      if (rightText) {
        doc.fontSize(14).font("Times-Roman").fillColor("#000000");
        doc.text(` | ${rightText}`, { continued: false });
      }
      doc.moveDown(0.2);
    };

    // Name
    const displayName = resumeContent.name || "Candidate";
    doc.fontSize(20).font("Times-Bold").fillColor("#000000").text(displayName, { align: "left" });
    drawLine();
    doc.moveDown(0.4);

    // Contact
    sectionHeader("Contact Information");
    doc.fontSize(12).font("Times-Roman").fillColor("#000000");
    const contact = resumeContent.contact || {};
    const contactLines = [
      contact.location,
      contact.phone,
      contact.email,
      contact.linkedin,
      contact.github,
      contact.portfolio
    ].filter(Boolean);
    if (contactLines.length) {
      doc.text(contactLines.join(" | "), { width: contentWidth });
    }
    doc.moveDown(0.3);
    drawLine();
    doc.moveDown(0.4);

    // Summary
    if (resumeContent.summary) {
      sectionHeader("Professional Summary");
      doc.fontSize(12).font("Times-Roman").fillColor("#000000");
      doc.text(resumeContent.summary, { width: contentWidth, align: "left", lineGap: 3 });
      doc.moveDown(0.3);
      drawLine();
      doc.moveDown(0.4);
    }

    // Skills two columns
    if (resumeContent.skills && resumeContent.skills.length > 0) {
      sectionHeader("Skills");
      doc.fontSize(12).font("Times-Roman").fillColor("#000000");
      const mid = Math.ceil(resumeContent.skills.length / 2);
      const left = resumeContent.skills.slice(0, mid);
      const right = resumeContent.skills.slice(mid);
      const columnWidth = (contentWidth - 20) / 2;
      const yStart = doc.y;
      doc.list(left, { bulletRadius: 2, textIndent: 10, width: columnWidth });
      const rightX = margin + columnWidth + 20;
      doc.y = yStart;
      doc.x = rightX;
      doc.list(right, { bulletRadius: 2, textIndent: 10, width: columnWidth, align: "left" });
      doc.x = margin;
      doc.moveDown(0.3);
    }

    // Projects
    if (resumeContent.projects && resumeContent.projects.length > 0) {
      drawLine();
      doc.moveDown(0.4);
      sectionHeader("Projects");
      doc.fontSize(12).font("Times-Roman").fillColor("#000000");
      resumeContent.projects.forEach((proj: any) => {
        const headerRight = [proj.start, proj.end].filter(Boolean).join(" - ");
        sectionHeader(proj.title || "Project", headerRight || undefined);
        if (proj.bullets && proj.bullets.length > 0) {
          doc.list(proj.bullets, { bulletRadius: 2, textIndent: 10, width: contentWidth });
        }
        doc.moveDown(0.3);
      });
      drawLine();
      doc.moveDown(0.4);
    }

    // Experience
    if (resumeContent.experience && resumeContent.experience.length > 0) {
      sectionHeader("Experience");
      doc.fontSize(12).font("Times-Roman").fillColor("#000000");
      resumeContent.experience.forEach((exp: any) => {
        const right = [exp.start, exp.end].filter(Boolean).join(" - ");
        sectionHeader(`${exp.role || "Role"} - ${exp.company || "Company"}`, right || undefined);
        if (exp.bullets && exp.bullets.length > 0) {
          doc.list(exp.bullets, { bulletRadius: 2, textIndent: 10, width: contentWidth });
        }
        doc.moveDown(0.3);
      });
      drawLine();
      doc.moveDown(0.4);
    }

    // Education
    if (resumeContent.education && resumeContent.education.length > 0) {
      sectionHeader("Education");
      doc.fontSize(12).font("Times-Roman").fillColor("#000000");
      resumeContent.education.forEach((edu: any) => {
        doc.font("Times-Bold").text(`${edu.degree || "Degree"} in ${edu.field || "Field"}`);
        doc.font("Times-Roman");
        const right = [edu.institution, [edu.start, edu.end].filter(Boolean).join(" - ")].filter(Boolean).join(" | ");
        if (right) {
          doc.text(right, { width: contentWidth, lineGap: 2 });
        }
        doc.moveDown(0.2);
      });
      drawLine();
      doc.moveDown(0.4);
    }

    // Certifications
    if (resumeContent.certifications && resumeContent.certifications.length > 0) {
      sectionHeader("Certifications");
      doc.fontSize(12).font("Times-Roman").fillColor("#000000");
      const titles = resumeContent.certifications.map((c: any) => c.title).filter(Boolean);
      if (titles.length) {
        doc.list(titles, { bulletRadius: 2, textIndent: 10, width: contentWidth });
      }
      doc.moveDown(0.3);
      drawLine();
      doc.moveDown(0.4);
    }

    // Footer removed: no page numbers on export

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(buffer)));
      doc.on("error", reject);
    });
  }

  async analyzeResume(userId: number, applicationId: number, resumeId: number, modelName?: string) {
    this.initializeGemini(modelName);

    // Rate limiting check
    const now = Date.now();
    const lastAnalysis = this.lastAnalysisTime.get(userId);
    
    if (lastAnalysis) {
      const timeSinceLastAnalysis = now - lastAnalysis;
      const remainingTime = this.RATE_LIMIT_MS - timeSinceLastAnalysis;
      
      if (remainingTime > 0) {
        const secondsRemaining = Math.ceil(remainingTime / 1000);
        throw new Error(`Rate limit exceeded. Please wait ${secondsRemaining} seconds before analyzing another resume.`);
      }
    }

    const [application, resume] = await Promise.all([
      prisma.jobApplication.findFirst({ where: { id: applicationId, userId } }),
      prisma.resume.findFirst({ where: { id: resumeId, userId, jobApplicationId: applicationId } })
    ]);
    if (!application) throw new Error("Job application not found");
    if (!resume) throw new Error("Resume not found");
    if (!application.jobDescription) throw new Error("Job description is missing for this application");

    const system = "You are a hiring expert. Compare the provided resume JSON against the job description. Return JSON only.";
    const analysisSchema = {
      matchScore: "number (0-100)",
      scoreBreakdown: {
        skills: "number (0-100)",
        experience: "number (0-100)",
        projects: "number (0-100)",
        summary: "number (0-100)"
      },
      missingSkills: ["string"],
      suggestions: "string"
    };

    const payload = {
      jobTitle: application.jobTitle,
      jobDescription: application.jobDescription,
      resume: typeof resume.content === 'string' ? JSON.parse(resume.content) : resume.content,
      instructions: {
        outputFormat: { type: 'json', schema: analysisSchema },
        style: { concise: true }
      }
    };

    const prompt = `${system}\n\n${JSON.stringify(payload)}`;

    try {
      const response = await this.model!.generateContent(prompt);
      const text = response.response.text();
      let content = text;
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch && jsonMatch[1]) {
        content = jsonMatch[1].trim();
      }
      const parsed = JSON.parse(content);
      const matchScore = Math.max(0, Math.min(100, Number(parsed.matchScore ?? 0)));
      const scoreBreakdown = parsed.scoreBreakdown ? JSON.stringify(parsed.scoreBreakdown) : null;
      const suggestions = parsed.suggestions || (parsed.missingSkills ? `Missing skills: ${parsed.missingSkills.join(', ')}` : null);

      // Overwrite previous analysis (effectively deleting the old reply)
      const updated = await prisma.resume.update({
        where: { id: resumeId },
        data: {
          matchScore,
          scoreBreakdown,
          suggestions
        },
        select: { id: true, matchScore: true, scoreBreakdown: true, suggestions: true, updatedAt: true }
      });

      // Update last analysis timestamp after successful completion
      this.lastAnalysisTime.set(userId, Date.now());

      return updated;
    } catch (err: any) {
      throw new Error(`Analysis failed: ${err?.message || 'Unknown error'}`);
    }
  }
}

export const resumeService = new ResumeService();