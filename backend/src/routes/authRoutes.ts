import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import passwordAuthRoutes from './passwordAuthRoutes.js';
import { googleOnlyAuthGuard } from '../middleware/googleOnlyAuthGuard.js';

const router = Router();

// Google OAuth (Authoritative Identity Provider)
router.post('/google', AuthController.googleAuth);
router.use('/password', passwordAuthRoutes);

// Credential-based Auth (Guarded in production)
router.post('/register', googleOnlyAuthGuard, AuthController.register);
router.post('/login', googleOnlyAuthGuard, AuthController.login);

// Phone OTP Auth (Guarded in production)
router.post('/otp/send', googleOnlyAuthGuard, AuthController.sendPhoneOtp);
router.post('/otp/verify', googleOnlyAuthGuard, AuthController.verifyPhoneOtp);

// Password Recovery (Guarded in production)
router.post('/forgot-password', googleOnlyAuthGuard, AuthController.forgotPassword);
router.post('/reset-password', googleOnlyAuthGuard, AuthController.resetPassword);

// Session & Profile
router.post('/logout', AuthController.logout);
router.get('/me', authMiddleware, AuthController.getMe);
router.post('/onboarding', authMiddleware, AuthController.updateOnboarding);

export default router;
