import multer from 'multer';
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getProfile,
  updateProfile,
  getUserEducation,
  addEducation,
  updateEducation,
  deleteEducation,
  getUserLinks,
  addLink,
  updateLink,
  deleteLink,
  getUserSkills,
  addSkill,
  removeSkill,
  searchSkills,
  getSkillCategories,
  getCustomPrompt,
  saveCustomPrompt,
} from '../controllers/profile.controller';
import { parseResume, commitParsedResume } from '../controllers/resumeParser.controller';

const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are supported.'));
    }
  }
});

const router = Router();

// All profile routes require authentication
router.use(authenticate);

// Resume parse (no DB writes, returns data for review) + commit (writes reviewed data)
router.post('/parse-resume', resumeUpload.single('resume'), parseResume);
router.post('/commit-resume-data', commitParsedResume);

// Profile routes
router.get('/', getProfile);
router.put('/', updateProfile);

// Custom Prompt routes
router.get('/prompt/custom', getCustomPrompt);
router.put('/prompt/custom', saveCustomPrompt);

// Education routes
router.get('/education', getUserEducation);
router.post('/education', addEducation);
router.put('/education/:educationId', updateEducation);
router.delete('/education/:educationId', deleteEducation);

// Link routes
router.get('/links', getUserLinks);
router.post('/links', addLink);
router.put('/links/:linkId', updateLink);
router.delete('/links/:linkId', deleteLink);

// Skill routes
router.get('/skills', getUserSkills);
router.post('/skills', addSkill);
router.delete('/skills/:skillId', removeSkill);

// Search endpoints
router.get('/skills/search', searchSkills);
router.get('/skills/categories', getSkillCategories);

export default router;
