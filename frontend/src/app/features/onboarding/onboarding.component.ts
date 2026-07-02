import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';

interface ParseResult {
  educationAdded: number;
  experienceAdded: number;
  projectsAdded: number;
  skillsAdded: number;
  certificationsAdded: number;
  profileUpdated: boolean;
}

type Stage = 'upload' | 'processing' | 'done' | 'error';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="onboarding-container">
      <div class="onboarding-card">
        <div class="skip-row">
          <a routerLink="/dashboard" class="skip-link">Skip for now →</a>
        </div>

        <div class="brand">
          <h1>Welcome to RoleFit</h1>
          <p class="subtitle">Upload your existing resume and we'll fill your profile in seconds.</p>
        </div>

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

        <!-- DONE STAGE -->
        @if (stage() === 'done' && parseResult()) {
          <div class="result">
            <div class="result-icon">✓</div>
            <h2>Profile populated!</h2>
            <p class="result-subtitle">Here's what we found in your resume:</p>

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

  stage = signal<Stage>('upload');
  selectedFile = signal<File | null>(null);
  isDragging = signal(false);
  isUploading = signal(false);
  processingMessage = signal('Extracting text from your resume...');
  errorMessage = signal('');
  parseResult = signal<ParseResult | null>(null);

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

  upload(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.isUploading.set(true);
    this.stage.set('processing');

    // Cycle through messages so the user knows something is happening
    const messages = [
      'Extracting text from your resume...',
      'Analysing with AI...',
      'Populating your profile...'
    ];
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      this.processingMessage.set(messages[msgIndex]);
    }, 4000);

    const formData = new FormData();
    formData.append('resume', file);

    this.http.post<{ message: string; result: ParseResult }>(
      `${environment.apiUrl}/profile/parse-resume`,
      formData
    ).subscribe({
      next: (res) => {
        clearInterval(msgInterval);
        this.parseResult.set(res.result);
        this.stage.set('done');
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

  reset(): void {
    this.stage.set('upload');
    this.selectedFile.set(null);
    this.errorMessage.set('');
    this.parseResult.set(null);
    this.isUploading.set(false);
  }

  formatSize(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
