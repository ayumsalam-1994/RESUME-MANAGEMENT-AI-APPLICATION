import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { RecentlyAddedService } from '../../core/services/recently-added.service';

interface ParseResult {
  educationAdded: number;
  experienceAdded: number;
  projectsAdded: number;
  skillsAdded: number;
  certificationsAdded: number;
  linksAdded: number;
  profileUpdated: boolean;
  educationIds: number[];
  experienceIds: number[];
  projectIds: number[];
  certificationIds: number[];
  newUserSkillIds: number[];
  linkIds: number[];
}

interface ParsedLink { type: string; url: string; }
interface ParsedProfilePreview {
  phone?: string;
  location?: string;
  summary?: string;
  links?: ParsedLink[];
}
interface ParsedEducationPreview {
  institution: string;
  degree: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
}
interface ParsedExperiencePreview {
  company: string;
  position: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  bullets?: string[];
}
interface ParsedProjectPreview {
  title: string;
  summary?: string;
  description?: string;
  role?: string;
  techStack?: string[];
  startDate?: string;
  endDate?: string;
  url?: string;
  bullets?: string[];
}
interface ParsedCertificationPreview { title: string; description?: string; }

interface ParsedResumePreview {
  profile: ParsedProfilePreview;
  education: ParsedEducationPreview[];
  experience: ParsedExperiencePreview[];
  projects: ParsedProjectPreview[];
  skills: { new: string[]; alreadyHave: string[] };
  certifications: ParsedCertificationPreview[];
}

