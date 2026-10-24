import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authMiddleware, optionalAuthMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { BlockerController } from '../controllers/blockerController.js';
import { BlockerService } from '../services/blockerService.js';
import { ALWAYS_BLOCKED_DOMAINS, ALWAYS_ALLOWED_DOMAINS, ALWAYS_BLOCKED_APPS, ALWAYS_ALLOWED_APPS } from '../config/shieldDomains.js';
import { generateToken } from '../utils/jwt.js';

const router = Router();

// 1. Generate Authenticated Pairing Token for Desktop Companion Daemon
router.post('/pair-token', optionalAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const targetUserId = req.user?.userId || (req.query.userId as string);
    if (!targetUserId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to generate desktop companion pairing token',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true, email: true, name: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email || undefined,
    });

    return res.json({
      success: true,
      token,
      user,
      expiresIn: '7d',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. User-scoped health/status check for extension and desktop agent
router.get('/live-status', optionalAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const now = new Date();
    const targetUserId = req.user?.userId || (req.query.userId as string);

    // Auto-expire any stale active sessions whose planned time has passed
    const activeSessions = await prisma.blockerSession.findMany({
      where: {
        status: 'ACTIVE',
        ...(targetUserId ? { userId: targetUserId } : {}),
      },
      include: { focusSession: true },
    });

    for (const s of activeSessions) {
      const maxDurationMinutes = Math.max(30, s.focusSession?.plannedDuration || 50) + 15;
      if (now.getTime() - s.startedAt.getTime() > maxDurationMinutes * 60 * 1000) {
        await prisma.blockerSession.update({
          where: { id: s.id },
          data: { status: 'COMPLETED', endedAt: now },
        });
        if (s.focusSession?.status === 'ACTIVE') {
          await prisma.focusSession.update({
            where: { id: s.focusSessionId },
            data: { status: 'COMPLETED', endTime: now },
          });
        }
      }
    }

    if (!targetUserId) {
      return res.json({
        active: false,
        message: 'Authentication required for user-scoped active focus session',
      });
    }

    const activeSession = await prisma.blockerSession.findFirst({
      where: { status: 'ACTIVE', userId: targetUserId },
      include: {
        focusSession: {
          include: {
            user: {
              select: { id: true, name: true, username: true },
            },
          },
        },
      },
    });

    if (!activeSession) {
      return res.json({
        active: false,
        message: 'No active focus session for authenticated user',
      });
    }

    const resources = await BlockerService.getResources(activeSession.userId);
    const customBlockedWebsites = resources.filter(r => r.type === 'WEBSITE' && !r.isAllowlist && r.enabled).map(r => r.identifier);
    const customAllowedWebsites = resources.filter(r => r.type === 'WEBSITE' && r.isAllowlist && r.enabled).map(r => r.identifier);
    const customBlockedApps = resources.filter(r => r.type === 'APPLICATION' && !r.isAllowlist && r.enabled).map(r => r.identifier);
    const customAllowedApps = resources.filter(r => r.type === 'APPLICATION' && r.isAllowlist && r.enabled).map(r => r.identifier);

    const blockedWebsites = Array.from(new Set([...ALWAYS_BLOCKED_DOMAINS.map(d => d.domain), ...customBlockedWebsites]));
    const allowedWebsites = Array.from(new Set([...ALWAYS_ALLOWED_DOMAINS.map(d => d.domain), ...customAllowedWebsites]));
    const blockedApps = Array.from(new Set([...ALWAYS_BLOCKED_APPS.map(a => a.name), ...customBlockedApps]));
    const allowedApps = Array.from(new Set([...ALWAYS_ALLOWED_APPS.map(a => a.name), ...customAllowedApps]));

    return res.json({
      active: true,
      sessionId: activeSession.focusSessionId,
      userId: activeSession.userId,
      user: activeSession.focusSession.user,
      activityType: activeSession.focusSession.activityType,
      mode: activeSession.mode,
      startedAt: activeSession.startedAt,
      blockedWebsites,
      blockedApps,
      allowedWebsites,
      allowedApps,
    });
  } catch (err: any) {
    return res.status(500).json({ active: false, error: err.message });
  }
});

// 3. Record desktop app distraction attempt (Multi-User Isolated)
router.post('/desktop-attempt', optionalAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { sessionId, appName } = req.body;
    const targetUserId = req.user?.userId || (req.query.userId as string);

    if (!targetUserId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to attribute desktop attempt to user',
      });
    }

    const active = await prisma.blockerSession.findFirst({
      where: {
        status: 'ACTIVE',
        userId: targetUserId,
      },
    });

    if (active) {
      const attempt = await BlockerService.recordAttempt(targetUserId, {
        sessionId: sessionId || active.focusSessionId,
        resourceType: 'APPLICATION',
        resourceIdentifier: appName || 'Distracting Desktop App',
        action: 'BLOCKED',
      });
      return res.status(201).json({ success: true, attempt });
    }
    return res.json({ success: false, message: 'No active focus session for authenticated user' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// All subsequent routes support optional JWT auth (falls back cleanly for guest/local testing)
router.use(optionalAuthMiddleware);

// Resource CRUD
router.get('/resources', BlockerController.getResources);
router.post('/resources', BlockerController.createResource);
router.put('/resources/:id', BlockerController.updateResource);
router.delete('/resources/:id', BlockerController.deleteResource);

// Session Blocker Activation / Deactivation
router.get('/status', BlockerController.getStatus);
router.post('/activate', BlockerController.activate);
router.post('/deactivate', BlockerController.deactivate);

// Block Attempt Recording
router.post('/attempt', BlockerController.recordAttempt);

// Statistics & Insights
router.get('/statistics', BlockerController.getStatistics);

// Activity-Specific Block Lists
router.get('/activity/:activityType', BlockerController.getActivityBlockList);
router.put('/activity/:activityType', BlockerController.updateActivityBlockList);

// Settings
router.put('/settings', BlockerController.updateSettings);

export default router;
