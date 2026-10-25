import { Router } from 'express';
import { ModerationController } from '../controllers/moderationController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Protected moderation endpoints
router.post('/report', authMiddleware, ModerationController.fileReport);
router.post('/vote', authMiddleware, ModerationController.castVote);
router.get('/active/:roomId', authMiddleware, ModerationController.getActiveBallot);
router.get('/restriction/:roomId', authMiddleware, ModerationController.checkRestriction);

export default router;
