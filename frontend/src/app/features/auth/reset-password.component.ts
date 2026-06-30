import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, type AbstractControl, type ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="reset-password-container">
      <div class="reset-password-card">
        <h1>Reset Password</h1>
        <p class="subtitle">Choose a new password for your account</p>

        @if (!token()) {
          <div class="error-message">
            This reset link is missing or invalid. Please request a new one.
          </div>
          <p class="login-link">
            <a routerLink="/forgot-password">Request a new reset link</a>
          </p>
        } @else {
          @if (errorMessage()) {
            <div class="error-message">{{ errorMessage() }}</div>
          }

          @if (successMessage()) {
            <div class="success-message">{{ successMessage() }}</div>
          } @else {
            <form [formGroup]="resetPasswordForm" (ngSubmit)="onSubmit()">
              <div class="form-group">
                <label for="newPassword">New Password</label>
                <input
                  id="newPassword"
                  type="password"
                  formControlName="newPassword"
                  placeholder="Minimum 8 characters"
                  required
                />
                @if (resetPasswordForm.get('newPassword')?.invalid && resetPasswordForm.get('newPassword')?.touched) {
                  <span class="error">Password must be at least 8 characters</span>
                }
              </div>

              <div class="form-group">
                <label for="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  formControlName="confirmPassword"
                  placeholder="Re-enter new password"
                  required
                />
                @if (resetPasswordForm.errors?.['passwordMismatch'] && resetPasswordForm.get('confirmPassword')?.touched) {
                  <span class="error">Passwords do not match</span>
                }
              </div>

              <button type="submit" [disabled]="resetPasswordForm.invalid || isLoading()">
                {{ isLoading() ? 'Resetting...' : 'Reset Password' }}
              </button>
            </form>
          }

          <p class="login-link">
            <a routerLink="/login">Back to login</a>
          </p>
        }
      </div>
    </div>
  `,
  styles: [`
    .reset-password-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1rem;
    }

    .reset-password-card {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 400px;
    }

    h1 {
      margin: 0 0 0.5rem;
      color: #333;
    }

    .subtitle {
      margin: 0 0 2rem;
      color: #666;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      color: #333;
      font-weight: 500;
    }

    input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      box-sizing: border-box;
    }

    input:focus {
      outline: none;
      border-color: #667eea;
    }

    .error {
      color: #e74c3c;
      font-size: 0.875rem;
      margin-top: 0.25rem;
      display: block;
    }

    .error-message {
      background: #fee;
      color: #c33;
      padding: 0.75rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }

    .success-message {
      background: #efe;
      color: #3c3;
      padding: 0.75rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }

    button {
      width: 100%;
      padding: 0.75rem;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      font-weight: 500;
    }

    button:hover:not(:disabled) {
      background: #5568d3;
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .login-link {
      margin-top: 1.5rem;
      text-align: center;
      color: #666;
    }

    .login-link a {
      color: #667eea;
      text-decoration: none;
    }

    .login-link a:hover {
      text-decoration: underline;
    }

    @media (max-width: 768px) {
      .reset-password-container {
        padding: 0.5rem;
      }

      .reset-password-card {
        padding: 1.5rem;
      }

      h1 {
        font-size: 1.5rem;
      }

      input, button {
        font-size: 16px; /* Prevent iOS zoom */
      }
    }
  `]
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  token = signal<string | null>(null);

  resetPasswordForm = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordsMatchValidator });

  constructor() {
    this.token.set(this.route.snapshot.queryParamMap.get('token'));
  }

  onSubmit(): void {
    if (this.resetPasswordForm.invalid) return;

    const currentToken = this.token();
    if (!currentToken) return;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const { newPassword } = this.resetPasswordForm.getRawValue();

    this.authService.resetPassword(currentToken, newPassword).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.successMessage.set(`${response.message}. Redirecting to login...`);
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.error?.error || 'Failed to reset password. The link may have expired.');
      }
    });
  }
}
