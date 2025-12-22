import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface Profile {
  id: number;
  userId: number;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  location?: string;
  summary?: string;
  educations: Education[];
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

export interface Education {
  id: number;
  profileId: number;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  current: boolean;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
}

export interface UserSkill {
  userId: number;
  skillId: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  skill: Skill;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private apiUrl = `${environment.apiUrl}/profile`;

  private profileUpdateFields = [
    'email',
    'phone',
    'linkedin',
    'github',
    'portfolio',
    'location',
    'summary',
  ] as const;

  profileSignal = signal<Profile | null>(null);
  skillsSignal = signal<UserSkill[]>([]);
  loadingSignal = signal(false);
  errorSignal = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  // Get user profile with education
  async getProfile(): Promise<Profile> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const profile = await firstValueFrom(this.http.get<Profile>(this.apiUrl));
      this.profileSignal.set(profile);
      return profile;
    } catch (error: any) {
      const message = error.error?.error || 'Failed to load profile';
      this.errorSignal.set(message);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  // Update profile
  async updateProfile(
    data: Partial<Omit<Profile, 'educations' | 'createdAt' | 'updatedAt' | 'id' | 'userId' | 'user'>> & { name?: string }
  ): Promise<Profile> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const payload: Record<string, unknown> = {};
      for (const key of this.profileUpdateFields) {
        if (key in data) {
          payload[key] = (data as any)[key];
        }
      }
      if (data.name !== undefined) {
        payload['name'] = data.name;
      }

      const updated = await firstValueFrom(
        this.http.put<Profile>(this.apiUrl, payload)
      );
      this.profileSignal.set(updated);
      return updated;
    } catch (error: any) {
      const message = error.error?.error || 'Failed to update profile';
      this.errorSignal.set(message);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  // Education Management
  async addEducation(data: Omit<Education, 'id' | 'profileId'>): Promise<Education> {
    this.loadingSignal.set(true);

    try {
      return await firstValueFrom(
        this.http.post<Education>(`${this.apiUrl}/education`, data)
      );
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async updateEducation(
    educationId: number,
    data: Partial<Education>
  ): Promise<Education> {
    return await firstValueFrom(
      this.http.put<Education>(`${this.apiUrl}/education/${educationId}`, data)
    );
  }

  async deleteEducation(educationId: number): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.apiUrl}/education/${educationId}`)
    );
  }

  // Skill Management
  async getUserSkills(): Promise<UserSkill[]> {
    this.loadingSignal.set(true);

    try {
      const skills = await firstValueFrom(
        this.http.get<UserSkill[]>(`${this.apiUrl}/skills`)
      );
      this.skillsSignal.set(skills);
      return skills;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async addSkill(data: {
    name: string;
    category?: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  }): Promise<UserSkill> {
    const userSkill = await firstValueFrom(
      this.http.post<UserSkill>(`${this.apiUrl}/skills`, data)
    );

    // Update local signals
    this.skillsSignal.update((skills) => [...skills, userSkill]);
    return userSkill;
  }

  async removeSkill(skillId: number): Promise<void> {
    await firstValueFrom(
      this.http.delete(`${this.apiUrl}/skills/${skillId}`)
    );

    // Update local signals
    this.skillsSignal.update((skills) =>
      skills.filter((s) => s.skillId !== skillId)
    );
  }

  async searchSkills(query: string, category?: string): Promise<Skill[]> {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (category) params.append('category', category);

    return await firstValueFrom(
      this.http.get<Skill[]>(
        `${this.apiUrl}/skills/search?${params.toString()}`
      )
    );
  }

  async getSkillCategories(): Promise<string[]> {
    return await firstValueFrom(
      this.http.get<string[]>(`${this.apiUrl}/skills/categories`)
    );
  }

  async getCustomPrompt(): Promise<string | null> {
    const result = await firstValueFrom(
      this.http.get<{ customPrompt: string | null }>(`${this.apiUrl}/prompt/custom`)
    );
    return result.customPrompt;
  }

  async saveCustomPrompt(customPrompt: string): Promise<void> {
    await firstValueFrom(
      this.http.put(`${this.apiUrl}/prompt/custom`, { customPrompt })
    );
  }

  clearError(): void {
    this.errorSignal.set(null);
  }
}
