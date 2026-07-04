import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

interface AtsResult {
  score: number;
  matched: string[];
  missing: string[];
  verdict: string;
  remainingChecks: number;
}

type DemoStage = 'idle' | 'loading' | 'result' | 'error' | 'limited';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  template: `
    <!-- NAV -->
    <nav class="nav">
      <a routerLink="/" class="nav-logo">RoleFit</a>
      <div class="nav-links">
        @if (auth.isAuthenticated()) {
          <a routerLink="/dashboard" class="nav-link">Dashboard</a>
        } @else {
          <a routerLink="/login" class="nav-link">Login</a>
          <a routerLink="/register" class="nav-cta">Get Started Free</a>
        }
      </div>
    </nav>

    <!-- HERO -->
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-badge">Trusted by job seekers across Malaysia 🇲🇾</div>
        <h1 class="hero-title">
          Stop Sending<br>Generic Resumes.
        </h1>
        <p class="hero-sub">
          RoleFit tailors your resume to every job description in seconds — so you pass ATS filters and stand out to recruiters.
        </p>
        <div class="hero-actions">
          <a href="#demo" class="btn-primary">Check My ATS Score — Free</a>
          <a routerLink="/register" class="btn-ghost">Sign Up Free →</a>
        </div>
        <p class="hero-note">No credit card required · 1 free AI tailoring after sign-up</p>
      </div>
    </section>

    <!-- ATS DEMO -->
    <section class="demo-section" id="demo">
      <div class="demo-inner">
        <div class="demo-header">
          <h2>See Your ATS Score in 15 Seconds</h2>
          <p>Paste your resume and a job description below. Our AI will score the match instantly — no sign-up needed.</p>
        </div>

        @if (demoStage() === 'idle' || demoStage() === 'loading' || demoStage() === 'error') {
          <div class="demo-form">
            <div class="demo-inputs">
              <div class="demo-field">
                <label>Your Resume</label>
                <textarea
                  placeholder="Paste the text content of your resume here..."
                  rows="8"
                  [value]="resumeText()"
                  (input)="resumeText.set(getTextValue($event))"
                ></textarea>
              </div>
              <div class="demo-field">
                <label>Job Description</label>
                <textarea
                  placeholder="Paste the job description you're applying for..."
                  rows="8"
                  [value]="jdText()"
                  (input)="jdText.set(getTextValue($event))"
                ></textarea>
              </div>
            </div>

            @if (demoStage() === 'error') {
              <div class="demo-error">{{ errorMsg() }}</div>
            }

            <button
              class="btn-primary demo-btn"
              [disabled]="demoStage() === 'loading' || !resumeText().trim() || !jdText().trim()"
              (click)="analyze()">
              {{ demoStage() === 'loading' ? 'Analysing with AI...' : 'Check My ATS Score →' }}
            </button>
            <p class="demo-hint">{{ config.demoChecksPerDay }} free checks per day · No account needed</p>
          </div>
        }

        @if (demoStage() === 'limited') {
          <div class="limited-box">
            <div class="limited-icon">⏰</div>
            <h3>Daily Limit Reached</h3>
            <p>You've used all {{ config.demoChecksPerDay }} free ATS checks for today. Sign up for unlimited access.</p>
            <a routerLink="/register" class="btn-primary">Create Free Account →</a>
          </div>
        }

        @if (demoStage() === 'result' && atsResult()) {
          <div class="result-card">
            <!-- Score -->
            <div class="score-wrap">
              <div class="score-ring" [class]="scoreClass()">
                <span class="score-num">{{ atsResult()!.score }}</span>
                <span class="score-pct">%</span>
              </div>
              <div class="score-meta">
                <div class="score-label">ATS Match Score</div>
                <div class="score-verdict">{{ atsResult()!.verdict }}</div>
              </div>
            </div>

            <!-- Keywords -->
            <div class="kw-grid">
              <div class="kw-col">
                <div class="kw-heading kw-good">✓ Matched Keywords</div>
                <div class="kw-chips">
                  @for (kw of atsResult()!.matched; track kw) {
                    <span class="chip chip-good">{{ kw }}</span>
                  }
                </div>
              </div>
              <div class="kw-col">
                <div class="kw-heading kw-bad">✗ Missing Keywords</div>
                <div class="kw-chips">
                  @for (kw of atsResult()!.missing; track kw) {
                    <span class="chip chip-bad">{{ kw }}</span>
                  }
                </div>
              </div>
            </div>

            <!-- CTA -->
            <div class="result-cta">
              <p class="result-cta-text">
                RoleFit can rewrite your experience bullets to include the missing keywords — automatically tailored to this exact job.
              </p>
              <a routerLink="/register" class="btn-primary">Fix My Resume — Sign Up Free →</a>
              <button class="btn-ghost-sm" (click)="resetDemo()">Try Another Job</button>
            </div>

            <p class="checks-left">{{ atsResult()!.remainingChecks }} free check{{ atsResult()!.remainingChecks !== 1 ? 's' : '' }} remaining today</p>
          </div>
        }
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section class="how-section">
      <div class="section-inner">
        <h2 class="section-title">How RoleFit Works</h2>
        <div class="steps">
          <div class="step">
            <div class="step-num">1</div>
            <h3>Upload Your Resume</h3>
            <p>Upload your existing resume and RoleFit auto-fills your profile — education, experience, skills, and more.</p>
          </div>
          <div class="step">
            <div class="step-num">2</div>
            <h3>Paste the Job Description</h3>
            <p>Copy the JD from LinkedIn, JobStreet, or anywhere else. RoleFit reads the requirements so you don't have to.</p>
          </div>
          <div class="step">
            <div class="step-num">3</div>
            <h3>Get an ATS-Optimised Resume</h3>
            <p>In seconds, RoleFit rewrites your bullet points with the right keywords — ready to pass ATS and impress hiring managers.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- FEATURES -->
    <section class="features-section">
      <div class="section-inner">
        <h2 class="section-title">Everything You Need to Land the Job</h2>
        <div class="features-grid">
          <div class="feature">
            <div class="feature-icon">🤖</div>
            <h3>AI Resume Tailoring</h3>
            <p>Gemini AI rewrites your experience bullets to match each job description — you review and approve.</p>
          </div>
          <div class="feature">
            <div class="feature-icon">📊</div>
            <h3>ATS Match Score</h3>
            <p>Know your score before you apply. See exactly which keywords are missing and why your resume might be filtered out.</p>
          </div>
          <div class="feature">
            <div class="feature-icon">📄</div>
            <h3>PDF Export</h3>
            <p>Download a clean, ATS-safe PDF resume with one click. No design skills needed.</p>
          </div>
          <div class="feature">
            <div class="feature-icon">📁</div>
            <h3>Job Application Tracker</h3>
            <p>Keep all your applications, resumes, and follow-ups in one place. Never lose track of where you applied.</p>
          </div>
          <div class="feature">
            <div class="feature-icon">🔒</div>
            <h3>Private & Secure</h3>
            <p>Your data is encrypted and never shared with employers or third parties. You own your resume.</p>
          </div>
          <div class="feature">
            <div class="feature-icon">⚡</div>
            <h3>Built for Malaysia</h3>
            <p>Pay via FPX (all Malaysian banks). Designed for the Malaysian job market — English and Malay resumes supported.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- PRICING -->
    <section class="pricing-section">
      <div class="section-inner">
        <h2 class="section-title">Simple, Honest Pricing</h2>
        <p class="pricing-sub">No hidden fees. Cancel any time. Only pay when you're actively job hunting.</p>

        <div class="pricing-cards">
          <!-- Free tier -->
          <div class="price-card">
            <h3 class="price-name">Free</h3>
            <div class="price-amount">
              <span class="price-rm">RM</span>
              <span class="price-num">0</span>
            </div>
            <ul class="price-features">
              <li>1 AI resume tailoring</li>
              <li>ATS score checker (3/day)</li>
              <li>Resume upload & profile fill</li>
              <li>Job application tracker</li>
            </ul>
            <a routerLink="/register" class="price-btn price-btn-outline">Get Started</a>
          </div>

          <!-- 7-day pass -->
          <div class="price-card">
            <h3 class="price-name">7-Day Pass</h3>
            <div class="price-amount">
              <span class="price-rm">RM</span>
              <span class="price-num">9</span>
              <span class="price-per">/ 7 days</span>
            </div>
            <ul class="price-features">
              <li>30 AI resume tailoring</li>
              <li>Unlimited ATS analysis</li>
              <li>PDF export</li>
              <li>Perfect for a focused job hunt</li>
            </ul>
            <button class="price-btn price-btn-outline" (click)="startSubscribe('weekly')">
              {{ isSubscribing() === 'weekly' ? 'Redirecting...' : 'Get 7-Day Pass' }}
            </button>
          </div>

          <!-- Monthly -->
          <div class="price-card price-card-featured">
            <div class="price-badge">Best Value</div>
            <h3 class="price-name">Monthly</h3>
            <div class="price-amount">
              <span class="price-rm">RM</span>
              <span class="price-num">29</span>
              <span class="price-per">/ month</span>
            </div>
            <ul class="price-features">
              <li>30 AI resume tailoring</li>
              <li>Unlimited ATS analysis</li>
              <li>PDF export</li>
              <li>Priority AI model</li>
              <li>Full job tracker</li>
            </ul>
            <button class="price-btn price-btn-primary" (click)="startSubscribe('monthly')">
              {{ isSubscribing() === 'monthly' ? 'Redirecting...' : 'Subscribe Now' }}
            </button>
          </div>
        </div>

        @if (subscribeError()) {
          <p class="subscribe-error">{{ subscribeError() }}</p>
        }

        <p class="pricing-legal">
          By subscribing you agree to our <a routerLink="/terms">Terms</a>, <a routerLink="/privacy">Privacy Policy</a>, and <a routerLink="/refund">48h Refund Policy</a>.
        </p>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="footer">
      <div class="footer-inner">
        <span class="footer-logo">RoleFit</span>
        <nav class="footer-nav">
          <a routerLink="/terms">Terms</a>
          <a routerLink="/privacy">Privacy</a>
          <a routerLink="/refund">Refund Policy</a>
          <a routerLink="/pricing">Pricing</a>
          <a routerLink="/login">Login</a>
          <a routerLink="/register">Register</a>
        </nav>
        <p class="footer-copy">© {{ year }} RoleFit. Built in Malaysia 🇲🇾</p>
      </div>
    </footer>
  `,
  styles: [`
    :host { display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

    /* ── NAV ─────────────────────────────────── */
    .nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 2rem;
      background: rgba(255,255,255,0.95);
      backdrop-filter: blur(8px);
      position: sticky;
      top: 0;
      z-index: 100;
      border-bottom: 1px solid #e5e7eb;
    }
    .nav-logo { font-size: 1.4rem; font-weight: 800; color: #667eea; text-decoration: none; }
    .nav-links { display: flex; align-items: center; gap: 1rem; }
    .nav-link { color: #555; text-decoration: none; font-size: 0.95rem; }
    .nav-link:hover { color: #667eea; }
    .nav-cta {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      padding: 0.5rem 1.25rem;
      border-radius: 6px;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
    }
    .nav-cta:hover { opacity: 0.9; }

    /* ── HERO ────────────────────────────────── */
    .hero {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 5rem 2rem 4rem;
      text-align: center;
      color: white;
    }
    .hero-inner { max-width: 700px; margin: 0 auto; }
    .hero-badge {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.3);
      padding: 0.35rem 1rem;
      border-radius: 20px;
      font-size: 0.85rem;
      margin-bottom: 1.5rem;
    }
    .hero-title { font-size: clamp(2.2rem, 6vw, 3.5rem); font-weight: 800; line-height: 1.1; margin: 0 0 1.25rem; }
    .hero-sub { font-size: 1.15rem; opacity: 0.9; margin: 0 0 2rem; line-height: 1.6; }
    .hero-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-bottom: 1rem; }
    .hero-note { font-size: 0.85rem; opacity: 0.7; margin: 0; }

    /* ── BUTTONS ─────────────────────────────── */
    .btn-primary {
      display: inline-block;
      padding: 0.85rem 1.75rem;
      background: white;
      color: #667eea;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      transition: transform 0.1s, box-shadow 0.1s;
      box-shadow: 0 4px 14px rgba(0,0,0,0.15);
    }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(0,0,0,0.2); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .btn-ghost {
      display: inline-block;
      padding: 0.85rem 1.75rem;
      background: rgba(255,255,255,0.15);
      color: white;
      border: 1px solid rgba(255,255,255,0.4);
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
    }
    .btn-ghost:hover { background: rgba(255,255,255,0.25); }
    .btn-ghost-sm {
      display: block;
      margin: 0.75rem auto 0;
      background: none;
      border: none;
      color: #888;
      font-size: 0.9rem;
      cursor: pointer;
      text-decoration: underline;
    }

    /* ── ATS DEMO ────────────────────────────── */
    .demo-section { background: #f8f7ff; padding: 4rem 2rem; }
    .demo-inner { max-width: 860px; margin: 0 auto; }
    .demo-header { text-align: center; margin-bottom: 2rem; }
    .demo-header h2 { font-size: 1.8rem; color: #1a1a2e; margin: 0 0 0.75rem; }
    .demo-header p { color: #555; font-size: 1rem; margin: 0; }

    .demo-inputs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .demo-field label {
      display: block;
      font-weight: 600;
      color: #333;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }
    .demo-field textarea {
      width: 100%;
      border: 1.5px solid #d1d5db;
      border-radius: 8px;
      padding: 0.75rem;
      font-size: 0.9rem;
      line-height: 1.5;
      resize: vertical;
      box-sizing: border-box;
      font-family: inherit;
    }
    .demo-field textarea:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.15); }

    .demo-btn { width: 100%; padding: 1rem; font-size: 1.05rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
    .demo-hint { text-align: center; color: #888; font-size: 0.85rem; margin: 0.75rem 0 0; }
    .demo-error { background: #fee2e2; color: #dc2626; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.9rem; }

    .limited-box { text-align: center; padding: 2.5rem; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .limited-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    .limited-box h3 { color: #333; margin: 0 0 0.5rem; }
    .limited-box p { color: #666; margin: 0 0 1.5rem; }
    .limited-box .btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }

    /* Result card */
    .result-card { background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .score-wrap { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 1.5rem; }
    .score-ring {
      width: 90px; height: 90px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; flex-direction: column;
      border: 6px solid currentColor; flex-shrink: 0;
      font-weight: 800;
    }
    .score-ring.score-low { color: #ef4444; background: #fef2f2; }
    .score-ring.score-mid { color: #f59e0b; background: #fffbeb; }
    .score-ring.score-high { color: #22c55e; background: #f0fdf4; }
    .score-num { font-size: 1.75rem; line-height: 1; }
    .score-pct { font-size: 0.9rem; }
    .score-label { font-weight: 700; color: #333; font-size: 1.1rem; margin-bottom: 0.25rem; }
    .score-verdict { color: #555; font-size: 0.95rem; }

    .kw-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.5rem; }
    .kw-heading { font-weight: 700; font-size: 0.85rem; margin-bottom: 0.6rem; }
    .kw-good { color: #16a34a; }
    .kw-bad { color: #dc2626; }
    .kw-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .chip { padding: 0.3rem 0.7rem; border-radius: 20px; font-size: 0.8rem; font-weight: 500; }
    .chip-good { background: #dcfce7; color: #166534; }
    .chip-bad { background: #fee2e2; color: #991b1b; }

    .result-cta { text-align: center; border-top: 1px solid #f0f0f0; padding-top: 1.5rem; }
    .result-cta-text { color: #555; font-size: 0.95rem; margin: 0 0 1rem; }
    .result-cta .btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; display: inline-block; }
    .checks-left { text-align: center; color: #aaa; font-size: 0.8rem; margin: 0.75rem 0 0; }

    /* ── HOW IT WORKS ────────────────────────── */
    .how-section { background: white; padding: 4rem 2rem; }
    .section-inner { max-width: 900px; margin: 0 auto; }
    .section-title { text-align: center; font-size: 1.9rem; color: #1a1a2e; margin: 0 0 2.5rem; }
    .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
    .step { text-align: center; }
    .step-num {
      width: 52px; height: 52px; border-radius: 50%;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white; font-size: 1.4rem; font-weight: 800;
      display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;
    }
    .step h3 { font-size: 1.1rem; color: #1a1a2e; margin: 0 0 0.5rem; }
    .step p { color: #555; font-size: 0.9rem; line-height: 1.6; margin: 0; }

    /* ── FEATURES ────────────────────────────── */
    .features-section { background: #f8f7ff; padding: 4rem 2rem; }
    .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
    .feature {
      background: white; padding: 1.5rem; border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    .feature-icon { font-size: 1.8rem; margin-bottom: 0.75rem; }
    .feature h3 { font-size: 1rem; color: #1a1a2e; margin: 0 0 0.5rem; }
    .feature p { font-size: 0.88rem; color: #555; line-height: 1.6; margin: 0; }

    /* ── PRICING ─────────────────────────────── */
    .pricing-section { background: white; padding: 4rem 2rem; }
    .pricing-sub { text-align: center; color: #666; margin: -1.5rem 0 2.5rem; }
    .pricing-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; max-width: 860px; margin: 0 auto; }
    .price-card {
      border: 2px solid #e5e7eb; border-radius: 12px; padding: 2rem 1.5rem;
      display: flex; flex-direction: column; position: relative;
    }
    .price-card-featured { border-color: #667eea; box-shadow: 0 4px 20px rgba(102,126,234,0.15); }
    .price-badge {
      position: absolute; top: -14px; left: 50%; transform: translateX(-50%);
      background: #667eea; color: white; font-size: 0.75rem; font-weight: 700;
      padding: 0.2rem 0.9rem; border-radius: 20px; white-space: nowrap;
    }
    .price-name { font-size: 1.1rem; font-weight: 700; color: #333; margin: 0 0 1rem; text-align: center; }
    .price-amount { text-align: center; margin-bottom: 1.25rem; color: #667eea; }
    .price-rm { font-size: 1.1rem; font-weight: 600; vertical-align: top; margin-top: 0.3rem; display: inline-block; }
    .price-num { font-size: 3rem; font-weight: 800; line-height: 1; }
    .price-per { font-size: 0.85rem; color: #888; }
    .price-features { list-style: none; padding: 0; margin: 0 0 1.5rem; flex: 1; }
    .price-features li { padding: 0.4rem 0; font-size: 0.88rem; color: #444; border-bottom: 1px solid #f4f4f5; }
    .price-features li::before { content: '✓ '; color: #22c55e; font-weight: 700; }
    .price-btn {
      width: 100%; padding: 0.85rem; border-radius: 8px; font-size: 0.95rem;
      font-weight: 600; cursor: pointer; text-decoration: none; display: block;
      text-align: center; border: none;
    }
    .price-btn-outline { background: white; border: 2px solid #667eea; color: #667eea; }
    .price-btn-outline:hover { background: #f0f4ff; }
    .price-btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
    .price-btn-primary:hover { opacity: 0.9; }
    .subscribe-error { text-align: center; color: #dc2626; font-size: 0.9rem; margin-top: 1rem; }
    .pricing-legal { text-align: center; font-size: 0.75rem; color: #aaa; margin-top: 1.5rem; }
    .pricing-legal a { color: #667eea; text-decoration: none; }

    /* ── FOOTER ──────────────────────────────── */
    .footer { background: #1a1a2e; color: rgba(255,255,255,0.7); padding: 2.5rem 2rem; }
    .footer-inner { max-width: 900px; margin: 0 auto; text-align: center; }
    .footer-logo { font-size: 1.3rem; font-weight: 800; color: white; display: block; margin-bottom: 1rem; }
    .footer-nav { display: flex; gap: 1.5rem; justify-content: center; flex-wrap: wrap; margin-bottom: 1rem; }
    .footer-nav a { color: rgba(255,255,255,0.6); text-decoration: none; font-size: 0.9rem; }
    .footer-nav a:hover { color: white; }
    .footer-copy { margin: 0; font-size: 0.82rem; }

    /* ── RESPONSIVE ──────────────────────────── */
    @media (max-width: 768px) {
      .nav { padding: 0.75rem 1rem; }
      .hero { padding: 3rem 1rem 2.5rem; }
      .hero-actions { flex-direction: column; align-items: center; }
      .demo-inputs { grid-template-columns: 1fr; }
      .steps { grid-template-columns: 1fr; gap: 1.5rem; }
      .features-grid { grid-template-columns: 1fr 1fr; }
      .pricing-cards { grid-template-columns: 1fr; }
      .kw-grid { grid-template-columns: 1fr; }
      .score-wrap { flex-direction: column; text-align: center; }
    }
    @media (max-width: 480px) {
      .features-grid { grid-template-columns: 1fr; }
      .nav-links .nav-link { display: none; }
    }
  `]
})
export class LandingComponent {
  auth = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly config = { demoChecksPerDay: 1 };
  readonly year = new Date().getFullYear();

