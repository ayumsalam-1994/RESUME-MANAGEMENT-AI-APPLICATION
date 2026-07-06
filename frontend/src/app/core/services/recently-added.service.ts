import { Injectable } from '@angular/core';

export type RecentlyAddedEntity = 'education' | 'experience' | 'projects' | 'certifications' | 'links' | 'skills';

/**
 * Tracks record IDs just created by an onboarding import so destination pages
 * (Profile, Experience, Projects, Certifications) can briefly highlight them.
 * Each entity's set is cleared once the corresponding page has shown it —
 * this is a one-time, temporary indicator, not a persistent flag.
 */
@Injectable({ providedIn: 'root' })
export class RecentlyAddedService {
  private ids: Record<RecentlyAddedEntity, Set<number>> = {
    education: new Set(),
    experience: new Set(),
    projects: new Set(),
    certifications: new Set(),
    links: new Set(),
    skills: new Set()
  };

  markAdded(entity: RecentlyAddedEntity, newIds: number[]): void {
    for (const id of newIds) {
      this.ids[entity].add(id);
    }
  }

  isNew(entity: RecentlyAddedEntity, id: number): boolean {
    return this.ids[entity].has(id);
  }

  clear(entity: RecentlyAddedEntity): void {
    this.ids[entity].clear();
  }
}
