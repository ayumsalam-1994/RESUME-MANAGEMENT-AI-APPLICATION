import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { environment } from '../../../environments/environment';

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  activeSubscription: {
    id: number;
    status: string;
    expiresAt: string;
    aiGenerations: number;
    amount: string;
  } | null;
}

interface AdminStats {
  totalUsers: number;
  activeSubscribers: number;
  pendingPayments: number;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="admin-container">
      <header class="admin-header">
        <h1>Admin Panel</h1>
        <a routerLink="/dashboard" class="back-link">← Dashboard</a>
      </header>

      @if (stats()) {
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-value">{{ stats()!.totalUsers }}</div>
            <div class="stat-label">Total Users</div>
          </div>
          <div class="stat-card active">
            <div class="stat-value">{{ stats()!.activeSubscribers }}</div>
            <div class="stat-label">Active Subscribers</div>
          </div>
          <div class="stat-card pending">
            <div class="stat-value">{{ stats()!.pendingPayments }}</div>
            <div class="stat-label">Pending Payments</div>
          </div>
        </div>
      }

      @if (successMessage()) {
        <div class="success-banner">{{ successMessage() }}</div>
      }

      @if (errorMessage()) {
        <div class="error-banner">{{ errorMessage() }}</div>
      }

      <section class="users-section">
        <h2>Users</h2>
        @if (isLoading()) {
          <p>Loading...</p>
        } @else {
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name / Email</th>
                  <th>Joined</th>
                  <th>Subscription</th>
                  <th>AI Usage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (user of users(); track user.id) {
                  <tr>
                    <td>
                      <div class="user-name">{{ user.name }}</div>
                      <div class="user-email">{{ user.email }}</div>
                      @if (user.role === 'admin') {
                        <span class="badge admin">admin</span>
                      }
                    </td>
                    <td>{{ user.createdAt | date:'d MMM y' }}</td>
                    <td>
                      @if (user.activeSubscription) {
                        <span class="badge active">Active</span>
                        <div class="sub-expiry">
                          Expires {{ user.activeSubscription.expiresAt | date:'d MMM y' }}
                        </div>
                      } @else {
                        <span class="badge inactive">No subscription</span>
                      }
                    </td>
                    <td>
                      @if (user.activeSubscription) {
                        {{ user.activeSubscription.aiGenerations }} / 30
                      } @else {
                        —
                      }
                    </td>
                    <td>
                      <button
                        class="action-btn activate"
                        (click)="activateSubscription(user.id)"
                        [disabled]="!!user.activeSubscription">
                        Activate 30d
                      </button>
                      @if (user.activeSubscription) {
                        <button
                          class="action-btn cancel"
                          (click)="cancelSubscription(user.activeSubscription.id)">
                          Cancel
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    .admin-container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 1.5rem;
    }

    .admin-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .admin-header h1 { margin: 0; }

    .back-link { color: #667eea; text-decoration: none; font-size: 0.9rem; }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-card {
      background: white;
      border-radius: 8px;
      padding: 1.25rem;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      border-top: 4px solid #ddd;
    }

    .stat-card.active { border-top-color: #22c55e; }
    .stat-card.pending { border-top-color: #f59e0b; }

    .stat-value { font-size: 2.5rem; font-weight: 700; color: #333; }
    .stat-label { color: #777; font-size: 0.9rem; margin-top: 0.25rem; }

    .success-banner {
      background: #efe;
      color: #166534;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      margin-bottom: 1rem;
    }

    .error-banner {
      background: #fee;
      color: #991b1b;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      margin-bottom: 1rem;
    }

    .users-section { background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }

    .users-section h2 { margin: 0 0 1rem; }

    .table-wrapper { overflow-x: auto; }

    table { width: 100%; border-collapse: collapse; }

    th {
      text-align: left;
      padding: 0.75rem 0.5rem;
      border-bottom: 2px solid #eee;
      font-size: 0.8rem;
      text-transform: uppercase;
      color: #888;
    }

    td {
      padding: 0.75rem 0.5rem;
      border-bottom: 1px solid #f5f5f5;
      font-size: 0.9rem;
      vertical-align: top;
    }

    .user-name { font-weight: 500; }
    .user-email { color: #777; font-size: 0.8rem; }
    .sub-expiry { font-size: 0.75rem; color: #888; margin-top: 0.25rem; }

    .badge {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      border-radius: 12px;
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge.active   { background: #dcfce7; color: #166534; }
    .badge.inactive { background: #f3f4f6; color: #6b7280; }
    .badge.admin    { background: #ede9fe; color: #5b21b6; }

    .action-btn {
      padding: 0.3rem 0.65rem;
      border: none;
      border-radius: 4px;
      font-size: 0.8rem;
      cursor: pointer;
      margin-right: 0.25rem;
    }

    .action-btn.activate { background: #22c55e; color: white; }
    .action-btn.activate:disabled { background: #d1fae5; color: #6b7280; cursor: not-allowed; }
    .action-btn.cancel { background: #ef4444; color: white; }
    .action-btn:hover:not(:disabled) { opacity: 0.85; }

    @media (max-width: 600px) {
      .stats-row { grid-template-columns: 1fr; }
    }
  `]
})
export class AdminComponent implements OnInit {
  private http = inject(HttpClient);
  private readonly adminUrl = `${environment.apiUrl}/admin`;

  isLoading = signal(true);
  users = signal<AdminUser[]>([]);
  stats = signal<AdminStats | null>(null);
  successMessage = signal('');
  errorMessage = signal('');

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.http.get<AdminUser[]>(`${this.adminUrl}/users`).subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load users.');
        this.isLoading.set(false);
      }
    });

    this.http.get<AdminStats>(`${this.adminUrl}/stats`).subscribe({
      next: (stats) => this.stats.set(stats),
      error: () => {}
    });
  }

  activateSubscription(userId: number): void {
    this.clearMessages();
    this.http.post(`${this.adminUrl}/users/${userId}/subscriptions`, {}).subscribe({
      next: () => {
        this.successMessage.set('Subscription activated for 30 days.');
        this.loadData();
      },
      error: (err) => this.errorMessage.set(err.error?.error || 'Failed to activate subscription.')
    });
  }

  cancelSubscription(subscriptionId: number): void {
    this.clearMessages();
    this.http.patch(`${this.adminUrl}/subscriptions/${subscriptionId}`, { status: 'cancelled' }).subscribe({
      next: () => {
        this.successMessage.set('Subscription cancelled.');
        this.loadData();
      },
      error: (err) => this.errorMessage.set(err.error?.error || 'Failed to cancel subscription.')
    });
  }

  private clearMessages(): void {
    this.successMessage.set('');
    this.errorMessage.set('');
  }
}
