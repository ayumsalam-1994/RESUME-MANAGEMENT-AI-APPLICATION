import fs from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";

import { authenticate } from "../middleware/auth.middleware";
import {
  addProjectImage,
  addProjectImageUpload,
  createProject,
  deleteProject,
  deleteProjectImage,
  getProject,
  getProjects,
  reorderProjectImages,
  addProjectBullet,
  updateProjectBullet,
  deleteProjectBullet,
  reorderProjectBullets,
  reorderProjects,
  setArchived,
  updateProject
} from "../controllers/project.controller";

const router = Router();
const uploadsDir = path.join(process.cwd(), "uploads");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${timestamp}-${safeName}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image uploads are allowed"));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// All project routes require authentication
router.use(authenticate);

// Project routes
router.get("/", getProjects);
router.get("/:projectId", getProject);
router.post("/", createProject);
router.put("/:projectId", updateProject);
router.delete("/:projectId", deleteProject);
router.patch("/:projectId/archive", setArchived);

// Image routes
router.post("/:projectId/images", addProjectImage);
router.post("/:projectId/images/upload", upload.single("image"), addProjectImageUpload);
router.delete("/images/:imageId", deleteProjectImage);
router.post("/:projectId/images/reorder", reorderProjectImages);

// Bullet routes
router.post("/:projectId/bullets", addProjectBullet);
router.put("/bullets/:bulletId", updateProjectBullet);
router.delete("/bullets/:bulletId", deleteProjectBullet);
router.post("/:projectId/bullets/reorder", reorderProjectBullets);

// Reorder projects
router.post("/reorder", reorderProjects);

export default router;
