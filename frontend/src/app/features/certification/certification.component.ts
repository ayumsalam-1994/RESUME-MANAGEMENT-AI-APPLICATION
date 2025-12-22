import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';

import {
  Certification,
  CertificationService
} from '../../core/services/certification.service';

@Component({
  selector: 'app-certifications',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="container">
      <div class="header">
        <div>
          <h2>Certifications</h2>
          <p class="subtext">Keep your certifications with attachments in one place</p>
        </div>
        @if (!isAddingNew && !editingId) {
          <button class="secondary" (click)="startAddCertification()">+ Add Certification</button>
        }
      </div>

      @if (certificationService.errorSignal()) {
        <div class="error-message">
          {{ certificationService.errorSignal() }}
          <button (click)="certificationService.clearError()">Dismiss</button>
        </div>
      }

      @if (certificationService.loadingSignal()) {
        <p class="loading">Loading certifications...</p>
      }

      @if (certForm) {
        @if (isAddingNew || editingId) {
          <div class="card">
            <h3>{{ editingId ? 'Edit Certification' : 'Add Certification' }}</h3>
            <form [formGroup]="certForm" (ngSubmit)="submitCertification()">
              <div class="form-group">
                <label>Title</label>
                <input formControlName="title" type="text" />
              </div>

              <div class="form-group">
                <label>Description</label>
                <textarea formControlName="description" rows="3"></textarea>
              </div>

              <div class="form-group">
                <label>Attachment URL (optional)</label>
                <input formControlName="fileUrl" type="url" placeholder="https://..." />
              </div>

              <div class="form-group">
                <label>Upload file or image (optional)</label>
                <input type="file" (change)="onFileChange($event)" accept="image/*,.pdf" />
                @if (selectedFile) {
                  <p class="hint">Selected: {{ selectedFile.name }}</p>
                }
              </div>

              <div class="actions">
                <button type="submit" class="primary">{{ editingId ? 'Save Changes' : 'Add Certification' }}</button>
                <button type="button" (click)="cancelEdit()">Cancel</button>
              </div>
            </form>
          </div>
        }

        @if (certificationService.certificationsSignal().length === 0 && !isAddingNew && !editingId) {
          <p class="empty">No certifications yet. Add your first one.</p>
        }

        @if (certificationService.certificationsSignal().length > 0) {
          <div class="cert-list">
            @for (cert of certificationService.certificationsSignal(); track cert.id) {
              <div class="card">
                <div class="card-header">
                  <div>
                    <h3>{{ cert.title }}</h3>
                    <p class="dates">Updated {{ cert.updatedAt | date: 'mediumDate' }}</p>
                  </div>
                  <div class="actions">
                    <button class="secondary" (click)="startEdit(cert)">Edit</button>
                    <button class="danger" (click)="deleteCertification(cert.id)">Delete</button>
                  </div>
                </div>

                @if (cert.description) {
                  <p class="description">{{ cert.description }}</p>
                }

                @if (cert.fileUrl) {
                  <p class="link">
                    <a [href]="cert.fileUrl" target="_blank" rel="noopener">View attachment</a>
                  </p>
                }
              </div>
            }
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

    .loading,
    .empty {
      color: #666;
    }

    .card {
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
    }

    .cert-list {
      display: grid;
      gap: 12px;
    }

    .form-group {
      margin-bottom: 12px;
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

    .actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
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

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .link a {
      color: #0056b3;
      text-decoration: underline;
    }

    .description {
      margin: 8px 0;
      color: #444;
    }

    .dates {
      margin: 0;
      color: #777;
      font-size: 13px;
    }

    .hint {
      margin: 4px 0;
      color: #666;
      font-size: 12px;
    }

    @media (max-width: 768px) {
      .container {
        padding: 12px;
      }

      h2 {
        font-size: 20px;
      }

      .card {
        padding: 15px;
      }

      .card-header {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }

      /* Card action buttons (Edit/Delete): right-aligned, fixed/short width, stacked */
      .card-header .actions {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: flex-end;
        gap: 8px;
        width: auto; /* override any generic width */
      }

      .card-header .actions button {
        width: 120px;
        min-height: 44px;
      }

      /* Keep form actions full-width and stacked for easier tapping */
      form .actions {
        display: flex;
        flex-direction: column;
        width: 100%;
        gap: 8px;
      }

      form .actions button {
        width: 100%;
        min-height: 44px;
      }

      input, textarea {
        font-size: 16px; /* Prevent iOS zoom */
      }
    }

    @media (max-width: 480px) {
      h2 {
        font-size: 18px;
      }
    }
  `,
})
export class CertificationComponent implements OnInit {
  certForm!: FormGroup;
  isAddingNew = false;
  editingId: number | null = null;
  selectedFile: File | null = null;

  constructor(
    public certificationService: CertificationService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadCertifications();
  }

  private initializeForm(): void {
    this.certForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      fileUrl: [''],
    });
  }

  private async loadCertifications(): Promise<void> {
    try {
      await this.certificationService.getCertifications();
    } catch (error) {
      console.error('Failed to load certifications:', error);
    }
  }

  startAddCertification(): void {
    this.isAddingNew = true;
    this.editingId = null;
    this.selectedFile = null;
    this.certForm?.reset();
  }

  startEdit(cert: Certification): void {
    this.editingId = cert.id;
    this.isAddingNew = false;
    this.selectedFile = null;
    this.certForm?.patchValue({
      title: cert.title,
      description: cert.description || '',
      fileUrl: cert.fileUrl || '',
    });

    // Scroll to top so the edit form is immediately visible
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // no-op if window is unavailable
    }
  }

  async submitCertification(): Promise<void> {
    if (!this.certForm?.valid) return;

    const formValue = this.certForm.value as any;
    const payload: any = {
      title: formValue.title,
    };
    if (formValue.description && formValue.description.trim()) {
      payload.description = formValue.description;
    }
    if (formValue.fileUrl && formValue.fileUrl.trim()) {
      payload.fileUrl = formValue.fileUrl;
    }

    try {
      if (this.selectedFile) {
        const { fileUrl } = await this.certificationService.uploadFile(this.selectedFile);
        payload.fileUrl = fileUrl;
      }

      if (this.editingId) {
        await this.certificationService.updateCertification(this.editingId, payload);
        alert('Certification updated successfully!');
      } else {
        await this.certificationService.createCertification(payload);
        alert('Certification added successfully!');
      }

      this.cancelEdit();
    } catch (error) {
      console.error('Failed to save certification:', error);
    }
  }

  async deleteCertification(certificationId: number): Promise<void> {
    if (!confirm('Delete this certification?')) return;

    try {
      await this.certificationService.deleteCertification(certificationId);
      alert('Certification deleted successfully!');
    } catch (error) {
      console.error('Failed to delete certification:', error);
    }
  }

  cancelEdit(): void {
    this.isAddingNew = false;
    this.editingId = null;
    this.selectedFile = null;
    this.certForm?.reset();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile = file;
  }
}
