import { Component, effect, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProfileService, Education, ProfileLink } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { RecentlyAddedService } from '../../core/services/recently-added.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="container">
      <h2>My Profile</h2>
      <p class="subtext">Keep your personal details and education aligned for resume generation.</p>

      @if (profileService.errorSignal()) {
        <div class="error-message">
          {{ profileService.errorSignal() }}
          <button (click)="profileService.clearError()">Dismiss</button>
        </div>
      }

      @if (profileService.loadingSignal()) {
        <p class="loading">Loading profile...</p>
      } @else if (profileForm) {
        <!-- Personal Information Section -->
        <div class="section">
          <h3>Personal Information</h3>
          <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
            <div class="form-group">
              <label>Full Name</label>
              <input formControlName="name" type="text" required />
            </div>

            <div class="form-group">
              <label>Email (for resume)</label>
              <input formControlName="email" type="email" />
              <small class="help-text">This email will be displayed on your resume. Leave empty to use your account email.</small>
            </div>

            <div class="form-group">
              <label>Location</label>
              <input formControlName="location" type="text" />
            </div>

            <div class="form-group">
              <label>Phone</label>
              <input formControlName="phone" type="tel" />
            </div>

            <div class="form-group">
              <label>Professional Summary</label>
              <textarea formControlName="summary" rows="4"></textarea>
            </div>

            <button type="submit" [disabled]="profileService.loadingSignal()">
              {{ profileService.loadingSignal() ? 'Saving...' : 'Save Profile' }}
            </button>
          </form>
        </div>

        <!-- Links Section -->
        <div class="section">
          <h3>Links</h3>

          <div class="links-list">
            @for (link of links; track link.id) {
              <div class="link-item" [class.newly-added]="recentlyAdded.isNew('links', link.id)">
                @if (!isEditingLink(link.id)) {
                  <div class="link-row">
                    <span class="link-type">{{ link.type }}</span>
                    <a [href]="link.url" target="_blank" rel="noopener" class="link-url">{{ link.url }}</a>
                    <div class="link-actions">
                      <button (click)="editLink(link)">Edit</button>
                      <button (click)="deleteLinkItem(link.id)" class="danger">Delete</button>
                    </div>
                  </div>
                } @else {
                  <form [formGroup]="linkForm!" (ngSubmit)="saveLink(link.id)">
                    <div class="form-group">
                      <label>Type</label>
                      <select formControlName="type" (change)="onLinkTypeChange($event)">
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="GitHub">GitHub</option>
                        <option value="Portfolio">Portfolio</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>
                    @if (showCustomLinkType) {
                      <div class="form-group">
                        <label>Custom Type Label</label>
                        <input formControlName="customType" type="text" placeholder="e.g. Twitter, Behance" />
                      </div>
                    }
                    <div class="form-group">
                      <label>URL</label>
                      <input formControlName="url" type="url" placeholder="https://..." />
                    </div>
                    <button type="submit" [disabled]="linkForm?.invalid">Save Link</button>
                    <button type="button" (click)="cancelLinkEdit()">Cancel</button>
                  </form>
                }
              </div>
            } @empty {
              <p class="muted">No links yet.</p>
            }
          </div>

          @if (!isAddingLink && !isEditingLinkId) {
            <button (click)="startAddLink()" class="secondary">+ Add Link</button>
          }

          @if (isAddingLink) {
            <form [formGroup]="linkForm!" (ngSubmit)="saveNewLink()">
              <div class="form-group">
                <label>Type</label>
                <select formControlName="type" (change)="onLinkTypeChange($event)">
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="GitHub">GitHub</option>
                  <option value="Portfolio">Portfolio</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              @if (showCustomLinkType) {
                <div class="form-group">
                  <label>Custom Type Label</label>
                  <input formControlName="customType" type="text" placeholder="e.g. Twitter, Behance" />
                </div>
              }
              <div class="form-group">
                <label>URL</label>
                <input formControlName="url" type="url" placeholder="https://..." />
              </div>
              <button type="submit" [disabled]="linkForm?.invalid">Add Link</button>
              <button type="button" (click)="cancelLinkEdit()">Cancel</button>
            </form>
          }
        </div>

        <!-- Education Section -->
        <div class="section">
          <h3>Education</h3>

          <div class="education-list">
            @for (edu of education; track edu.id) {
              <div class="education-item" [class.newly-added]="recentlyAdded.isNew('education', edu.id)">
                <div class="education-header">
                  <strong>{{ edu.degree }} in {{ edu.field }}</strong>
                  @if (!isEditingEducation(edu.id)) {
                    <button (click)="editEducation(edu)">Edit</button>
                    <button (click)="deleteEducationItem(edu.id)" class="danger">
                      Delete
                    </button>
                  }
                </div>

                @if (isEditingEducation(edu.id)) {
                  <form [formGroup]="educationForm!" (ngSubmit)="saveEducation(edu.id)">
                    <div class="form-group">
                      <label>Institution</label>
                      <input formControlName="institution" type="text" />
                      @if (controlInvalid('institution')) { <small class="error">Institution is required</small> }
                    </div>

                    <div class="form-group">
                      <label>Degree</label>
                      <input formControlName="degree" type="text" />
                      @if (controlInvalid('degree')) { <small class="error">Degree is required</small> }
                    </div>

                    <div class="form-group">
                      <label>Field of Study</label>
                      <input formControlName="field" type="text" />
                      @if (controlInvalid('field')) { <small class="error">Field is required</small> }
                    </div>

                    <div class="form-group">
                      <label>Start Date</label>
                      <input formControlName="startDate" type="date" />
                      @if (controlInvalid('startDate')) { <small class="error">Start date is required</small> }
                    </div>

                    <div class="form-group">
                      <label>End Date</label>
                      <input formControlName="endDate" type="date" />
                    </div>

                    <div class="form-group checkbox">
                      <label>
                        <input formControlName="current" type="checkbox" />
                        Currently Studying
                      </label>
                    </div>

                    <button type="submit" [disabled]="educationForm?.invalid">Save Education</button>
                    <button type="button" (click)="cancelEducationEdit()">
                      Cancel
                    </button>
                  </form>
                } @else {
                  <p>{{ edu.institution }}</p>
                  <p>
                    {{ edu.startDate | date: 'MMM yyyy' }} -
                    @if (edu.current) {
                      Present
                    } @else {
                      {{ edu.endDate | date: 'MMM yyyy' }}
                    }
                  </p>
                }
              </div>
            } @empty {
              <p class="muted">No education entries yet.</p>
            }
          </div>

          @if (!isAddingEducation && !isEditingEducationId) {
            <button (click)="startAddEducation()" class="secondary">
              + Add Education
            </button>
          }

          @if (isAddingEducation) {
            <form [formGroup]="educationForm!" (ngSubmit)="saveNewEducation()">
              <div class="form-group">
                <label>Institution</label>
                <input formControlName="institution" type="text" />
                @if (controlInvalid('institution')) { <small class="error">Institution is required</small> }
              </div>

              <div class="form-group">
                <label>Degree</label>
                <input formControlName="degree" type="text" />
                @if (controlInvalid('degree')) { <small class="error">Degree is required</small> }
              </div>

              <div class="form-group">
                <label>Field of Study</label>
                <input formControlName="field" type="text" />
                @if (controlInvalid('field')) { <small class="error">Field is required</small> }
              </div>

              <div class="form-group">
                <label>Start Date</label>
                <input formControlName="startDate" type="date" />
                @if (controlInvalid('startDate')) { <small class="error">Start date is required</small> }
              </div>

              <div class="form-group">
                <label>End Date</label>
                <input formControlName="endDate" type="date" />
              </div>

              <div class="form-group checkbox">
                <label>
                  <input formControlName="current" type="checkbox" />
                  Currently Studying
                </label>
              </div>
              <button type="submit" [disabled]="educationForm?.invalid">Add Education</button>
              <button type="button" (click)="cancelEducationEdit()">Cancel</button>
            </form>
          }
        </div>

        <!-- Skills Section -->
        <div class="section">
          <h3>Skills</h3>

          <div class="skills-list">
            @for (userSkill of profileService.skillsSignal(); track userSkill.skillId) {
              <div class="skill-badge" [class.newly-added]="recentlyAdded.isNew('skills', userSkill.id)">
                <span>{{ userSkill.skill.name }}</span>
                <button
                  (click)="removeSkill(userSkill.skillId)"
                  class="remove-btn"
                  type="button"
                >
                  ×
                </button>
              </div>
            } @empty {
              <p class="muted">No skills added yet.</p>
            }
          </div>

          @if (!isAddingSkill) {
            <button (click)="startAddSkill()" class="secondary">+ Add Skill</button>
          } @else {
            <form [formGroup]="skillForm!" (ngSubmit)="addNewSkill()">
              <div class="form-group">
                <label>Skill Name</label>
                <input formControlName="skillName" type="text" />
              </div>

              <div class="form-group">
                <label>Level</label>
                <select formControlName="level">
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>

              <button type="submit">Add Skill</button>
              <button type="button" (click)="isAddingSkill = false">Cancel</button>
            </form>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    h2 {
      margin: 0 0 2px;
    }

    .subtext {
      margin: 0 0 22px;
    }

    .section {
      margin-bottom: 40px;
      padding: 20px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: #fff;
    }

    h3 {
      margin-top: 0;
      margin-bottom: 15px;
    }

    .form-group {
      margin-bottom: 15px;
    }

    label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
    }

    .help-text {
      display: block;
      margin-top: 4px;
      font-size: 12px;
      color: #666;
    }

    input,
    textarea,
    select {
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
      padding: 8px 16px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;

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
    }

    .education-list {
      margin-bottom: 20px;
    }

    .education-item {
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-bottom: 10px;
    }

    .education-header {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      margin-bottom: 10px;

      strong {
        flex: 1;
      }

      button {
        margin-left: 10px;
        padding: 4px 8px;
        font-size: 12px;
      }
    }

    .education-item p {
      margin: 5px 0;
      color: #666;
    }

    .links-list {
      margin-bottom: 20px;
    }

    .link-item {
      padding: 12px 15px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-bottom: 10px;
    }

    .link-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .link-type {
      font-weight: 600;
      min-width: 80px;
    }

    .link-url {
      flex: 1;
      color: #007bff;
      text-decoration: none;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      &:hover {
        text-decoration: underline;
      }
    }

    .link-actions {
      display: flex;
      gap: 8px;

      button {
        padding: 4px 8px;
        font-size: 12px;
      }
    }

    .muted {
      color: #777;
    }

    .newly-added {
      box-shadow: 0 0 0 2px #22c55e;
      position: relative;

      &::after {
        content: 'New';
        position: absolute;
        top: -8px;
        right: 8px;
        background: #22c55e;
        color: white;
        font-size: 10px;
        font-weight: 700;
        padding: 1px 6px;
        border-radius: 8px;
        text-transform: uppercase;
      }
    }

    .skills-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 15px;
    }

    .skill-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: #e7f3ff;
      border: 1px solid #007bff;
      border-radius: 20px;
      font-size: 14px;

      .remove-btn {
        background: none;
        border: none;
        color: #007bff;
        font-size: 16px;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          background: #f0f0f0;
          border-radius: 50%;
        }
      }
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

    small.error {
      color: #dc3545;
      display: block;
      margin-top: 4px;
    }

    /* Add a bit more gap between adjacent form buttons */
    form button + button {
      margin-left: 10px;
    }

    @media (max-width: 768px) {
      .container {
        padding: 12px;
      }

      .section {
        padding: 15px;
      }

      h2 {
        font-size: 20px;
      }

      h3 {
        font-size: 16px;
      }

      .education-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;

        button {
          width: 100%;
        }
      }

      .link-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .link-url {
        max-width: 100%;
      }

      .link-actions {
        width: 100%;

        button {
          flex: 1;
        }
      }

      .skills-list {
        gap: 8px;
      }

      .skill-badge {
        font-size: 13px;
        padding: 5px 10px;
      }

      button {
        width: 100%;
        min-height: 44px;
      }

      input, textarea, select {
        font-size: 16px; /* Prevent iOS zoom */
      }

      /* On mobile, buttons stack; use vertical gap instead of left margin */
      form button + button {
        margin-left: 0;
        margin-top: 10px;
      }
    }

    @media (max-width: 480px) {
      .section {
        padding: 12px;
      }

      h2 {
        font-size: 18px;
      }
    }
  `,
})
export class ProfileComponent implements OnInit, OnDestroy {
  profileForm: FormGroup | null = null;
  educationForm: FormGroup | null = null;
  linkForm: FormGroup | null = null;
  skillForm: FormGroup | null = null;

  isAddingEducation = false;
  isEditingEducationId: number | null = null;
  isAddingLink = false;
  isEditingLinkId: number | null = null;
  showCustomLinkType = false;
  isAddingSkill = false;

  education: Education[] = [];
  links: ProfileLink[] = [];

  constructor(
    public profileService: ProfileService,
    private authService: AuthService,
    public recentlyAdded: RecentlyAddedService,
    private fb: FormBuilder
  ) {
    // Auto-load profile data when component initializes
    effect(() => {
      const profile = this.profileService.profileSignal();
      if (profile) {
        this.populateProfileForm(profile);
        this.education = profile.educations || [];
        this.links = profile.profileLinks || [];
      }
    });
  }

  ngOnInit(): void {
    this.initializeForms();
    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.recentlyAdded.clear('education');
    this.recentlyAdded.clear('links');
    this.recentlyAdded.clear('skills');
  }

  private initializeForms(): void {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      email: [''],
      location: [''],
      phone: [''],
      summary: [''],
    });

    this.educationForm = this.fb.group({
      institution: ['', Validators.required],
      degree: ['', Validators.required],
      field: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: [''],
      current: [false],
    });

    this.linkForm = this.fb.group({
      type: ['LinkedIn', Validators.required],
      customType: [''],
      url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    });

    this.skillForm = this.fb.group({
      skillName: ['', Validators.required],
      level: ['Intermediate', Validators.required],
    });
  }

  private populateProfileForm(profile: any): void {
    if (this.profileForm) {
      this.profileForm.patchValue({
        name: profile.user?.name || '',
        email: profile.email || '',
        location: profile.location || '',
        phone: profile.phone || '',
        summary: profile.summary || '',
      });
    }
  }

  private async loadProfile(): Promise<void> {
    try {
      await this.profileService.getProfile();
      await this.profileService.getUserSkills();
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }

  async saveProfile(): Promise<void> {
    if (!this.profileForm?.valid) return;

    try {
      await this.profileService.updateProfile(this.profileForm.value);
      alert('Profile saved successfully!');
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  }

  startAddEducation(): void {
    this.isAddingEducation = true;
    this.educationForm?.reset();
  }

  editEducation(edu: Education): void {
    this.isEditingEducationId = edu.id;
    this.educationForm?.patchValue({
      institution: edu.institution,
      degree: edu.degree,
      field: edu.field,
      startDate: new Date(edu.startDate).toISOString().split('T')[0],
      endDate: edu.endDate
        ? new Date(edu.endDate).toISOString().split('T')[0]
        : '',
      current: edu.current,
    });
  }

  async saveEducation(educationId: number): Promise<void> {
    if (!this.educationForm?.valid) return;
    this.educationForm?.markAllAsTouched();

    try {
      const formValue = this.educationForm.value;
      const payload: any = {
        institution: formValue.institution,
        degree: formValue.degree,
        field: formValue.field,
        startDate: formValue.startDate,
        current: formValue.current ?? false,
      };
      // Only include endDate if it has a value
      if (formValue.endDate && formValue.endDate.trim()) {
        payload.endDate = formValue.endDate;
      }
      
      const updated = await this.profileService.updateEducation(
        educationId,
        payload
      );
      const list = this.education.map((e) => (e.id === educationId ? updated : e));
      this.setLocalEducations(list);
      this.cancelEducationEdit();
      alert('Education updated successfully!');
    } catch (error) {
      console.error('Failed to save education:', error);
      alert('Failed to update education. Please check the console for details.');
    }
  }

  async saveNewEducation(): Promise<void> {
    if (!this.educationForm?.valid) return;
    this.educationForm?.markAllAsTouched();

    try {
      const formValue = this.educationForm.value;
      const payload: any = {
        institution: formValue.institution,
        degree: formValue.degree,
        field: formValue.field,
        startDate: formValue.startDate,
        current: formValue.current ?? false,
      };
      // Only include endDate if it has a value
      if (formValue.endDate && formValue.endDate.trim()) {
        payload.endDate = formValue.endDate;
      }
      
      const created = await this.profileService.addEducation(payload);
      const list = [created, ...this.education];
      this.setLocalEducations(list);
      this.cancelEducationEdit();
      alert('Education added successfully!');
    } catch (error) {
      console.error('Failed to add education:', error);
      alert('Failed to add education. Please check the console for details.');
    }
  }

  async deleteEducationItem(educationId: number): Promise<void> {
    if (!confirm('Are you sure you want to delete this education entry?'))
      return;

    try {
      await this.profileService.deleteEducation(educationId);
      const list = this.education.filter((e) => e.id !== educationId);
      this.setLocalEducations(list);
      alert('Education deleted successfully!');
    } catch (error) {
      console.error('Failed to delete education:', error);
    }
  }

  cancelEducationEdit(): void {
    this.isAddingEducation = false;
    this.isEditingEducationId = null;
    this.educationForm?.reset();
  }

  isEditingEducation(educationId: number): boolean {
    return this.isEditingEducationId === educationId;
  }

  startAddLink(): void {
    this.isAddingLink = true;
    this.showCustomLinkType = false;
    this.linkForm?.reset({ type: 'LinkedIn', customType: '', url: '' });
  }

  editLink(link: ProfileLink): void {
    this.isEditingLinkId = link.id;
    const isKnownType = ['LinkedIn', 'GitHub', 'Portfolio'].includes(link.type);
    this.showCustomLinkType = !isKnownType;
    this.linkForm?.patchValue({
      type: isKnownType ? link.type : 'Custom',
      customType: isKnownType ? '' : link.type,
      url: link.url,
    });
  }

  onLinkTypeChange(event: Event): void {
    this.showCustomLinkType = (event.target as HTMLSelectElement).value === 'Custom';
  }

  private buildLinkPayload(): { type: string; url: string } {
    const formValue = this.linkForm!.value;
    const type = formValue.type === 'Custom' ? (formValue.customType || 'Custom').trim() : formValue.type;
    return { type, url: formValue.url };
  }

  async saveLink(linkId: number): Promise<void> {
    if (!this.linkForm?.valid) return;
    this.linkForm?.markAllAsTouched();

    try {
      const payload = this.buildLinkPayload();
      const updated = await this.profileService.updateLink(linkId, payload);
      const list = this.links.map((l) => (l.id === linkId ? updated : l));
      this.setLocalLinks(list);
      this.cancelLinkEdit();
      alert('Link updated successfully!');
    } catch (error) {
      console.error('Failed to save link:', error);
      alert('Failed to update link. Please check the console for details.');
    }
  }

  async saveNewLink(): Promise<void> {
    if (!this.linkForm?.valid) return;
    this.linkForm?.markAllAsTouched();

    try {
      const payload = this.buildLinkPayload();
      const created = await this.profileService.addLink(payload);
      const list = [...this.links, created];
      this.setLocalLinks(list);
      this.cancelLinkEdit();
      alert('Link added successfully!');
    } catch (error) {
      console.error('Failed to add link:', error);
      alert('Failed to add link. Please check the console for details.');
    }
  }

  async deleteLinkItem(linkId: number): Promise<void> {
    if (!confirm('Are you sure you want to delete this link?')) return;

    try {
      await this.profileService.deleteLink(linkId);
      const list = this.links.filter((l) => l.id !== linkId);
      this.setLocalLinks(list);
      alert('Link deleted successfully!');
    } catch (error) {
      console.error('Failed to delete link:', error);
    }
  }

  cancelLinkEdit(): void {
    this.isAddingLink = false;
    this.isEditingLinkId = null;
    this.showCustomLinkType = false;
    this.linkForm?.reset({ type: 'LinkedIn', customType: '', url: '' });
  }

  isEditingLink(linkId: number): boolean {
    return this.isEditingLinkId === linkId;
  }

  private setLocalLinks(list: ProfileLink[]): void {
    this.links = list;
    this.profileService.profileSignal.update((p) => (p ? { ...p, profileLinks: list } : p));
  }

  startAddSkill(): void {
    this.isAddingSkill = true;
  }

  async addNewSkill(): Promise<void> {
    if (!this.skillForm?.valid) return;

    try {
      const { skillName, level } = this.skillForm.value;
      await this.profileService.addSkill({
        name: skillName,
        level,
      });
      await this.profileService.getUserSkills();
      this.skillForm.reset({ level: 'Intermediate' });
      this.isAddingSkill = false;
      alert('Skill added successfully!');
    } catch (error) {
      console.error('Failed to add skill:', error);
    }
  }

  async removeSkill(skillId: number): Promise<void> {
    if (!confirm('Remove this skill?')) return;

    try {
      await this.profileService.removeSkill(skillId);
      alert('Skill removed successfully!');
    } catch (error) {
      console.error('Failed to remove skill:', error);
    }
  }

  private setLocalEducations(list: Education[]): void {
    this.education = list;
    this.profileService.profileSignal.update((p) => (p ? { ...p, educations: list } : p));
  }

  controlInvalid(name: string): boolean {
    const c = this.educationForm?.get(name);
    return !!c && c.invalid && (c.dirty || c.touched);
  }
}
