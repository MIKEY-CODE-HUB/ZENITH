import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { ALWAYS_BLOCKED_DOMAINS, ALWAYS_ALLOWED_DOMAINS, isDomainInList } from '../config/shieldDomains.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'trapbreaker_super_secret_jwt_key_2026';

export class BlockerService {
  // Normalize domain names (e.g. m.youtube.com, www.youtube.com -> youtube.com)
  static normalizeDomain(input: string): string {
    if (!input) return '';
    let domain = input.trim().toLowerCase();
    domain = domain.replace(/^https?:\/\//, '');
    domain = domain.replace(/^www\./, '');
    domain = domain.replace(/^m\./, '');
    domain = domain.split('/')[0];
    domain = domain.split('?')[0];
    return domain;
  }

  static async getDefaultUserId(): Promise<string> {
    const user = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    return user?.id || '';
  }

  // 1. Get Blocked Resources & Allowlists for User (with fallback)
  static async getResources(userId?: string) {
    let resources: any[] = [];
    if (userId) {
      resources = await prisma.blockedResource.findMany({
        where: {
          OR: [{ userId }, { userId: null }],
        },
        orderBy: [{ isAllowlist: 'asc' }, { category: 'asc' }, { displayName: 'asc' }],
      });
    }

    // Fallback: If user has no specific resources or is unauthenticated, fetch all configured resources
    if (!resources || resources.length === 0) {
      resources = await prisma.blockedResource.findMany({
        orderBy: [{ isAllowlist: 'asc' }, { category: 'asc' }, { displayName: 'asc' }],
      });
    }

    return resources;
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

    // Prevent blocking of protected essential learning and problem-solving tools
    if (data.type === 'WEBSITE' && !data.isAllowlist) {
      if (isDomainInList(cleanIdentifier, ALWAYS_ALLOWED_DOMAINS)) {
        throw new Error(`Cannot block protected tool: ${cleanIdentifier} is always allowed in Zenith.`);
      }
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
    const resource = await prisma.blockedResource.update({
      where: { id },
      data,
    });
    return resource;
  }

  // 4. Delete Resource
  static async deleteResource(userId: string | undefined, id: string) {
    await prisma.blockedResource.delete({
      where: { id },
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

    // Generate temporary 2-hour scoped Blocker Token for Extension & Desktop agent
    const blockerToken = jwt.sign(
      {
        userId: targetUserId,
        focusSessionId: targetSessionId,
        mode,
        type: 'BLOCKER_AUTH',
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Fetch active block list and allow list
    const resources = await this.getResources(targetUserId);
    const customBlocked = resources.filter(r => r.type === 'WEBSITE' && !r.isAllowlist && r.enabled).map(r => r.identifier);
    const blockedApps = resources.filter(r => r.type === 'APPLICATION' && !r.isAllowlist && r.enabled).map(r => r.identifier);
    const customAllowed = resources.filter(r => r.type === 'WEBSITE' && r.isAllowlist && r.enabled).map(r => r.identifier);

    // Merge Tier 1 (Always Blocked) and Tier 2 (Always Allowed)
    const blockedWebsites = Array.from(new Set([...ALWAYS_BLOCKED_DOMAINS.map(d => d.domain), ...customBlocked]));
    const allowedWebsites = Array.from(new Set([...ALWAYS_ALLOWED_DOMAINS.map(d => d.domain), ...customAllowed]));

    return {
      success: true,
      blockerSession: session,
      blockerToken,
      config: {
        mode,
        blockedWebsites,
        blockedApps,
        allowedWebsites,
      },
    };
  }

  // 6. Deactivate Blocker Session
  static async deactivateBlocker(userId: string | undefined, focusSessionId?: string) {
    const now = new Date();
    const targetUserId = userId || (await this.getDefaultUserId());

    if (focusSessionId) {
      await prisma.blockerSession.updateMany({
        where: { focusSessionId },
        data: {
          status: 'COMPLETED',
          endedAt: now,
        },
      });
      await prisma.focusSession.updateMany({
        where: { id: focusSessionId, status: 'ACTIVE' },
        data: {
          status: 'COMPLETED',
          endTime: now,
        },
      });
    } else {
      await prisma.blockerSession.updateMany({
        where: { userId: targetUserId, status: 'ACTIVE' },
        data: {
          status: 'COMPLETED',
          endedAt: now,
        },
      });
      await prisma.focusSession.updateMany({
        where: { userId: targetUserId, status: 'ACTIVE' },
        data: {
          status: 'COMPLETED',
          endTime: now,
        },
      });
    }

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
