import { Router } from 'express';
import { SessionController } from '../controllers/sessionController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/start', authMiddleware, SessionController.startSession);
router.post('/:sessionId/events', authMiddleware, SessionController.logEvents);
router.post('/:sessionId/end', authMiddleware, SessionController.endSession);
router.get('/history', authMiddleware, SessionController.getHistory);
router.get('/:id', authMiddleware, SessionController.getSession);

export default router;
