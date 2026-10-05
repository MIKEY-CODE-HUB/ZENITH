import { Router } from 'express';
import { AchievementController } from '../controllers/achievementController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authMiddleware, AchievementController.getAchievements);

export default router;
