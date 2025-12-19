import fs from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";

import { authenticate } from "../middleware/auth.middleware";
import {
  createCertification,
  deleteCertification,
  getCertifications,
  updateCertification,
  uploadCertificationFile
} from "../controllers/certification.controller";

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
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only images or PDF files are allowed"));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

router.use(authenticate);

router.get("/", getCertifications);
router.post("/", createCertification);
router.put("/:certificationId", updateCertification);
router.delete("/:certificationId", deleteCertification);
router.post("/upload", upload.single("file"), uploadCertificationFile);

export default router;
