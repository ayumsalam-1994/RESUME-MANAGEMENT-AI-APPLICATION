import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import type { Request, Response } from "express";

import { config } from "./config.js";
import { errorHandler } from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import experienceRoutes from "./routes/experience.routes.js";
import projectRoutes from "./routes/project.routes.js";
import companyRoutes from "./routes/company.routes.js";
import jobApplicationRoutes from "./routes/jobApplication.routes.js";
import certificationRoutes from "./routes/certification.routes.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsPath = path.join(__dirname, "..", "uploads");

app.use(
  cors({
    origin: config.frontendOrigin,
    credentials: true
  })
);
app.use(express.json());
app.use("/uploads", express.static(uploadsPath));

// Routes
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/experiences", experienceRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/job-applications", jobApplicationRoutes);
app.use("/api/certifications", certificationRoutes);

// Error handler (must be last)
app.use(errorHandler);

export default app;
