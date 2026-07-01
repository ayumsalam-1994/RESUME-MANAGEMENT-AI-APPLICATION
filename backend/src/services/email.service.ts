import { Resend } from "resend";

import { config } from "../config.js";

const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

export class EmailService {
  static async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    if (!resend) {
      console.warn(`RESEND_API_KEY not set - skipping password reset email to ${to}. Reset URL: ${resetUrl}`);
      return;
    }

    await resend.emails.send({
      from: config.emailFrom,
      to,
      subject: "Reset your RoleFit password",
      html: `
        <p>We received a request to reset your RoleFit password.</p>
        <p><a href="${resetUrl}">Click here to reset your password</a></p>
        <p>This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.</p>
      `
    });
  }
}
