import cors from "cors";
import express from "express";
import type { Request, Response } from "express";

import { config } from "./config.js";
import { errorHandler } from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import experienceRoutes from "./routes/experience.routes.js";

const app = express();

app.use(
  cors({
    origin: config.frontendOrigin,
    credentials: true
  })
);
app.use(express.json());

// Routes
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/experiences", experienceRoutes);

// Error handler (must be last)
app.use(errorHandler);

export default app;
