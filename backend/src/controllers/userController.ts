import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../config/prisma.js';
import { StreakAchievementService } from '../services/streakAchievementService.js';

export class UserController {
  public static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          settings: true,
          userAchievements: { include: { achievement: true } },
          focusSessions: {
            where: { status: 'COMPLETED' },
            orderBy: { startTime: 'desc' },
          },
        },
      });

      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const streak = await StreakAchievementService.calculateStreak(userId);
      const totalFocusedSeconds = user.focusSessions.reduce((acc, s) => acc + s.focusedDuration, 0);
      const avgScore = user.focusSessions.length > 0
        ? Math.round(user.focusSessions.reduce((acc, s) => acc + s.focusScore, 0) / user.focusSessions.length)
        : 0;
      const bestScore = user.focusSessions.reduce((max, s) => Math.max(max, s.focusScore), 0);
      const longestSessionSeconds = user.focusSessions.reduce((max, s) => Math.max(max, s.focusedDuration), 0);

      const { passwordHash: _, ...safeUser } = user;

      res.json({
        success: true,
        profile: {
          ...safeUser,
          currentStreak: streak,
          totalFocusedMinutes: Math.round(totalFocusedSeconds / 60),
          totalSessionsCount: user.focusSessions.length,
          averageFocusScore: avgScore,
          bestFocusScore: bestScore,
          longestSessionMinutes: Math.round(longestSessionSeconds / 60),
          recentSessions: user.focusSessions.slice(0, 5),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async updateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const {
        idleThresholdSeconds,
        warningThresholdSeconds,
        autoStartTimer,
        cameraVisibility,
        activityVisibility,
        showFocusScore,
        distractionAlerts,
        sessionCompleteAlerts,
        streakReminders,
      } = req.body;

      // Validate customThemeTarget
      const allowedTargets = ['DASHBOARD', 'ROOMS', 'BOTH'];
      if (req.body.customThemeTarget && !allowedTargets.includes(req.body.customThemeTarget)) {
        res.status(400).json({ success: false, error: 'customThemeTarget must be DASHBOARD, ROOMS, or BOTH' });
        return;
      }

      // Validate customThemeUrl against script injection
      if (req.body.customThemeUrl) {
        const themeUrl = String(req.body.customThemeUrl).trim();
        if (
          themeUrl.startsWith('javascript:') ||
          themeUrl.startsWith('data:text/html') ||
          themeUrl.includes('<script>') ||
          themeUrl.includes('onerror=')
        ) {
          res.status(400).json({ success: false, error: 'Invalid or unsafe theme URL detected' });
          return;
        }
      }

      const settings = await prisma.userSettings.upsert({
        where: { userId },
        update: {
          idleThresholdSeconds: idleThresholdSeconds !== undefined ? parseInt(idleThresholdSeconds, 10) : undefined,
          warningThresholdSeconds: warningThresholdSeconds !== undefined ? parseInt(warningThresholdSeconds, 10) : undefined,
          autoStartTimer: autoStartTimer !== undefined ? Boolean(autoStartTimer) : undefined,
          cameraVisibility: cameraVisibility || undefined,
          activityVisibility: activityVisibility || undefined,
          showFocusScore: showFocusScore !== undefined ? Boolean(showFocusScore) : undefined,
          distractionAlerts: distractionAlerts !== undefined ? Boolean(distractionAlerts) : undefined,
          sessionCompleteAlerts: sessionCompleteAlerts !== undefined ? Boolean(sessionCompleteAlerts) : undefined,
          streakReminders: streakReminders !== undefined ? Boolean(streakReminders) : undefined,
          appearanceMode: req.body.appearanceMode || undefined,
          customThemeUrl: req.body.customThemeUrl !== undefined ? req.body.customThemeUrl : undefined,
          customThemeTarget: req.body.customThemeTarget || undefined,
          videoLayout: req.body.videoLayout || undefined,
        },
        create: {
          userId,
          idleThresholdSeconds: idleThresholdSeconds || 60,
          warningThresholdSeconds: warningThresholdSeconds || 10,
          autoStartTimer: autoStartTimer || false,
          cameraVisibility: cameraVisibility || 'Participants',
          activityVisibility: activityVisibility || 'Room',
          showFocusScore: showFocusScore !== undefined ? showFocusScore : true,
          distractionAlerts: distractionAlerts !== undefined ? distractionAlerts : true,
          sessionCompleteAlerts: sessionCompleteAlerts !== undefined ? sessionCompleteAlerts : true,
          streakReminders: streakReminders !== undefined ? streakReminders : true,
          appearanceMode: req.body.appearanceMode || 'dark',
          customThemeUrl: req.body.customThemeUrl || null,
          customThemeTarget: req.body.customThemeTarget || 'BOTH',
          videoLayout: req.body.videoLayout || 'footer',
        },
      });

      res.json({ success: true, settings });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async getLeaderboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { metric = 'score' } = req.query; // 'score', 'time', 'streak'

      const users = await prisma.user.findMany({
        include: {
          focusSessions: {
            where: { status: 'COMPLETED' },
            select: { focusedDuration: true, focusScore: true },
          },
        },
      });

      const leaderboardData = await Promise.all(
        users.map(async (u) => {
          const streak = await StreakAchievementService.calculateStreak(u.id);
          const totalFocusedMinutes = Math.round(
            u.focusSessions.reduce((acc, s) => acc + s.focusedDuration, 0) / 60
          );
          const avgScore = u.focusSessions.length > 0
            ? Math.round(u.focusSessions.reduce((acc, s) => acc + s.focusScore, 0) / u.focusSessions.length)
            : 0;

          return {
            id: u.id,
            name: u.name,
            username: u.username,
            avatarUrl: u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`,
            preferredActivity: u.preferredActivity,
            streak,
            totalFocusedMinutes,
            averageScore: avgScore,
            sessionsCount: u.focusSessions.length,
          };
        })
      );

      // Sort according to selected metric
      let sorted = [...leaderboardData];
      if (metric === 'time') {
        sorted.sort((a, b) => b.totalFocusedMinutes - a.totalFocusedMinutes);
      } else if (metric === 'streak') {
        sorted.sort((a, b) => b.streak - a.streak);
      } else {
        // default average focus score
        sorted.sort((a, b) => b.averageScore - a.averageScore);
      }

      res.json({
        success: true,
        metric,
        leaderboard: sorted.slice(0, 20),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async generateThemeProposal(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { activityPreference, mood = 'calm' } = req.body;
      const activity = String(activityPreference || 'Coding').toLowerCase();

      let proposal = {
        themeId: 'tokyo-night',
        name: 'Tokyo Night',
        tagline: 'Quiet Tokyo high-rise desk overlooking neon twilight',
        category: 'TECH',
        bgImageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1920&q=80&auto=format&fit=crop',
        effectType: 'cyber-grid',
        gradientOverlay: 'radial-gradient(ellipse at center, rgba(12,10,24,0.55) 0%, rgba(6,4,14,0.92) 100%)',
        accentColor: '#818cf8',
        recommendedSound: 'lofi',
        rationale: 'Optimized for high-concentration programming sessions with subdued neon contrast.',
      };

      if (activity.includes('study') || activity.includes('read') || activity.includes('math')) {
        proposal = {
          themeId: 'oxford-library',
          name: 'Oxford Cathedral Library',
          tagline: 'Vaulted oak arches and centuries of scholastic heritage',
          category: 'LIBRARY / STUDY',
          bgImageUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1920&q=80&auto=format&fit=crop',
          effectType: 'particles',
          gradientOverlay: 'radial-gradient(ellipse at center, rgba(18,12,6,0.6) 0%, rgba(8,5,2,0.95) 100%)',
          accentColor: '#d97706',
          recommendedSound: 'fireplace',
          rationale: 'Warm acoustic atmosphere suited for deep reading and conceptual study.',
        };
      } else if (activity.includes('gym') || activity.includes('exercise') || activity.includes('workout')) {
        proposal = {
          themeId: 'energy-grid',
          name: 'Energy Grid',
          tagline: 'High-intensity athletic cyber grid designed for workouts',
          category: 'TECH',
          bgImageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80&auto=format&fit=crop',
          effectType: 'cyber-grid',
          gradientOverlay: 'radial-gradient(ellipse at center, rgba(20,8,8,0.5) 0%, rgba(6,2,2,0.94) 100%)',
          accentColor: '#ef4444',
          recommendedSound: 'lofi',
          rationale: 'High contrast dynamic environment designed to support physical momentum.',
        };
      } else if (activity.includes('nature') || activity.includes('calm') || mood === 'nature') {
        proposal = {
          themeId: 'alpine-lake',
          name: 'Alpine Lake & Pine Forest',
          tagline: 'Still emerald waters framed by mist-covered mountain peaks',
          category: 'NATURE',
          bgImageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80&auto=format&fit=crop',
          effectType: 'ambient',
          gradientOverlay: 'radial-gradient(ellipse at center, rgba(6,16,14,0.5) 0%, rgba(2,8,7,0.95) 100%)',
          accentColor: '#059669',
          recommendedSound: 'wind',
          rationale: 'Restorative natural landscape reducing cognitive fatigue during extended sessions.',
        };
      }

      res.json({
        success: true,
        proposal,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
