import { prisma } from "../db/prisma";

export class JobApplicationService {
  // Get all job applications for a user
  async getUserJobApplications(userId: number) {
    const applications = await prisma.jobApplication.findMany({
      where: { userId },
      include: {
        company: true,
        resumes: {
          orderBy: { version: "desc" },
          take: 1
        },
        interviews: {
          orderBy: { date: "desc" }
        },
        statusHistory: {
          orderBy: { changedAt: "desc" }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    return applications;
  }

  // Get single job application
  async getJobApplication(applicationId: number, userId: number) {
    const application = await prisma.jobApplication.findFirst({
      where: { id: applicationId, userId },
      include: {
        company: true,
        resumes: {
          orderBy: { version: "desc" }
        },
        interviews: {
          orderBy: { date: "desc" }
        },
        reminders: {
          orderBy: { dueDate: "asc" }
        },
        statusHistory: {
          orderBy: { changedAt: "desc" }
        }
      }
    });

    if (!application) {
      throw new Error("Job application not found");
    }

    return application;
  }

  // Create job application
  async createJobApplication(
    userId: number,
    data: {
      companyId: number;
      jobTitle: string;
      jobDescription: string;
      platform?: string;
      applicationUrl?: string;
      contactPerson?: string;
      dateApplied?: Date;
      status?: string;
      notes?: string;
    }
  ) {
    const application = await prisma.jobApplication.create({
      data: {
        ...data,
        userId
      },
      include: {
        company: true
      }
    });

    // Create initial status history
    await prisma.statusHistory.create({
      data: {
        jobApplicationId: application.id,
        status: data.status || "draft"
      }
    });

    return application;
  }

  // Update job application
  async updateJobApplication(
    applicationId: number,
    userId: number,
    data: Record<string, unknown>
  ) {
    const exists = await prisma.jobApplication.findFirst({
      where: { id: applicationId, userId }
    });

    if (!exists) {
      throw new Error("Job application not found");
    }

    // Track status change
    if (data.status && data.status !== exists.status) {
      await prisma.statusHistory.create({
        data: {
          jobApplicationId: applicationId,
          status: data.status as string,
          notes: (data.notes as string) || undefined
        }
      });
    }

    const application = await prisma.jobApplication.update({
      where: { id: applicationId },
      data,
      include: {
        company: true,
        statusHistory: {
          orderBy: { changedAt: "desc" }
        }
      }
    });

    return application;
  }

  // Delete job application
  async deleteJobApplication(applicationId: number, userId: number) {
    const exists = await prisma.jobApplication.findFirst({
      where: { id: applicationId, userId }
    });

    if (!exists) {
      throw new Error("Job application not found");
    }

    await prisma.jobApplication.delete({
      where: { id: applicationId }
    });

    return { success: true };
  }

  // Get applications by status
  async getApplicationsByStatus(userId: number, status: string) {
    const applications = await prisma.jobApplication.findMany({
      where: { userId, status },
      include: {
        company: true
      },
      orderBy: { updatedAt: "desc" }
    });

    return applications;
  }

  // Get applications by company
  async getApplicationsByCompany(userId: number, companyId: number) {
    const applications = await prisma.jobApplication.findMany({
      where: { userId, companyId },
      include: {
        company: true
      },
      orderBy: { updatedAt: "desc" }
    });

    return applications;
  }
}

export const jobApplicationService = new JobApplicationService();
