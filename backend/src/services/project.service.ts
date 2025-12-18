import { prisma } from "../db/prisma";

export class ProjectService {
  // Fetch all projects for a user (optionally include archived)
  async getUserProjects(userId: number, includeArchived = false) {
    const projects = await prisma.project.findMany({
      where: {
        userId,
        ...(includeArchived ? {} : { archived: false })
      },
      include: {
        images: {
          orderBy: { order: "asc" }
        }
      },
      orderBy: { order: "asc" }
    });

    return projects;
  }

  // Fetch single project (with ownership check)
  async getProject(projectId: number, userId: number) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        images: {
          orderBy: { order: "asc" }
        }
      }
    });

    if (!project) {
      throw new Error("Project not found");
    }

    return project;
  }

  // Create project with optional images
  async createProject(
    userId: number,
    data: {
      title: string;
      summary?: string;
      description?: string;
      role?: string;
      achievements?: string;
      techStack?: string;
      startDate?: Date;
      endDate?: Date;
      url?: string;
      archived?: boolean;
      order?: number;
      images?: { url: string; caption?: string; order?: number }[];
    }
  ) {
    const maxOrder = await prisma.project.findFirst({
      where: { userId },
      orderBy: { order: "desc" },
      select: { order: true }
    });

    const order = data.order ?? (maxOrder?.order ?? -1) + 1;

    const project = await prisma.project.create({
      data: {
        ...data,
        order,
        userId,
        images: data.images
          ? {
              create: data.images.map((img, index) => ({
                url: img.url,
                caption: img.caption,
                order: img.order ?? index
              }))
            }
          : undefined
      },
      include: {
        images: {
          orderBy: { order: "asc" }
        }
      }
    });

    return project;
  }

  // Update project (with ownership check)
  async updateProject(projectId: number, userId: number, data: Record<string, unknown>) {
    const exists = await prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!exists) {
      throw new Error("Project not found");
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data,
      include: {
        images: {
          orderBy: { order: "asc" }
        }
      }
    });

    return project;
  }

  // Archive/unarchive project
  async setArchived(projectId: number, userId: number, archived: boolean) {
    return this.updateProject(projectId, userId, { archived });
  }

  // Delete project (cascades to images)
  async deleteProject(projectId: number, userId: number) {
    const exists = await prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!exists) {
      throw new Error("Project not found");
    }

    await prisma.project.delete({ where: { id: projectId } });
    return { success: true };
  }

  // Add image to project
  async addImage(
    projectId: number,
    userId: number,
    data: { url: string; caption?: string; order?: number }
  ) {
    const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) {
      throw new Error("Project not found");
    }

    const maxOrder = await prisma.projectImage.findFirst({
      where: { projectId },
      orderBy: { order: "desc" },
      select: { order: true }
    });

    const order = data.order ?? (maxOrder?.order ?? -1) + 1;

    const image = await prisma.projectImage.create({
      data: {
        projectId,
        url: data.url,
        caption: data.caption,
        order
      }
    });

    return image;
  }

  // Delete image
  async deleteImage(imageId: number, userId: number) {
    const image = await prisma.projectImage.findFirst({
      where: { id: imageId, project: { userId } },
      select: { id: true }
    });

    if (!image) {
      throw new Error("Image not found");
    }

    await prisma.projectImage.delete({ where: { id: imageId } });
    return { success: true };
  }

  // Reorder images
  async reorderImages(projectId: number, userId: number, imageIds: number[]) {
    const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) {
      throw new Error("Project not found");
    }

    const updates = imageIds.map((id, index) =>
      prisma.projectImage.update({
        where: { id },
        data: { order: index }
      })
    );

    await prisma.$transaction(updates);

    const images = await prisma.projectImage.findMany({
      where: { projectId },
      orderBy: { order: "asc" }
    });

    return images;
  }

  // Reorder projects for a user
  async reorderProjects(userId: number, projectIds: number[]) {
    const updates = projectIds.map((id, index) =>
      prisma.project.updateMany({
        where: { id, userId },
        data: { order: index }
      })
    );

    await prisma.$transaction(updates);

    const projects = await prisma.project.findMany({
      where: { userId },
      include: {
        images: {
          orderBy: { order: "asc" }
        }
      },
      orderBy: { order: "asc" }
    });

    return projects;
  }
}

export const projectService = new ProjectService();
