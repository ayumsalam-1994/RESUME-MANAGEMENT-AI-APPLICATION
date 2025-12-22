# Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Configuration

**Backend Environment Variables** (`.env`)
```bash
# Production settings
PORT=3000
NODE_ENV=production
FRONTEND_ORIGIN=https://yourdomain.com

# Database (use production MySQL instance)
DATABASE_URL=mysql://user:password@host:3306/dbname

# Security (generate new secrets for production!)
JWT_SECRET=GENERATE_A_LONG_RANDOM_STRING_HERE
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Google Gemini API
GEMINI_API_KEY=your-production-api-key
```

**Frontend Environment** (`src/environments/environment.ts`)
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.yourdomain.com/api'  // Your backend API URL
};
```

### 2. Database Setup

```bash
# Run migrations on production database
cd backend
npx prisma migrate deploy

# Verify schema
npx prisma db pull
```

### 3. Security Checklist

- [ ] Generate new JWT_SECRET for production (use: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
- [ ] Update FRONTEND_ORIGIN to your actual domain
- [ ] Enable HTTPS on both frontend and backend
- [ ] Configure firewall rules (only allow necessary ports)
- [ ] Set up rate limiting on API endpoints
- [ ] Review and update CORS settings in `backend/src/index.ts`

### 4. Build Verification

```bash
# Backend
cd backend
npm run build
# Should complete with no errors

# Frontend
cd frontend
ng build --configuration production
# Should complete (budget warning is acceptable)
```

---

## Deployment Options

### Option A: Traditional VPS/Server

**Backend Deployment:**
```bash
# 1. SSH into server
ssh user@your-server.com

# 2. Clone repository
git clone <your-repo-url>
cd resume-management-ai-application/backend

# 3. Install dependencies
npm ci --production

# 4. Set up environment variables
nano .env
# Paste production values

# 5. Run migrations
npx prisma migrate deploy

# 6. Build TypeScript
npm run build

# 7. Install PM2 for process management
npm install -g pm2

# 8. Start backend
pm2 start dist/index.js --name "resume-api"
pm2 save
pm2 startup  # Follow instructions for auto-restart on reboot
```

**Frontend Deployment:**
```bash
# Build locally
cd frontend
ng build --configuration production

# Upload dist/resume-ai-frontend/* to web server
# Using nginx:
sudo cp -r dist/resume-ai-frontend/* /var/www/html/

# Nginx config example (/etc/nginx/sites-available/resume-app):
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option B: Cloud Platform (Vercel/Railway/Render)

**Vercel (Frontend):**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from frontend directory
cd frontend
vercel --prod

# Configure:
# - Framework: Angular
# - Build Command: ng build --configuration production
# - Output Directory: dist/resume-ai-frontend
```

**Railway/Render (Backend):**
1. Connect GitHub repository
2. Configure:
   - Root Directory: `backend`
   - Build Command: `npm run build`
   - Start Command: `node dist/index.js`
3. Add environment variables from checklist above
4. Deploy

---

## Post-Deployment Verification

### 1. Health Checks

**Backend API:**
```bash
# Check server is running
curl https://api.yourdomain.com/health

# Test auth endpoint
curl -X POST https://api.yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

**Frontend:**
- Visit `https://yourdomain.com`
- Register a new account
- Create a profile
- Add an experience
- Create a job application
- Generate a resume
- Export PDF

### 2. Monitoring Setup

**Recommended Tools:**
- **Error Tracking:** Sentry
- **Uptime Monitoring:** UptimeRobot or Pingdom
- **Performance:** Google Analytics, LogRocket
- **Logs:** PM2 logs, CloudWatch, or Papertrail

**PM2 Monitoring:**
```bash
pm2 logs resume-api        # View logs
pm2 monit                  # Real-time monitoring
pm2 list                   # Check status
```

### 3. Backup Strategy

**Database Backups:**
```bash
# Daily automated backup (add to cron)
mysqldump -u user -p dbname > backup-$(date +%Y%m%d).sql

# Cron job (daily at 2 AM):
0 2 * * * mysqldump -u user -p'password' dbname > /backups/resume-$(date +\%Y\%m\%d).sql
```

**Upload Storage Backup:**
- Set up automated backups of `backend/uploads/` directory
- Consider using S3/CloudStorage for file uploads instead of local storage

---

## Troubleshooting

### Backend Won't Start
```bash
# Check logs
pm2 logs resume-api

# Common issues:
# - DATABASE_URL incorrect → verify connection string
# - Port already in use → change PORT in .env
# - Missing .env file → create from .env.example
# - Migrations not applied → run npx prisma migrate deploy
```

### Frontend Shows Blank Page
```bash
# Check browser console for errors
# Common issues:
# - API URL incorrect → verify environment.ts
# - CORS errors → check FRONTEND_ORIGIN in backend .env
# - 404 on routes → configure server to redirect to index.html
```

### AI Features Not Working
```bash
# Check Gemini API key
curl -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY"

# If quota exceeded → check API console, upgrade plan
```

---

## Rollback Procedure

```bash
# Backend rollback
pm2 stop resume-api
git checkout <previous-commit>
npm ci
npm run build
pm2 restart resume-api

# Database rollback (if needed)
mysql -u user -p dbname < backup-YYYYMMDD.sql

# Frontend rollback
# Redeploy previous build from dist backup
```

---

## Performance Optimization

### Database
- [ ] Add indexes on frequently queried columns
- [ ] Enable query caching
- [ ] Set up read replicas for high traffic

### Backend
- [ ] Enable gzip compression
- [ ] Implement response caching for static data
- [ ] Use connection pooling (Prisma default)

### Frontend
- [ ] Enable CDN for static assets
- [ ] Configure browser caching headers
- [ ] Optimize bundle size (already using lazy loading)

---

## Security Hardening

### Backend
```bash
# Install security headers middleware
npm install helmet

# In backend/src/index.ts:
import helmet from 'helmet';
app.use(helmet());
```

### Rate Limiting
```bash
# Install rate limiter
npm install express-rate-limit

# Add to backend/src/index.ts:
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### SSL/TLS
- Use Let's Encrypt for free SSL certificates
- Configure nginx/Apache to redirect HTTP to HTTPS
- Set HSTS headers

---

## Support & Maintenance

### Regular Tasks
- **Daily:** Check error logs, monitor uptime
- **Weekly:** Review database size, check backup integrity
- **Monthly:** Update dependencies, security patches
- **Quarterly:** Review API usage, optimize queries

### Updating Dependencies
```bash
# Backend
cd backend
npm outdated
npm update
npm audit fix

# Frontend
cd frontend
npm outdated
npm update
ng update @angular/cli @angular/core
```

---

## Contact & Escalation

For critical issues:
1. Check logs first (PM2, nginx, MySQL)
2. Review this troubleshooting guide
3. Check GitHub issues
4. Rollback if necessary
