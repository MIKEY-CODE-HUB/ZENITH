import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Credential-based Auth
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Google OAuth
router.post('/google', AuthController.googleAuth);

// Phone OTP Auth
router.post('/otp/send', AuthController.sendPhoneOtp);
router.post('/otp/verify', AuthController.verifyPhoneOtp);

// Password Recovery
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

// Session & Profile
router.post('/logout', AuthController.logout);
router.get('/me', authMiddleware, AuthController.getMe);
router.post('/onboarding', authMiddleware, AuthController.updateOnboarding);

export default router;
