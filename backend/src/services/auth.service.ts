import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";

import { config } from "../config.js";
import type { JWTPayload } from "../types/auth.js";

const SALT_ROUNDS = 10;

export class AuthService {
  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compare plain password with hashed password
   */
  static async comparePasswords(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Generate JWT access token
   */
  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtAccessExpires
    } as SignOptions);
  }

  /**
   * Generate JWT refresh token
   */
  static generateRefreshToken(payload: JWTPayload): string {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtRefreshExpires
    } as SignOptions);
  }

  /**
   * Verify and decode JWT token
   */
  static verifyToken(token: string): JWTPayload {
    return jwt.verify(token, config.jwtSecret) as JWTPayload;
  }
}
