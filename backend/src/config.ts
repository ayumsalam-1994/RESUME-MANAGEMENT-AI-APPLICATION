import dotenv from "dotenv";
import process from "process";

dotenv.config();

// Make PORT optional with default
const required = [
  "DATABASE_URL",
  "JWT_SECRET",
  "GEMINI_API_KEY",
  "FRONTEND_ORIGIN"
];

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`Warning: Missing env var: ${key}`);
  }
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  dbUrl: process.env.DATABASE_URL as string,
  jwtSecret: process.env.JWT_SECRET as string,
  geminiKey: process.env.GEMINI_API_KEY as string,
  frontendOrigin: process.env.FRONTEND_ORIGIN as string,
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || "7d",
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES || "30d"
};
