import { Request, Response } from "express";
import { z } from "zod";
import { jobApplicationService } from "../services/jobApplication.service";

const JobApplicationSchema = z.object({
  companyId: z.number(),
  jobTitle: z.string().min(1),
  jobDescription: z.string().min(1),
  platform: z.string().optional(),
  applicationUrl: z.string().url().optional(),
  contactPerson: z.string().optional(),
  dateApplied: z.coerce.date().optional(),
  status: z.enum(["draft", "applied", "interviewing", "offer", "rejected", "withdrawn"]).optional(),
  notes: z.string().optional()
});

// Get all job applications for user
export async function getJobApplications(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { status } = req.query;
    
    let applications;
    if (status && typeof status === "string") {
      applications = await jobApplicationService.getApplicationsByStatus(userId, status);
    } else {
      applications = await jobApplicationService.getUserJobApplications(userId);
    }

    res.json(applications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Get single job application
export async function getJobApplication(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const applicationId = Number(req.params.applicationId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (Number.isNaN(applicationId)) {
      return res.status(400).json({ error: "Invalid application id" });
    }

    const application = await jobApplicationService.getJobApplication(applicationId, userId);
    res.json(application);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
}

// Create job application
export async function createJobApplication(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const data = JobApplicationSchema.parse(req.body);
    const application = await jobApplicationService.createJobApplication(userId, data);

    res.status(201).json(application);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// Update job application
export async function updateJobApplication(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const applicationId = Number(req.params.applicationId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (Number.isNaN(applicationId)) {
      return res.status(400).json({ error: "Invalid application id" });
    }

    const data = JobApplicationSchema.partial().parse(req.body);
    const application = await jobApplicationService.updateJobApplication(
      applicationId,
      userId,
      data
    );

    res.json(application);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// Delete job application
export async function deleteJobApplication(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const applicationId = Number(req.params.applicationId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (Number.isNaN(applicationId)) {
      return res.status(400).json({ error: "Invalid application id" });
    }

    await jobApplicationService.deleteJobApplication(applicationId, userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
