import { Router } from 'express';
import { UserController } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/profile', authMiddleware, UserController.getProfile);
router.put('/settings', authMiddleware, UserController.updateSettings);
router.get('/leaderboard', authMiddleware, UserController.getLeaderboard);

export default router;
