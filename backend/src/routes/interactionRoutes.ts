import { Router } from 'express';
import { InteractionController } from '../controllers/interactionController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/quote', authMiddleware, InteractionController.getQuote);
router.post('/authorize', authMiddleware, InteractionController.authorizeEntry);
router.post('/report', authMiddleware, InteractionController.reportUser);
router.post('/block', authMiddleware, InteractionController.blockUser);

export default router;
