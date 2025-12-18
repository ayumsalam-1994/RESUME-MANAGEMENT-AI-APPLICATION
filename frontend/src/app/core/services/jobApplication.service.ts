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

export interface Resume {
  id: number;
  applicationId: number;
  version: number;
  content: any;
  createdAt: string;
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

  async listResumes(applicationId: number): Promise<Resume[]> {
    return await firstValueFrom(
      this.http.get<Resume[]>(`${API_URL}/${applicationId}/resumes`)
    );
  }

  async generateResume(applicationId: number, jobDescriptionOverride?: string): Promise<Resume> {
    const body = jobDescriptionOverride ? { jobDescription: jobDescriptionOverride } : {};
    return await firstValueFrom(
      this.http.post<Resume>(`${API_URL}/${applicationId}/resumes/generate`, body)
    );
  }

  async importResume(applicationId: number, content: string): Promise<Resume> {
    return await firstValueFrom(
      this.http.post<Resume>(`${API_URL}/${applicationId}/resumes/import`, { content })
    );
  }

  async deleteResume(applicationId: number, resumeId: number): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${API_URL}/${applicationId}/resumes/${resumeId}`)
    );
  }

  async downloadResumePDF(applicationId: number, resumeId: number, filename?: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.get(`${API_URL}/${applicationId}/resumes/${resumeId}/export`, {
        responseType: 'blob'
      })
    );
    
    const blob = new Blob([response], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `resume-v${resumeId}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  }}