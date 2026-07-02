import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="pricing-page">
      <header class="hero">
        <h1>RoleFit</h1>
        <p class="tagline">Tailor your resume for every job — powered by AI</p>
      </header>

      <section class="plan-card">
        <div class="plan-badge">Most Popular</div>
        <h2 class="plan-name">Monthly Access</h2>
        <div class="plan-price">
          <span class="currency">RM</span>
          <span class="amount">29</span>
          <span class="period">/ month</span>
        </div>

        <ul class="features">
          <li>AI-powered resume tailoring to any job description</li>
          <li>Up to 30 AI generations per month</li>
          <li>AI match score & gap analysis</li>
          <li>PDF resume export</li>
          <li>Job application tracker</li>
          <li>Unlimited profile & experience editing</li>
        </ul>

        @if (errorMessage()) {
          <div class="error-message">{{ errorMessage() }}</div>
        }

        <button class="cta-button" [disabled]="isLoading()" (click)="subscribe()">
          {{ isLoading() ? 'Redirecting to payment...' : 'Subscribe Now' }}
        </button>

        <p class="legal-note">
          By subscribing you agree to our
          <a routerLink="/terms">Terms of Service</a>,
          <a routerLink="/privacy">Privacy Policy</a>, and
          <a routerLink="/refund">Refund Policy</a>.
        </p>
      </section>

      <section class="faq">
        <h3>Frequently Asked Questions</h3>
        <div class="faq-item">
          <strong>What payment methods are accepted?</strong>
          <p>Online banking (FPX) via ToyyibPay — all Malaysian banks supported.</p>
        </div>
        <div class="faq-item">
          <strong>Can I cancel anytime?</strong>
          <p>Yes. Your access continues until the end of the paid month. See our <a routerLink="/refund">Refund Policy</a> for details.</p>
        </div>
        <div class="faq-item">
          <strong>What is the AI generation limit?</strong>
          <p>30 AI resume generations or analyses per billing month — more than enough for an active job search.</p>
        </div>
      </section>

      <footer class="footer">
        <a routerLink="/login">Login</a> ·
        <a routerLink="/register">Register</a> ·
        <a routerLink="/terms">Terms</a> ·
        <a routerLink="/privacy">Privacy</a>
      </footer>
    </div>
  `,
  styles: [`
    .pricing-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem 1rem;
      font-family: sans-serif;
    }

    .hero {
      text-align: center;
      color: white;
      margin-bottom: 2rem;
    }

    .hero h1 {
      font-size: 2.5rem;
      margin: 0 0 0.5rem;
      font-weight: 700;
    }

    .tagline {
      font-size: 1.1rem;
      opacity: 0.9;
      margin: 0;
    }

    .plan-card {
      background: white;
      border-radius: 12px;
      padding: 2.5rem;
      max-width: 480px;
      margin: 0 auto 2rem;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      position: relative;
    }

    .plan-badge {
      position: absolute;
      top: -14px;
      left: 50%;
      transform: translateX(-50%);
      background: #f59e0b;
      color: white;
      padding: 0.25rem 1rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .plan-name {
      text-align: center;
      font-size: 1.4rem;
      color: #333;
      margin: 0 0 1rem;
    }

    .plan-price {
      text-align: center;
      margin-bottom: 1.5rem;
      color: #667eea;
    }

    .currency {
      font-size: 1.4rem;
      font-weight: 600;
      vertical-align: top;
      margin-top: 0.4rem;
      display: inline-block;
    }

    .amount {
      font-size: 4rem;
      font-weight: 800;
      line-height: 1;
    }

    .period {
      font-size: 1rem;
      color: #888;
    }

    .features {
      list-style: none;
      padding: 0;
      margin: 0 0 1.5rem;
    }

    .features li {
      padding: 0.5rem 0;
      border-bottom: 1px solid #f0f0f0;
      color: #444;
    }

    .features li::before {
      content: '✓ ';
      color: #22c55e;
      font-weight: 700;
    }

    .error-message {
      background: #fee;
      color: #c33;
      padding: 0.75rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }

    .cta-button {
      width: 100%;
      padding: 1rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      margin-bottom: 1rem;
    }

    .cta-button:hover:not(:disabled) {
      opacity: 0.9;
    }

    .cta-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .legal-note {
      font-size: 0.75rem;
      color: #888;
      text-align: center;
    }

    .legal-note a {
      color: #667eea;
      text-decoration: none;
    }

    .faq {
      max-width: 480px;
      margin: 0 auto 2rem;
      color: white;
    }

    .faq h3 {
      margin-bottom: 1rem;
    }

    .faq-item {
      background: rgba(255,255,255,0.15);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 0.75rem;
    }

    .faq-item strong {
      display: block;
      margin-bottom: 0.25rem;
    }

    .faq-item p { margin: 0; opacity: 0.9; font-size: 0.9rem; }

    .faq-item a { color: #fde68a; }

    .footer {
      text-align: center;
      color: rgba(255,255,255,0.7);
      font-size: 0.9rem;
    }

    .footer a {
      color: rgba(255,255,255,0.85);
      text-decoration: none;
      margin: 0 0.25rem;
    }

    .footer a:hover { text-decoration: underline; }

    @media (max-width: 520px) {
      .plan-card { padding: 2rem 1.25rem; }
      .hero h1 { font-size: 2rem; }
      .amount { font-size: 3rem; }
    }
  `]
})
export class PricingComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal(false);
  errorMessage = signal('');

  subscribe(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/register']);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const user = this.authService.currentUser();
    const name = user?.name || user?.email || '';

    this.authService.subscribe(name).subscribe({
      next: (result) => {
        window.location.href = result.redirectUrl;
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to start payment. Please try again.');
      }
    });
  }
}
