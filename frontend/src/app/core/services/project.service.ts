import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

const API_URL = `${environment.apiUrl}/projects`;

export interface ProjectImage {
  id: number;
  projectId: number;
  url: string;
  caption?: string;
  order: number;
}

export interface ProjectBullet {
  id: number;
  projectId: number;
  content: string;
  order: number;
}

export interface Project {
  id: number;
  userId: number;
  title: string;
  summary?: string;
  description?: string;
  role?: string;
  techStack?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
  archived: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  images: ProjectImage[];
  bullets: ProjectBullet[];
}

export interface ProjectInput {
  title: string;
  summary?: string;
  description?: string;
  role?: string;
  techStack?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
  archived?: boolean;
  order?: number;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  projectsSignal = signal<Project[]>([]);
  loadingSignal = signal(false);
  errorSignal = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  async getProjects(includeArchived = false): Promise<Project[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const query = includeArchived ? '?archived=true' : '';
      const projects = await firstValueFrom(
        this.http.get<Project[]>(`${API_URL}${query}`)
      );
      this.projectsSignal.set(projects);
      return projects;
    } catch (error: any) {
      const message = error.error?.error || 'Failed to load projects';
      this.errorSignal.set(message);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async getProject(projectId: number): Promise<Project> {
    return await firstValueFrom(
      this.http.get<Project>(`${API_URL}/${projectId}`)
    );
  }

  async createProject(data: ProjectInput): Promise<Project> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const project = await firstValueFrom(
        this.http.post<Project>(API_URL, data)
      );
      this.projectsSignal.update((list) => [...list, project].sort((a, b) => a.order - b.order));
      return project;
    } catch (error: any) {
      const message = error.error?.error || 'Failed to create project';
      this.errorSignal.set(message);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async updateProject(projectId: number, data: Partial<ProjectInput>): Promise<Project> {
    this.loadingSignal.set(true);

    try {
      const updated = await firstValueFrom(
        this.http.put<Project>(`${API_URL}/${projectId}`, data)
      );
      this.projectsSignal.update((list) =>
        list.map((p) => (p.id === projectId ? updated : p))
      );
      return updated;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async deleteProject(projectId: number): Promise<void> {
    this.loadingSignal.set(true);

    try {
      await firstValueFrom(this.http.delete(`${API_URL}/${projectId}`));
      this.projectsSignal.update((list) => list.filter((p) => p.id !== projectId));
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async setArchived(projectId: number, archived: boolean): Promise<Project> {
    const project = await firstValueFrom(
      this.http.patch<Project>(`${API_URL}/${projectId}/archive`, { archived })
    );

    this.projectsSignal.update((list) =>
      list.map((p) => (p.id === projectId ? project : p))
    );

    return project;
  }

  async addImage(
    projectId: number,
    data: { url: string; caption?: string; order?: number }
  ): Promise<ProjectImage> {
    const image = await firstValueFrom(
      this.http.post<ProjectImage>(`${API_URL}/${projectId}/images`, data)
    );

    this.projectsSignal.update((list) =>
      list.map((p) => {
        if (p.id === projectId) {
          return { ...p, images: [...p.images, image].sort((a, b) => a.order - b.order) };
        }
        return p;
      })
    );

    return image;
  }

  async uploadImage(
    projectId: number,
    file: File,
    caption?: string,
    order?: number
  ): Promise<ProjectImage> {
    const formData = new FormData();
    formData.append('image', file);
    if (caption) {
      formData.append('caption', caption);
    }
    if (order !== undefined) {
      formData.append('order', String(order));
    }

    const image = await firstValueFrom(
      this.http.post<ProjectImage>(`${API_URL}/${projectId}/images/upload`, formData)
    );

    this.projectsSignal.update((list) =>
      list.map((p) => {
        if (p.id === projectId) {
          return { ...p, images: [...p.images, image].sort((a, b) => a.order - b.order) };
        }
        return p;
      })
    );

    return image;
  }

  async deleteImage(projectId: number, imageId: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${API_URL}/images/${imageId}`));

    this.projectsSignal.update((list) =>
      list.map((p) => {
        if (p.id === projectId) {
          return { ...p, images: p.images.filter((img) => img.id !== imageId) };
        }
        return p;
      })
    );
  }

  async reorderImages(projectId: number, imageIds: number[]): Promise<ProjectImage[]> {
    const images = await firstValueFrom(
      this.http.post<ProjectImage[]>(
        `${API_URL}/${projectId}/images/reorder`,
        { imageIds }
      )
    );

    this.projectsSignal.update((list) =>
      list.map((p) => (p.id === projectId ? { ...p, images } : p))
    );

    return images;
  }

  async addBullet(
    projectId: number,
    content: string,
    order?: number
  ): Promise<ProjectBullet> {
    const bullet = await firstValueFrom(
      this.http.post<ProjectBullet>(`${API_URL}/${projectId}/bullets`, {
        content,
        order,
      })
    );

    this.projectsSignal.update((list) =>
      list.map((p) =>
        p.id === projectId
          ? { ...p, bullets: [...(p.bullets || []), bullet].sort((a, b) => a.order - b.order) }
          : p
      )
    );

    return bullet;
  }

  async deleteBullet(projectId: number, bulletId: number): Promise<void> {
    await firstValueFrom(this.http.delete(`${API_URL}/bullets/${bulletId}`));

    this.projectsSignal.update((list) =>
      list.map((p) =>
        p.id === projectId ? { ...p, bullets: p.bullets.filter((b) => b.id !== bulletId) } : p
      )
    );
  }

  async reorderBullets(projectId: number, bulletIds: number[]): Promise<ProjectBullet[]> {
    const bullets = await firstValueFrom(
      this.http.post<ProjectBullet[]>(`${API_URL}/${projectId}/bullets/reorder`, {
        bulletIds,
      })
    );

    this.projectsSignal.update((list) =>
      list.map((p) => (p.id === projectId ? { ...p, bullets } : p))
    );

    return bullets;
  }

  async reorderProjects(projectIds: number[]): Promise<Project[]> {
    const projects = await firstValueFrom(
      this.http.post<Project[]>(`${API_URL}/reorder`, { projectIds })
    );

    this.projectsSignal.set(projects);
    return projects;
  }

  clearError(): void {
    this.errorSignal.set(null);
  }
}
