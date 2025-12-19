import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Certification {
  id: number;
  userId: number;
  title: string;
  description?: string | null;
  fileUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CertificationInput {
  title: string;
  description?: string | null;
  fileUrl?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CertificationService {
  private apiUrl = 'http://localhost:3000/api/certifications';

  certificationsSignal = signal<Certification[]>([]);
  loadingSignal = signal(false);
  errorSignal = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  async getCertifications(): Promise<Certification[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const items = await firstValueFrom(
        this.http.get<Certification[]>(this.apiUrl)
      );
      this.certificationsSignal.set(items);
      return items;
    } catch (error: any) {
      const message = error.error?.error || 'Failed to load certifications';
      this.errorSignal.set(message);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async createCertification(data: CertificationInput): Promise<Certification> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const created = await firstValueFrom(
        this.http.post<Certification>(this.apiUrl, data)
      );
      this.certificationsSignal.update((list) => [created, ...list]);
      return created;
    } catch (error: any) {
      const message = error.error?.error || 'Failed to create certification';
      this.errorSignal.set(message);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async updateCertification(
    certificationId: number,
    data: Partial<CertificationInput>
  ): Promise<Certification> {
    this.loadingSignal.set(true);

    try {
      const updated = await firstValueFrom(
        this.http.put<Certification>(`${this.apiUrl}/${certificationId}`, data)
      );
      this.certificationsSignal.update((list) =>
        list.map((c) => (c.id === certificationId ? updated : c))
      );
      return updated;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async deleteCertification(certificationId: number): Promise<void> {
    this.loadingSignal.set(true);

    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/${certificationId}`)
      );
      this.certificationsSignal.update((list) =>
        list.filter((c) => c.id !== certificationId)
      );
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async uploadFile(file: File): Promise<{ fileUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return await firstValueFrom(
      this.http.post<{ fileUrl: string }>(`${this.apiUrl}/upload`, formData)
    );
  }

  clearError(): void {
    this.errorSignal.set(null);
  }
}
