import type { Request, Response } from "express";
import { checkDemoRateLimit, recordDemoUsage, analyzeAtsScore } from "../services/demo.service.js";
import { AI_BUSY_MESSAGE, isAiServiceBusyError } from "../utils/aiError";

export class DemoController {
  static async analyze(req: Request, res: Response): Promise<void> {
    const { resumeText, jobDescription } = req.body as { resumeText?: string; jobDescription?: string };

    if (!resumeText?.trim() || !jobDescription?.trim()) {
      res.status(400).json({ error: "Both resumeText and jobDescription are required." });
      return;
    }
    if (resumeText.trim().length < 100) {
      res.status(400).json({ error: "Resume text is too short. Please paste your full resume." });
      return;
    }
    if (jobDescription.trim().length < 50) {
      res.status(400).json({ error: "Job description is too short." });
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const { allowed, remaining, ipHash } = await checkDemoRateLimit(ip);

    if (!allowed) {
      res.status(429).json({
        error: "You've used all your free ATS checks for today. Sign up for unlimited access.",
        code: "DEMO_RATE_LIMITED"
      });
      return;
    }

    try {
      const analysis = await analyzeAtsScore(resumeText, jobDescription);
      // Only record usage after a successful Gemini response
      await recordDemoUsage(ipHash);
      res.json({ ...analysis, remainingChecks: remaining });
    } catch (err) {
      if (isAiServiceBusyError(err)) {
        res.status(503).json({ error: AI_BUSY_MESSAGE });
        return;
      }
      const msg = err instanceof Error ? err.message : "Analysis failed. Please try again.";
      res.status(500).json({ error: msg });
    }
  }
}
