import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  createJobApplication,
  deleteJobApplication,
  getJobApplication,
  getJobApplications,
  updateJobApplication
} from "../controllers/jobApplication.controller";
import { generateResume, listResumes, getResume, importResume, deleteResume } from "../controllers/resume.controller";

const router = Router();

router.use(authenticate);

router.get("/", getJobApplications);
router.get("/:applicationId", getJobApplication);
router.post("/", createJobApplication);
router.put("/:applicationId", updateJobApplication);
router.delete("/:applicationId", deleteJobApplication);
// Resume generation and listing for an application
router.post("/:applicationId/resumes/generate", generateResume);
router.post("/:applicationId/resumes/import", importResume);
router.get("/:applicationId/resumes", listResumes);
router.get("/:applicationId/resumes/:resumeId", getResume);
router.delete("/:applicationId/resumes/:resumeId", deleteResume);

export default router;
