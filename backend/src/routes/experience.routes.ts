import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getUserExperiences,
  getExperience,
  createExperience,
  updateExperience,
  deleteExperience,
  addBullet,
  updateBullet,
  deleteBullet,
  reorderBullets,
} from '../controllers/experience.controller';

const router = Router();

// All experience routes require authentication
router.use(authenticate);

// Experience routes
router.get('/', getUserExperiences);
router.get('/:experienceId', getExperience);
router.post('/', createExperience);
router.put('/:experienceId', updateExperience);
router.delete('/:experienceId', deleteExperience);

// Bullet routes
router.post('/:experienceId/bullets', addBullet);
router.put('/bullets/:bulletId', updateBullet);
router.delete('/bullets/:bulletId', deleteBullet);
router.post('/:experienceId/bullets/reorder', reorderBullets);

export default router;
