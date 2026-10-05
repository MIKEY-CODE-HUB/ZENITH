import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/dashboard', optionalAuthMiddleware, AnalyticsController.getDashboardStats);
router.get('/daily', authMiddleware, AnalyticsController.getDaily);
router.get('/weekly', authMiddleware, AnalyticsController.getWeekly);
router.get('/monthly', authMiddleware, AnalyticsController.getMonthly);
router.get('/activity', authMiddleware, AnalyticsController.getActivityBreakdown);
router.get('/rewarding', optionalAuthMiddleware, AnalyticsController.getRewardingAnalytics);

export default router;
