import crypto from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../db/prisma.js";
import { config } from "../config.js";

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + (config.jwtSecret || "salt")).digest("hex");
}

export async function checkDemoRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number; ipHash: string }> {
  const ipHash = hashIp(ip);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const count = await prisma.demoUsage.count({
    where: { ipHash, createdAt: { gte: since } }
  });

  const limit = config.demoChecksPerDay;
  if (count >= limit) {
    return { allowed: false, remaining: 0, ipHash };
  }

  // Don't write the row yet — caller records it only on success
  return { allowed: true, remaining: limit - count - 1, ipHash };
}

export async function recordDemoUsage(ipHash: string): Promise<void> {
  await prisma.demoUsage.create({ data: { ipHash } });
}

export async function analyzeAtsScore(
  resumeText: string,
  jobDescription: string
): Promise<{ score: number; matched: string[]; missing: string[]; verdict: string }> {
  if (!config.geminiKey) throw new Error("Gemini API key not configured.");

  const genAI = new GoogleGenerativeAI(config.geminiKey);
  const model = genAI.getGenerativeModel({ model: config.geminiModelFree });

  const prompt = `You are an ATS (Applicant Tracking System) analyzer. Compare the resume against the job description and return ONLY valid JSON, no markdown.

{
  "score": <integer 0-100>,
  "matched": ["up to 8 specific skills/keywords from the JD found in the resume"],
  "missing": ["up to 6 important skills/keywords from the JD NOT found in the resume"],
  "verdict": "<one sentence, under 20 words, summarising the match>"
}

Rules:
- score = rough percentage of the JD's key requirements met by the resume
- matched/missing: short, concrete terms (1–3 words each) — technologies, skills, certifications, experience levels
- Return ONLY the JSON object

Job Description:
${jobDescription.slice(0, 3000)}

Resume:
${resumeText.slice(0, 5000)}`;

  const response = await model.generateContent(prompt);
  const raw = response.response.text().trim();
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();

  try {
    return JSON.parse(cleaned) as { score: number; matched: string[]; missing: string[]; verdict: string };
  } catch {
    throw new Error("Could not parse ATS analysis. Please try again.");
  }
}
