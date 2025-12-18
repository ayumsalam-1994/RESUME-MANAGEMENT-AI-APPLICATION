import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const API_URL = 'http://localhost:3000/api/experiences';

export interface ExperienceBullet {
  id: string;
  experienceId: string;
  content: string;
  order: number;
}

export interface Experience {
  id: string;
  userId: string;
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
  bullets: ExperienceBullet[];
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class ExperienceService {
  experiencesSignal = signal<Experience[]>([]);
  loadingSignal = signal(false);
  errorSignal = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  // Get all experiences
  async getUserExperiences(): Promise<Experience[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const experiences = await firstValueFrom(
        this.http.get<Experience[]>(API_URL)
      );
      this.experiencesSignal.set(experiences);
      return experiences;
    } catch (error: any) {
      const message = error.error?.error || 'Failed to load experiences';
      this.errorSignal.set(message);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  // Get single experience
  async getExperience(experienceId: string): Promise<Experience> {
    return await firstValueFrom(
      this.http.get<Experience>(`${API_URL}/${experienceId}`)
    );
  }

  // Create experience
  async createExperience(data: Omit<Experience, 'id' | 'userId' | 'bullets' | 'createdAt' | 'updatedAt'>): Promise<Experience> {
    this.loadingSignal.set(true);

    try {
      const experience = await firstValueFrom(
        this.http.post<Experience>(API_URL, data)
      );
      this.experiencesSignal.update((exps) => [experience, ...exps]);
      return experience;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  // Update experience
  async updateExperience(
    experienceId: string,
    data: Partial<Experience>
  ): Promise<Experience> {
    this.loadingSignal.set(true);

    try {
      const updated = await firstValueFrom(
        this.http.put<Experience>(`${API_URL}/${experienceId}`, data)
      );
      this.experiencesSignal.update((exps) =>
        exps.map((e) => (e.id === experienceId ? updated : e))
      );
      return updated;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  // Delete experience
  async deleteExperience(experienceId: string): Promise<void> {
    this.loadingSignal.set(true);

    try {
      await firstValueFrom(
        this.http.delete(`${API_URL}/${experienceId}`)
      );
      this.experiencesSignal.update((exps) =>
        exps.filter((e) => e.id !== experienceId)
      );
    } finally {
      this.loadingSignal.set(false);
    }
  }

  // Add bullet point
  async addBullet(
    experienceId: string,
    content: string
  ): Promise<ExperienceBullet> {
    const bullet = await firstValueFrom(
      this.http.post<ExperienceBullet>(
        `${API_URL}/${experienceId}/bullets`,
        { content }
      )
    );

    // Update experience in signals
    this.experiencesSignal.update((exps) =>
      exps.map((e) => {
        if (e.id === experienceId) {
          return { ...e, bullets: [...e.bullets, bullet] };
        }
        return e;
      })
    );

    return bullet;
  }

  // Update bullet
  async updateBullet(
    bulletId: string,
    content: string
  ): Promise<ExperienceBullet> {
    return await firstValueFrom(
      this.http.put<ExperienceBullet>(
        `${API_URL}/bullets/${bulletId}`,
        { content }
      )
    );
  }

  // Delete bullet
  async deleteBullet(
    experienceId: string,
    bulletId: string
  ): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${API_URL}/bullets/${bulletId}`)
    );

    this.experiencesSignal.update((exps) =>
      exps.map((e) => {
        if (e.id === experienceId) {
          return {
            ...e,
            bullets: e.bullets.filter((b) => b.id !== bulletId),
          };
        }
        return e;
      })
    );
  }

  // Reorder bullets
  async reorderBullets(
    experienceId: string,
    bulletIds: string[]
  ): Promise<ExperienceBullet[]> {
    const bullets = await firstValueFrom(
      this.http.post<ExperienceBullet[]>(
        `${API_URL}/${experienceId}/bullets/reorder`,
        { bulletIds }
      )
    );

    this.experiencesSignal.update((exps) =>
      exps.map((e) => {
        if (e.id === experienceId) {
          return { ...e, bullets };
        }
        return e;
      })
    );

    return bullets;
  }

  clearError(): void {
    this.errorSignal.set(null);
  }
}
