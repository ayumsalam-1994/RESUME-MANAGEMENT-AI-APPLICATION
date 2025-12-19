import { Request, Response } from 'express';
import { profileService } from '../services/profile.service';
import { z } from 'zod';

// Zod schemas for validation
const ProfileUpdateSchema = z.object({
  phone: z.string().optional(),
  linkedin: z.string().url().optional(),
  github: z.string().url().optional(),
  portfolio: z.string().url().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  name: z.string().min(1).optional(),
});

const EducationSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().min(1),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  current: z.boolean().optional().default(false),
});

const SkillSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
});

// Get user profile
export async function getProfile(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const profile = await profileService.getProfile(userId);
    res.json(profile);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
}

// Update profile
export async function updateProfile(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = ProfileUpdateSchema.parse(req.body);
    const { name, ...profileData } = parsed;

    await profileService.upsertProfile(userId, profileData);

    if (name && name.trim()) {
      await profileService.updateUserName(userId, name.trim());
    }

    const profile = await profileService.getProfile(userId);
    res.json(profile);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// Get user education
export async function getUserEducation(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const education = await profileService.getUserEducation(userId);
    res.json(education);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Add education
export async function addEducation(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validated = EducationSchema.parse(req.body);
    const data = {
      institution: validated.institution,
      degree: validated.degree,
      field: validated.field,
      startDate: new Date(validated.startDate),
      endDate: validated.endDate ? new Date(validated.endDate) : null,
      current: validated.current ?? false,
    };
    const education = await profileService.addEducation(userId, data);

    res.status(201).json(education);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// Update education
export async function updateEducation(req: Request, res: Response) {
  try {
    const educationId = Number(req.params.educationId);
    if (Number.isNaN(educationId)) {
      return res.status(400).json({ error: 'Invalid education id' });
    }

    const validated = EducationSchema.partial().parse(req.body);
    const data: any = {};
    if (validated.institution !== undefined) data.institution = validated.institution;
    if (validated.degree !== undefined) data.degree = validated.degree;
    if (validated.field !== undefined) data.field = validated.field;
    if (validated.startDate) {
      data.startDate = new Date(validated.startDate);
    }
    if (validated.endDate !== undefined) {
      data.endDate = validated.endDate ? new Date(validated.endDate) : null;
    }
    if (validated.current !== undefined) {
      data.current = validated.current;
    }

    const education = await profileService.updateEducation(educationId, data);
    res.json(education);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// Delete education
export async function deleteEducation(req: Request, res: Response) {
  try {
    const educationId = Number(req.params.educationId);
    if (Number.isNaN(educationId)) {
      return res.status(400).json({ error: 'Invalid education id' });
    }

    await profileService.deleteEducation(educationId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Get user skills
export async function getUserSkills(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const skills = await profileService.getUserSkills(userId);
    res.json(skills);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Add skill to user
export async function addSkill(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = SkillSchema.parse(req.body);
    const userSkill = await profileService.addSkill(userId, data);

    res.status(201).json(userSkill);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// Remove skill from user
export async function removeSkill(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const skillId = Number(req.params.skillId);
    if (Number.isNaN(skillId)) {
      return res.status(400).json({ error: 'Invalid skill id' });
    }

    await profileService.removeSkill(userId, skillId);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Search skills
export async function searchSkills(req: Request, res: Response) {
  try {
    const { query, category } = req.query;
    const skills = await profileService.searchSkills(
      (query as string) || '',
      (category as string) || undefined
    );

    res.json(skills);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Get skill categories
export async function getSkillCategories(req: Request, res: Response) {
  try {
    const categories = await profileService.getSkillCategories();
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