type Stage = 'upload' | 'processing' | 'review' | 'done' | 'error';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="onboarding-container">
      <div class="onboarding-card" [class.wide]="stage() === 'review'">
        @if (stage() !== 'review') {
          <div class="skip-row">
            <a routerLink="/dashboard" class="skip-link">Skip for now →</a>
          </div>

          <div class="brand">
            <h1>Import Resume</h1>
            <p class="subtitle">Upload a resume to add new details to your profile. Nothing is saved until you confirm.</p>
          </div>
        }

        <!-- UPLOAD STAGE -->
        @if (stage() === 'upload') {
          <div
            class="drop-zone"
            [class.drag-over]="isDragging()"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave()"
            (drop)="onDrop($event)"
            (click)="fileInput.click()">
            <div class="drop-icon">📄</div>
            <p class="drop-text">Drag & drop your resume here</p>
            <p class="drop-hint">or click to browse</p>
            <p class="drop-hint">PDF or DOCX · max 5 MB</p>
          </div>

          <input
            #fileInput
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            style="display:none"
            (change)="onFileSelected($event)"
          />

          @if (selectedFile()) {
            <div class="selected-file">
              <span class="file-name">{{ selectedFile()!.name }}</span>
              <span class="file-size">{{ formatSize(selectedFile()!.size) }}</span>
            </div>
          }

          @if (errorMessage()) {
            <div class="error-box">{{ errorMessage() }}</div>
          }

          <button
            class="primary-btn"
            [disabled]="!selectedFile() || isUploading()"
            (click)="upload()">
            {{ isUploading() ? 'Uploading...' : 'Parse My Resume' }}
          </button>
        }

        <!-- PROCESSING STAGE -->
        @if (stage() === 'processing') {
          <div class="processing">
            <div class="spinner"></div>
            <p class="processing-label">{{ processingMessage() }}</p>
            <p class="processing-hint">This usually takes 5–15 seconds</p>
          </div>
        }

        <!-- REVIEW STAGE -->
        @if (stage() === 'review' && parsedData()) {
          <div class="review">
            <div class="review-header">
              <h2>Review before adding</h2>
              <p class="result-subtitle">Remove anything you don't want. Nothing is saved yet.</p>
            </div>

            <div class="review-section">
              <h3>Profile details</h3>
              @if (parsedData()!.profile.phone) {
                <label class="review-check">
                  <input type="checkbox" [(ngModel)]="includePhone" />
                  Phone: {{ parsedData()!.profile.phone }}
                </label>
              }
              @if (parsedData()!.profile.location) {
                <label class="review-check">
                  <input type="checkbox" [(ngModel)]="includeLocation" />
                  Location: {{ parsedData()!.profile.location }}
                </label>
              }
              @if (parsedData()!.profile.summary) {
                <label class="review-check">
                  <input type="checkbox" [(ngModel)]="includeSummary" />
                  Summary: {{ parsedData()!.profile.summary }}
                </label>
              }
              @if (!parsedData()!.profile.phone && !parsedData()!.profile.location && !parsedData()!.profile.summary) {
                <p class="muted">Nothing new found.</p>
              }
              <p class="hint">Only fills fields you haven't already set — never overwrites existing profile info.</p>
            </div>

            @if (links.length > 0) {
              <div class="review-section">
                <h3>Links ({{ links.length }})</h3>
                @for (link of links; track $index) {
                  <div class="review-item">
                    <span>{{ link.type }}: {{ link.url }}</span>
                    <button class="remove-btn" (click)="removeAt(links, $index)">Remove</button>
                  </div>
                }
              </div>
            }

            @if (education.length > 0) {
              <div class="review-section">
                <h3>Education ({{ education.length }})</h3>
                @for (edu of education; track $index) {
                  <div class="review-item">
                    <span>{{ edu.degree }} in {{ edu.field }} — {{ edu.institution }}</span>
                    <button class="remove-btn" (click)="removeAt(education, $index)">Remove</button>
                  </div>
                }
              </div>
            }

            @if (experience.length > 0) {
              <div class="review-section">
                <h3>Experience ({{ experience.length }})</h3>
                @for (exp of experience; track $index) {
                  <div class="review-item">
                    <span>{{ exp.position }} @ {{ exp.company }}</span>
                    <button class="remove-btn" (click)="removeAt(experience, $index)">Remove</button>
                  </div>
                }
              </div>
            }

            @if (projects.length > 0) {
              <div class="review-section">
                <h3>Projects ({{ projects.length }})</h3>
                @for (proj of projects; track $index) {
                  <div class="review-item">
                    <span>{{ proj.title }}</span>
                    <button class="remove-btn" (click)="removeAt(projects, $index)">Remove</button>
                  </div>
                }
              </div>
            }

            @if (newSkills.length > 0) {
              <div class="review-section">
                <h3>New Skills ({{ newSkills.length }})</h3>
                <div class="chip-row">
                  @for (skill of newSkills; track $index) {
                    <span class="chip">
                      {{ skill }}
                      <button class="chip-remove" (click)="removeAt(newSkills, $index)">×</button>
                    </span>
                  }
                </div>
              </div>
            }

            @if (certifications.length > 0) {
              <div class="review-section">
                <h3>Certifications ({{ certifications.length }})</h3>
                @for (cert of certifications; track $index) {
                  <div class="review-item">
                    <span>{{ cert.title }}</span>
                    <button class="remove-btn" (click)="removeAt(certifications, $index)">Remove</button>
                  </div>
                }
              </div>
            }

            @if (errorMessage()) {
              <div class="error-box">{{ errorMessage() }}</div>
            }

            <button class="primary-btn" [disabled]="isUploading()" (click)="commit()">
              {{ isUploading() ? 'Adding...' : 'Add to My Profile' }}
            </button>
            <button class="secondary-link as-button" (click)="reset()">Discard / Start Over</button>
          </div>
        }

        <!-- DONE STAGE -->
        @if (stage() === 'done' && parseResult()) {
          <div class="result">
            <div class="result-icon">✓</div>
            <h2>Profile updated!</h2>
            <p class="result-subtitle">Here's what was added:</p>

            <div class="result-grid">
              @if (parseResult()!.experienceAdded > 0) {
                <div class="result-item">
                  <span class="result-count">{{ parseResult()!.experienceAdded }}</span>
                  <span class="result-label">Work Experience</span>
                </div>
              }
              @if (parseResult()!.educationAdded > 0) {
                <div class="result-item">
                  <span class="result-count">{{ parseResult()!.educationAdded }}</span>
                  <span class="result-label">Education</span>
                </div>
              }
              @if (parseResult()!.projectsAdded > 0) {
                <div class="result-item">
                  <span class="result-count">{{ parseResult()!.projectsAdded }}</span>
                  <span class="result-label">Projects</span>
                </div>
              }
              @if (parseResult()!.skillsAdded > 0) {
                <div class="result-item">
                  <span class="result-count">{{ parseResult()!.skillsAdded }}</span>
                  <span class="result-label">Skills</span>
                </div>
              }
              @if (parseResult()!.certificationsAdded > 0) {
                <div class="result-item">
                  <span class="result-count">{{ parseResult()!.certificationsAdded }}</span>
                  <span class="result-label">Certifications</span>
                </div>
              }
              @if (parseResult()!.linksAdded > 0) {
                <div class="result-item">
                  <span class="result-count">{{ parseResult()!.linksAdded }}</span>
                  <span class="result-label">Links</span>
                </div>
              }
            </div>

            <p class="ai-disclaimer">
              ⚠ AI-generated — please review your profile for accuracy before applying to jobs.
            </p>

            <a routerLink="/profile" class="primary-btn block-link">Review My Profile →</a>
            <a routerLink="/dashboard" class="secondary-link">Go to Dashboard</a>
          </div>
        }

        <!-- ERROR STAGE -->
        @if (stage() === 'error') {
          <div class="error-state">
            <div class="error-icon">✗</div>
            <h2>Something went wrong</h2>
            <p class="error-detail">{{ errorMessage() }}</p>
            <button class="primary-btn" (click)="reset()">Try Again</button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .onboarding-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1rem;
    }

    .onboarding-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    }

    .onboarding-card.wide {
      max-width: 640px;
      max-height: 88vh;
      overflow-y: auto;
    }

    .skip-row {
      text-align: right;
      margin-bottom: 1.25rem;
    }

    .skip-link {
      color: #888;
      font-size: 0.85rem;
      text-decoration: none;
    }

    .skip-link:hover { color: #555; text-decoration: underline; }

    .brand h1 { margin: 0 0 0.5rem; color: #333; font-size: 1.6rem; }
    .subtitle { color: #666; margin: 0 0 1.5rem; }

    .drop-zone {
      border: 2px dashed #c4c4f4;
      border-radius: 10px;
      padding: 2rem 1rem;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
      margin-bottom: 1rem;
    }

    .drop-zone:hover, .drop-zone.drag-over {
      border-color: #667eea;
      background: #f5f4ff;
    }

    .drop-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .drop-text { font-weight: 600; color: #444; margin: 0 0 0.25rem; }
    .drop-hint { color: #888; font-size: 0.85rem; margin: 0.1rem 0; }

    .selected-file {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #f0f4ff;
      border-radius: 6px;
      padding: 0.6rem 0.8rem;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }

    .file-name { font-weight: 500; color: #333; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .file-size { color: #888; white-space: nowrap; }

    .error-box {
      background: #fee;
      color: #c33;
      padding: 0.75rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }

    .primary-btn {
      width: 100%;
      padding: 0.85rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
    }

    .primary-btn:hover:not(:disabled) { opacity: 0.9; }

    .primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .block-link {
      display: block;
      text-align: center;
      text-decoration: none;
      margin-bottom: 0.75rem;
    }

    .secondary-link {
      display: block;
      text-align: center;
      color: #888;
      font-size: 0.9rem;
      text-decoration: none;
    }

    .secondary-link:hover { text-decoration: underline; }

    .secondary-link.as-button {
      width: 100%;
      background: none;
      border: none;
      margin-top: 0.75rem;
      cursor: pointer;
      font-family: inherit;
    }

    /* Processing */
    .processing {
      text-align: center;
      padding: 2rem 0;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #e5e7eb;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .processing-label { font-weight: 600; color: #444; margin: 0 0 0.25rem; }
    .processing-hint { color: #888; font-size: 0.85rem; margin: 0; }

    /* Review */
    .review-header h2 { margin: 0 0 0.25rem; color: #333; }
    .review-section {
      margin-bottom: 1.25rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #eee;
    }
    .review-section h3 { margin: 0 0 0.5rem; font-size: 0.95rem; color: #444; }
    .review-check {
      display: block;
      font-size: 0.9rem;
      color: #444;
      margin-bottom: 0.4rem;
    }
    .review-check input { margin-right: 0.4rem; }
    .review-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0;
      font-size: 0.9rem;
      color: #444;
    }
    .remove-btn {
      background: #fee;
      color: #c33;
      border: none;
      border-radius: 6px;
      padding: 0.3rem 0.6rem;
      font-size: 0.8rem;
      cursor: pointer;
      white-space: nowrap;
    }
    .chip-row { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      background: #f0f4ff;
      color: #4c51bf;
      border-radius: 14px;
      padding: 0.25rem 0.4rem 0.25rem 0.7rem;
      font-size: 0.85rem;
    }
    .chip-remove {
      background: none;
      border: none;
      color: #4c51bf;
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
      padding: 0 0.2rem;
    }
    .hint { font-size: 0.78rem; color: #999; margin: 0.4rem 0 0; }
    .muted { color: #999; font-size: 0.9rem; }

    /* Result */
    .result { text-align: center; }
    .result-icon { font-size: 3rem; color: #22c55e; margin-bottom: 0.5rem; }
    .result h2 { margin: 0 0 0.25rem; color: #333; }
    .result-subtitle { color: #666; margin: 0 0 1.25rem; }

    .result-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: center;
      margin-bottom: 1.25rem;
    }

    .result-item {
      background: #f5f4ff;
      border-radius: 8px;
      padding: 0.6rem 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 80px;
    }

    .result-count { font-size: 1.5rem; font-weight: 700; color: #667eea; }
    .result-label { font-size: 0.75rem; color: #888; }

    .ai-disclaimer {
      font-size: 0.8rem;
      color: #b45309;
      background: #fffbeb;
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      margin-bottom: 1rem;
    }

    /* Error state */
    .error-state { text-align: center; }
    .error-icon { font-size: 3rem; color: #ef4444; margin-bottom: 0.5rem; }
    .error-state h2 { margin: 0 0 0.5rem; color: #333; }
    .error-detail { color: #666; margin: 0 0 1.5rem; font-size: 0.9rem; }

    @media (max-width: 520px) {
      .onboarding-card { padding: 1.5rem; }
      .brand h1 { font-size: 1.4rem; }
    }
  `]
})
export class OnboardingComponent {
  private http = inject(HttpClient);
  private router = inject(Router);
  private recentlyAdded = inject(RecentlyAddedService);

  stage = signal<Stage>('upload');
  selectedFile = signal<File | null>(null);
  isDragging = signal(false);
  isUploading = signal(false);
  processingMessage = signal('Extracting text from your resume...');
  errorMessage = signal('');
  parseResult = signal<ParseResult | null>(null);
  parsedData = signal<ParsedResumePreview | null>(null);

  // Local mutable copies the review screen can remove items from
  links: ParsedLink[] = [];
  education: ParsedEducationPreview[] = [];
  experience: ParsedExperiencePreview[] = [];
  projects: ParsedProjectPreview[] = [];
  newSkills: string[] = [];
  certifications: ParsedCertificationPreview[] = [];
  includePhone = true;
  includeLocation = true;
  includeSummary = true;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.setFile(file);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.setFile(file);
  }

  private setFile(file: File): void {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowed.includes(file.type)) {
      this.errorMessage.set('Only PDF and DOCX files are supported.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage.set('File exceeds the 5 MB limit.');
      return;
    }
    this.errorMessage.set('');
    this.selectedFile.set(file);
  }

  removeAt<T>(list: T[], index: number): void {
    list.splice(index, 1);
  }

  upload(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.isUploading.set(true);
    this.stage.set('processing');
    this.errorMessage.set('');

    // Cycle through messages so the user knows something is happening
    const messages = [
      'Extracting text from your resume...',
      'Analysing with AI...',
      'Preparing for review...'
    ];
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      this.processingMessage.set(messages[msgIndex]);
    }, 4000);

    const formData = new FormData();
    formData.append('resume', file);

    this.http.post<{ message: string; parsed: ParsedResumePreview }>(
      `${environment.apiUrl}/profile/parse-resume`,
      formData
    ).subscribe({
      next: (res) => {
        clearInterval(msgInterval);
        this.parsedData.set(res.parsed);
        this.links = [...(res.parsed.profile.links || [])];
        this.education = [...res.parsed.education];
        this.experience = [...res.parsed.experience];
        this.projects = [...res.parsed.projects];
        this.newSkills = [...res.parsed.skills.new];
        this.certifications = [...res.parsed.certifications];
        this.includePhone = true;
        this.includeLocation = true;
        this.includeSummary = true;
        this.stage.set('review');
        this.isUploading.set(false);
      },
      error: (err) => {
        clearInterval(msgInterval);
        this.errorMessage.set(err.error?.error || 'Failed to parse resume. Please try again.');
        this.stage.set('error');
        this.isUploading.set(false);
      }
    });
  }

  commit(): void {
    const parsed = this.parsedData();
    if (!parsed) return;

    this.isUploading.set(true);
    this.errorMessage.set('');

    const payload = {
      profile: {
        phone: this.includePhone ? parsed.profile.phone : undefined,
        location: this.includeLocation ? parsed.profile.location : undefined,
        summary: this.includeSummary ? parsed.profile.summary : undefined,
        links: this.links
      },
      education: this.education,
      experience: this.experience,
      projects: this.projects,
      skills: this.newSkills,
      certifications: this.certifications
    };

    this.http.post<{ message: string; result: ParseResult }>(
      `${environment.apiUrl}/profile/commit-resume-data`,
      payload
    ).subscribe({
      next: (res) => {
        this.recentlyAdded.markAdded('education', res.result.educationIds);
        this.recentlyAdded.markAdded('experience', res.result.experienceIds);
        this.recentlyAdded.markAdded('projects', res.result.projectIds);
        this.recentlyAdded.markAdded('certifications', res.result.certificationIds);
        this.recentlyAdded.markAdded('links', res.result.linkIds);
        this.recentlyAdded.markAdded('skills', res.result.newUserSkillIds);

        this.parseResult.set(res.result);
        this.stage.set('done');
        this.isUploading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.error || 'Failed to add to profile. Please try again.');
        this.isUploading.set(false);
      }
    });
  }

  reset(): void {
    this.stage.set('upload');
    this.selectedFile.set(null);
    this.errorMessage.set('');
    this.parseResult.set(null);
    this.parsedData.set(null);
    this.links = [];
    this.education = [];
    this.experience = [];
    this.projects = [];
    this.newSkills = [];
    this.certifications = [];
    this.isUploading.set(false);
  }

  formatSize(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
