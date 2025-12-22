import { Request, Response } from "express";
import { z } from "zod";
import { resumeService } from "../services/resume.service";

// List resumes for application
export async function listResumes(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const applicationId = Number(req.params.applicationId);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (Number.isNaN(applicationId)) return res.status(400).json({ error: "Invalid application id" });

    const resumes = await resumeService.getResumesForApplication(userId, applicationId);
    res.json(resumes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Get single resume
export async function getResume(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const resumeId = Number(req.params.resumeId);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (Number.isNaN(resumeId)) return res.status(400).json({ error: "Invalid resume id" });

    const resume = await resumeService.getResume(resumeId, userId);
    res.json(resume);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
}

// Generate resume for application
export async function generateResume(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const applicationId = Number(req.params.applicationId);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (Number.isNaN(applicationId)) return res.status(400).json({ error: "Invalid application id" });

    const bodySchema = z.object({ 
      jobDescription: z.string().min(10).optional(), 
      customPrompt: z.string().optional(),
      fallback: z.boolean().optional() 
    });
    const { jobDescription, customPrompt } = bodySchema.parse(req.body ?? {});

    const resume = await resumeService.generateForApplication(userId, applicationId, jobDescription, customPrompt);
    res.status(201).json(resume);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// Import resume from pasted JSON
export async function importResume(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const applicationId = Number(req.params.applicationId);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (Number.isNaN(applicationId)) return res.status(400).json({ error: "Invalid application id" });

    const bodySchema = z.object({ content: z.string().min(2) });
    const { content } = bodySchema.parse(req.body);

    const resume = await resumeService.importResume(userId, applicationId, content);
    res.status(201).json(resume);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// Delete resume
export async function deleteResume(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const resumeId = Number(req.params.resumeId);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (Number.isNaN(resumeId)) return res.status(400).json({ error: "Invalid resume id" });

    await resumeService.deleteResume(resumeId, userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Export resume as PDF
export async function exportResumePDF(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const resumeId = Number(req.params.resumeId);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (Number.isNaN(resumeId)) return res.status(400).json({ error: "Invalid resume id" });

    const resume = await resumeService.getResume(resumeId, userId);
    if (!resume) return res.status(404).json({ error: "Resume not found" });

    const resumeContent = typeof resume.content === "string" ? JSON.parse(resume.content) : resume.content;
    const pdfBuffer = await resumeService.generatePDF(resumeContent);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="resume-v${resume.version}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error("PDF export error:", error);
    res.status(500).json({ error: error.message });
  }
}