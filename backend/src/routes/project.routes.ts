import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware";
import {
  addProjectImage,
  createProject,
  deleteProject,
  deleteProjectImage,
  getProject,
  getProjects,
  reorderProjectImages,
  reorderProjects,
  setArchived,
  updateProject
} from "../controllers/project.controller";

const router = Router();

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
router.delete("/images/:imageId", deleteProjectImage);
router.post("/:projectId/images/reorder", reorderProjectImages);

// Reorder projects
router.post("/reorder", reorderProjects);

export default router;
