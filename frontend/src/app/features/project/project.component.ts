import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';

import {
  Project,
  ProjectImage,
  ProjectService
} from '../../core/services/project.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="container">
      <div class="header">
        <div>
          <h2>Projects</h2>
          <p class="subtext">Manage your projects, images, and archive status</p>
        </div>
        <label class="toggle">
          <input type="checkbox" [checked]="includeArchived" (change)="toggleArchived($event)" />
          <span>Show archived</span>
        </label>
      </div>

      @if (projectService.errorSignal()) {
        <div class="error-message">
          {{ projectService.errorSignal() }}
          <button (click)="projectService.clearError()">Dismiss</button>
        </div>
      }

      @if (projectService.loadingSignal()) {
        <p class="loading">Loading projects...</p>
      }

      @if (projectForm) {
        <div class="project-list">
          @for (project of projectService.projectsSignal(); track project.id; let idx = $index) {
            <div class="project-card" [class.archived]="project.archived">
              @if (editingId === project.id) {
                <!-- Edit Form -->
                <form [formGroup]="projectForm" (ngSubmit)="saveProject(project.id)">
                  <div class="form-row">
                    <div class="form-group">
                      <label>Title</label>
                      <input formControlName="title" type="text" />
                    </div>
                    <div class="form-group">
                      <label>Role</label>
                      <input formControlName="role" type="text" />
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Summary</label>
                    <textarea formControlName="summary" rows="2"></textarea>
                  </div>

                  <div class="form-group">
                    <label>Tech Stack (comma-separated)</label>
                    <input formControlName="techStack" type="text" />
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label>Start Date</label>
                      <input formControlName="startDate" type="date" />
                    </div>
                    <div class="form-group">
                      <label>End Date</label>
                      <input formControlName="endDate" type="date" />
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Project URL</label>
                    <input formControlName="url" type="url" />
                  </div>

                  <div class="actions">
                    <button type="submit" class="primary">Save</button>
                    <button type="button" (click)="cancelEdit()">Cancel</button>
                  </div>
                </form>
              } @else {
                <!-- Display Card -->
                <div class="card-header">
                  <div>
                    <h3>{{ project.title }}</h3>
                    @if (project.role) {
                      <p class="role">Role: {{ project.role }}</p>
                    }
                    <p class="dates">
                      @if (project.startDate) {
                        {{ project.startDate | date: 'MMM yyyy' }} -
                        @if (project.endDate) {
                          {{ project.endDate | date: 'MMM yyyy' }}
                        } @else {
                          Present
                        }
                      } @else {
                        Timeline not set
                      }
                    </p>
                    @if (project.url) {
                      <p class="link"><a [href]="project.url" target="_blank" rel="noopener">View project</a></p>
                    }
                    @if (project.summary) {
                      <p class="summary">{{ project.summary }}</p>
                    }
                    @if (project.bullets?.length) {
                      <ul class="bullets">
                        @for (bullet of project.bullets; track bullet.id; let bIdx = $index) {
                          <li>
                            <span>{{ bullet.content }}</span>
                            <div class="bullet-controls">
                              <button
                                class="ghost small"
                                (click)="moveBullet(project.id, bullet.id, 'up')"
                                [disabled]="bIdx === 0"
                              >
                                ↑
                              </button>
                              <button
                                class="ghost small"
                                (click)="moveBullet(project.id, bullet.id, 'down')"
                                [disabled]="bIdx === (project.bullets.length - 1)"
                              >
                                ↓
                              </button>
                              <button
                                class="danger small"
                                (click)="deleteBullet(project.id, bullet.id)"
                              >
                                Delete
                              </button>
                            </div>
                          </li>
                        }
                      </ul>
                    }
                    @if (project.techStack) {
                      <p class="tech">Tech Stack: {{ project.techStack }}</p>
                    }
                  </div>
                  <div class="chip" *ngIf="project.archived">Archived</div>
                </div>

                <div class="bullet-actions">
                  @if (addingBulletFor === project.id) {
                    <form (ngSubmit)="saveBullet(project.id)">
                      <div class="form-group">
                        <textarea
                          [(ngModel)]="bulletDrafts[project.id]"
                          [name]="'bullet-' + project.id"
                          rows="2"
                          placeholder="Add a bullet point"
                          required
                        ></textarea>
                      </div>
                      <div class="actions">
                        <button type="submit" class="primary small">Add Bullet</button>
                        <button type="button" class="small" (click)="cancelBullet()">Cancel</button>
                      </div>
                    </form>
                  } @else {
                    <button class="secondary small" (click)="startAddBullet(project.id)">
                      + Add Bullet
                    </button>
                  }
                </div>

                <!-- Images -->
                @if (project.images.length) {
                  <div class="images">
                    @for (img of project.images; track img.id; let imgIndex = $index) {
                      <div class="image-item">
                        <a [href]="img.url" target="_blank" rel="noopener">Image {{ img.order + 1 }}</a>
                        @if (img.caption) {
                          <p class="caption">{{ img.caption }}</p>
                        }
                        <div class="actions">
                          <button class="ghost small" (click)="moveImage(project.id, img.id, 'up')" [disabled]="imgIndex === 0">↑ Move Up</button>
                          <button class="ghost small" (click)="moveImage(project.id, img.id, 'down')" [disabled]="imgIndex === project.images.length - 1">↓ Move Down</button>
                          <button class="danger small" (click)="deleteImage(project.id, img.id)">Delete</button>
                        </div>
                      </div>
                    }
                  </div>
                }

                <!-- Add Image Form -->
                @if (addingImageFor === project.id) {
                  <form [formGroup]="imageForm" (ngSubmit)="addImage(project.id)">
                    <div class="form-row">
                      <div class="form-group">
                        <label>Image URL</label>
                        <input formControlName="url" type="url" placeholder="https://..." />
                      </div>
                      <div class="form-group">
                        <label>Upload Image</label>
                        <input type="file" accept="image/*" (change)="onImageFileChange($event)" />
                        @if (imageFile) {
                          <p class="hint">Selected: {{ imageFile.name }}</p>
                        }
                      </div>
                      <div class="form-group">
                        <label>Caption</label>
                        <input formControlName="caption" type="text" />
                      </div>
                    </div>
                    <p class="hint">Provide a URL or upload a file (max 5MB).</p>
                    <div class="actions">
                      <button type="submit" class="primary small">Add Image</button>
                      <button type="button" class="small" (click)="cancelImage()">Cancel</button>
                    </div>
                  </form>
                } @else {
                  <button class="secondary small" (click)="startAddImage(project.id)">+ Add Image</button>
                }

                <div class="actions">
                  <button class="ghost" (click)="moveProject(project.id, 'up')" [disabled]="idx === 0">↑ Move Up</button>
                  <button class="ghost" (click)="moveProject(project.id, 'down')" [disabled]="idx === projectService.projectsSignal().length - 1">↓ Move Down</button>
                  <button class="secondary" (click)="startEdit(project)">Edit</button>
                  <button class="danger" (click)="deleteProjectItem(project.id)">Delete</button>
                  <button class="ghost" (click)="toggleArchive(project)">
                    {{ project.archived ? 'Unarchive' : 'Archive' }}
                  </button>
                </div>
              }
            </div>
          }
        </div>

        <!-- Add Project Button -->
        @if (!editingId && !isAddingNew) {
          <button class="secondary" (click)="startAddProject()">+ Add Project</button>
        }

        <!-- Add Project Form -->
        @if (isAddingNew) {
          <div class="project-card add-form">
            <h3>Add Project</h3>
            <form [formGroup]="projectForm" (ngSubmit)="addProject()">
              <div class="form-row">
                <div class="form-group">
                  <label>Title</label>
                  <input formControlName="title" type="text" />
                </div>
                <div class="form-group">
                  <label>Role</label>
                  <input formControlName="role" type="text" />
                </div>
              </div>

              <div class="form-group">
                <label>Summary</label>
                <textarea formControlName="summary" rows="2"></textarea>
              </div>

              <div class="form-group">
                <label>Bullet Points</label>

                @if (newProjectBullets.length) {
                  <ul class="bullets">
                    @for (bullet of newProjectBullets; track bullet; let bIdx = $index) {
                      <li>
                        <span>{{ bullet }}</span>
                        <div class="bullet-controls">
                          <button
                            class="ghost small"
                            type="button"
                            (click)="moveNewProjectBullet(bIdx, 'up')"
                            [disabled]="bIdx === 0"
                          >
                            ↑
                          </button>
                          <button
                            class="ghost small"
                            type="button"
                            (click)="moveNewProjectBullet(bIdx, 'down')"
                            [disabled]="bIdx === newProjectBullets.length - 1"
                          >
                            ↓
                          </button>
                          <button
                            class="danger small"
                            type="button"
                            (click)="removeNewProjectBullet(bIdx)"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    }
                  </ul>
                }

                <div class="form-group">
                  <textarea
                    [(ngModel)]="newProjectBullet"
                    name="newProjectBullet"
                    rows="2"
                    placeholder="Add a bullet point"
                  ></textarea>
                </div>
                <div class="actions">
                  <button type="button" class="primary small" (click)="addNewProjectBullet()">
                    Add Bullet
                  </button>
                  <button
                    type="button"
                    class="small"
                    (click)="clearNewProjectBullets()"
                    [disabled]="!newProjectBullets.length"
                  >
                    Clear Bullets
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label>Tech Stack (comma-separated)</label>
                <input formControlName="techStack" type="text" />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Start Date</label>
                  <input formControlName="startDate" type="date" />
                </div>
                <div class="form-group">
                  <label>End Date</label>
                  <input formControlName="endDate" type="date" />
                </div>
              </div>

              <div class="form-group">
                <label>Project URL</label>
                <input formControlName="url" type="url" />
              </div>

              <div class="actions">
                <button type="submit" class="primary">Add</button>
                <button type="button" (click)="cancelEdit()">Cancel</button>
              </div>
            </form>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .container {
      max-width: 960px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .subtext {
      margin: 4px 0 0;
      color: #666;
    }

    .toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #444;
    }

    .error-message {
      background: #f8d7da;
      color: #721c24;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;

      button {
        background: #721c24;
        padding: 4px 8px;
        font-size: 12px;
      }
    }

    .loading {
      text-align: center;
      color: #666;
    }

    .project-list {
      display: grid;
      gap: 16px;
      margin-bottom: 24px;
    }

    .project-card {
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      position: relative;

      &.archived {
        background: #f6f6f6;
        border-style: dashed;
      }
    }

    .chip {
      background: #6c757d;
      color: white;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      height: fit-content;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }

    h3 {
      margin: 0 0 6px;
    }

    .role {
      margin: 0;
      color: #007bff;
      font-weight: 600;
    }

    .dates {
      margin: 6px 0;
      color: #777;
      font-size: 14px;
    }

    .link a {
      color: #0056b3;
      text-decoration: underline;
    }

    .summary,
    .tech {
      margin: 6px 0;
      color: #444;
      line-height: 1.5;
    }

    .images {
      margin: 12px 0;
      display: grid;
      gap: 8px;
    }

    .bullets {
      margin: 10px 0;
      padding-left: 18px;
      display: grid;
      gap: 8px;
      list-style-type: none;

      li {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        position: relative;

        &::before {
          content: '•';
          position: absolute;
          left: -18px;
          font-size: 18px;
          line-height: 1.6;
        }
      }

      span {
        flex: 1;
      }
    }

    .bullet-controls {
      display: inline-flex;
      gap: 6px;
    }

    .bullet-actions {
      margin-top: 10px;
    }

    .image-item {
      padding: 10px;
      border: 1px solid #eee;
      border-radius: 6px;
      background: #fafafa;
    }

    .caption {
      margin: 4px 0;
      color: #555;
    }

    .hint {
      margin: 4px 0;
      color: #666;
      font-size: 12px;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }

    .form-group {
      margin-bottom: 12px;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
    }

    label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
    }

    input,
    textarea {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
      font-family: inherit;
    }

    textarea {
      resize: vertical;
    }

    button {
      padding: 8px 14px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;

      &.primary {
        background: #007bff;
      }

      &.secondary {
        background: #6c757d;
      }

      &.danger {
        background: #dc3545;
      }

      &.ghost {
        background: #f1f3f5;
        color: #333;
        border: 1px solid #ddd;
      }

      &.small {
        padding: 6px 10px;
        font-size: 13px;
      }
    }
  `,
})
export class ProjectComponent implements OnInit {
  projectForm!: FormGroup;
  imageForm!: FormGroup;
  isAddingNew = false;
  editingId: number | null = null;
  addingImageFor: number | null = null;
  includeArchived = false;
  imageFile: File | null = null;
  addingBulletFor: number | null = null;
  bulletDrafts: Record<number, string> = {};
  newProjectBullets: string[] = [];
  newProjectBullet = '';

  constructor(
    public projectService: ProjectService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.loadProjects();
  }

  private initializeForms(): void {
    this.projectForm = this.fb.group({
      title: ['', Validators.required],
      summary: [''],
      role: [''],
      techStack: [''],
      startDate: [''],
      endDate: [''],
      url: [''],
      archived: [false]
    });

    this.imageForm = this.fb.group({
      url: [''],
      caption: ['']
    });
  }

  private async loadProjects(): Promise<void> {
    try {
      await this.projectService.getProjects(this.includeArchived);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }

  toggleArchived(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.includeArchived = input.checked;
    this.loadProjects();
  }

  startAddProject(): void {
    this.isAddingNew = true;
    this.editingId = null;
    this.projectForm?.reset({ archived: false });
    this.newProjectBullets = [];
    this.newProjectBullet = '';
    this.addingBulletFor = null;
    this.bulletDrafts = {};
  }

  startEdit(project: Project): void {
    this.editingId = project.id;
    this.isAddingNew = false;
    this.projectForm?.patchValue({
      title: project.title,
      summary: project.summary || '',
      role: project.role || '',
      techStack: project.techStack || '',
      startDate: project.startDate ? project.startDate.split('T')[0] : '',
      endDate: project.endDate ? project.endDate.split('T')[0] : '',
      url: project.url || '',
      archived: project.archived
    });
    this.addingBulletFor = null;
  }

  async addProject(): Promise<void> {
    if (!this.projectForm?.valid) return;

    try {
      const project = await this.projectService.createProject(this.projectForm.value);

      if (this.newProjectBullets.length) {
        for (let i = 0; i < this.newProjectBullets.length; i++) {
          await this.projectService.addBullet(project.id, this.newProjectBullets[i], i);
        }
      }

      this.cancelEdit();
      alert('Project added successfully!');
    } catch (error) {
      console.error('Failed to add project:', error);
    }
  }

  async saveProject(projectId: number): Promise<void> {
    if (!this.projectForm?.valid) return;

    try {
      await this.projectService.updateProject(projectId, this.projectForm.value);
      this.cancelEdit();
      alert('Project updated successfully!');
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  }

  async deleteProjectItem(projectId: number): Promise<void> {
    if (!confirm('Delete this project?')) return;

    try {
      await this.projectService.deleteProject(projectId);
      alert('Project deleted successfully!');
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  }

  async toggleArchive(project: Project): Promise<void> {
    try {
      await this.projectService.setArchived(project.id, !project.archived);
    } catch (error) {
      console.error('Failed to update archive status:', error);
    }
  }

  async moveProject(projectId: number, direction: 'up' | 'down'): Promise<void> {
    const projects = [...this.projectService.projectsSignal()];
    const index = projects.findIndex((p) => p.id === projectId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= projects.length) return;

    [projects[index], projects[targetIndex]] = [projects[targetIndex], projects[index]];
    const reordered = projects.map((p, i) => ({ ...p, order: i }));
    this.projectService.projectsSignal.set(reordered);

    try {
      await this.projectService.reorderProjects(reordered.map((p) => p.id));
    } catch (error) {
      console.error('Failed to reorder projects:', error);
    }
  }

  startAddImage(projectId: number): void {
    this.addingImageFor = projectId;
    this.imageForm?.reset();
    this.imageFile = null;
  }

  async addImage(projectId: number): Promise<void> {
    if (!this.imageForm?.valid && !this.imageFile) return;

    try {
      const caption = this.imageForm?.value.caption as string | undefined;
      const url = this.imageForm?.value.url as string | undefined;

      if (this.imageFile) {
        await this.projectService.uploadImage(projectId, this.imageFile, caption);
      } else if (url) {
        await this.projectService.addImage(projectId, { url, caption });
      } else {
        return;
      }

      this.cancelImage();
      alert('Image added successfully!');
    } catch (error) {
      console.error('Failed to add image:', error);
    }
  }

  async deleteImage(projectId: number, imageId: number): Promise<void> {
    if (!confirm('Delete this image?')) return;

    try {
      await this.projectService.deleteImage(projectId, imageId);
      alert('Image deleted successfully!');
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  }

  cancelEdit(): void {
    this.isAddingNew = false;
    this.editingId = null;
    this.addingImageFor = null;
    this.imageFile = null;
    this.addingBulletFor = null;
    this.bulletDrafts = {};
    this.newProjectBullets = [];
    this.newProjectBullet = '';
    this.projectForm?.reset({ archived: false });
    this.imageForm?.reset();
  }

  cancelImage(): void {
    this.addingImageFor = null;
    this.imageFile = null;
    this.imageForm?.reset();
  }

  async moveImage(projectId: number, imageId: number, direction: 'up' | 'down'): Promise<void> {
    const projects = this.projectService.projectsSignal();
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const images = [...project.images];
    const index = images.findIndex((img) => img.id === imageId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    [images[index], images[targetIndex]] = [images[targetIndex], images[index]];
    const normalized = images.map((img, i) => ({ ...img, order: i }));
    const updatedProjects = projects.map((p) =>
      p.id === projectId ? { ...p, images: normalized } : p
    );
    this.projectService.projectsSignal.set(updatedProjects);

    try {
      await this.projectService.reorderImages(projectId, normalized.map((img) => img.id));
    } catch (error) {
      console.error('Failed to reorder images:', error);
    }
  }

  onImageFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.imageFile = file ?? null;
  }

  startAddBullet(projectId: number): void {
    this.addingBulletFor = projectId;
    this.bulletDrafts[projectId] = '';
  }

  cancelBullet(): void {
    if (this.addingBulletFor !== null) {
      delete this.bulletDrafts[this.addingBulletFor];
    }
    this.addingBulletFor = null;
  }

  async saveBullet(projectId: number): Promise<void> {
    const content = (this.bulletDrafts[projectId] || '').trim();
    if (!content) return;

    try {
      await this.projectService.addBullet(projectId, content);
      this.bulletDrafts[projectId] = '';
      this.addingBulletFor = null;
      alert('Bullet added successfully!');
    } catch (error) {
      console.error('Failed to add bullet:', error);
    }
  }

  async deleteBullet(projectId: number, bulletId: number): Promise<void> {
    if (!confirm('Delete this bullet point?')) return;

    try {
      await this.projectService.deleteBullet(projectId, bulletId);
      alert('Bullet deleted successfully!');
    } catch (error) {
      console.error('Failed to delete bullet:', error);
    }
  }

  async moveBullet(projectId: number, bulletId: number, direction: 'up' | 'down'): Promise<void> {
    const projects = this.projectService.projectsSignal();
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const bullets = [...(project.bullets || [])];
    const index = bullets.findIndex((b) => b.id === bulletId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= bullets.length) return;

    [bullets[index], bullets[targetIndex]] = [bullets[targetIndex], bullets[index]];
    const normalized = bullets.map((b, i) => ({ ...b, order: i }));

    const updatedProjects = projects.map((p) => (p.id === projectId ? { ...p, bullets: normalized } : p));
    this.projectService.projectsSignal.set(updatedProjects);

    try {
      await this.projectService.reorderBullets(projectId, normalized.map((b) => b.id));
    } catch (error) {
      console.error('Failed to reorder bullets:', error);
    }
  }

  addNewProjectBullet(): void {
    const content = this.newProjectBullet.trim();
    if (!content) return;
    this.newProjectBullets = [...this.newProjectBullets, content];
    this.newProjectBullet = '';
  }

  removeNewProjectBullet(index: number): void {
    this.newProjectBullets = this.newProjectBullets.filter((_, i) => i !== index);
  }

  moveNewProjectBullet(index: number, direction: 'up' | 'down'): void {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= this.newProjectBullets.length) return;
    const updated = [...this.newProjectBullets];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    this.newProjectBullets = updated;
  }

  clearNewProjectBullets(): void {
    this.newProjectBullets = [];
    this.newProjectBullet = '';
  }
}
