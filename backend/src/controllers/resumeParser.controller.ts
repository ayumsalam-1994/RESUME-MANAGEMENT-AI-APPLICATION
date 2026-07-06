import type { Request, Response } from "express";
import { z } from "zod";
import { parseOnly, populateProfile } from "../services/resumeParser.service.js";
import type { AuthRequest } from "../types/auth.js";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// Loose validation — just enough to reject a malformed frontend payload, not
// to re-validate resume content quality (the data already passed through
// Gemini once when it was parsed).
const CommitResumeSchema = z.object({
  profile: z
    .object({
      phone: z.string().optional(),
      location: z.string().optional(),
      summary: z.string().optional(),
      links: z.array(z.object({ type: z.string(), url: z.string() })).optional()
    })
    .optional(),
  education: z.array(z.record(z.any())).optional(),
  experience: z.array(z.record(z.any())).optional(),
  projects: z.array(z.record(z.any())).optional(),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.record(z.any())).optional()
});

// Parse a resume upload and return the structured result for review —
// no database writes happen here.
export async function parseResume(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as unknown as AuthRequest).user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded. Please attach a PDF or DOCX." });
      return;
    }

    // Validate MIME type against the declared type (multer already checked, but double-check)
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      res.status(400).json({ error: "Only PDF and DOCX files are supported." });
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      res.status(400).json({ error: "File exceeds the 5 MB limit." });
      return;
    }

    const parsed = await parseOnly(file.buffer, file.mimetype, userId);

    res.json({
      message: "Resume parsed. Review before adding to your profile.",
      parsed
    });
  } catch (error: any) {
    const msg: string = error?.message ?? "Failed to parse resume";
    const status = msg.includes("Unsupported") || msg.includes("Could not extract") ? 400 : 500;
    res.status(status).json({ error: msg });
  }
}

// Commit the (possibly user-edited/filtered) parsed data into the user's
// profile — this is the only place that actually writes to the database.
export async function commitParsedResume(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as unknown as AuthRequest).user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const validated = CommitResumeSchema.parse(req.body ?? {});
    const result = await populateProfile(userId, {
      profile: validated.profile ?? {},
      education: (validated.education as any) ?? [],
      experience: (validated.experience as any) ?? [],
      projects: (validated.projects as any) ?? [],
      skills: validated.skills ?? [],
      certifications: (validated.certifications as any) ?? []
    });

    res.json({
      message: "Added to your profile.",
      result
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    res.status(500).json({ error: error?.message ?? "Failed to add to profile" });
  }
}
