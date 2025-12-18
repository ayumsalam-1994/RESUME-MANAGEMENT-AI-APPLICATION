# Database Setup Guide

## Prerequisites
Install MySQL on your system:
- **Windows**: Download from https://dev.mysql.com/downloads/installer/
- **Mac**: `brew install mysql`
- **Linux**: `sudo apt-get install mysql-server`

## Setup Steps

### 1. Start MySQL Service
```bash
# Windows
net start MySQL80

# Mac/Linux
sudo service mysql start
# or
brew services start mysql
```

### 2. Create Database and User
```bash
# Login to MySQL as root
mysql -u root -p

# Run these SQL commands:
CREATE DATABASE resume_ai;
CREATE USER 'resume_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON resume_ai.* TO 'resume_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Update .env File
Update your `backend/.env` file with the correct credentials:
```env
DATABASE_URL="mysql://resume_user:your_secure_password@localhost:3306/resume_ai"
```

Or if using root (not recommended for production):
```env
DATABASE_URL="mysql://root:your_root_password@localhost:3306/resume_ai"
```

### 4. Run Prisma Migrations
```bash
cd backend
npx prisma migrate dev --name init
```

This will:
- Create all database tables
- Generate Prisma Client
- Apply the schema to your MySQL database

### 5. Verify Database
```bash
# Check if tables were created
mysql -u resume_user -p resume_ai

# List tables
SHOW TABLES;

# Exit
EXIT;
```

## Prisma Commands

```bash
# Generate Prisma Client (after schema changes)
npx prisma generate

# Create a new migration
npx prisma migrate dev --name migration_name

# View database in browser
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Format schema file
npx prisma format
```

## Database Schema Overview

### Tables Created:
- **User** - Authentication and user data
- **Profile** - Extended user profile (phone, links, summary)
- **Education** - Academic background
- **Skill** - Skill master list
- **UserSkill** - Skills assigned to users with proficiency
- **Experience** - Work experience
- **ExperienceBullet** - Bullet points for experiences
- **Project** - User projects
- **ProjectImage** - Project images (up to 5 per project)
- **Company** - Company profiles
- **JobApplication** - Job application tracking
- **Resume** - Generated resumes
- **CoverLetter** - Cover letters linked to resumes
- **Interview** - Interview rounds and outcomes
- **Reminder** - Follow-up reminders
- **StatusHistory** - Job application status changes timeline

## Troubleshooting

### Can't connect to MySQL
- Verify MySQL is running: `mysql -V`
- Check port 3306 is not blocked
- Verify credentials in .env match your MySQL user

### Migration fails
- Ensure database exists: `CREATE DATABASE resume_ai;`
- Check user has proper permissions
- Try: `npx prisma migrate reset` (WARNING: deletes data)

### Prisma Client errors
- Run: `npx prisma generate`
- Restart your dev server
