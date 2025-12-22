import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface RequiredEnvVars {
  DATABASE_URL: string;
  JWT_SECRET: string;
  GEMINI_API_KEY: string;
  PORT?: string;
  NODE_ENV?: string;
  FRONTEND_ORIGIN?: string;
  JWT_ACCESS_EXPIRES?: string;
  JWT_REFRESH_EXPIRES?: string;
}

const requiredVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'GEMINI_API_KEY'
];

export function validateEnv(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\nPlease set these in your .env file or environment.');
    console.error('See .env.example for reference.\n');
    process.exit(1);
  }

  // Check recommended variables
  if (!process.env.NODE_ENV) {
    warnings.push('NODE_ENV not set (defaulting to development)');
  }

  if (!process.env.FRONTEND_ORIGIN && process.env.NODE_ENV === 'production') {
    warnings.push('FRONTEND_ORIGIN not set - CORS may not work in production');
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET === 'change-me') {
    warnings.push('JWT_SECRET is using default value - INSECURE for production!');
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Environment warnings:');
    warnings.forEach(w => console.warn(`   - ${w}`));
    console.warn('');
  }

  // Success message
  console.log('✅ Environment variables validated');
  console.log(`   - Database: ${process.env.DATABASE_URL?.split('@')[1] || 'configured'}`);
  console.log(`   - AI: Gemini API (${process.env.GEMINI_API_KEY?.substring(0, 10)}...)`);
  console.log(`   - Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
}

export const config = {
  port: process.env.PORT || '3000',
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:4200',
  database: {
    url: process.env.DATABASE_URL!,
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  geminiKey: process.env.GEMINI_API_KEY!,
};
