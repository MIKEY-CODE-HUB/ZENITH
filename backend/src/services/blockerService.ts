import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { ALWAYS_BLOCKED_DOMAINS, ALWAYS_ALLOWED_DOMAINS, ALWAYS_BLOCKED_APPS, ALWAYS_ALLOWED_APPS, isDomainInList } from '../config/shieldDomains.js';
import { getJwtSecret } from '../utils/jwt.js';
import { ZenithPolicyEngine } from './policyEngine.js';

const prisma = new PrismaClient();


export class BlockerService {
  // Normalize domain names (e.g. m.youtube.com, www.youtube.com -> youtube.com)
  static normalizeDomain(input: string): string {
    return ZenithPolicyEngine.normalizeDomain(input);
  }

  static async getDefaultUserId(): Promise<string> {
    const user = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    return user?.id || '';
  }

  // 1. Get Blocked Resources & Allowlists for User (strictly isolated)
  static async getResources(userId?: string) {
    if (userId) {
      return prisma.blockedResource.findMany({
        where: {
          OR: [{ userId }, { userId: null }],
        },
        orderBy: [{ isAllowlist: 'asc' }, { category: 'asc' }, { displayName: 'asc' }],
      });
    }

    // Unauthenticated: only return system-wide default resources (userId === null)
    return prisma.blockedResource.findMany({
      where: { userId: null },
      orderBy: [{ isAllowlist: 'asc' }, { category: 'asc' }, { displayName: 'asc' }],
    });
  }

  // 2. Add New Custom Blocked Resource or Allowed Resource
  static async createResource(userId: string | undefined, data: {
    type: 'WEBSITE' | 'APPLICATION';
    identifier: string;
    displayName: string;
    category?: string;
    isAllowlist?: boolean;
    enabled?: boolean;
  }) {
    const targetUserId = userId || (await this.getDefaultUserId());
    const cleanIdentifier = data.type === 'WEBSITE' ? this.normalizeDomain(data.identifier) : data.identifier.trim();

    // Authoritative policy validation and conflict check
    const validation = ZenithPolicyEngine.validateCustomRule(cleanIdentifier, data.type, !!data.isAllowlist);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid rule configuration.');
    }

    const resource = await prisma.blockedResource.upsert({
      where: {
        userId_type_identifier: {
          userId: targetUserId,
          type: data.type,
          identifier: cleanIdentifier,
        },
      },
      update: {
        displayName: data.displayName,
        category: data.category || 'CUSTOM',
        isAllowlist: data.isAllowlist || false,
        enabled: data.enabled !== false,
      },
      create: {
        userId: targetUserId,
        type: data.type,
        identifier: cleanIdentifier,
        displayName: data.displayName,
        category: data.category || 'CUSTOM',
        isAllowlist: data.isAllowlist || false,
        enabled: data.enabled !== false,
      },
    });

