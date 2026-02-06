import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="dashboard">
      <nav class="navbar">
        <div class="navbar-content">
          <h1>RoleFit</h1>
          <div class="navbar-actions">
            @if (authService.currentUser(); as user) {
              <span class="user-info">{{ user.email }}</span>
            }
            <button (click)="logout()" class="logout-btn">Logout</button>
          </div>
        </div>
      </nav>

      <div class="dashboard-content">
        <h2>Dashboard</h2>
        <p>RoleFit helps you generate the right resume for every job application—automatically.</p>

        <div class="feature-cards">
          <div class="card" (click)="navigateToProfile()">
            <h3>Profile</h3>
            <p>Manage your personal information, education, and skills</p>
          </div>

          <div class="card" (click)="navigateToExperience()">
            <h3>Experience</h3>
            <p>Add and manage your work experience</p>
          </div>

          <div class="card" (click)="navigateToProjects()">
            <h3>Projects</h3>
            <p>Showcase your projects with images and details</p>
          </div>

          <div class="card" (click)="navigateToJobApplications()">
            <h3>Job Applications</h3>
            <p>Track your job applications and generate tailored resumes</p>
          </div>

          <div class="card">
            <h3>AI Resume Builder</h3>
            <p>Generate ATS-optimized resumes with AI</p>
            <span class="status">Coming Soon</span>
          </div>

          <div class="card">
            <h3>Analytics</h3>
            <p>View insights on your job search progress</p>
            <span class="status">Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      min-height: 100vh;
      background: #f8fafc;
    }

    .navbar {
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 1rem 0;
    }

    .navbar-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .navbar h1 {
      margin: 0;
      color: #667eea;
      font-size: 1.5rem;
    }

    .navbar-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .user-info {
      color: #666;
    }

    .logout-btn {
      padding: 0.5rem 1rem;
      background: #e74c3c;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
    }

    .logout-btn:hover {
      background: #c0392b;
    }

    .dashboard-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }

    h2 {
      margin: 0 0 0.5rem;
      color: #333;
    }

    .feature-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }

    .card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      position: relative;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }

    .card h3 {
      margin: 0 0 0.5rem;
      color: #333;
    }

    .card p {
      margin: 0;
      color: #666;
      font-size: 0.9rem;
    }

    .status {
      display: inline-block;
      margin-top: 1rem;
      padding: 0.25rem 0.75rem;
      background: #ffeaa7;
      color: #d63031;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    @media (max-width: 768px) {
      .dashboard {
        padding: 12px;
      }

      h1 {
        font-size: 22px;
      }

      .feature-cards {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .card {
        padding: 1.25rem;
      }

      .navbar-content {
        flex-direction: column;
        gap: 1rem;
      }
    }

    @media (max-width: 480px) {
      h1 {
        font-size: 20px;
      }

      .card {
        padding: 1rem;
      }
    }
  `]
})
export class DashboardComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }

  navigateToExperience(): void {
    this.router.navigate(['/experience']);
  }

  navigateToProjects(): void {
    this.router.navigate(['/projects']);
  }

  navigateToJobApplications(): void {
    this.router.navigate(['/job-applications']);
  }
}

