import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { generateToken } from '../utils/jwt.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export class AuthController {
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, username, email, password, preferredActivity } = req.body;

      if (!name || !username || !email || !password) {
        res.status(400).json({ success: false, error: 'Name, username, email, and password are required' });
        return;
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
        },
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          error: existingUser.email === email.toLowerCase() ? 'Email is already in use' : 'Username is already taken',
        });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          name,
          username: username.toLowerCase(),
          email: email.toLowerCase(),
          passwordHash,
          preferredActivity: preferredActivity || 'Coding',
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
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
            },
          },
        },
        include: { settings: true },
      });

      const token = generateToken({
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      const { passwordHash: _, ...safeUser } = user;
      res.status(201).json({ success: true, user: safeUser, token });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({ success: false, error: error.message || 'Registration failed' });
    }
  }

  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { loginIdentifier, password } = req.body; // email or username

      if (!loginIdentifier || !password) {
        res.status(400).json({ success: false, error: 'Email/username and password are required' });
        return;
      }

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: loginIdentifier.toLowerCase() },
            { username: loginIdentifier.toLowerCase() },
          ],
        },
        include: { settings: true },
      });

      if (!user) {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
        return;
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
        return;
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      const { passwordHash: _, ...safeUser } = user;
      res.json({ success: true, user: safeUser, token });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, error: error.message || 'Login failed' });
    }
  }

  public static async demoLogin(req: Request, res: Response): Promise<void> {
    try {
      const { username = 'mikey' } = req.body;
      const user = await prisma.user.findUnique({
        where: { username: username.toLowerCase() },
        include: { settings: true },
      });

      if (!user) {
        res.status(404).json({ success: false, error: 'Demo user not found. Please run seed.' });
        return;
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      const { passwordHash: _, ...safeUser } = user;
      res.json({ success: true, user: safeUser, token });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Demo login failed' });
    }
  }

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

      const { passwordHash: _, ...safeUser } = user;
      res.json({ success: true, user: safeUser });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch user' });
    }
  }

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

      const { passwordHash: _, ...safeUser } = user;
      res.json({ success: true, user: safeUser });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to update onboarding' });
    }
  }
}
