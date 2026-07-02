import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-payment-return',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="return-container">
      <div class="return-card">
        @if (status() === 'loading') {
          <div class="status-icon">⏳</div>
          <h1>Verifying payment...</h1>
          <p>Please wait while we confirm your payment.</p>
        } @else if (status() === 'success') {
          <div class="status-icon success">✓</div>
          <h1>Payment successful!</h1>
          <p>Your RoleFit subscription is now active. You have access for 30 days.</p>
          <a class="button" routerLink="/dashboard">Go to Dashboard</a>
        } @else if (status() === 'pending') {
          <div class="status-icon pending">⏳</div>
          <h1>Payment pending</h1>
          <p>Your payment is being processed. This usually takes a few minutes. Check back shortly or contact support if it takes longer.</p>
          <a class="button secondary" routerLink="/dashboard">Back to Dashboard</a>
        } @else {
          <div class="status-icon error">✗</div>
          <h1>Payment unsuccessful</h1>
          <p>Your payment did not go through. You have not been charged. Please try again.</p>
          <a class="button" routerLink="/pricing">Try again</a>
          <a class="button secondary" routerLink="/dashboard">Back to Dashboard</a>
        }
      </div>
    </div>
  `,
  styles: [`
    .return-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1rem;
    }

    .return-card {
      background: white;
      padding: 2.5rem;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      width: 100%;
      max-width: 440px;
      text-align: center;
    }

    .status-icon {
      font-size: 3.5rem;
      margin-bottom: 1rem;
    }

    .status-icon.success { color: #22c55e; }
    .status-icon.pending { color: #f59e0b; }
    .status-icon.error   { color: #ef4444; }

    h1 { margin: 0 0 0.75rem; color: #333; font-size: 1.6rem; }

    p { color: #555; margin: 0 0 1.5rem; line-height: 1.5; }

    .button {
      display: inline-block;
      padding: 0.75rem 1.75rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 0.25rem;
    }

    .button.secondary {
      background: #f0f0f0;
      color: #555;
    }

    .button:hover { opacity: 0.9; }
  `]
})
export class PaymentReturnComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private router = inject(Router);

  status = signal<'loading' | 'success' | 'pending' | 'failed'>('loading');

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.authService.getSubscriptionStatus().subscribe({
      next: (sub) => {
        if (sub.isActive) {
          this.status.set('success');
        } else if (sub.pending) {
          this.status.set('pending');
        } else {
          this.status.set('failed');
        }
      },
      error: () => this.status.set('failed')
    });
  }
}
