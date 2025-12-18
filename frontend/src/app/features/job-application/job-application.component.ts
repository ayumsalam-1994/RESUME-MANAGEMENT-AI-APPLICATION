import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';

import {
  JobApplication,
  JobApplicationService
} from '../../core/services/jobApplication.service';
import { Company, CompanyService } from '../../core/services/company.service';

@Component({
  selector: 'app-job-applications',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="container">
      <div class="header">
        <div>
          <h2>Job Applications</h2>
          <p class="subtext">Track your job search targets and applications</p>
        </div>
        <div class="filters">
          <select [(ngModel)]="selectedStatus" (change)="filterByStatus()">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="applied">Applied</option>
            <option value="interviewing">Interviewing</option>
            <option value="offer">Offer</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </div>
      </div>

      @if (applicationService.errorSignal()) {
        <div class="error-message">
          {{ applicationService.errorSignal() }}
          <button (click)="applicationService.clearError()">Dismiss</button>
        </div>
      }

      @if (applicationService.loadingSignal()) {
        <p class="loading">Loading applications...</p>
      }

      <div class="application-list">
        @for (app of applicationService.applicationsSignal(); track app.id) {
          <div class="application-card" [attr.data-status]="app.status">
            @if (editingId === app.id) {
              <!-- Edit Form -->
              <form [formGroup]="applicationForm" (ngSubmit)="saveApplication(app.id)">
                <div class="form-group">
                  <label>Company</label>
                  <select formControlName="companyId">
                    <option value="">Select company...</option>
                    @for (company of companyService.companiesSignal(); track company.id) {
                      <option [value]="company.id">{{ company.name }}</option>
                    }
                  </select>
                  <button type="button" class="link-btn" (click)="showCompanyForm = !showCompanyForm">
                    + Add New Company
                  </button>
                </div>

                @if (showCompanyForm) {
                  <div class="company-form">
                    <input [(ngModel)]="newCompanyName" [ngModelOptions]="{standalone: true}" placeholder="Company name" />
                    <button type="button" class="small" (click)="addCompany()">Add</button>
                    <button type="button" class="small ghost" (click)="showCompanyForm = false">Cancel</button>
                  </div>
                }

                <div class="form-group">
                  <label>Job Title</label>
                  <input formControlName="jobTitle" type="text" />
                </div>

                <div class="form-group">
                  <label>Job Description</label>
                  <textarea formControlName="jobDescription" rows="6"></textarea>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Platform</label>
                    <input formControlName="platform" type="text" placeholder="LinkedIn, Indeed..." />
                  </div>
                  <div class="form-group">
                    <label>Application URL</label>
                    <input formControlName="applicationUrl" type="url" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Contact Person</label>
                    <input formControlName="contactPerson" type="text" />
                  </div>
                  <div class="form-group">
                    <label>Date Applied</label>
                    <input formControlName="dateApplied" type="date" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Status</label>
                    <select formControlName="status">
                      <option value="draft">Draft</option>
                      <option value="applied">Applied</option>
                      <option value="interviewing">Interviewing</option>
                      <option value="offer">Offer</option>
                      <option value="rejected">Rejected</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label>Notes</label>
                  <textarea formControlName="notes" rows="3"></textarea>
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
                  <h3>{{ app.jobTitle }}</h3>
                  <p class="company">{{ app.company?.name || 'Unknown Company' }}</p>
                  <span class="status-badge" [attr.data-status]="app.status">{{ app.status }}</span>
                </div>
              </div>

              <div class="job-info">
                @if (app.platform) {
                  <p><strong>Platform:</strong> {{ app.platform }}</p>
                }
                @if (app.applicationUrl) {
                  <p><strong>URL:</strong> <a [href]="app.applicationUrl" target="_blank">{{ app.applicationUrl }}</a></p>
                }
                @if (app.contactPerson) {
                  <p><strong>Contact:</strong> {{ app.contactPerson }}</p>
                }
                @if (app.dateApplied) {
                  <p><strong>Applied:</strong> {{ app.dateApplied | date: 'MMM dd, yyyy' }}</p>
                }
              </div>

              <div class="description">
                <h4>Job Description</h4>
                <p>{{ app.jobDescription }}</p>
              </div>

              @if (app.notes) {
                <div class="notes">
                  <h4>Notes</h4>
                  <p>{{ app.notes }}</p>
                </div>
              }

              <div class="actions">
                <button class="secondary" (click)="startEdit(app)">Edit</button>
                <button class="danger" (click)="deleteApplicationItem(app.id)">Delete</button>
                <button class="primary" (click)="generateResume(app.id)">Generate AI Resume</button>
                <button class="ghost" (click)="toggleResumes(app.id)">
                  @if (resumePanels[app.id]) { Hide Resumes } @else { Show Resumes }
                </button>
              </div>

              @if (resumePanels[app.id]) {
                <div class="resume-panel">
                  <div class="resume-actions">
                    <button class="small" (click)="refreshResumes(app.id)">Refresh</button>
                  </div>
                  @if (resumesByApp[app.id]?.length) {
                    <div class="resume-list">
                      @for (resume of resumesByApp[app.id]; track resume.id) {
                        <div class="resume-item">
                          <div class="resume-meta">
                            <strong>Version {{ resume.version }}</strong>
                            <span>• {{ resume.createdAt | date: 'MMM dd, yyyy HH:mm' }}</span>
                          </div>
                          <pre class="resume-content">{{ resume.content | json }}</pre>
                        </div>
                      }
                    </div>
                  } @else {
                    <p class="muted">No resumes yet. Generate one above.</p>
                  }
                </div>
              }
            }
          </div>
        }
      </div>

      @if (!editingId && !isAddingNew) {
        <button class="secondary" (click)="startAddApplication()">+ Add Job Target</button>
      }

      @if (isAddingNew) {
        <div class="application-card add-form">
          <h3>Add Job Target</h3>
          <form [formGroup]="applicationForm" (ngSubmit)="addApplication()">
            <div class="form-group">
              <label>Company</label>
              <select formControlName="companyId">
                <option value="">Select company...</option>
                @for (company of companyService.companiesSignal(); track company.id) {
                  <option [value]="company.id">{{ company.name }}</option>
                }
              </select>
              <button type="button" class="link-btn" (click)="showCompanyForm = !showCompanyForm">
                + Add New Company
              </button>
            </div>

            @if (showCompanyForm) {
              <div class="company-form">
                <input [(ngModel)]="newCompanyName" [ngModelOptions]="{standalone: true}" placeholder="Company name" />
                <button type="button" class="small" (click)="addCompany()">Add</button>
                <button type="button" class="small ghost" (click)="showCompanyForm = false">Cancel</button>
              </div>
            }

            <div class="form-group">
              <label>Job Title</label>
              <input formControlName="jobTitle" type="text" />
            </div>

            <div class="form-group">
              <label>Job Description</label>
              <textarea formControlName="jobDescription" rows="6"></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Platform</label>
                <input formControlName="platform" type="text" placeholder="LinkedIn, Indeed..." />
              </div>
              <div class="form-group">
                <label>Application URL</label>
                <input formControlName="applicationUrl" type="url" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Contact Person</label>
                <input formControlName="contactPerson" type="text" />
              </div>
              <div class="form-group">
                <label>Date Applied</label>
                <input formControlName="dateApplied" type="date" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Status</label>
                <select formControlName="status">
                  <option value="draft">Draft</option>
                  <option value="applied">Applied</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="offer">Offer</option>
                  <option value="rejected">Rejected</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Notes</label>
              <textarea formControlName="notes" rows="3"></textarea>
            </div>

            <div class="actions">
              <button type="submit" class="primary">Add</button>
              <button type="button" (click)="cancelEdit()">Cancel</button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
  styles: `
    .container {
      max-width: 1000px;
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

    .filters select {
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
    }

    .error-message {
      background: #f8d7da;
      color: #721c24;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;

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

    .application-list {
      display: grid;
      gap: 16px;
      margin-bottom: 24px;
    }

    .application-card {
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      border-left: 4px solid #6c757d;

      &[data-status="draft"] { border-left-color: #6c757d; }
      &[data-status="applied"] { border-left-color: #007bff; }
      &[data-status="interviewing"] { border-left-color: #ffc107; }
      &[data-status="offer"] { border-left-color: #28a745; }
      &[data-status="rejected"] { border-left-color: #dc3545; }
      &[data-status="withdrawn"] { border-left-color: #6c757d; }
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    h3 {
      margin: 0 0 6px;
    }

    .company {
      margin: 0;
      color: #555;
      font-weight: 600;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: white;
      margin-top: 8px;

      &[data-status="draft"] { background: #6c757d; }
      &[data-status="applied"] { background: #007bff; }
      &[data-status="interviewing"] { background: #ffc107; color: #333; }
      &[data-status="offer"] { background: #28a745; }
      &[data-status="rejected"] { background: #dc3545; }
      &[data-status="withdrawn"] { background: #6c757d; }
    }

    .job-info {
      margin: 12px 0;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;

      p {
        margin: 6px 0;
        font-size: 14px;
      }

      a {
        color: #007bff;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }
    }

    .description, .notes {
      margin: 12px 0;

      h4 {
        margin: 0 0 8px;
        font-size: 14px;
        color: #333;
      }

      p {
        margin: 0;
        color: #555;
        line-height: 1.6;
        white-space: pre-wrap;
      }
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

    .company-form {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      padding: 12px;
      background: #f0f0f0;
      border-radius: 6px;

      input {
        flex: 1;
      }
    }

    label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
    }

    input, textarea, select {
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

      &.link-btn {
        background: none;
        color: #007bff;
        padding: 4px 0;
        text-decoration: underline;
        font-size: 13px;
      }
    }

    .resume-panel {
      margin-top: 12px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
    }

    .resume-actions {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 8px;
    }

    .resume-list {
      display: grid;
      gap: 10px;
    }

    .resume-item {
      background: white;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 10px;
    }

    .resume-meta {
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: 13px;
      margin-bottom: 6px;
    }

    .resume-content {
      margin: 0;
      white-space: pre-wrap;
      font-size: 12px;
      background: #f6f6f6;
      padding: 8px;
      border-radius: 4px;
      border: 1px solid #eee;
    }

    .muted { color: #777; }
  `,
})
export class JobApplicationComponent implements OnInit {
  applicationForm!: FormGroup;
  isAddingNew = false;
  editingId: number | null = null;
  selectedStatus = '';
  showCompanyForm = false;
  newCompanyName = '';
  resumesByApp: Record<number, any[]> = {};
  resumePanels: Record<number, boolean> = {};

  constructor(
    public applicationService: JobApplicationService,
    public companyService: CompanyService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadApplications();
    this.loadCompanies();
  }

  private initializeForm(): void {
    this.applicationForm = this.fb.group({
      companyId: ['', Validators.required],
      jobTitle: ['', Validators.required],
      jobDescription: ['', Validators.required],
      platform: [''],
      applicationUrl: [''],
      contactPerson: [''],
      dateApplied: [''],
      status: ['draft'],
      notes: ['']
    });
  }

  private async loadApplications(): Promise<void> {
    try {
      await this.applicationService.getApplications();
    } catch (error) {
      console.error('Failed to load applications:', error);
    }
  }

  private async loadCompanies(): Promise<void> {
    try {
      await this.companyService.getCompanies();
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  }

  async filterByStatus(): Promise<void> {
    try {
      await this.applicationService.getApplications(this.selectedStatus || undefined);
    } catch (error) {
      console.error('Failed to filter applications:', error);
    }
  }

  startAddApplication(): void {
    this.isAddingNew = true;
    this.editingId = null;
    this.applicationForm.reset({ status: 'draft' });
  }

  startEdit(app: JobApplication): void {
    this.editingId = app.id;
    this.isAddingNew = false;
    this.applicationForm.patchValue({
      companyId: app.companyId,
      jobTitle: app.jobTitle,
      jobDescription: app.jobDescription,
      platform: app.platform || '',
      applicationUrl: app.applicationUrl || '',
      contactPerson: app.contactPerson || '',
      dateApplied: app.dateApplied ? app.dateApplied.split('T')[0] : '',
      status: app.status,
      notes: app.notes || ''
    });
  }

  async addApplication(): Promise<void> {
    if (!this.applicationForm.valid) return;

    try {
      await this.applicationService.createApplication(this.applicationForm.value);
      this.cancelEdit();
      alert('Job target added successfully!');
    } catch (error) {
      console.error('Failed to add application:', error);
    }
  }

  async saveApplication(applicationId: number): Promise<void> {
    if (!this.applicationForm.valid) return;

    try {
      await this.applicationService.updateApplication(applicationId, this.applicationForm.value);
      this.cancelEdit();
      alert('Application updated successfully!');
    } catch (error) {
      console.error('Failed to update application:', error);
    }
  }

  async deleteApplicationItem(applicationId: number): Promise<void> {
    if (!confirm('Delete this job application?')) return;

    try {
      await this.applicationService.deleteApplication(applicationId);
      alert('Application deleted successfully!');
    } catch (error) {
      console.error('Failed to delete application:', error);
    }
  }

  async addCompany(): Promise<void> {
    if (!this.newCompanyName.trim()) return;

    try {
      const company = await this.companyService.createCompany({
        name: this.newCompanyName.trim()
      });
      this.applicationForm.patchValue({ companyId: company.id });
      this.showCompanyForm = false;
      this.newCompanyName = '';
    } catch (error) {
      console.error('Failed to add company:', error);
    }
  }

  cancelEdit(): void {
    this.isAddingNew = false;
    this.editingId = null;
    this.showCompanyForm = false;
    this.newCompanyName = '';
    this.applicationForm.reset({ status: 'draft' });
  }

  async generateResume(applicationId: number): Promise<void> {
    try {
      await this.applicationService.generateResume(applicationId);
      await this.refreshResumes(applicationId);
      alert('Resume generated successfully.');
      this.resumePanels[applicationId] = true;
    } catch (error) {
      console.error('Failed to generate resume:', error);
      alert('Failed to generate resume.');
    }
  }

  async refreshResumes(applicationId: number): Promise<void> {
    try {
      const items = await this.applicationService.listResumes(applicationId);
      this.resumesByApp[applicationId] = items;
    } catch (error) {
      console.error('Failed to load resumes:', error);
    }
  }

  async toggleResumes(applicationId: number): Promise<void> {
    const currently = !!this.resumePanels[applicationId];
    this.resumePanels[applicationId] = !currently;
    if (!currently) {
      await this.refreshResumes(applicationId);
    }
  }
}
