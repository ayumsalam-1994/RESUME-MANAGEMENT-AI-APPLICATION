import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Company } from './company.service';

const API_URL = 'http://localhost:3000/api/job-applications';

export interface JobApplication {
  id: number;
  userId: number;
  companyId: number;
  jobTitle: string;
  jobDescription: string;
  platform?: string;
  applicationUrl?: string;
  contactPerson?: string;
  dateApplied?: string;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  company?: Company;
}

export interface JobApplicationInput {
  companyId: number;
  jobTitle: string;
  jobDescription: string;
  platform?: string;
  applicationUrl?: string;
  contactPerson?: string;
  dateApplied?: string;
  status?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class JobApplicationService {
  applicationsSignal = signal<JobApplication[]>([]);
  loadingSignal = signal(false);
  errorSignal = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  async getApplications(status?: string): Promise<JobApplication[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      const applications = await firstValueFrom(
        this.http.get<JobApplication[]>(`${API_URL}${query}`)
      );
      this.applicationsSignal.set(applications);
      return applications;
    } catch (error: any) {
      const message = error.error?.error || 'Failed to load applications';
      this.errorSignal.set(message);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async getApplication(applicationId: number): Promise<JobApplication> {
    return await firstValueFrom(
      this.http.get<JobApplication>(`${API_URL}/${applicationId}`)
    );
  }

  async createApplication(data: JobApplicationInput): Promise<JobApplication> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const application = await firstValueFrom(
        this.http.post<JobApplication>(API_URL, data)
      );
      this.applicationsSignal.update((list) => [application, ...list]);
      return application;
    } catch (error: any) {
      const message = error.error?.error || 'Failed to create application';
      this.errorSignal.set(message);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async updateApplication(
    applicationId: number,
    data: Partial<JobApplicationInput>
  ): Promise<JobApplication> {
    this.loadingSignal.set(true);

    try {
      const updated = await firstValueFrom(
        this.http.put<JobApplication>(`${API_URL}/${applicationId}`, data)
      );
      this.applicationsSignal.update((list) =>
        list.map((a) => (a.id === applicationId ? updated : a))
      );
      return updated;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async deleteApplication(applicationId: number): Promise<void> {
    this.loadingSignal.set(true);

    try {
      await firstValueFrom(this.http.delete(`${API_URL}/${applicationId}`));
      this.applicationsSignal.update((list) =>
        list.filter((a) => a.id !== applicationId)
      );
    } finally {
      this.loadingSignal.set(false);
    }
  }

  clearError(): void {
    this.errorSignal.set(null);
  }
}