  demoStage = signal<DemoStage>('idle');
  resumeText = signal('');
  jdText = signal('');
  atsResult = signal<AtsResult | null>(null);
  errorMsg = signal('');
  isSubscribing = signal<'monthly' | 'weekly' | null>(null);
  subscribeError = signal('');

  getTextValue(event: Event): string {
    return (event.target as HTMLTextAreaElement).value;
  }

  scoreClass(): string {
    const s = this.atsResult()?.score ?? 0;
    if (s >= 70) return 'score-high';
    if (s >= 45) return 'score-mid';
    return 'score-low';
  }

  analyze(): void {
    if (!this.resumeText().trim() || !this.jdText().trim()) return;
    this.demoStage.set('loading');
    this.errorMsg.set('');

    this.http.post<AtsResult>(`${environment.apiUrl}/demo/analyze`, {
      resumeText: this.resumeText(),
      jobDescription: this.jdText()
    }).subscribe({
      next: (res) => {
        this.atsResult.set(res);
        this.demoStage.set('result');
      },
      error: (err) => {
        if (err.status === 429) {
          this.demoStage.set('limited');
        } else {
          this.errorMsg.set(err.error?.error || 'Analysis failed. Please try again.');
          this.demoStage.set('error');
        }
      }
    });
  }

  resetDemo(): void {
    this.demoStage.set('idle');
    this.atsResult.set(null);
    this.jdText.set('');
  }

  startSubscribe(plan: 'monthly' | 'weekly'): void {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/register']);
      return;
    }

    this.isSubscribing.set(plan);
    this.subscribeError.set('');

    const user = this.auth.currentUser();
    const name = user?.name || user?.email || '';

    this.auth.subscribe(name, plan).subscribe({
      next: (res) => { window.location.href = res.redirectUrl; },
      error: (err) => {
        this.isSubscribing.set(null);
        this.subscribeError.set(err.error?.error || 'Failed to start payment. Please try again.');
      }
    });
  }
}
