import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getProfile,
  updateProfile,
  getUserEducation,
  addEducation,
  updateEducation,
  deleteEducation,
  getUserSkills,
  addSkill,
  removeSkill,
  searchSkills,
  getSkillCategories,
} from '../controllers/profile.controller';

const router = Router();

// All profile routes require authentication
router.use(authenticate);

// Profile routes
router.get('/', getProfile);
router.put('/', updateProfile);

// Education routes
router.get('/education', getUserEducation);
router.post('/education', addEducation);
router.put('/education/:educationId', updateEducation);
router.delete('/education/:educationId', deleteEducation);

// Skill routes
router.get('/skills', getUserSkills);
router.post('/skills', addSkill);
router.delete('/skills/:skillId', removeSkill);

// Search endpoints
router.get('/skills/search', searchSkills);
router.get('/skills/categories', getSkillCategories);

export default router;
