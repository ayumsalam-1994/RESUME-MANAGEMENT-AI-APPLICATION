import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  createJobApplication,
  deleteJobApplication,
  getJobApplication,
  getJobApplications,
  updateJobApplication
} from "../controllers/jobApplication.controller";

const router = Router();

router.use(authenticate);

router.get("/", getJobApplications);
router.get("/:applicationId", getJobApplication);
router.post("/", createJobApplication);
router.put("/:applicationId", updateJobApplication);
router.delete("/:applicationId", deleteJobApplication);

export default router;
