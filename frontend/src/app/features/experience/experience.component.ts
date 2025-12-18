import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ExperienceService, Experience } from '../../core/services/experience.service';

@Component({
  selector: 'app-experience',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="container">
      <h2>Work Experience</h2>

      @if (experienceService.errorSignal()) {
        <div class="error-message">
          {{ experienceService.errorSignal() }}
          <button (click)="experienceService.clearError()">Dismiss</button>
        </div>
      }

      @if (experienceService.loadingSignal()) {
        <p class="loading">Loading experiences...</p>
      } @else if (experienceForm) {
        <!-- Experience List -->
        @if (experienceService.experiencesSignal().length > 0) {
          <div class="experiences-list">
            @for (exp of experienceService.experiencesSignal(); track exp.id) {
              <div class="experience-card">
                @if (!isEditingId || isEditingId !== exp.id) {
                  <div class="experience-header">
                    <div>
                      <h3>{{ exp.position }}</h3>
                      <p class="company">{{ exp.company }}</p>
                      @if (exp.location) {
                        <p class="location">📍 {{ exp.location }}</p>
                      }
                      <p class="dates">
                        {{ exp.startDate | date: 'MMM yyyy' }} -
                        @if (exp.current) {
                          Present
                        } @else {
                          {{ exp.endDate | date: 'MMM yyyy' }}
                        }
                      </p>
                    </div>
                    <div class="actions">
                      <button (click)="editExperience(exp)" class="secondary">Edit</button>
                      <button (click)="deleteExperienceItem(exp.id)" class="danger">Delete</button>
                    </div>
                  </div>

                  @if (exp.description) {
                    <p class="description">{{ exp.description }}</p>
                  }

                  <!-- Bullets Display -->
                  @if (exp.bullets && exp.bullets.length > 0) {
                    <ul class="bullets">
                      @for (bullet of exp.bullets; track bullet.id) {
                        <li>{{ bullet.content }}</li>
                      }
                    </ul>
                  }

                  <div class="bullet-actions">
                    <button (click)="startAddBullet(exp.id)" class="secondary small">
                      + Add Bullet Point
                    </button>
                  </div>

                  <!-- Add Bullet Form -->
                  @if (addingBulletTo === exp.id) {
                    <form (ngSubmit)="addBulletPoint(exp.id)">
                      <div class="form-group">
                        <textarea
                          [(ngModel)]="newBulletContent"
                          name="bulletContent"
                          placeholder="e.g., Led team of 5 engineers to deliver..."
                          rows="3"
                          required
                        ></textarea>
                      </div>
                      <button type="submit" class="primary small">Add Bullet</button>
                      <button type="button" (click)="addingBulletTo = null" class="small">Cancel</button>
                    </form>
                  }
                } @else {
                  <!-- Edit Form -->
                  <form [formGroup]="experienceForm" (ngSubmit)="saveExperience(exp.id)">
                    <div class="form-group">
                      <label>Company</label>
                      <input formControlName="company" type="text" />
                    </div>

                    <div class="form-group">
                      <label>Position</label>
                      <input formControlName="position" type="text" />
                    </div>

                    <div class="form-group">
                      <label>Location</label>
                      <input formControlName="location" type="text" />
                    </div>

                    <div class="form-group">
                      <label>Start Date</label>
                      <input formControlName="startDate" type="date" />
                    </div>

                    <div class="form-group">
                      <label>End Date</label>
                      <input formControlName="endDate" type="date" />
                    </div>

                    <div class="form-group checkbox">
                      <label>
                        <input formControlName="current" type="checkbox" />
                        Currently Working Here
                      </label>
                    </div>

                    <div class="form-group">
                      <label>Description</label>
                      <textarea formControlName="description" rows="3"></textarea>
                    </div>

                    <button type="submit">Save Experience</button>
                    <button type="button" (click)="cancelEdit()">Cancel</button>
                  </form>
                }
              </div>
            }
          </div>
        }

        <!-- Add Experience Button -->
        @if (!isAddingNew && !isEditingId) {
          <button (click)="startAddExperience()" class="secondary">
            + Add Work Experience
          </button>
        }

        <!-- Add Experience Form -->
        @if (isAddingNew) {
          <div class="experience-card add-form">
            <h3>Add Work Experience</h3>
            <form [formGroup]="experienceForm" (ngSubmit)="addNewExperience()">
              <div class="form-group">
                <label>Company</label>
                <input formControlName="company" type="text" />
              </div>

              <div class="form-group">
                <label>Position</label>
                <input formControlName="position" type="text" />
              </div>

              <div class="form-group">
                <label>Location</label>
                <input formControlName="location" type="text" />
              </div>

              <div class="form-group">
                <label>Start Date</label>
                <input formControlName="startDate" type="date" />
              </div>

              <div class="form-group">
                <label>End Date</label>
                <input formControlName="endDate" type="date" />
              </div>

              <div class="form-group checkbox">
                <label>
                  <input formControlName="current" type="checkbox" />
                  Currently Working Here
                </label>
              </div>

              <div class="form-group">
                <label>Description</label>
                <textarea formControlName="description" rows="3"></textarea>
              </div>

              <button type="submit">Add Experience</button>
              <button type="button" (click)="cancelEdit()">Cancel</button>
            </form>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }

    h2 {
      margin-bottom: 20px;
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

    .experiences-list {
      margin-bottom: 30px;
    }

    .experience-card {
      background: white;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
      margin-bottom: 15px;

      &.add-form {
        background: #f9f9f9;
      }
    }

    .experience-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
    }

    h3 {
      margin: 0 0 5px;
      color: #333;
    }

    .company {
      margin: 0;
      font-weight: 600;
      color: #007bff;
    }

    .location {
      margin: 5px 0;
      color: #666;
      font-size: 14px;
    }

    .dates {
      margin: 5px 0;
      color: #999;
      font-size: 14px;
    }

    .description {
      margin: 10px 0;
      color: #555;
      line-height: 1.5;
    }

    .bullets {
      margin: 15px 0;
      padding-left: 20px;

      li {
        margin: 8px 0;
        color: #555;
        line-height: 1.6;
      }
    }

    .actions {
      display: flex;
      gap: 10px;

      button {
        padding: 6px 12px;
        font-size: 13px;
      }
    }

    .bullet-actions {
      margin-top: 10px;
    }

    .form-group {
      margin-bottom: 15px;
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
      padding: 10px 16px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-right: 10px;
      margin-bottom: 10px;

      &:hover:not(:disabled) {
        background: #0056b3;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      &.secondary {
        background: #6c757d;

        &:hover {
          background: #5a6268;
        }
      }

      &.danger {
        background: #dc3545;

        &:hover {
          background: #c82333;
        }
      }

      &.small {
        padding: 6px 12px;
        font-size: 13px;
      }
    }

    .checkbox {
      display: flex;

      label {
        display: flex;
        align-items: center;
        margin: 0;

        input {
          width: auto;
          margin-right: 8px;
        }
      }
    }
  `,
})
export class ExperienceComponent implements OnInit {
  experienceForm: FormGroup | null = null;
  isAddingNew = false;
  isEditingId: string | null = null;
  addingBulletTo: string | null = null;
  newBulletContent = '';

  constructor(
    public experienceService: ExperienceService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadExperiences();
  }

  private initializeForm(): void {
    this.experienceForm = this.fb.group({
      company: ['', Validators.required],
      position: ['', Validators.required],
      location: [''],
      startDate: ['', Validators.required],
      endDate: [''],
      current: [false],
      description: [''],
    });
  }

  private async loadExperiences(): Promise<void> {
    try {
      await this.experienceService.getUserExperiences();
    } catch (error) {
      console.error('Failed to load experiences:', error);
    }
  }

  startAddExperience(): void {
    this.isAddingNew = true;
    this.experienceForm?.reset();
  }

  editExperience(exp: Experience): void {
    this.isEditingId = exp.id;
    this.experienceForm?.patchValue({
      company: exp.company,
      position: exp.position,
      location: exp.location || '',
      startDate: new Date(exp.startDate).toISOString().split('T')[0],
      endDate: exp.endDate
        ? new Date(exp.endDate).toISOString().split('T')[0]
        : '',
      current: exp.current,
      description: exp.description || '',
    });
  }

  async saveExperience(experienceId: string): Promise<void> {
    if (!this.experienceForm?.valid) return;

    try {
      const formValue = this.experienceForm.value;
      const payload: any = {
        company: formValue.company,
        position: formValue.position,
        startDate: formValue.startDate,
        current: formValue.current ?? false,
      };
      if (formValue.location && formValue.location.trim()) {
        payload.location = formValue.location;
      }
      if (formValue.endDate && formValue.endDate.trim()) {
        payload.endDate = formValue.endDate;
      }
      if (formValue.description && formValue.description.trim()) {
        payload.description = formValue.description;
      }
      
      await this.experienceService.updateExperience(
        experienceId,
        payload
      );
      this.cancelEdit();
      alert('Experience updated successfully!');
    } catch (error) {
      console.error('Failed to update experience:', error);
      alert('Failed to update experience. Check console for details.');
    }
  }

  async addNewExperience(): Promise<void> {
    if (!this.experienceForm?.valid) return;

    try {
      const formValue = this.experienceForm.value;
      const payload: any = {
        company: formValue.company,
        position: formValue.position,
        startDate: formValue.startDate,
        current: formValue.current ?? false,
      };
      if (formValue.location && formValue.location.trim()) {
        payload.location = formValue.location;
      }
      if (formValue.endDate && formValue.endDate.trim()) {
        payload.endDate = formValue.endDate;
      }
      if (formValue.description && formValue.description.trim()) {
        payload.description = formValue.description;
      }
      
      await this.experienceService.createExperience(payload);
      this.cancelEdit();
      alert('Experience added successfully!');
    } catch (error) {
      console.error('Failed to add experience:', error);
      alert('Failed to add experience. Check console for details.');
    }
  }

  async deleteExperienceItem(experienceId: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this experience?')) return;

    try {
      await this.experienceService.deleteExperience(experienceId);
      alert('Experience deleted successfully!');
    } catch (error) {
      console.error('Failed to delete experience:', error);
    }
  }

  startAddBullet(experienceId: string): void {
    this.addingBulletTo = experienceId;
    this.newBulletContent = '';
  }

  async addBulletPoint(experienceId: string): Promise<void> {
    if (!this.newBulletContent.trim()) return;

    try {
      await this.experienceService.addBullet(
        experienceId,
        this.newBulletContent
      );
      this.newBulletContent = '';
      this.addingBulletTo = null;
      alert('Bullet point added successfully!');
    } catch (error) {
      console.error('Failed to add bullet:', error);
    }
  }

  cancelEdit(): void {
    this.isAddingNew = false;
    this.isEditingId = null;
    this.addingBulletTo = null;
    this.newBulletContent = '';
    this.experienceForm?.reset();
  }
}
