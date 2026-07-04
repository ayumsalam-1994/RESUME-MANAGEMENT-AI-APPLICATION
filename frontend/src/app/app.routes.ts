import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing.component').then((m) => m.LandingComponent)
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register.component').then((m) => m.RegisterComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password.component').then((m) => m.ResetPasswordComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
    canActivate: [authGuard]
  },
  {
    path: 'experience',
    loadComponent: () =>
      import('./features/experience/experience.component').then((m) => m.ExperienceComponent),
    canActivate: [authGuard]
  },
  {
    path: 'projects',
    loadComponent: () =>
      import('./features/project/project.component').then((m) => m.ProjectComponent),
    canActivate: [authGuard]
  },
  {
    path: 'certifications',
    loadComponent: () =>
      import('./features/certification/certification.component').then((m) => m.CertificationComponent),
    canActivate: [authGuard]
  },
  {
    path: 'job-applications',
    loadComponent: () =>
      import('./features/job-application/job-application.component').then((m) => m.JobApplicationComponent),
    canActivate: [authGuard]
  },
  {
    path: 'applications/:id/tailor',
    loadComponent: () =>
      import('./features/tailoring-workspace/tailoring-workspace.component').then((m) => m.TailoringWorkspaceComponent),
    canActivate: [authGuard]
  },
  {
    path: 'onboarding',
    loadComponent: () =>
      import('./features/onboarding/onboarding.component').then((m) => m.OnboardingComponent),
    canActivate: [authGuard]
  },
  {
    path: 'pricing',
    loadComponent: () =>
      import('./features/pricing/pricing.component').then((m) => m.PricingComponent)
  },
  {
    path: 'payment/return',
    loadComponent: () =>
      import('./features/payment/payment-return.component').then((m) => m.PaymentReturnComponent),
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin.component').then((m) => m.AdminComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('./features/legal/terms.component').then((m) => m.TermsComponent)
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./features/legal/privacy.component').then((m) => m.PrivacyComponent)
  },
  {
    path: 'refund',
    loadComponent: () =>
      import('./features/legal/refund.component').then((m) => m.RefundComponent)
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
