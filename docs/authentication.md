# Authentication & Security Documentation

## Overview
JWT-based authentication with RBAC (Role-Based Access Control).

## Roles
- `user`: Standard user (default)
- `admin`: Administrator (reserved for future use)

## Endpoints

### Public (no auth required)

**POST /api/auth/register**
- Register new user
- Body: `{ email, password (min 8 chars), name }`
- Returns: User object (stub, no DB yet)

**POST /api/auth/login**
- Login with credentials
- Body: `{ email, password }`
- Returns: `{ accessToken, refreshToken, user }`

**POST /api/auth/refresh**
- Refresh access token using refresh token
- Body: `{ refreshToken }`
- Returns: `{ accessToken }`

### Protected (requires Bearer token)

**GET /api/auth/me**
- Get current user info
- Header: `Authorization: Bearer <accessToken>`
- Returns: User payload from JWT

## Token Expiry
- Access token: 15 minutes (default)
- Refresh token: 7 days (default)

## Security Features Implemented
✅ Password hashing (bcrypt, 10 rounds)
✅ JWT signing and verification
✅ Bearer token authentication
✅ Role-based authorization middleware
✅ Request validation (Zod)
✅ Error handling with safe error messages
✅ CORS restricted to frontend origin

## TODO (DB integration required)
- [ ] Store users in MySQL
- [ ] Check email uniqueness on registration
- [ ] Verify password against DB on login
- [ ] Store refresh tokens (optional: token rotation)
- [ ] Password reset flow
- [ ] Email verification
