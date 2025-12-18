import type { Request } from 'express';
import type { SignOptions } from 'jsonwebtoken';

// User roles for RBAC
export enum UserRole {
  USER = "user",
  ADMIN = "admin"
}

// JWT payload structure
export interface JWTPayload {
  userId: number;
  email: string;
  role: UserRole;
}

// Sign options for JWT
export type JWTSignOptions = SignOptions;

// Auth request extending Express Request
export interface AuthRequest extends Request {
  user?: JWTPayload;
}
