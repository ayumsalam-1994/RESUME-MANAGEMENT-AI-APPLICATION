import type { Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma.js";
import { AuthService } from "../services/auth.service.js";
import { UserRole } from "../types/auth.js";

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export class AuthController {
  /**
   * Register new user
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name } = registerSchema.parse(req.body);

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        res.status(409).json({ error: "Email already registered" });
        return;
      }

      // Hash password
      const hashedPassword = await AuthService.hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: UserRole.USER
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true
        }
      });

      res.status(201).json({
        message: "User registered successfully",
        user
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ error: "Validation error", details: error.errors });
        return;
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = loginSchema.parse(req.body);

      // Fetch user from DB
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      // Verify password
      const isValidPassword = await AuthService.comparePasswords(
        password,
        user.password
      );

      if (!isValidPassword) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      // Generate tokens
      const payload = {
        userId: user.id,
        email: user.email,
        role: user.role as UserRole
      };

      const accessToken = AuthService.generateAccessToken(payload);
      const refreshToken = AuthService.generateRefreshToken(payload);

      res.json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ error: "Validation error", details: error.errors });
        return;
      }
      console.error("Login error:", error);
      res.status(401).json({ error: "Invalid credentials" });
    }
  }

  /**
   * Get current user info (requires auth)
   */
  static async me(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true
        }
      });

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({ user });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  }

  /**
   * Refresh access token
   */
  static async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ error: "Refresh token required" });
        return;
      }

      const payload = AuthService.verifyToken(refreshToken);
      const newAccessToken = AuthService.generateAccessToken(payload);

      res.json({ accessToken: newAccessToken });
    } catch (error) {
      res.status(401).json({ error: "Invalid refresh token" });
    }
  }
}
