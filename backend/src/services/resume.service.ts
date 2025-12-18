import OpenAI from "openai";
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

  async generateForApplication(userId: number, applicationId: number) {
    // Gather user data
    const [user, profile, experiences, projects, application] = await Promise.all([
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
      prisma.jobApplication.findFirst({ where: { id: applicationId, userId } })
    ]);

    if (!user || !application) {
      throw new Error("Required data missing");
    }

    const system = "You are an expert ATS resume writer. Produce a concise, ATS-safe resume JSON based on the user's profile and the job description. Avoid images, tables, and fancy formatting.";

    const userPayload = {
      application: {
        jobTitle: application.jobTitle,
        jobDescription: application.jobDescription,
        platform: application.platform,
        url: application.applicationUrl
      },
      user: {
        name: user.name,
        email: user.email
      },
      profile,
      experiences: experiences.map((e) => ({
        company: e.company,
        position: e.position,
        location: e.location,
        startDate: e.startDate,
        endDate: e.endDate,
        current: e.current,
        description: e.description,
        bullets: e.bullets.map((b) => b.content)
      })),
      projects: projects.map((p) => ({
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

    const prompt = [
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

    const completion = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: prompt,
      temperature: 0.2
    });

    const content = completion.choices[0]?.message?.content ?? "{}";

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
}

export const resumeService = new ResumeService();