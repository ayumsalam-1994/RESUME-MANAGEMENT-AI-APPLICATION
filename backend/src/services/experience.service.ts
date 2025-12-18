import { prisma } from '../db/prisma';

export class ExperienceService {
  // Get all experiences for user
  async getUserExperiences(userId: string) {
    const experiences = await prisma.experience.findMany({
      where: { userId },
      include: {
        bullets: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return experiences;
  }

  // Get single experience with bullets
  async getExperience(experienceId: string) {
    const experience = await prisma.experience.findUnique({
      where: { id: experienceId },
      include: {
        bullets: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!experience) {
      throw new Error('Experience not found');
    }

    return experience;
  }

  // Create experience
  async createExperience(
    userId: string,
    data: {
      company: string;
      position: string;
      location?: string;
      startDate: Date;
      endDate?: Date;
      current: boolean;
      description?: string;
    }
  ) {
    const experience = await prisma.experience.create({
      data: {
        ...data,
        userId,
      },
      include: {
        bullets: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return experience;
  }

  // Update experience
  async updateExperience(
    experienceId: string,
    data: Record<string, unknown>
  ) {
    const experience = await prisma.experience.update({
      where: { id: experienceId },
      data,
      include: {
        bullets: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return experience;
  }

  // Delete experience (cascades to bullets)
  async deleteExperience(experienceId: string) {
    await prisma.experience.delete({
      where: { id: experienceId },
    });

    return { success: true };
  }

  // Add bullet point
  async addBullet(
    experienceId: string,
    data: {
      content: string;
      order?: number;
    }
  ) {
    // Get current max order
    const maxBullet = await prisma.experienceBullet.findFirst({
      where: { experienceId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const order = data.order ?? (maxBullet?.order ?? 0) + 1;

    const bullet = await prisma.experienceBullet.create({
      data: {
        experienceId,
        content: data.content,
        order,
      },
    });

    return bullet;
  }

  // Update bullet
  async updateBullet(
    bulletId: string,
    data: {
      content?: string;
      order?: number;
    }
  ) {
    const bullet = await prisma.experienceBullet.update({
      where: { id: bulletId },
      data,
    });

    return bullet;
  }

  // Delete bullet
  async deleteBullet(bulletId: string) {
    await prisma.experienceBullet.delete({
      where: { id: bulletId },
    });

    return { success: true };
  }

  // Reorder bullets
  async reorderBullets(
    experienceId: string,
    bulletIds: string[]
  ) {
    // Update order for each bullet
    const updates = bulletIds.map((id, index) =>
      prisma.experienceBullet.update({
        where: { id },
        data: { order: index },
      })
    );

    await prisma.$transaction(updates);

    // Return reordered bullets
    const bullets = await prisma.experienceBullet.findMany({
      where: { experienceId },
      orderBy: { order: 'asc' },
    });

    return bullets;
  }

  // Get experiences by company
  async getExperiencesByCompany(userId: string, company: string) {
    const experiences = await prisma.experience.findMany({
      where: { userId, company },
      include: {
        bullets: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return experiences;
  }
}

export const experienceService = new ExperienceService();
