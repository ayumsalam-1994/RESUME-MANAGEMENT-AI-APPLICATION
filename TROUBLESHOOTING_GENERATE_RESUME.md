# Generate AI Resume - Troubleshooting Guide

## What I Fixed
Fixed potential initialization issue with Gemini API client where it was being created at class definition time instead of when actually needed.

### Changes Made:
- Made `genAI` and `model` optional properties
- Added `initializeGemini()` method that initializes on first use
- Added initialization call in `generateForApplication()` method
- This ensures the API key check happens at runtime, not startup

## To Test "Generate AI Resume"

### 1. Verify Backend is Running
```
Check: Is the backend listening on http://localhost:3000 ?
Terminal should show: "API listening on port 3000"
```

### 2. Check Browser Console
When you click "Generate AI Resume":
- Open browser DevTools (F12)
- Go to **Console** tab
- Look for any error messages
- Share the specific error if still occurring

### 3. Check Environment Variables
Ensure your `.env` file in the backend folder has:
```
GEMINI_API_KEY=your_actual_api_key
```

### 4. Common Issues

**Error: "Gemini API key is missing"**
- Solution: Make sure `GEMINI_API_KEY` is set in `.env` file
- Backend must be restarted after adding the key

**Error: "Resume generation failed"**
- Check browser console for full error message
- Could be:
  - Invalid API key format
  - API quota exceeded
  - Network connectivity issue
  - Job description is empty

**Error: "Required data missing"**
- Ensure job application has:
  - Job title
  - Job description (required)
  - Company selected

### 5. Manual Testing Steps

1. Fill in a job application with:
   - Company name
   - Job title
   - Job description (full text)
   - Apply button to set to "Applied" status

2. Open the job application details

3. Click "Generate AI Resume" button

4. Check for:
   - Success message
   - Resume appears in the list below
   - Or error message with guidance

### 6. If Still Seeing Errors

**Check the network tab:**
1. Open DevTools (F12)
2. Go to **Network** tab
3. Click "Generate AI Resume"
4. Look for a request like `POST /api/resume/generate`
5. Check the response for the actual error

**Common response errors:**
- `401` - Unauthorized (API key issue)
- `400` - Bad request (missing data)
- `500` - Server error (check backend logs)

## Backend Code Changes

The resume service now:
✅ Defers Gemini client initialization to runtime
✅ Validates API key before attempting to use it
✅ Provides clear error messages
✅ Handles markdown-wrapped JSON responses
✅ Removes fallback generation (directs to manual generation)

## Files Modified

1. `backend/src/services/resume.service.ts`
   - Line 6-18: Changed initialization pattern
   - Line 31: Added `initializeGemini()` call

## Verification

Backend should compile without errors:
```bash
cd backend
npm run build
```

Expected output: No errors, clean compilation

Server should start:
```bash
npm run dev
```

Expected output: 
```
API listening on port 3000
Health check: http://localhost:3000/health
```
