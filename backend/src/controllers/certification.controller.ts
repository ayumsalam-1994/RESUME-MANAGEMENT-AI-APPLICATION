import { Request, Response } from "express";
import { z } from "zod";

import { certificationService } from "../services/certification.service";

const CertificationSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  fileUrl: z.string().url().optional()
});

export async function getCertifications(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const items = await certificationService.getUserCertifications(userId);
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function createCertification(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const data = CertificationSchema.parse(req.body);
    const cert = await certificationService.createCertification(userId, data);
    res.status(201).json(cert);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

export async function updateCertification(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const certificationId = Number(req.params.certificationId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (Number.isNaN(certificationId)) {
      return res.status(400).json({ error: "Invalid certification id" });
    }

    const data = CertificationSchema.partial().parse(req.body);
    const cert = await certificationService.updateCertification(certificationId, userId, data);
    res.json(cert);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
}

export async function deleteCertification(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const certificationId = Number(req.params.certificationId);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (Number.isNaN(certificationId)) {
      return res.status(400).json({ error: "Invalid certification id" });
    }

    await certificationService.deleteCertification(certificationId, userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function uploadCertificationFile(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ error: "File is required" });
    }

    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
    res.status(201).json({ fileUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
