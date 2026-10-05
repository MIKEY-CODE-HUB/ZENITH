import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/authMiddleware.js';
import { BlockerController } from '../controllers/blockerController.js';
import { BlockerService } from '../services/blockerService.js';
import { ALWAYS_BLOCKED_DOMAINS, ALWAYS_ALLOWED_DOMAINS } from '../config/shieldDomains.js';

const router = Router();

// Public health/status check for desktop blocker agent
router.get('/live-status', async (req, res) => {
  try {
    const now = new Date();

    // Auto-expire any stale active sessions whose planned time has passed
    const activeSessions = await prisma.blockerSession.findMany({
      where: { status: 'ACTIVE' },
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

    const activeSession = await prisma.blockerSession.findFirst({
      where: { status: 'ACTIVE' },
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
        message: 'No active focus session',
      });
    }

    const resources = await BlockerService.getResources(activeSession.userId);
    const customBlocked = resources.filter(r => r.type === 'WEBSITE' && !r.isAllowlist && r.enabled).map(r => r.identifier);
    const blockedApps = resources.filter(r => r.type === 'APPLICATION' && !r.isAllowlist && r.enabled).map(r => r.identifier);
    const customAllowed = resources.filter(r => r.type === 'WEBSITE' && r.isAllowlist && r.enabled).map(r => r.identifier);

    const blockedWebsites = Array.from(new Set([...ALWAYS_BLOCKED_DOMAINS.map(d => d.domain), ...customBlocked]));
    const allowedWebsites = Array.from(new Set([...ALWAYS_ALLOWED_DOMAINS.map(d => d.domain), ...customAllowed]));

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
    });
  } catch (err: any) {
    return res.status(500).json({ active: false, error: err.message });
  }
});

// Record desktop app distraction attempt
router.post('/desktop-attempt', async (req, res) => {
  try {
    const { sessionId, appName } = req.body;
    const active = await prisma.blockerSession.findFirst({
      where: { status: 'ACTIVE' },
    });
    if (active) {
      const attempt = await BlockerService.recordAttempt(active.userId, {
        sessionId: sessionId || active.focusSessionId,
        resourceType: 'APPLICATION',
        resourceIdentifier: appName || 'Distracting Desktop App',
        action: 'BLOCKED',
      });
      return res.status(201).json({ success: true, attempt });
    }
    return res.json({ success: false, message: 'No active session' });
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
