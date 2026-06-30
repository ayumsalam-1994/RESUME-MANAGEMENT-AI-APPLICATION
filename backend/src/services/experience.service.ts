import { prisma } from '../db/prisma';

export class ExperienceService {
  // Get all experiences for user
  async getUserExperiences(userId: number) {
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
  async getExperience(experienceId: number, userId: number) {
    const experience = await prisma.experience.findFirst({
      where: { id: experienceId, userId },
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
    userId: number,
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
    experienceId: number,
    userId: number,
    data: Record<string, unknown>
  ) {
    const existing = await prisma.experience.findFirst({
      where: { id: experienceId, userId },
    });
    if (!existing) {
      throw new Error('Experience not found');
    }

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
  async deleteExperience(experienceId: number, userId: number) {
    const existing = await prisma.experience.findFirst({
      where: { id: experienceId, userId },
    });
    if (!existing) {
      throw new Error('Experience not found');
    }

    await prisma.experience.delete({
      where: { id: experienceId },
    });

    return { success: true };
  }

  // Add bullet point
  async addBullet(
    experienceId: number,
    userId: number,
    data: {
      content: string;
      order?: number;
    }
  ) {
    const experience = await prisma.experience.findFirst({
      where: { id: experienceId, userId },
    });
    if (!experience) {
      throw new Error('Experience not found');
    }

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
    bulletId: number,
    userId: number,
    data: {
      content?: string;
      order?: number;
    }
  ) {
    const existing = await prisma.experienceBullet.findFirst({
      where: { id: bulletId, experience: { userId } },
    });
    if (!existing) {
      throw new Error('Bullet not found');
    }

    const bullet = await prisma.experienceBullet.update({
      where: { id: bulletId },
      data,
    });

    return bullet;
  }

  // Delete bullet
  async deleteBullet(bulletId: number, userId: number) {
    const existing = await prisma.experienceBullet.findFirst({
      where: { id: bulletId, experience: { userId } },
    });
    if (!existing) {
      throw new Error('Bullet not found');
    }

    await prisma.experienceBullet.delete({
      where: { id: bulletId },
    });

    return { success: true };
  }

  // Reorder bullets
  async reorderBullets(
    experienceId: number,
    userId: number,
    bulletIds: number[]
  ) {
    const experience = await prisma.experience.findFirst({
      where: { id: experienceId, userId },
    });
    if (!experience) {
      throw new Error('Experience not found');
    }

    // Update order for each bullet, scoped to this experience so a foreign bulletId is silently ignored
    const updates = bulletIds.map((id, index) =>
      prisma.experienceBullet.updateMany({
        where: { id, experienceId },
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
  async getExperiencesByCompany(userId: number, company: string) {
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
