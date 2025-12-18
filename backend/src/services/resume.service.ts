import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { prisma } from "../db/prisma";
import { config } from "../config";
import PDFDocument from "pdfkit";

export class ResumeService {
  private client = new OpenAI({ apiKey: config.openAiKey });

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

  async generateForApplication(userId: number, applicationId: number, jobDescriptionOverride?: string) {
    if (!config.openAiKey) {
      throw new Error("OpenAI API key is missing. Set OPENAI_API_KEY in your environment.");
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
        include: { images: { orderBy: { order: "asc" } } },
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

    const system = "You are an expert ATS resume writer. Produce a concise, ATS-safe resume JSON based on the user's profile and the job description. Avoid images, tables, and fancy formatting.";

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
        achievements: p.achievements,
        techStack: p.techStack,
        startDate: p.startDate,
        endDate: p.endDate,
        url: p.url
      }))
    };

    const prompt: ChatCompletionMessageParam[] = [
      { role: "system", content: system },
      {
        role: "user",
        content: JSON.stringify({
          instructions: {
            outputFormat: {
              type: "json",
              schema: {
                summary: "string",
                skills: "string[]",
                experience: [
                  {
                    company: "string",
                    role: "string",
                    start: "string",
                    end: "string",
                    bullets: "string[]"
                  }
                ],
                projects: [
                  {
                    title: "string",
                    description: "string",
                    tech: "string[]"
                  }
                ]
              }
            },
            style: {
              atsSafe: true,
              avoidFirstPerson: true,
              focusOnImpact: true
            }
          },
          data: userPayload
        })
      }
    ];

    let content = "{}";
    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: prompt,
        temperature: 0.2
      });
      content = completion.choices[0]?.message?.content ?? "{}";
    } catch (err: any) {
      const status = err?.status ?? err?.statusCode;
      const msg = err?.message || "Unknown OpenAI error";
      // Graceful fallback on rate limit/quota or network failures
      if (status === 429 || (typeof msg === "string" && msg.includes("quota"))) {
        const fallback = this.generateFallbackResume({ user, profile, experiences, projects, application, userSkills, jobDescription });
        content = JSON.stringify(fallback);
      } else {
        throw new Error(`OpenAI request failed: ${msg}`);
      }
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

    return resume;
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

  private generateFallbackResume({
    user,
    profile,
    experiences,
    projects,
    application,
    userSkills,
    jobDescription
  }: any) {
    const skills: string[] = Array.isArray(userSkills)
      ? userSkills.map((us: any) => us.skill?.name).filter(Boolean)
      : [];

    const projectTechs: string[] = [];
    for (const p of projects || []) {
      let tech: string[] = [];
      if (typeof p.techStack === "string") {
        try {
          const parsed = JSON.parse(p.techStack);
          if (Array.isArray(parsed)) tech = parsed.filter((x: any) => typeof x === "string");
        } catch {
          // Fallback: comma-separated string
          tech = p.techStack.split(",").map((s: string) => s.trim()).filter(Boolean);
        }
      }
      projectTechs.push(...tech);
    }
    const dedup = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

    const exp = (experiences || []).map((e: any) => ({
      company: e.company,
      role: e.position,
      start: e.startDate ? new Date(e.startDate).toISOString().split("T")[0] : "",
      end: e.current ? "Present" : e.endDate ? new Date(e.endDate).toISOString().split("T")[0] : "",
      bullets: (e.bullets || []).map((b: any) => b.content).filter(Boolean)
    }));

    const projs = (projects || []).map((p: any) => ({
      title: p.title,
      description: p.description || p.summary || "",
      tech: dedup(projectTechs)
    }));

    const summary = [
      `Target Role: ${application?.jobTitle || "N/A"}`,
      profile?.summary ? profile.summary : `Candidate: ${user?.name || "User"}. Generated from profile, experiences, and projects.`
    ].join(" | ");

    return {
      summary,
      skills: dedup([...skills, ...projectTechs]),
      experience: exp,
      projects: projs,
      meta: {
        generator: "fallback",
        reason: "openai_quota_or_rate_limit",
        timestamp: new Date().toISOString()
      }
    };
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

    // Helper: draw a horizontal line
    const drawLine = () => {
      doc.strokeColor("#cccccc").moveTo(margin, doc.y).lineTo(pageWidth - margin, doc.y).stroke();
    };

    // Header: Title (extract job title from summary)
    const titleParts = resumeContent.summary?.split(" | ") || [];
    const title = titleParts[0]?.replace("Target Role: ", "") || "Resume";
    
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#1a1a1a").text(title);
    doc.moveDown(0.3);
    
    // Summary text
    if (titleParts[1]) {
      doc.fontSize(10).font("Helvetica").fillColor("#555555");
      doc.text(titleParts[1], { width: contentWidth, align: "left" });
    }
    
    doc.moveDown(0.5);
    drawLine();
    doc.moveDown(0.8);

    // Skills Section
    if (resumeContent.skills && resumeContent.skills.length > 0) {
      doc.fontSize(12).font("Helvetica-Bold").fillColor("#000000").text("SKILLS");
      doc.moveDown(0.3);
      doc.fontSize(10).font("Helvetica").fillColor("#333333");
      
      const skillsText = resumeContent.skills.slice(0, 35).join(" • ");
      doc.text(skillsText, { width: contentWidth, align: "left", lineGap: 4 });
      
      doc.moveDown(0.6);
      drawLine();
      doc.moveDown(0.8);
    }

    // Experience Section
    if (resumeContent.experience && resumeContent.experience.length > 0) {
      doc.fontSize(12).font("Helvetica-Bold").fillColor("#000000").text("EXPERIENCE");
      doc.moveDown(0.3);

      resumeContent.experience.slice(0, 4).forEach((exp: any, index: number) => {
        // Company and Role
        doc.fontSize(11).font("Helvetica-Bold").fillColor("#000000").text(`${exp.role} at ${exp.company}`);
        
        // Dates
        doc.fontSize(9).font("Helvetica").fillColor("#666666");
        doc.text(`${exp.start} – ${exp.end || "Present"}`, { lineGap: 2 });
        
        // Bullets
        if (exp.bullets && exp.bullets.length > 0) {
          doc.moveDown(0.2);
          doc.fontSize(9).fillColor("#333333");
          exp.bullets.slice(0, 4).forEach((bullet: string) => {
            doc.text(`• ${bullet}`, { width: contentWidth - 20, indent: 20, lineGap: 3 });
          });
        }
        
        if (index < resumeContent.experience.length - 1) {
          doc.moveDown(0.4);
        } else {
          doc.moveDown(0.2);
        }
      });

      doc.moveDown(0.4);
      drawLine();
      doc.moveDown(0.8);
    }

    // Projects Section
    if (resumeContent.projects && resumeContent.projects.length > 0) {
      doc.fontSize(12).font("Helvetica-Bold").fillColor("#000000").text("PROJECTS");
      doc.moveDown(0.3);

      resumeContent.projects.slice(0, 3).forEach((proj: any, index: number) => {
        // Project Title
        doc.fontSize(11).font("Helvetica-Bold").fillColor("#000000").text(proj.title);
        
        // Description
        if (proj.description) {
          doc.fontSize(9).font("Helvetica").fillColor("#333333");
          doc.text(proj.description, { width: contentWidth, lineGap: 2 });
        }
        
        // Technologies
        if (proj.tech && proj.tech.length > 0) {
          doc.fontSize(8).fillColor("#666666");
          doc.text(`Tech: ${proj.tech.join(", ")}`, { lineGap: 1 });
        }
        
        if (index < resumeContent.projects.length - 1) {
          doc.moveDown(0.4);
        }
      });

      doc.moveDown(0.4);
    }

    // Footer with page numbers
    const pages = doc.bufferedPageRange().count;
    for (let i = 0; i < pages; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor("#999999").text(
        `Page ${i + 1} of ${pages}`,
        margin,
        doc.page.height - 30,
        { width: contentWidth, align: "center" }
      );
    }

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(buffer)));
      doc.on("error", reject);
    });
  }
}

export const resumeService = new ResumeService();