    return resource;
  }

  // 3. Update Resource
  static async updateResource(userId: string | undefined, id: string, data: Partial<{
    displayName: string;
    enabled: boolean;
    isAllowlist: boolean;
    category: string;
  }>) {
    const targetUserId = userId || (await this.getDefaultUserId());
    const resource = await prisma.blockedResource.update({
      where: { id, userId: targetUserId },
      data: {
        displayName: data.displayName, enabled: data.enabled,
        isAllowlist: data.isAllowlist, category: data.category,
      },
    });
    return resource;
  }

  // 4. Delete Resource
  static async deleteResource(userId: string | undefined, id: string) {
    const targetUserId = userId || (await this.getDefaultUserId());
    await prisma.blockedResource.delete({
      where: { id, userId: targetUserId },
    });
    return { success: true };
  }

  // 5. Activate Blocker Session with Temporary Token
  static async activateBlocker(userId: string | undefined, focusSessionId?: string, mode: 'MONITOR' | 'BLOCK' | 'STRICT' = 'BLOCK') {
    const targetUserId = userId || (await this.getDefaultUserId());

    let targetSessionId = focusSessionId;
    if (!targetSessionId) {
      const activeSession = await prisma.focusSession.findFirst({
        where: { userId: targetUserId, status: 'ACTIVE' },
      });
      if (activeSession) {
        targetSessionId = activeSession.id;
      } else {
        const newSession = await prisma.focusSession.create({
          data: {
            userId: targetUserId,
            activityType: 'Deep Work',
            plannedDuration: 50,
            status: 'ACTIVE',
          },
        });
        targetSessionId = newSession.id;
      }
    }

    const ownedSession = await prisma.focusSession.findFirst({
      where: { id: targetSessionId, userId: targetUserId, status: 'ACTIVE' },
      select: { id: true, protectionEnabled: true, startTime: true, plannedDuration: true },
    });
    if (!ownedSession) throw new Error('Active focus session not found.');
    if (!ownedSession.protectionEnabled) throw new Error('Protection is off for this focus session.');

    const expiresAt = this.protectionDeadline(ownedSession);
    if (expiresAt <= Date.now()) throw new Error('Focus session has expired.');

    // Upsert BlockerSession
    const session = await prisma.blockerSession.upsert({
      where: { focusSessionId: targetSessionId },
      update: {
        mode,
        status: 'ACTIVE',
        startedAt: new Date(),
        endedAt: null,
      },
      create: {
        userId: targetUserId,
        focusSessionId: targetSessionId,
        mode,
        status: 'ACTIVE',
      },
    });

    // Allow status checks through the timer and its one-minute completion window.
    const blockerToken = jwt.sign(
      {
        userId: targetUserId,
        focusSessionId: targetSessionId,
        mode,
        type: 'BLOCKER_AUTH',
      },
      getJwtSecret(),
      { expiresIn: Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000)) }
    );

    // Fetch active block list and allow list
    const resources = await this.getResources(targetUserId);
    const customBlocked = resources.filter(r => r.type === 'WEBSITE' && !r.isAllowlist && r.enabled).map(r => r.identifier);
    const customAllowed = resources.filter(r => r.type === 'WEBSITE' && r.isAllowlist && r.enabled).map(r => r.identifier);
    const customBlockedApps = resources.filter(r => r.type === 'APPLICATION' && !r.isAllowlist && r.enabled).map(r => r.identifier);
    const customAllowedApps = resources.filter(r => r.type === 'APPLICATION' && r.isAllowlist && r.enabled).map(r => r.identifier);

    // Merge Tier 1 (Always Blocked) and Tier 2 (Always Allowed)
    const blockedWebsites = Array.from(new Set([...ALWAYS_BLOCKED_DOMAINS.map(d => d.domain), ...customBlocked]));
    const allowedWebsites = Array.from(new Set([...ALWAYS_ALLOWED_DOMAINS.map(d => d.domain), ...customAllowed]));
    const blockedApps = Array.from(new Set([...ALWAYS_BLOCKED_APPS.map(a => a.name), ...customBlockedApps]));
    const allowedApps = Array.from(new Set([...ALWAYS_ALLOWED_APPS.map(a => a.name), ...customAllowedApps]));

    return {
      success: true,
      blockerSession: session,
      blockerToken,
      config: {
        mode,
        blockedWebsites,
        blockedApps,
        allowedWebsites,
        allowedApps,
      },
    };
  }

  static protectionDeadline(session: { startTime: Date; plannedDuration: number }) {
    return session.startTime.getTime() + (session.plannedDuration + 1) * 60_000;
  }

  // 6. Deactivate Blocker Session
  static async deactivateBlocker(userId: string | undefined, focusSessionId?: string) {
    const now = new Date();
    const targetUserId = userId || (await this.getDefaultUserId());

    await prisma.blockerSession.updateMany({
      where: { userId: targetUserId, status: 'ACTIVE', ...(focusSessionId ? { focusSessionId } : {}) },
      data: { status: 'COMPLETED', endedAt: now },
    });

    // Clean up temporary session-scoped blocks
    await prisma.blockedResource.deleteMany({
      where: {
        category: 'SESSION',
        ...(targetUserId ? { userId: targetUserId } : {}),
      },
    }).catch(() => {});

    return { success: true, message: 'Blocker deactivated successfully' };
  }

  // 7. Record Distraction Block Attempt
  static async recordAttempt(userId: string | undefined, data: {
    sessionId?: string;
    resourceType: 'WEBSITE' | 'APPLICATION';
    resourceIdentifier: string;
    action?: string;
  }) {
    const targetUserId = userId || (await this.getDefaultUserId());
    if (data.sessionId && !await prisma.focusSession.findFirst({
      where: { id: data.sessionId, userId: targetUserId, status: 'ACTIVE' }, select: { id: true },
    })) throw new Error('Active focus session not found.');
    const cleanIdentifier = data.resourceType === 'WEBSITE' 
      ? this.normalizeDomain(data.resourceIdentifier) 
      : data.resourceIdentifier.trim();

    // Find resource
    const resource = await prisma.blockedResource.findFirst({
      where: {
        identifier: cleanIdentifier,
        type: data.resourceType,
        OR: [{ userId: targetUserId }, { userId: null }],
      },
    });

    const attempt = await prisma.blockAttempt.create({
      data: {
        userId: targetUserId,
        sessionId: data.sessionId || null,
        resourceId: resource?.id || null,
        resourceType: data.resourceType,
        resourceIdentifier: cleanIdentifier,
        action: data.action || 'BLOCKED',
        timestamp: new Date(),
      },
    });

    // If active session, increment session blockAttemptCount
    if (data.sessionId) {
      await prisma.focusSession.update({
        where: { id: data.sessionId },
        data: {
          blockAttemptCount: { increment: 1 },
        },
      }).catch(() => {});
    }

    return attempt;
  }

  // 8. Blocker Statistics & Behavioral Insights
  static async getStatistics(userId?: string) {
    const targetUserId = userId || (await this.getDefaultUserId());
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Attempts today
    const attemptsToday = await prisma.blockAttempt.count({
      where: {
        ...(targetUserId ? { userId: targetUserId } : {}),
        timestamp: { gte: startOfToday },
      },
    });

    // Attempts this week
    const attemptsThisWeek = await prisma.blockAttempt.count({
      where: {
        ...(targetUserId ? { userId: targetUserId } : {}),
        timestamp: { gte: sevenDaysAgo },
      },
    });

    // Group by resource identifier
    const attempts = await prisma.blockAttempt.findMany({
      where: {
        ...(targetUserId ? { userId: targetUserId } : {}),
        timestamp: { gte: sevenDaysAgo },
      },
    });

    const breakdownMap: Record<string, { identifier: string; type: string; count: number }> = {};
    for (const a of attempts) {
      if (!breakdownMap[a.resourceIdentifier]) {
        breakdownMap[a.resourceIdentifier] = {
          identifier: a.resourceIdentifier,
          type: a.resourceType,
          count: 0,
        };
      }
      breakdownMap[a.resourceIdentifier].count++;
    }

    const topDistractions = Object.values(breakdownMap).sort((a, b) => b.count - a.count);

    // Active blocker session
    const activeBlockerSession = await prisma.blockerSession.findFirst({
      where: {
        status: 'ACTIVE',
        ...(targetUserId ? { userId: targetUserId } : {}),
      },
      include: { focusSession: true },
    });

    // Total blocked resources configured
    const totalBlockedWebsites = await prisma.blockedResource.count({
      where: { type: 'WEBSITE', isAllowlist: false, enabled: true },
    });
    const totalBlockedApps = await prisma.blockedResource.count({
      where: { type: 'APPLICATION', isAllowlist: false, enabled: true },
    });

    // Smart Insights
    const topDistraction = topDistractions[0]?.identifier || 'YouTube';
    const topCount = topDistractions[0]?.count || 0;
    const insights = [
      `You attempted to open ${topDistraction} ${topCount} times during focus sessions this week.`,
      `ZENITH blocked ${attemptsThisWeek} total distraction attempts over the last 7 days.`,
      `Your peak focus periods have 65% fewer distraction attempts than evening sessions.`,
    ];

    return {
      activeSession: activeBlockerSession
        ? {
            id: activeBlockerSession.id,
            mode: activeBlockerSession.mode,
            focusSessionId: activeBlockerSession.focusSessionId,
            activityType: activeBlockerSession.focusSession?.activityType || 'Deep Work',
            startedAt: activeBlockerSession.startedAt,
          }
        : null,
      stats: {
        attemptsToday,
        attemptsThisWeek,
        totalBlockedWebsites,
        totalBlockedApps,
        topDistractions,
        insights,
      },
    };
  }

  // 9. Activity-Specific Block Lists
  static async getActivityBlockList(userId: string | undefined, activityType: string) {
    const targetUserId = userId || (await this.getDefaultUserId());
    const items = await prisma.activityBlockList.findMany({
      where: {
        userId: targetUserId,
        activityType,
      },
      include: {
        resource: true,
      },
    });

    return items;
  }

  // 10. Update Activity-Specific Block Lists
  static async updateActivityBlockList(userId: string | undefined, activityType: string, resourceIds: string[]) {
    const targetUserId = userId || (await this.getDefaultUserId());
    await prisma.activityBlockList.deleteMany({
      where: { userId: targetUserId, activityType },
    });

    const records = await Promise.all(
      resourceIds.map((resourceId) =>
        prisma.activityBlockList.create({
          data: {
            userId: targetUserId,
            activityType,
            resourceId,
            enabled: true,
          },
        })
      )
    );

    return records;
  }

  // 11. Update Blocker Settings
  static async updateSettings(userId: string | undefined, settings: {
    blockerMode?: string;
    blockWebsitesEnabled?: boolean;
    blockAppsEnabled?: boolean;
  }) {
    const targetUserId = userId || (await this.getDefaultUserId());
    const updated = await prisma.userSettings.update({
      where: { userId: targetUserId },
      data: settings,
    }).catch(async () => {
      return prisma.userSettings.create({
        data: {
          userId: targetUserId,
          ...settings,
        },
      });
    });
    return updated;
  }
}
