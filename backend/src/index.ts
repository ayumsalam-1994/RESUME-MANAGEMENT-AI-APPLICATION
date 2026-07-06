import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "path";
import type { Request, Response } from "express";

import { validateEnv, config } from "./validateEnv.js";
import { errorHandler } from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import experienceRoutes from "./routes/experience.routes.js";
import projectRoutes from "./routes/project.routes.js";
import companyRoutes from "./routes/company.routes.js";
import jobApplicationRoutes from "./routes/jobApplication.routes.js";
import certificationRoutes from "./routes/certification.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import demoRoutes from "./routes/demo.routes.js";

// Validate environment variables on startup
validateEnv();

const app = express();
const uploadsPath = path.join(__dirname, "..", "uploads");

// crossOriginResourcePolicy relaxed so the frontend (different origin) can load /uploads images
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: config.frontendOrigin,
    credentials: true
  })
);
app.use(express.json({ limit: "2mb" }));
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
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/demo", demoRoutes);

// Error handler (must be last)
app.use(errorHandler);

export default app;
