import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';

import {
  JobApplication,
  JobApplicationService
} from '../../core/services/jobApplication.service';
import { Company, CompanyService } from '../../core/services/company.service';
import { ProfileService } from '../../core/services/profile.service';
import { ExperienceService } from '../../core/services/experience.service';
import { ProjectService } from '../../core/services/project.service';

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
                    <button class="small primary" (click)="copyPrompt(app)">Copy Prompt</button>
                    <button class="small secondary" (click)="startImport(app.id)">Import Resume</button>
                    <button class="small ghost" (click)="toggleRaw(app.id)">
                      @if (rawPanels[app.id]) { Hide Raw } @else { Show Raw }
                    </button>
                  </div>
                  @if (importingTo === app.id) {
                    <div class="import-panel">
                      <h4>Paste Resume JSON</h4>
                      <textarea
                        [(ngModel)]="importContent"
                        placeholder="Paste the JSON from ChatGPT here..."
                        rows="8"
                      ></textarea>
                      <div class="import-actions">
                        <button class="primary small" (click)="submitImport(app.id)">Import</button>
                        <button class="ghost small" (click)="cancelImport()">Cancel</button>
                      </div>
                    </div>
                  }
                  @if (resumesByApp[app.id]?.length) {
                    <div class="resume-list">
                      @for (resume of resumesByApp[app.id]; track resume.id) {
                        <div class="resume-item">
                          @if (resume.parsed?.meta?.generator === 'fallback') {
                            <span class="badge fallback">Fallback</span>
                          }
                          <div class="resume-meta">
                            <strong>Version {{ resume.version }}</strong>
                            <span>• {{ resume.createdAt | date: 'MMM dd, yyyy HH:mm' }}</span>
                            <button class="success tiny" (click)="exportResumePDF(app.id, resume.id)">Export PDF</button>
                            <button class="danger tiny" (click)="deleteResumeVersion(app.id, resume.id)">Delete</button>
                          </div>
                          @if (!rawPanels[app.id]) {
                            @if (resume.parsed?.summary) {
                              <p class="summary">{{ resume.parsed.summary }}</p>
                            }
                            @if (resume.parsed?.skills?.length) {
                              <div class="chips">
                                @for (skill of resume.parsed.skills; track skill) {
                                  <span class="chip">{{ skill }}</span>
                                }
                              </div>
                            }
                            @if (resume.parsed?.experience?.length) {
                              <div class="section">
                                <h5>Experience</h5>
                                @for (exp of resume.parsed.experience; track exp.company + exp.role + exp.start) {
                                  <div class="exp-item">
                                    <div class="exp-header">
                                      <strong>{{ exp.role }}</strong>
                                      <span class="company">@ {{ exp.company }}</span>
                                      <span class="dates">• {{ exp.start }} - {{ exp.end || 'Present' }}</span>
                                    </div>
                                    @if (exp.bullets?.length) {
                                      <ul class="bullets">
                                        @for (b of exp.bullets; track b) { <li>{{ b }}</li> }
                                      </ul>
                                    }
                                  </div>
                                }
                              </div>
                            }
                            @if (resume.parsed?.projects?.length) {
                              <div class="section">
                                <h5>Projects</h5>
                                @for (proj of resume.parsed.projects; track proj.title) {
                                  <div class="proj-item">
                                    <strong>{{ proj.title }}</strong>
                                    @if (proj.description) { <p>{{ proj.description }}</p> }
                                    @if (proj.tech?.length) {
                                      <div class="chips">
                                        @for (t of proj.tech; track t) { <span class="chip alt">{{ t }}</span> }
                                      </div>
                                    }
                                  </div>
                                }
                              </div>
                            }
                          } @else {
                            <pre class="resume-content">{{ resume.content | json }}</pre>
                          }
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

      &.success {
        background: #28a745;
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

      &.tiny {
        padding: 2px 6px;
        font-size: 11px;
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
      gap: 6px;
    }

    .import-panel {
      background: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;

      h4 { margin: 0 0 8px; font-size: 13px; }
      textarea {
        width: 100%;
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-family: monospace;
        font-size: 12px;
      }
      .import-actions {
        display: flex;
        gap: 6px;
        margin-top: 8px;
      }
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

    .badge.fallback {
      display: inline-block;
      padding: 2px 6px;
      font-size: 11px;
      border-radius: 10px;
      background: #ffe08a;
      color: #5c4b1b;
      border: 1px solid #e5c970;
      margin-bottom: 6px;
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

    .summary { color: #333; margin: 4px 0 8px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 8px; }
    .chip { background: #e7f3ff; color: #004085; border: 1px solid #99caff; border-radius: 12px; padding: 2px 8px; font-size: 12px; }
    .chip.alt { background: #f1f3f5; color: #333; border-color: #ccc; }
    .section { margin-top: 8px; }
    .section h5 { margin: 0 0 6px; font-size: 13px; color: #444; }
    .exp-item { margin-bottom: 8px; }
    .exp-header { display: flex; gap: 8px; align-items: baseline; font-size: 13px; }
    .exp-header .company { color: #555; }
    .exp-header .dates { color: #777; }
    .bullets { margin: 6px 0 0; padding-left: 18px; }
    .proj-item { margin-bottom: 8px; }

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
  rawPanels: Record<number, boolean> = {};
  importingTo: number | null = null;
  importContent = '';

  constructor(
    public applicationService: JobApplicationService,
    public companyService: CompanyService,
    private profileService: ProfileService,
    private experienceService: ExperienceService,
    private projectService: ProjectService,
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
      const formValue = this.applicationForm.value;
      const payload: any = {
        companyId: Number(formValue.companyId),
        jobTitle: formValue.jobTitle,
        jobDescription: formValue.jobDescription,
        platform: formValue.platform || undefined,
        applicationUrl: formValue.applicationUrl || undefined,
        contactPerson: formValue.contactPerson || undefined,
        dateApplied: formValue.dateApplied || undefined,
        status: formValue.status || 'draft',
        notes: formValue.notes || undefined
      };
      
      // Remove undefined values
      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
      
      await this.applicationService.createApplication(payload);
      this.cancelEdit();
      alert('Job target added successfully!');
    } catch (error: any) {
      console.error('Failed to add application:', error);
      alert(`Error adding job target: ${error?.error?.error || error.message}`);
    }
  }

  async saveApplication(applicationId: number): Promise<void> {
    if (!this.applicationForm.valid) return;

    try {
      const formValue = this.applicationForm.value;
      const payload: any = {
        companyId: Number(formValue.companyId),
        jobTitle: formValue.jobTitle,
        jobDescription: formValue.jobDescription,
        platform: formValue.platform || undefined,
        applicationUrl: formValue.applicationUrl || undefined,
        contactPerson: formValue.contactPerson || undefined,
        dateApplied: formValue.dateApplied || undefined,
        status: formValue.status || 'draft',
        notes: formValue.notes || undefined
      };
      
      // Remove undefined values
      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
      
      await this.applicationService.updateApplication(applicationId, payload);
      this.cancelEdit();
      alert('Application updated successfully!');
    } catch (error: any) {
      console.error('Failed to update application:', error);
      alert(`Error updating job target: ${error?.error?.error || error.message}`);
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
      const parsed = items.map((r: any) => ({
        ...r,
        parsed: this.safeParse(r.content)
      }));
      this.resumesByApp[applicationId] = parsed;
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

  toggleRaw(applicationId: number): void {
    this.rawPanels[applicationId] = !this.rawPanels[applicationId];
  }

  private safeParse(content: any): any {
    if (!content) return null;
    if (typeof content === 'object') return content;
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async copyPrompt(app: any): Promise<void> {
    try {
      // Fetch user data
      const profile = await this.profileService.getProfile();
      const skills = await this.profileService.getUserSkills();
      const experiences = await this.experienceService.getUserExperiences();
      const projects = await this.projectService.getProjects(false); // only active projects

      // Format profile data
      let profileSection = `\n--- USER PROFILE DATA ---\n`;
      if (profile) {
        profileSection += `Phone: ${profile.phone || 'Not specified'}\n`;
        profileSection += `Location: ${profile.location || 'Not specified'}\n`;
        profileSection += `LinkedIn: ${profile.linkedin || 'Not specified'}\n`;
        profileSection += `GitHub: ${profile.github || 'Not specified'}\n`;
        profileSection += `Portfolio: ${profile.portfolio || 'Not specified'}\n`;
        if (profile.summary) {
          profileSection += `\nProfessional Summary:\n${profile.summary}\n`;
        }
        
        if (profile.educations && profile.educations.length > 0) {
          profileSection += `\nEducation:\n`;
          profile.educations.forEach((edu: any) => {
            profileSection += `  - ${edu.degree} in ${edu.field} from ${edu.institution} (${edu.startDate ? new Date(edu.startDate).getFullYear() : ''} - ${edu.endDate ? new Date(edu.endDate).getFullYear() : 'Present'})\n`;
          });
        }
      }

      // Format skills
      if (skills && skills.length > 0) {
        profileSection += `\nSkills:\n`;
        skills.forEach((userSkill: any) => {
          profileSection += `  - ${userSkill.skill.name}${userSkill.skill.category ? ` (${userSkill.skill.category})` : ''}${userSkill.level ? ` - ${userSkill.level}` : ''}\n`;
        });
      }

      // Format experiences
      let experienceSection = `\n--- USER EXPERIENCE ---\n`;
      if (experiences && experiences.length > 0) {
        experiences.forEach((exp: any) => {
          experienceSection += `\nCompany: ${exp.company}\n`;
          experienceSection += `Position: ${exp.position}\n`;
          experienceSection += `Duration: ${exp.startDate ? new Date(exp.startDate).toLocaleDateString() : 'N/A'} - ${exp.endDate ? new Date(exp.endDate).toLocaleDateString() : 'Present'}\n`;
          if (exp.location) experienceSection += `Location: ${exp.location}\n`;
          if (exp.description) experienceSection += `Description: ${exp.description}\n`;
          if (exp.bullets && exp.bullets.length > 0) {
            experienceSection += `Key Achievements:\n`;
            exp.bullets.forEach((bullet: any) => {
              experienceSection += `  - ${bullet.content}\n`;
            });
          }
        });
      } else {
        experienceSection += `No experience data available.\n`;
      }

      // Format projects
      let projectSection = `\n--- USER PROJECTS ---\n`;
      if (projects && projects.length > 0) {
        projects.filter((p: any) => !p.archived).forEach((proj: any) => {
          projectSection += `\nProject: ${proj.title}\n`;
          if (proj.summary) projectSection += `Summary: ${proj.summary}\n`;
          if (proj.description) projectSection += `Description: ${proj.description}\n`;
          if (proj.role) projectSection += `Role: ${proj.role}\n`;
          if (proj.achievements) projectSection += `Achievements: ${proj.achievements}\n`;
          if (proj.techStack) {
            projectSection += `Technologies: ${proj.techStack}\n`;
          }
          if (proj.url) projectSection += `URL: ${proj.url}\n`;
          if (proj.startDate) {
            projectSection += `Duration: ${new Date(proj.startDate).toLocaleDateString()} - ${proj.endDate ? new Date(proj.endDate).toLocaleDateString() : 'Present'}\n`;
          }
        });
      } else {
        projectSection += `No project data available.\n`;
      }

      const prompt = `You are an expert ATS resume writer. Generate a concise, ATS-safe resume in JSON format based on the following data.

--- JOB TARGET ---
Job Title: ${app.jobTitle}
Job Description:
${app.jobDescription}
${profileSection}${experienceSection}${projectSection}

--- INSTRUCTIONS ---
Using the user's profile, experience, and projects data above, create a tailored resume for the job target.

Output a JSON object with this exact structure:
{
  "summary": "Professional summary tailored to the job (2-3 sentences, emphasize relevant skills and experience)",
  "skills": ["skill1", "skill2", "skill3", ...],
  "experience": [
    {
      "company": "Company Name",
      "role": "Position Title",
      "start": "YYYY-MM",
      "end": "YYYY-MM or Present",
      "bullets": ["Achievement 1 with metrics", "Achievement 2 with impact", ...]
    }
  ],
  "projects": [
    {
      "title": "Project Name",
      "description": "Brief description emphasizing relevance to job",
      "tech": ["tech1", "tech2"]
    }
  ]
}

Guidelines:
- Focus on ATS-safe formatting, avoid special characters
- Avoid first person pronouns (I, my, we)
- Emphasize quantifiable impact and results
- Prioritize skills and experience most relevant to the job description
- Keep bullets concise and action-oriented
- Highlight and reframe my skills to be relevant for the position
- Do not use em-dash in your writing
- Use simple vocabulary that a Malaysian English speaker would normally use
- Use past tense for previous roles, present tense for current roles`;

      await navigator.clipboard.writeText(prompt);
      alert('Detailed prompt with your profile data copied to clipboard! Paste it into ChatGPT.');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy prompt. Please try again.');
    }
  }

  startImport(applicationId: number): void {
    this.importingTo = applicationId;
    this.importContent = '';
  }

  cancelImport(): void {
    this.importingTo = null;
    this.importContent = '';
  }

  async submitImport(applicationId: number): Promise<void> {
    if (!this.importContent.trim()) {
      alert('Please paste resume JSON content.');
      return;
    }

    try {
      await this.applicationService.importResume(applicationId, this.importContent);
      await this.refreshResumes(applicationId);
      this.cancelImport();
      alert('Resume imported successfully!');
    } catch (error: any) {
      console.error('Failed to import resume:', error);
      const msg = error?.error?.error || error?.message || 'Failed to import resume.';
      alert(`Import failed: ${msg}`);
    }
  }

  async deleteResumeVersion(applicationId: number, resumeId: number): Promise<void> {
    if (!confirm('Delete this resume version? This cannot be undone.')) return;

    try {
      await this.applicationService.deleteResume(applicationId, resumeId);
      await this.refreshResumes(applicationId);
      alert('Resume version deleted.');
    } catch (error: any) {
      console.error('Failed to delete resume:', error);
      alert('Failed to delete resume.');
    }
  }

  async exportResumePDF(applicationId: number, resumeId: number): Promise<void> {
    try {
      await this.applicationService.downloadResumePDF(applicationId, resumeId);
      alert('Resume PDF downloaded.');
    } catch (error: any) {
      console.error('Failed to download PDF:', error);
      alert('Failed to download PDF.');
    }
  }
}
