import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-refund',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="legal-page">
      <div class="legal-card">
        <a routerLink="/pricing" class="back-link">← Back</a>
        <h1>Refund Policy</h1>
        <p class="last-updated">Last updated: 1 July 2026</p>

        <h2>1. Subscription Terms</h2>
        <p>RoleFit subscriptions are monthly (30 days) and do not renew automatically. You pay once and get 30 days of access.</p>

        <h2>2. Refund Eligibility</h2>
        <p>We offer a <strong>full refund within 48 hours</strong> of your first payment if you have not used the AI generation feature. After 48 hours or after using AI generation, subscriptions are non-refundable.</p>

        <h2>3. How to Request a Refund</h2>
        <p>Email <a href="mailto:support@rolefit.my">support@rolefit.my</a> with your registered email address and payment reference number. We will respond within 2 business days.</p>

        <h2>4. Technical Issues</h2>
        <p>If the service is unavailable for more than 24 consecutive hours due to our fault during your subscription period, we will extend your subscription by the equivalent downtime at no extra charge.</p>

        <h2>5. Contact</h2>
        <p>Questions? Email <a href="mailto:support@rolefit.my">support@rolefit.my</a></p>
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
    p { color: #555; line-height: 1.6; }
    a { color: #667eea; }
  `]
})
export class RefundComponent {}
