import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
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
    path: '**',
    redirectTo: '/dashboard'
  }
];
