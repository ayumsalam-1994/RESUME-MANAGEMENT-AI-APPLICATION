import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="legal-page">
      <div class="legal-card">
        <a routerLink="/pricing" class="back-link">← Back</a>
        <h1>Privacy Policy</h1>
        <p class="last-updated">Last updated: 1 July 2026</p>

        <p>This policy explains what personal data RoleFit collects and how it is used, in compliance with Malaysia's Personal Data Protection Act 2010 (PDPA).</p>

        <h2>1. Data We Collect</h2>
        <ul>
          <li>Name, email, and password (at registration)</li>
          <li>Resume content: work history, education, projects, skills, certifications</li>
          <li>Job descriptions you enter for tailoring</li>
          <li>Payment status (via ToyyibPay — we do not store card/bank details)</li>
        </ul>

        <h2>2. How We Use Your Data</h2>
        <ul>
          <li>To provide the resume-tailoring service</li>
          <li>To send transactional emails (password reset, payment confirmation)</li>
          <li>To enforce subscription and usage limits</li>
        </ul>

        <h2>3. AI Processing</h2>
        <p>Your resume content and job descriptions are sent to Google Gemini AI to generate tailored resumes. Google's privacy policy governs their handling of this data.</p>

        <h2>4. Data Sharing</h2>
        <p>We do not sell your data. We share data only with service providers necessary to operate RoleFit (Google Gemini, ToyyibPay, Resend).</p>

        <h2>5. Data Retention</h2>
        <p>Your data is retained for as long as your account is active. You may request deletion by contacting us.</p>

        <h2>6. Your Rights</h2>
        <p>Under PDPA, you have the right to access and correct your personal data. Contact us at <a href="mailto:support@rolefit.my">support@rolefit.my</a> to exercise these rights.</p>

        <h2>7. Security</h2>
        <p>We use industry-standard security (HTTPS, hashed passwords, JWT authentication). No system is 100% secure.</p>
      </div>
    </div>
  `,
  styles: [`
    .legal-page {
      min-height: 100vh;
      background: #f5f7fa;
      padding: 2rem 1rem;
    }
    .legal-card {
      max-width: 680px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .back-link { color: #667eea; text-decoration: none; font-size: 0.9rem; }
    h1 { margin: 1rem 0 0.25rem; }
    .last-updated { color: #888; font-size: 0.85rem; margin: 0 0 2rem; }
    h2 { color: #333; font-size: 1.1rem; margin-top: 1.5rem; }
    p, li { color: #555; line-height: 1.6; }
    a { color: #667eea; }
    ul { padding-left: 1.25rem; }
  `]
})
export class PrivacyComponent {}
