import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/demo-login', AuthController.demoLogin);
router.get('/me', authMiddleware, AuthController.getMe);
router.post('/onboarding', authMiddleware, AuthController.updateOnboarding);

export default router;
