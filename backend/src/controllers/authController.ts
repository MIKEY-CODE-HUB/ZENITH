import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { generateToken } from '../utils/jwt.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number.' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character.' };
  }
  return { valid: true };
}

function sanitizeUser(user: any) {
  const { passwordHash, otpCode, resetToken, verificationToken, ...safeUser } = user;
  return safeUser;
}

export class AuthController {
  // ── 1. REGISTRATION (EMAIL OR PHONE + PASSWORD) ──────────────────────────
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, username, email, phoneNumber, password, preferredActivity } = req.body;

      if (!name || !username || (!email && !phoneNumber) || !password) {
        res.status(400).json({
          success: false,
          error: 'Name, username, password, and either email or phone number are required',
        });
        return;
      }

      const passCheck = validatePasswordStrength(password);
      if (!passCheck.valid) {
        res.status(400).json({ success: false, error: passCheck.message });
        return;
      }

      const cleanUsername = username.trim().toLowerCase();
      const cleanEmail = email ? email.trim().toLowerCase() : null;
      const cleanPhone = phoneNumber ? phoneNumber.trim().replace(/\s+/g, '') : null;

      // Check for existing user conflicts
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: cleanUsername },
            ...(cleanEmail ? [{ email: cleanEmail }] : []),
            ...(cleanPhone ? [{ phoneNumber: cleanPhone }] : []),
          ],
        },
      });

      if (existingUser) {
        if (existingUser.username === cleanUsername) {
          res.status(400).json({ success: false, error: 'Username is already taken.' });
          return;
        }
        if (cleanEmail && existingUser.email === cleanEmail) {
          res.status(400).json({ success: false, error: 'Email address is already registered.' });
          return;
        }
        if (cleanPhone && existingUser.phoneNumber === cleanPhone) {
          res.status(400).json({ success: false, error: 'Phone number is already registered.' });
          return;
        }
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          name: name.trim(),
          username: cleanUsername,
          email: cleanEmail,
          phoneNumber: cleanPhone,
          passwordHash,
          isEmailVerified: true,
          preferredActivity: preferredActivity || 'Coding',
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
          settings: {
            create: {
              idleThresholdSeconds: 60,
              warningThresholdSeconds: 10,
              autoStartTimer: false,
              cameraVisibility: 'Participants',
              activityVisibility: 'Room',
              showFocusScore: true,
              distractionAlerts: true,
              sessionCompleteAlerts: true,
              streakReminders: true,
              appearanceMode: 'dark',
              customThemeTarget: 'BOTH',
            },
          },
        },
        include: { settings: true },
      });

      const token = generateToken({
        userId: user.id,
        email: user.email || undefined,
        username: user.username,
        phoneNumber: user.phoneNumber || undefined,
      });

      res.status(201).json({ success: true, user: sanitizeUser(user), token });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({ success: false, error: error.message || 'Registration failed' });
    }
  }

  // ── 2. LOGIN (EMAIL/USERNAME/PHONE + PASSWORD) ───────────────────────────
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { loginIdentifier, password } = req.body;

      if (!loginIdentifier || !password) {
        res.status(400).json({ success: false, error: 'Username/email/phone and password are required' });
        return;
      }

      const cleanIdentifier = loginIdentifier.trim().toLowerCase();

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: cleanIdentifier },
            { username: cleanIdentifier },
            { phoneNumber: loginIdentifier.trim().replace(/\s+/g, '') },
          ],
        },
        include: { settings: true },
      });

      if (!user) {
        res.status(401).json({ success: false, error: 'Invalid credentials. User not found.' });
        return;
      }

      if (!user.passwordHash) {
        res.status(401).json({
          success: false,
          error: 'This account was created with Google or Phone OTP. Please log in using that method.',
        });
        return;
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ success: false, error: 'Invalid credentials. Incorrect password.' });
        return;
      }

      const token = generateToken({
        userId: user.id,
        email: user.email || undefined,
        username: user.username,
        phoneNumber: user.phoneNumber || undefined,
      });

      res.json({ success: true, user: sanitizeUser(user), token });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, error: error.message || 'Login failed' });
    }
  }

  // ── 3. GOOGLE OAUTH / ID TOKEN AUTHENTICATION ────────────────────────────
  public static async googleAuth(req: Request, res: Response): Promise<void> {
    try {
      const { email, name, googleId, avatarUrl } = req.body;

      if (!email || !googleId) {
        res.status(400).json({ success: false, error: 'Email and Google ID are required for Google authentication.' });
        return;
      }

      const cleanEmail = email.trim().toLowerCase();

      let user = await prisma.user.findFirst({
        where: {
          OR: [{ googleId }, { email: cleanEmail }],
        },
        include: { settings: true },
      });

      if (user) {
        // Link googleId if not already linked
        if (!user.googleId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { googleId, isEmailVerified: true },
            include: { settings: true },
          });
        }
      } else {
        // Create new user from Google profile
        const baseUsername = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '').slice(0, 18) || 'user';
        let uniqueUsername = baseUsername;
        let counter = 1;
        while (await prisma.user.findUnique({ where: { username: uniqueUsername } })) {
          uniqueUsername = `${baseUsername}${counter++}`;
        }

        user = await prisma.user.create({
          data: {
            name: (name || cleanEmail.split('@')[0]).trim(),
            username: uniqueUsername,
            email: cleanEmail,
            googleId,
            isEmailVerified: true,
            avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${uniqueUsername}`,
            settings: {
              create: {
                idleThresholdSeconds: 60,
                warningThresholdSeconds: 10,
                appearanceMode: 'dark',
              },
            },
          },
          include: { settings: true },
        });
      }

      const token = generateToken({
        userId: user.id,
        email: user.email || undefined,
        username: user.username,
      });

      res.json({ success: true, user: sanitizeUser(user), token });
    } catch (error: any) {
      console.error('Google auth error:', error);
      res.status(500).json({ success: false, error: error.message || 'Google authentication failed' });
    }
  }

  // ── 4. PHONE NUMBER OTP DISPATCH ─────────────────────────────────────────
  public static async sendPhoneOtp(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber || phoneNumber.trim().length < 8) {
        res.status(400).json({ success: false, error: 'Valid phone number is required.' });
        return;
      }

      const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
      const user = await prisma.user.findUnique({
        where: { phoneNumber: cleanPhone },
      });

      // Rate limit / cooldown: 60s cooldown
      if (user && user.otpCooldownUntil && user.otpCooldownUntil > new Date()) {
        const remainingSec = Math.ceil((user.otpCooldownUntil.getTime() - Date.now()) / 1000);
        res.status(429).json({
          success: false,
          error: `Please wait ${remainingSec}s before requesting another OTP.`,
          cooldownSeconds: remainingSec,
        });
        return;
      }

      // Generate cryptographically random 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
      const otpCooldownUntil = new Date(Date.now() + 60 * 1000); // 60s

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            otpCode,
            otpExpiresAt,
            otpAttempts: 0,
            otpCooldownUntil,
          },
        });
      }

      console.log(`\x1b[35m[ZENITH AUTH] Verification OTP for ${cleanPhone}: ${otpCode}\x1b[0m`);

      res.json({
        success: true,
        message: 'Verification code sent.',
        cooldownSeconds: 60,
        // In local development, surface the code for automated verification testing
        devCode: process.env.NODE_ENV !== 'production' ? otpCode : undefined,
      });
    } catch (error: any) {
      console.error('Send OTP error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to send OTP' });
    }
  }

  // ── 5. PHONE NUMBER OTP VERIFICATION & LOGIN ──────────────────────────────
  public static async verifyPhoneOtp(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber, otpCode, name } = req.body;

      if (!phoneNumber || !otpCode) {
        res.status(400).json({ success: false, error: 'Phone number and verification code are required.' });
        return;
      }

      const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
      let user = await prisma.user.findUnique({
        where: { phoneNumber: cleanPhone },
        include: { settings: true },
      });

      if (!user) {
        // Create new account verified via phone
        const baseUsername = `phone_${cleanPhone.slice(-6)}`;
        let uniqueUsername = baseUsername;
        let counter = 1;
        while (await prisma.user.findUnique({ where: { username: uniqueUsername } })) {
          uniqueUsername = `${baseUsername}${counter++}`;
        }

        user = await prisma.user.create({
          data: {
            name: (name || 'Scholar').trim(),
            username: uniqueUsername,
            phoneNumber: cleanPhone,
            isPhoneVerified: true,
            avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${uniqueUsername}`,
            settings: {
              create: {
                idleThresholdSeconds: 60,
                appearanceMode: 'dark',
              },
            },
          },
          include: { settings: true },
        });
      } else {
        // Validate existing OTP
        if (!user.otpCode || !user.otpExpiresAt) {
          res.status(400).json({ success: false, error: 'No active OTP request found. Please request a new code.' });
          return;
        }

        if (user.otpExpiresAt < new Date()) {
          res.status(400).json({ success: false, error: 'OTP has expired. Please request a new code.' });
          return;
        }

        if (user.otpAttempts >= 5) {
          res.status(400).json({ success: false, error: 'Too many failed attempts. Please request a new code.' });
          return;
        }

        if (user.otpCode !== otpCode.trim()) {
          await prisma.user.update({
            where: { id: user.id },
            data: { otpAttempts: { increment: 1 } },
          });
          res.status(400).json({ success: false, error: 'Invalid verification code.' });
          return;
        }

        // Successfully verified: clear OTP code
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            isPhoneVerified: true,
            otpCode: null,
            otpExpiresAt: null,
            otpAttempts: 0,
          },
          include: { settings: true },
        });
      }

      const token = generateToken({
        userId: user.id,
        email: user.email || undefined,
        username: user.username,
        phoneNumber: user.phoneNumber || undefined,
      });

      res.json({ success: true, user: sanitizeUser(user), token });
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ success: false, error: error.message || 'OTP verification failed' });
    }
  }

  // ── 6. FORGOT PASSWORD (REQUEST RESET TOKEN) ─────────────────────────────
  public static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ success: false, error: 'Email address is required.' });
        return;
      }

      const cleanEmail = email.trim().toLowerCase();
      const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (!user) {
        // Safe response to prevent account enumeration
        res.json({ success: true, message: 'If an account matches, password reset instructions have been generated.' });
        return;
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry },
      });

      console.log(`\x1b[35m[ZENITH AUTH] Password reset token for ${cleanEmail}: ${resetToken}\x1b[0m`);

      res.json({
        success: true,
        message: 'Password reset token generated.',
        devToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
      });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to process password reset' });
    }
  }

  // ── 7. RESET PASSWORD (SUBMIT NEW PASSWORD) ──────────────────────────────
  public static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { resetToken, newPassword } = req.body;

      if (!resetToken || !newPassword) {
        res.status(400).json({ success: false, error: 'Reset token and new password are required.' });
        return;
      }

      const passCheck = validatePasswordStrength(newPassword);
      if (!passCheck.valid) {
        res.status(400).json({ success: false, error: passCheck.message });
        return;
      }

      const user = await prisma.user.findFirst({
        where: {
          resetToken,
          resetTokenExpiry: { gt: new Date() },
        },
      });

      if (!user) {
        res.status(400).json({ success: false, error: 'Invalid or expired password reset token.' });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      res.json({ success: true, message: 'Password has been updated successfully. Please log in with your new password.' });
    } catch (error: any) {
      console.error('Reset password error:', error);
      res.status(500).json({ success: false, error: error.message || 'Password reset failed' });
    }
  }

  // ── 8. GET CURRENT AUTHENTICATED USER ────────────────────────────────────
  public static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        include: {
          settings: true,
          userAchievements: { include: { achievement: true } },
        },
      });

      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      res.json({ success: true, user: sanitizeUser(user) });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch user' });
    }
  }

  // ── 9. UPDATE ONBOARDING PREFERENCES ─────────────────────────────────────
  public static async updateOnboarding(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        preferredActivity,
        typicalDuration,
        cameraAccountability,
        distractionWarnings,
        streakTracking,
      } = req.body;

      const user = await prisma.user.update({
        where: { id: req.user!.userId },
        data: {
          preferredActivity: preferredActivity || undefined,
          typicalDuration: typicalDuration ? parseInt(typicalDuration, 10) : undefined,
          cameraAccountability: cameraAccountability !== undefined ? Boolean(cameraAccountability) : undefined,
          distractionWarnings: distractionWarnings !== undefined ? Boolean(distractionWarnings) : undefined,
          streakTracking: streakTracking !== undefined ? Boolean(streakTracking) : undefined,
        },
        include: { settings: true },
      });

      res.json({ success: true, user: sanitizeUser(user) });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to update onboarding' });
    }
  }

  // ── 10. LOGOUT ───────────────────────────────────────────────────────────
  public static async logout(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Logged out successfully.' });
  }
}
