import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const API_URL = 'http://localhost:3000/api/companies';

export interface Company {
  id: number;
  name: string;
  industry?: string;
  size?: string;
  website?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyInput {
  name: string;
  industry?: string;
  size?: string;
  website?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class CompanyService {
  companiesSignal = signal<Company[]>([]);
  loadingSignal = signal(false);
  errorSignal = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  async getCompanies(search?: string): Promise<Company[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const companies = await firstValueFrom(
        this.http.get<Company[]>(`${API_URL}${query}`)
      );
      this.companiesSignal.set(companies);
      return companies;
    } catch (error: any) {
      const message = error.error?.error || 'Failed to load companies';
      this.errorSignal.set(message);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async getCompany(companyId: number): Promise<Company> {
    return await firstValueFrom(
      this.http.get<Company>(`${API_URL}/${companyId}`)
    );
  }

  async createCompany(data: CompanyInput): Promise<Company> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const company = await firstValueFrom(
        this.http.post<Company>(API_URL, data)
      );
      this.companiesSignal.update((list) => [...list, company].sort((a, b) => a.name.localeCompare(b.name)));
      return company;
    } catch (error: any) {
      const message = error.error?.error || 'Failed to create company';
      this.errorSignal.set(message);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async updateCompany(companyId: number, data: Partial<CompanyInput>): Promise<Company> {
    this.loadingSignal.set(true);

    try {
      const updated = await firstValueFrom(
        this.http.put<Company>(`${API_URL}/${companyId}`, data)
      );
      this.companiesSignal.update((list) =>
        list.map((c) => (c.id === companyId ? updated : c))
      );
      return updated;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async deleteCompany(companyId: number): Promise<void> {
    this.loadingSignal.set(true);

    try {
      await firstValueFrom(this.http.delete(`${API_URL}/${companyId}`));
      this.companiesSignal.update((list) => list.filter((c) => c.id !== companyId));
    } finally {
      this.loadingSignal.set(false);
    }
  }

  clearError(): void {
    this.errorSignal.set(null);
  }
}
