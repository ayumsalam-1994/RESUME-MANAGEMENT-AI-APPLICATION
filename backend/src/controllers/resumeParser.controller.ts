import type { Request, Response } from "express";
import { parseAndPopulate } from "../services/resumeParser.service.js";
import type { AuthRequest } from "../types/auth.js";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

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

    const result = await parseAndPopulate(userId, file.buffer, file.mimetype);

    res.json({
      message: "Resume parsed and profile populated successfully.",
      result
    });
  } catch (error: any) {
    const msg: string = error?.message ?? "Failed to parse resume";
    const status = msg.includes("Unsupported") || msg.includes("Could not extract") ? 400 : 500;
    res.status(status).json({ error: msg });
  }
}
