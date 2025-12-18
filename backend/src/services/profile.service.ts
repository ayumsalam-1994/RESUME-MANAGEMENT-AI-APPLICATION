import { prisma } from '../db/prisma';
import { Prisma } from '@prisma/client';

export class ProfileService {
  // Get user profile with all related data
  async getProfile(userId: string) {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        education: {
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
    userId: string,
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
        education: {
          orderBy: { startDate: 'desc' },
        },
      },
    });

    return profile;
  }

  // Add education
  async addEducation(
    userId: string,
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
        ...data,
        profileId: profile.id,
      },
    });

    return education;
  }

  // Update education
  async updateEducation(educationId: string, data: Record<string, unknown>) {
    const education = await prisma.education.update({
      where: { id: educationId },
      data,
    });

    return education;
  }

  // Delete education
  async deleteEducation(educationId: string) {
    await prisma.education.delete({
      where: { id: educationId },
    });

    return { success: true };
  }

  // Get all education for user
  async getUserEducation(userId: string) {
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
  async addSkill(userId: string, skillData: { name: string; category?: string; level: string }) {
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
  async removeSkill(userId: string, skillId: string) {
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
  async getUserSkills(userId: string) {
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
    const skills = await prisma.skill.findMany({
      where: {
        AND: [
          query ? { name: { contains: query, mode: 'insensitive' } } : {},
          category ? { category } : {},
        ],
      },
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

    return categories.map((c: { category: string }) => c.category);
  }
}

export const profileService = new ProfileService();
