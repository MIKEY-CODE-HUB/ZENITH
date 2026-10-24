import { Router } from 'express';
import { AchievementController } from '../controllers/achievementController.js';
import { optionalAuthMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', optionalAuthMiddleware, AchievementController.getAchievements);

export default router;
