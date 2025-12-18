import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  createCompany,
  deleteCompany,
  getCompanies,
  getCompany,
  updateCompany
} from "../controllers/company.controller";

const router = Router();

router.use(authenticate);

router.get("/", getCompanies);
router.get("/:companyId", getCompany);
router.post("/", createCompany);
router.put("/:companyId", updateCompany);
router.delete("/:companyId", deleteCompany);

export default router;
