import { prisma } from '../db/prisma';
import { Prisma } from '@prisma/client';

export class ProfileService {
  // Get user profile with all related data
  async getProfile(userId: number) {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        educations: {
          orderBy: { startDate: 'desc' },
        },
        user: {
          select: { id: true, email: true, name: true, role: true },
        },
      },
    });

    if (!profile) {
      throw new Error('Profile not found');
    }

    return profile;
  }

  // Create or update profile
  async upsertProfile(
    userId: number,
    data: Record<string, unknown>
  ) {
    const profile = await prisma.profile.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
      include: {
        educations: {
          orderBy: { startDate: 'desc' },
        },
        user: {
          select: { id: true, email: true, name: true, role: true },
        },
      },
    });

    return profile;
  }

  // Add education
  async addEducation(
    userId: number,
    data: Record<string, unknown>
  ) {
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new Error('Profile not found. Create profile first.');
    }

    const education = await prisma.education.create({
      data: {
        profileId: profile.id,
        ...data,
      } as any,
    });

    return education;
  }

  // Update education
  async updateEducation(educationId: number, data: Record<string, unknown>) {
    const education = await prisma.education.update({
      where: { id: educationId },
      data,
    });

    return education;
  }

  // Delete education
  async deleteEducation(educationId: number) {
    await prisma.education.delete({
      where: { id: educationId },
    });

    return { success: true };
  }

  // Get all education for user
  async getUserEducation(userId: number) {
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new Error('Profile not found');
    }

    const education = await prisma.education.findMany({
      where: { profileId: profile.id },
      orderBy: { startDate: 'desc' },
    });

    return education;
  }

  // Add skill to user
  async addSkill(userId: number, skillData: { name: string; category?: string; level: string }) {
    // Get or create skill
    let skill = await prisma.skill.findUnique({
      where: { name: skillData.name },
    });

    if (!skill) {
      skill = await prisma.skill.create({
        data: {
          name: skillData.name,
          category: skillData.category || 'General',
        },
      });
    }

    // Add to user (upsert to handle duplicates)
    const userSkill = await prisma.userSkill.upsert({
      where: {
        userId_skillId: {
          userId,
          skillId: skill.id,
        },
      },
      update: { level: skillData.level },
      create: {
        userId,
        skillId: skill.id,
        level: skillData.level,
      },
    });

    return userSkill;
  }

  // Remove skill from user
  async removeSkill(userId: number, skillId: number) {
    await prisma.userSkill.delete({
      where: {
        userId_skillId: {
          userId,
          skillId,
        },
      },
    });

    return { success: true };
  }

  // Get all user skills
  async getUserSkills(userId: number) {
    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: {
        skill: true,
      },
      orderBy: {
        skill: { name: 'asc' },
      },
    });

    return userSkills;
  }

  // Search skills by category or name
  async searchSkills(query: string, category?: string) {
    const whereConditions: any = {};
    if (query) {
      whereConditions.name = { contains: query };
    }
    if (category) {
      whereConditions.category = category;
    }

    const skills = await prisma.skill.findMany({
      where: whereConditions,
      orderBy: { name: 'asc' },
      take: 20,
    });

    return skills;
  }

  // Get skill categories
  async getSkillCategories() {
    const categories = await prisma.skill.findMany({
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });

    return categories.map((c) => c.category).filter((cat): cat is string => cat !== null);
  }

  async updateUserName(userId: number, name: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { name },
      select: { id: true, email: true, name: true, role: true },
    });
  }
}

export const profileService = new ProfileService();
