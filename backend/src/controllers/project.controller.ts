import { Request, Response } from "express";
import { z } from "zod";

import { projectService } from "../services/project.service";

const ProjectSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  role: z.string().optional(),
  achievements: z.string().optional(),
  techStack: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  url: z.string().url().optional(),
  archived: z.boolean().optional(),
  order: z.number().optional(),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        caption: z.string().optional(),
        order: z.number().optional()
      })
    )
    .optional()
});

const ProjectBulletSchema = z.object({
  content: z.string().min(1),
  order: z.number().optional()
});

const ImageSchema = z.object({
  url: z.string().url(),
  caption: z.string().optional(),
  order: z.number().optional()
});

const UploadImageSchema = z.object({
  caption: z.string().optional(),
  order: z.coerce.number().optional()
});

const ReorderSchema = z.object({
  imageIds: z.array(z.number())
});

const ProjectReorderSchema = z.object({
  projectIds: z.array(z.number())
});

const ProjectBulletReorderSchema = z.object({
  bulletIds: z.array(z.number())
});

// Get all projects for a user
export async function getProjects(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const includeArchived = req.query.archived === "true";
    const projects = await projectService.getUserProjects(userId, includeArchived);
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Get single project
export async function getProject(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const projectId = Number(req.params.projectId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (Number.isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const project = await projectService.getProject(projectId, userId);
    res.json(project);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
}

// Create project
export async function createProject(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const data = ProjectSchema.parse(req.body);
    const project = await projectService.createProject(userId, data);

    res.status(201).json(project);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// Update project
export async function updateProject(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const projectId = Number(req.params.projectId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (Number.isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const data = ProjectSchema.partial().parse(req.body);
    const project = await projectService.updateProject(projectId, userId, data);

    res.json(project);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// Add bullet point
export async function addProjectBullet(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const projectId = Number(req.params.projectId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (Number.isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const data = ProjectBulletSchema.parse(req.body);
    const bullet = await projectService.addBullet(projectId, userId, data);

    res.status(201).json(bullet);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// Update bullet
export async function updateProjectBullet(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const bulletId = Number(req.params.bulletId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (Number.isNaN(bulletId)) {
      return res.status(400).json({ error: "Invalid bullet id" });
    }

    const data = ProjectBulletSchema.partial().parse(req.body);
    const bullet = await projectService.updateBullet(bulletId, userId, data);

    res.json(bullet);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// Delete bullet
export async function deleteProjectBullet(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const bulletId = Number(req.params.bulletId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (Number.isNaN(bulletId)) {
      return res.status(400).json({ error: "Invalid bullet id" });
    }

    await projectService.deleteBullet(bulletId, userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Reorder bullets
export async function reorderProjectBullets(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const projectId = Number(req.params.projectId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (Number.isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const { bulletIds } = ProjectBulletReorderSchema.parse(req.body);
    const bullets = await projectService.reorderBullets(projectId, userId, bulletIds);

    res.json(bullets);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// Delete project
export async function deleteProject(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const projectId = Number(req.params.projectId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (Number.isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    await projectService.deleteProject(projectId, userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Archive / unarchive project
export async function setArchived(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const projectId = Number(req.params.projectId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (Number.isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const schema = z.object({ archived: z.boolean() });
    const { archived } = schema.parse(req.body);

    const project = await projectService.setArchived(projectId, userId, archived);
    res.json(project);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// Add project image
export async function addProjectImage(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const projectId = Number(req.params.projectId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (Number.isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const data = ImageSchema.parse(req.body);
    const image = await projectService.addImage(projectId, userId, data);

    res.status(201).json(image);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// Upload project image (multipart)
export async function addProjectImageUpload(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const projectId = Number(req.params.projectId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (Number.isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ error: "Image file is required" });
    }

    const { caption, order } = UploadImageSchema.parse(req.body);
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;

    const image = await projectService.addImage(projectId, userId, {
      url: fileUrl,
      caption,
      order
    });

    res.status(201).json(image);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// Delete project image
export async function deleteProjectImage(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const imageId = Number(req.params.imageId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (Number.isNaN(imageId)) {
      return res.status(400).json({ error: "Invalid image id" });
    }

    await projectService.deleteImage(imageId, userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Reorder project images
export async function reorderProjectImages(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const projectId = Number(req.params.projectId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (Number.isNaN(projectId)) {
      return res.status(400).json({ error: "Invalid project id" });
    }

    const { imageIds } = ReorderSchema.parse(req.body);
    const images = await projectService.reorderImages(projectId, userId, imageIds);

    res.json(images);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

// Reorder projects
export async function reorderProjects(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { projectIds } = ProjectReorderSchema.parse(req.body);
    const projects = await projectService.reorderProjects(userId, projectIds);

    res.json(projects);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}
