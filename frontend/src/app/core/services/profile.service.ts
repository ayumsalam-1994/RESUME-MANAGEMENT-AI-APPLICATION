import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Profile {
  id: string;
  userId: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  location?: string;
  summary?: string;
  education: Education[];
  createdAt: string;
  updatedAt: string;
}

export interface Education {
  id: string;
  profileId: string;
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
  userId: string;
  skillId: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  skill: Skill;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private apiUrl = 'http://localhost:3000/api/profile';

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
  async updateProfile(data: Partial<Profile>): Promise<Profile> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.put<Profile>(this.apiUrl, data)
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
    educationId: string,
    data: Partial<Education>
  ): Promise<Education> {
    return await firstValueFrom(
      this.http.put<Education>(`${this.apiUrl}/education/${educationId}`, data)
    );
  }

  async deleteEducation(educationId: string): Promise<void> {
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

  async removeSkill(skillId: string): Promise<void> {
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

  clearError(): void {
    this.errorSignal.set(null);
  }
}
