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

    const system = "You are an expert ATS resume writer. Produce a concise, ATS-safe resume JSON based on the user's profile and the job description. Avoid images, tables, and fancy formatting. Use month-year date strings (e.g., Jan 2024).";

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

    const prompt: ChatCompletionMessageParam[] = [
      { role: "system", content: system },
      {
        role: "user",
        content: JSON.stringify({
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
    userSkills
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

    const toMonthYear = (date?: string | null, current?: boolean) => {
      if (current) return "Present";
      if (!date) return "";
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    };

    const exp = (experiences || []).map((e: any) => ({
      company: e.company,
      role: e.position,
      start: toMonthYear(e.startDate),
      end: toMonthYear(e.endDate, e.current),
      bullets: (e.bullets || []).map((b: any) => b.content).filter(Boolean)
    }));

    const projs = (projects || []).map((p: any) => ({
      title: p.title,
      start: toMonthYear(p.startDate),
      end: toMonthYear(p.endDate),
      bullets: (p as any).bullets ? (p as any).bullets.map((b: any) => b.content) : [],
      tech: dedup(projectTechs)
    }));

    const education = (profile?.educations || []).map((edu: any) => ({
      degree: edu.degree,
      field: edu.field,
      institution: edu.institution,
      start: toMonthYear(edu.startDate),
      end: toMonthYear(edu.endDate, edu.current)
    }));

    const summary = profile?.summary
      ? profile.summary
      : `Target Role: ${application?.jobTitle || "N/A"}. Generated from available profile, experiences, and projects.`;

    return {
      name: user?.name || "Candidate",
      contact: {
        location: profile?.location || "",
        phone: profile?.phone || "",
        email: profile?.email || user?.email || "",
        linkedin: profile?.linkedin || "",
        github: profile?.github || "",
        portfolio: profile?.portfolio || ""
      },
      summary,
      skills: dedup([...skills, ...projectTechs]),
      projects: projs,
      experience: exp,
      education,
      certifications: [],
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
      drawLine();
      doc.moveDown(0.4);
    }

    // Projects
    if (resumeContent.projects && resumeContent.projects.length > 0) {
      sectionHeader("Projects");
      doc.fontSize(12).font("Times-Roman").fillColor("#000000");
      resumeContent.projects.forEach((proj: any) => {
        const headerRight = [proj.start, proj.end].filter(Boolean).join(" | ");
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
        const right = [exp.start, exp.end].filter(Boolean).join(" | ");
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
        const right = [edu.institution, [edu.start, edu.end].filter(Boolean).join(" | ")].filter(Boolean).join(" | ");
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