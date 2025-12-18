import { Request, Response } from 'express';
import { experienceService } from '../services/experience.service';
import { z } from 'zod';

// Zod schemas for validation
const ExperienceSchema = z.object({
  company: z.string().min(1),
  position: z.string().min(1),
  location: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  current: z.boolean().default(false),
  description: z.string().optional(),
});

const BulletSchema = z.object({
  content: z.string().min(1),
  order: z.number().optional(),
});

const ReorderSchema = z.object({
  bulletIds: z.array(z.number()),
});

// Get all experiences for user
export async function getUserExperiences(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const experiences = await experienceService.getUserExperiences(userId);
    res.json(experiences);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Get single experience
export async function getExperience(req: Request, res: Response) {
  try {
    const experienceId = Number(req.params.experienceId);
    if (Number.isNaN(experienceId)) {
      return res.status(400).json({ error: 'Invalid experience id' });
    }

    const experience = await experienceService.getExperience(experienceId);
    res.json(experience);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
}

// Create experience
export async function createExperience(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = ExperienceSchema.parse(req.body);
    const experience = await experienceService.createExperience(userId, data);

    res.status(201).json(experience);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// Update experience
export async function updateExperience(req: Request, res: Response) {
  try {
    const experienceId = Number(req.params.experienceId);
    if (Number.isNaN(experienceId)) {
      return res.status(400).json({ error: 'Invalid experience id' });
    }

    const data = ExperienceSchema.partial().parse(req.body);

    const experience = await experienceService.updateExperience(
      experienceId,
      data
    );
    res.json(experience);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// Delete experience
export async function deleteExperience(req: Request, res: Response) {
  try {
    const experienceId = Number(req.params.experienceId);
    if (Number.isNaN(experienceId)) {
      return res.status(400).json({ error: 'Invalid experience id' });
    }

    await experienceService.deleteExperience(experienceId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Add bullet point
export async function addBullet(req: Request, res: Response) {
  try {
    const experienceId = Number(req.params.experienceId);
    if (Number.isNaN(experienceId)) {
      return res.status(400).json({ error: 'Invalid experience id' });
    }

    const data = BulletSchema.parse(req.body);

    const bullet = await experienceService.addBullet(experienceId, data);
    res.status(201).json(bullet);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// Update bullet
export async function updateBullet(req: Request, res: Response) {
  try {
    const bulletId = Number(req.params.bulletId);
    if (Number.isNaN(bulletId)) {
      return res.status(400).json({ error: 'Invalid bullet id' });
    }

    const data = BulletSchema.partial().parse(req.body);

    const bullet = await experienceService.updateBullet(bulletId, data);
    res.json(bullet);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// Delete bullet
export async function deleteBullet(req: Request, res: Response) {
  try {
    const bulletId = Number(req.params.bulletId);
    if (Number.isNaN(bulletId)) {
      return res.status(400).json({ error: 'Invalid bullet id' });
    }

    await experienceService.deleteBullet(bulletId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Reorder bullets
export async function reorderBullets(req: Request, res: Response) {
  try {
    const experienceId = Number(req.params.experienceId);
    if (Number.isNaN(experienceId)) {
      return res.status(400).json({ error: 'Invalid experience id' });
    }

    const { bulletIds } = ReorderSchema.parse(req.body);

    const bullets = await experienceService.reorderBullets(
      experienceId,
      bulletIds
    );
    res.json(bullets);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}
