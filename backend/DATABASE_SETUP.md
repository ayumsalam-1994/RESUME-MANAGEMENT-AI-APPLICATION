# Database Setup Instructions

## Quick Start (if MySQL is already installed)

1. **Create database and user** (run in MySQL command line):
```sql
CREATE DATABASE IF NOT EXISTS resume_ai;
-- Use default root or create a specific user
```

2. **Update backend/.env**:
```env
# For root user (replace 'password' with your actual MySQL root password)
DATABASE_URL="mysql://root:password@localhost:3306/resume_ai"

# OR for custom user
DATABASE_URL="mysql://resume_user:your_password@localhost:3306/resume_ai"
```

3. **Run migrations** (from backend folder):
```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

## Don't have MySQL installed?

### Windows:
1. Download MySQL Installer: https://dev.mysql.com/downloads/installer/
2. Run installer, choose "Developer Default"
3. Set root password during installation
4. Complete installation
5. MySQL will start automatically

### Using XAMPP (Easiest for Windows):
1. Download XAMPP: https://www.apachefriends.org/
2. Install and start MySQL from control panel
3. Default credentials: username=`root`, password=`` (empty)
4. Update .env: `DATABASE_URL="mysql://root@localhost:3306/resume_ai"`

### Mac:
```bash
brew install mysql
brew services start mysql
mysql_secure_installation  # Set root password
```

### Linux:
```bash
sudo apt-get update
sudo apt-get install mysql-server
sudo mysql_secure_installation
```

## After MySQL is Running

```bash
# Test connection
mysql -u root -p
# Enter your password

# Create database
CREATE DATABASE resume_ai;
EXIT;

# Then run migrations from backend folder
cd backend
npx prisma migrate dev --name init
```

## Verify Setup

```bash
# View database schema in browser
npx prisma studio
# Opens at http://localhost:5555
```

## Common Issues

**Error: Can't connect to MySQL server**
- MySQL service not running
- Windows: `net start MySQL80`
- Mac: `brew services start mysql`

**Error: Access denied for user**
- Wrong password in DATABASE_URL
- Check your MySQL root password

**Error: Unknown database 'resume_ai'**
- Database not created
- Run: `CREATE DATABASE resume_ai;` in MySQL

## Need Help?

If MySQL setup is too complex, consider using:
- **SQLite** (simpler, file-based - update schema.prisma: `provider = "sqlite"` and DATABASE_URL)
- **Docker MySQL** (if you have Docker installed)

See full guide in [database-setup.md](./database-setup.md)
