import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { prisma } from "../db/prisma";
import { config } from "../config";

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
}

export const resumeService = new ResumeService();