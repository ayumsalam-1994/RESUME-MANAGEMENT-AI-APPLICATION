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
          @for (project of projectService.projectsSignal(); track project.id) {
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
                    <label>Description</label>
                    <textarea formControlName="description" rows="3"></textarea>
                  </div>

                  <div class="form-group">
                    <label>Achievements</label>
                    <textarea formControlName="achievements" rows="3"></textarea>
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
                    @if (project.description) {
                      <p class="description">{{ project.description }}</p>
                    }
                    @if (project.achievements) {
                      <p class="achievements">Achievements: {{ project.achievements }}</p>
                    }
                    @if (project.techStack) {
                      <p class="tech">Tech Stack: {{ project.techStack }}</p>
                    }
                  </div>
                  <div class="chip" *ngIf="project.archived">Archived</div>
                </div>

                <!-- Images -->
                @if (project.images.length) {
                  <div class="images">
                    @for (img of project.images; track img.id) {
                      <div class="image-item">
                        <a [href]="img.url" target="_blank" rel="noopener">Image {{ img.order + 1 }}</a>
                        @if (img.caption) {
                          <p class="caption">{{ img.caption }}</p>
                        }
                        <button class="danger small" (click)="deleteImage(project.id, img.id)">Delete</button>
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
                        <input formControlName="url" type="url" />
                      </div>
                      <div class="form-group">
                        <label>Caption</label>
                        <input formControlName="caption" type="text" />
                      </div>
                    </div>
                    <div class="actions">
                      <button type="submit" class="primary small">Add Image</button>
                      <button type="button" class="small" (click)="cancelImage()">Cancel</button>
                    </div>
                  </form>
                } @else {
                  <button class="secondary small" (click)="startAddImage(project.id)">+ Add Image</button>
                }

                <div class="actions">
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
                <label>Description</label>
                <textarea formControlName="description" rows="3"></textarea>
              </div>

              <div class="form-group">
                <label>Achievements</label>
                <textarea formControlName="achievements" rows="3"></textarea>
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
    .description,
    .achievements,
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
      description: [''],
      role: [''],
      achievements: [''],
      techStack: [''],
      startDate: [''],
      endDate: [''],
      url: [''],
      archived: [false]
    });

    this.imageForm = this.fb.group({
      url: ['', Validators.required],
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
  }

  startEdit(project: Project): void {
    this.editingId = project.id;
    this.isAddingNew = false;
    this.projectForm?.patchValue({
      title: project.title,
      summary: project.summary || '',
      description: project.description || '',
      role: project.role || '',
      achievements: project.achievements || '',
      techStack: project.techStack || '',
      startDate: project.startDate ? project.startDate.split('T')[0] : '',
      endDate: project.endDate ? project.endDate.split('T')[0] : '',
      url: project.url || '',
      archived: project.archived
    });
  }

  async addProject(): Promise<void> {
    if (!this.projectForm?.valid) return;

    try {
      await this.projectService.createProject(this.projectForm.value);
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

  startAddImage(projectId: number): void {
    this.addingImageFor = projectId;
    this.imageForm?.reset();
  }

  async addImage(projectId: number): Promise<void> {
    if (!this.imageForm?.valid) return;

    try {
      await this.projectService.addImage(projectId, this.imageForm.value);
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
    this.projectForm?.reset({ archived: false });
    this.imageForm?.reset();
  }

  cancelImage(): void {
    this.addingImageFor = null;
    this.imageForm?.reset();
  }
}
