import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem
} from '@angular/cdk/drag-drop';

import {
  JobApplication,
  JobApplicationService
} from '../../core/services/jobApplication.service';
import { Company, CompanyService } from '../../core/services/company.service';

interface StatusColumn {
  key: string;
  label: string;
  color: string;
}

const STATUS_COLUMNS: StatusColumn[] = [
  { key: 'draft', label: 'Draft', color: '#6c757d' },
  { key: 'applied', label: 'Applied', color: '#007bff' },
  { key: 'interviewing', label: 'Interviewing', color: '#ffc107' },
  { key: 'offer', label: 'Offer', color: '#28a745' },
  { key: 'rejected', label: 'Rejected', color: '#dc3545' },
  { key: 'withdrawn', label: 'Withdrawn', color: '#6c757d' }
];

@Component({
  selector: 'app-job-applications',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DragDropModule],
  template: `
    <div class="board-page">
      <div class="page-header">
        <div>
          <h2>Job Applications</h2>
          <p class="subtext">Drag a card between columns to update its status</p>
        </div>
        <button class="primary" (click)="startAddApplication()">+ Add Job Target</button>
      </div>

      @if (applicationService.errorSignal()) {
        <div class="error-message">
          {{ applicationService.errorSignal() }}
          <button (click)="applicationService.clearError()">Dismiss</button>
        </div>
      }

      @if (applicationService.loadingSignal() && !isBoardPopulated()) {
        <p class="loading">Loading applications...</p>
      }

      <!-- Mobile column-jump tabs -->
      <div class="column-tabs">
        @for (col of statusColumns; track col.key) {
          <button
            class="column-tab"
            [style.borderColor]="col.color"
            (click)="scrollToColumn(col.key)"
          >
            {{ col.label }}
            <span class="count">{{ columns[col.key]?.length || 0 }}</span>
          </button>
        }
      </div>

      <div class="board" cdkDropListGroup>
        @for (col of statusColumns; track col.key) {
          <div class="kanban-column" [id]="'column-' + col.key">
            <div class="column-header" [style.borderTopColor]="col.color">
              <span>{{ col.label }}</span>
              <span class="count">{{ columns[col.key]?.length || 0 }}</span>
            </div>

            <div
              class="column-body"
              cdkDropList
              [id]="'col-' + col.key"
              [cdkDropListData]="columns[col.key]"
              [cdkDropListConnectedTo]="connectedDropLists"
              (cdkDropListDropped)="drop($event, col.key)"
            >
              @for (app of columns[col.key]; track app.id) {
                <div
                  class="kanban-card"
                  cdkDrag
                  [cdkDragData]="app"
                  [class.moving]="movingId === app.id"
                  [style.borderLeftColor]="col.color"
                >
                  <div class="card-top">
                    <h4>{{ app.jobTitle }}</h4>
                    <button class="menu-btn" (click)="toggleMenu(app.id)">⋮</button>
                  </div>
                  <p class="company">{{ app.company?.name || 'Unknown Company' }}</p>
                  @if (app.dateApplied) {
                    <p class="meta">Applied {{ app.dateApplied | date: 'MMM dd, yyyy' }}</p>
                  }
                  @if (app.platform) {
                    <p class="meta">{{ app.platform }}</p>
                  }

                  @if (openMenuId === app.id) {
                    <div class="card-menu">
                      <button (click)="startEdit(app)">Edit</button>
                      <button class="danger" (click)="deleteApplicationItem(app.id)">Delete</button>
                    </div>
                  }

                  <div class="card-actions">
                    <select
                      class="move-select"
                      (click)="$event.stopPropagation()"
                      (change)="onMoveSelect(app, $event)"
                    >
                      @for (opt of statusColumns; track opt.key) {
                        <option [value]="opt.key" [selected]="opt.key === app.status">Move to: {{ opt.label }}</option>
                      }
                    </select>
                    <button class="tailor-btn" (click)="goToWorkspace(app.id)">Tailor →</button>
                  </div>
                </div>
              }
              @if (!columns[col.key]?.length) {
                <p class="empty-hint">No applications</p>
              }
            </div>
          </div>
        }
      </div>
    </div>

    @if (isAddingNew || editingApp) {
      <div class="modal-backdrop" (click)="cancelEdit()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>{{ editingApp ? 'Edit Job Target' : 'Add Job Target' }}</h3>
          <form [formGroup]="applicationForm" (ngSubmit)="editingApp ? saveApplication(editingApp.id) : addApplication()">
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
                  @for (col of statusColumns; track col.key) {
                    <option [value]="col.key">{{ col.label }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Notes</label>
              <textarea formControlName="notes" rows="3"></textarea>
            </div>

            <div class="actions">
              <button type="submit" class="primary">{{ editingApp ? 'Save' : 'Add' }}</button>
              <button type="button" (click)="cancelEdit()">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: `
    .board-page {
      max-width: 100%;
      padding: 20px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      gap: 12px;
      flex-wrap: wrap;
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

    button {
      padding: 8px 14px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;

      &.primary { background: #667eea; }
      &.ghost { background: #f1f3f5; color: #333; border: 1px solid #ddd; }
      &.danger { background: #dc3545; }
      &.small { padding: 6px 10px; font-size: 13px; }
      &.link-btn { background: none; color: #667eea; padding: 4px 0; text-decoration: underline; font-size: 13px; }
    }

    /* Mobile column-jump tabs */
    .column-tabs {
      display: none;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }

    .column-tab {
      flex: 0 0 auto;
      background: white;
      color: #333;
      border: 2px solid #ddd;
      border-radius: 20px;
      padding: 6px 12px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 6px;

      .count {
        background: #f1f3f5;
        border-radius: 10px;
        padding: 1px 7px;
        font-size: 11px;
      }
    }

    .board {
      display: flex;
      gap: 14px;
      overflow-x: auto;
      padding-bottom: 12px;
      align-items: flex-start;
    }

    .kanban-column {
      flex: 0 0 300px;
      background: #f4f5f7;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 220px);
      scroll-snap-align: start;
    }

    .column-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      font-weight: 600;
      border-top: 4px solid #ccc;
      border-radius: 8px 8px 0 0;
      background: white;

      .count {
        background: #f1f3f5;
        border-radius: 10px;
        padding: 1px 8px;
        font-size: 12px;
        color: #555;
      }
    }

    .column-body {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      min-height: 80px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .empty-hint {
      text-align: center;
      color: #999;
      font-size: 13px;
      margin: 12px 0;
    }

    .kanban-card {
      background: white;
      border-radius: 6px;
      border-left: 4px solid #ccc;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      padding: 10px 12px;
      cursor: grab;
      position: relative;

      &.moving { opacity: 0.6; }

      .card-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 6px;
      }

      h4 {
        margin: 0;
        font-size: 14px;
      }

      .menu-btn {
        background: none;
        color: #666;
        padding: 0 4px;
        font-size: 16px;
        line-height: 1;
      }

      .company {
        margin: 4px 0 0;
        color: #555;
        font-size: 13px;
        font-weight: 600;
      }

      .meta {
        margin: 2px 0 0;
        color: #888;
        font-size: 12px;
      }

      .card-menu {
        position: absolute;
        right: 8px;
        top: 30px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.12);
        display: flex;
        flex-direction: column;
        z-index: 5;

        button {
          background: none;
          color: #333;
          text-align: left;
          border-radius: 0;
          padding: 8px 14px;
          font-size: 13px;

          &.danger { color: #dc3545; }
          &:hover { background: #f5f5f5; }
        }
      }

      .card-actions {
        margin-top: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .move-select {
        width: 100%;
        padding: 5px 6px;
        font-size: 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        color: #333;
        background: #fafafa;
      }

      .tailor-btn {
        background: #667eea;
        font-size: 12px;
        padding: 6px 10px;
      }
    }

    .cdk-drag-preview {
      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
      border-radius: 6px;
    }

    .cdk-drag-placeholder {
      opacity: 0.3;
    }

    .cdk-drop-list-dragging .kanban-card:not(.cdk-drag-placeholder) {
      transition: transform 200ms ease;
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 40px 16px;
      overflow-y: auto;
      z-index: 100;
    }

    .modal {
      background: white;
      border-radius: 10px;
      padding: 24px;
      width: 100%;
      max-width: 560px;

      h3 { margin-top: 0; }
    }

    .form-group { margin-bottom: 12px; }

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

      input { flex: 1; }
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

    textarea { resize: vertical; }

    .actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }

    /* Mobile: one column at a time, snap-scroll */
    @media (max-width: 768px) {
      .board-page { padding: 12px; }

      .column-tabs { display: flex; }

      .board {
        scroll-snap-type: x mandatory;
      }

      .kanban-column {
        flex: 0 0 100%;
        max-height: none;
      }

      input, textarea, select { font-size: 16px; }

      button { min-height: 40px; }
    }
  `
})
export class JobApplicationComponent implements OnInit {
  statusColumns = STATUS_COLUMNS;
  connectedDropLists = STATUS_COLUMNS.map((c) => 'col-' + c.key);
  columns: Record<string, JobApplication[]> = {};

  applicationForm!: FormGroup;
  isAddingNew = false;
  editingApp: JobApplication | null = null;
  showCompanyForm = false;
  newCompanyName = '';
  openMenuId: number | null = null;
  movingId: number | null = null;

  constructor(
    public applicationService: JobApplicationService,
    public companyService: CompanyService,
    private fb: FormBuilder,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.initializeForm();
    this.resetColumns();
    await this.loadCompanies();
    await this.loadApplications();
  }

  isBoardPopulated(): boolean {
    return Object.values(this.columns).some((c) => c.length > 0);
  }

  private resetColumns(): void {
    const columns: Record<string, JobApplication[]> = {};
    for (const col of this.statusColumns) {
      columns[col.key] = [];
    }
    this.columns = columns;
  }

  private rebuildColumns(apps: JobApplication[]): void {
    this.resetColumns();
    for (const app of apps) {
      const key = this.columns[app.status] ? app.status : 'draft';
      this.columns[key].push(app);
    }
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
      const apps = await this.applicationService.getApplications();
      this.rebuildColumns(apps);
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

  scrollToColumn(key: string): void {
    document.getElementById('column-' + key)?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'start'
    });
  }

  toggleMenu(appId: number): void {
    this.openMenuId = this.openMenuId === appId ? null : appId;
  }

  goToWorkspace(applicationId: number): void {
    this.router.navigate(['/applications', applicationId, 'tailor']);
  }

  private async persistStatusChange(
    app: JobApplication,
    fromStatus: string,
    toStatus: string,
    revert: () => void
  ): Promise<void> {
    app.status = toStatus;
    this.movingId = app.id;
    try {
      const updated = await this.applicationService.updateApplication(app.id, { status: toStatus });
      Object.assign(app, updated);
    } catch (error) {
      revert();
      app.status = fromStatus;
      alert('Failed to update status. Please try again.');
    } finally {
      this.movingId = null;
    }
  }

  async drop(event: CdkDragDrop<JobApplication[]>, targetStatus: string): Promise<void> {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    const app = event.previousContainer.data[event.previousIndex];
    const fromStatus = app.status;
    const fromIndex = event.previousIndex;
    const previousContainerData = event.previousContainer.data;
    const containerData = event.container.data;

    transferArrayItem(previousContainerData, containerData, event.previousIndex, event.currentIndex);

    await this.persistStatusChange(app, fromStatus, targetStatus, () => {
      const curIdx = containerData.indexOf(app);
      if (curIdx !== -1) containerData.splice(curIdx, 1);
      previousContainerData.splice(fromIndex, 0, app);
    });
  }

  async onMoveSelect(app: JobApplication, event: Event): Promise<void> {
    const targetStatus = (event.target as HTMLSelectElement).value;
    if (!targetStatus || targetStatus === app.status) return;

    const fromStatus = app.status;
    const fromArr = this.columns[fromStatus] || [];
    const fromIndex = fromArr.findIndex((a) => a.id === app.id);
    if (fromIndex === -1) return;

    fromArr.splice(fromIndex, 1);
    this.columns[targetStatus] = this.columns[targetStatus] || [];
    this.columns[targetStatus].unshift(app);

    await this.persistStatusChange(app, fromStatus, targetStatus, () => {
      const curIdx = this.columns[targetStatus].indexOf(app);
      if (curIdx !== -1) this.columns[targetStatus].splice(curIdx, 1);
      fromArr.splice(fromIndex, 0, app);
    });
  }

  startAddApplication(): void {
    this.isAddingNew = true;
    this.editingApp = null;
    this.openMenuId = null;
    this.applicationForm.reset({ status: 'draft' });
  }

  startEdit(app: JobApplication): void {
    this.editingApp = app;
    this.isAddingNew = false;
    this.openMenuId = null;
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
      const payload = this.buildPayload();
      await this.applicationService.createApplication(payload);
      await this.loadApplications();
      this.cancelEdit();
    } catch (error: any) {
      console.error('Failed to add application:', error);
      alert(`Error adding job target: ${error?.error?.error || error.message}`);
    }
  }

  async saveApplication(applicationId: number): Promise<void> {
    if (!this.applicationForm.valid) return;

    try {
      const payload = this.buildPayload();
      await this.applicationService.updateApplication(applicationId, payload);
      await this.loadApplications();
      this.cancelEdit();
    } catch (error: any) {
      console.error('Failed to update application:', error);
      alert(`Error updating job target: ${error?.error?.error || error.message}`);
    }
  }

  private buildPayload(): any {
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
    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
    return payload;
  }

  async deleteApplicationItem(applicationId: number): Promise<void> {
    this.openMenuId = null;
    if (!confirm('Delete this job application?')) return;

    try {
      await this.applicationService.deleteApplication(applicationId);
      await this.loadApplications();
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
    this.editingApp = null;
    this.showCompanyForm = false;
    this.newCompanyName = '';
    this.applicationForm.reset({ status: 'draft' });
  }
}
