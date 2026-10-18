import { ALWAYS_BLOCKED_DOMAINS, ALWAYS_ALLOWED_DOMAINS, ALWAYS_BLOCKED_APPS, ALWAYS_ALLOWED_APPS, ShieldDomain, ShieldApp, isDomainInList, isAppInList } from './shieldDomains';

export interface UserCustomRule {
  id?: string;
  type: 'WEBSITE' | 'APPLICATION';
  identifier: string;
  displayName?: string;
  isAllowlist: boolean;
  enabled: boolean;
}

export interface PolicyContext {
  isSessionActive: boolean;
  sessionMode?: 'MONITOR' | 'BLOCK' | 'STRICT';
  userRules?: UserCustomRule[];
  customAllowedWebsites?: string[];
  customBlockedWebsites?: string[];
  activeRoomUrl?: string | null;
}

export interface ApplicationPolicyContext {
  isSessionActive: boolean;
  sessionMode?: 'MONITOR' | 'BLOCK' | 'STRICT';
  userRules?: UserCustomRule[];
  customAllowedApps?: string[];
  customBlockedApps?: string[];
}

export interface PolicyEvaluation {
  action: 'ALLOW' | 'BLOCK';
  tier: 'SYSTEM' | 'TIER_1' | 'TIER_2' | 'TIER_3' | 'UNKNOWN';
  reason: string;
  matchedRule?: string;
  cleanIdentifier?: string;
}

export class ZenithPolicyEngine {
  public static normalizeDomain(input: string): string {
    if (!input) return '';
    let domain = input.trim().toLowerCase();
    domain = domain.replace(/^https?:\/\//, '');
    domain = domain.replace(/^www\./, '');
    domain = domain.replace(/^m\./, '');
    domain = domain.split('/')[0];
    domain = domain.split('?')[0];
    domain = domain.split('#')[0];
    domain = domain.split(':')[0];
    return domain.trim();
  }

  public static matchesDomainPattern(hostname: string, targetDomain: string): boolean {
    if (!hostname || !targetDomain) return false;
    const h = this.normalizeDomain(hostname);
    const d = this.normalizeDomain(targetDomain);

    if (!h || !d) return false;
    if (h === d) return true;
    if (h.endsWith('.' + d)) return true;
    if (d === 'localhost' && (h === '127.0.0.1' || h === 'localhost')) return true;

    return false;
  }

  public static matchesAppPattern(appName: string, targetName: string): boolean {
    if (!appName || !targetName) return false;
    const a = appName.toLowerCase().trim();
    const t = targetName.toLowerCase().trim();
    return a === t || a.includes(t) || t.includes(a);
  }

  public static isSystemOrBrowserUrl(url: string): boolean {
    if (!url) return false;
    const trimmed = url.trim().toLowerCase();
    return (
      trimmed === 'about:blank' ||
      trimmed === 'about:newtab' ||
      trimmed.startsWith('chrome://') ||
      trimmed.startsWith('chrome-extension://') ||
      trimmed.startsWith('chrome-search://') ||
      trimmed.startsWith('edge://') ||
      trimmed.startsWith('brave://') ||
      trimmed.startsWith('devtools://') ||
      trimmed.startsWith('view-source:')
    );
  }

  public static isZenithAppUrl(url: string, activeRoomUrl?: string | null): boolean {
    if (!url) return false;
    const trimmed = url.trim().toLowerCase();

    if (trimmed.includes('/blocker/blocked') || trimmed.includes('blocked.html')) {
      return true;
    }

    const host = this.normalizeDomain(url);
    if (!host) return false;

    if (host === 'localhost' || host === '127.0.0.1') {
      return true;
    }

    if (
      host === 'zenith.com' ||
      host.endsWith('.zenith.com') ||
      host === 'zenith.app' ||
      host.endsWith('.zenith.app') ||
      host === 'zenith-focus.com' ||
      host.endsWith('.zenith-focus.com') ||
      host === 'zenith.io' ||
      host.endsWith('.zenith.io') ||
      host === 'zenith.dev' ||
      host.endsWith('.zenith.dev') ||
      host === 'zenith-dusky-theta.vercel.app' ||
      (host.endsWith('.vercel.app') && (host.includes('zenith') || host.includes('trapbreaker')))
    ) {
      return true;
    }

    if (activeRoomUrl) {
      const activeHost = this.normalizeDomain(activeRoomUrl);
      if (activeHost && host === activeHost) return true;
    }

    return false;
  }

  public static validateCustomRule(
    identifier: string,
    type: 'WEBSITE' | 'APPLICATION',
    isAllowlist: boolean
  ): { valid: boolean; error?: string; conflictTier?: 'TIER_1' | 'TIER_2' } {
    if (!identifier || !identifier.trim()) {
      return { valid: false, error: 'Identifier cannot be empty.' };
    }

    const clean = type === 'WEBSITE' ? this.normalizeDomain(identifier) : identifier.trim();

    if (type === 'WEBSITE') {
      if (!clean.includes('.') && clean !== 'localhost') {
        return {
          valid: false,
          error: `Invalid domain format "${identifier}". Please enter a valid domain like "reddit.com" or "news.ycombinator.com".`,
        };
      }

      if (isAllowlist) {
        for (const blocked of ALWAYS_BLOCKED_DOMAINS) {
          if (this.matchesDomainPattern(clean, blocked.domain)) {
            return {
              valid: false,
              conflictTier: 'TIER_1',
              error: `Conflict with Tier 1: ${blocked.name} (${blocked.domain}) is a core distraction platform and cannot be added to allowlist.`,
            };
          }
        }
      }

      if (!isAllowlist) {
        for (const allowed of ALWAYS_ALLOWED_DOMAINS) {
          if (this.matchesDomainPattern(clean, allowed.domain)) {
            return {
              valid: false,
              conflictTier: 'TIER_2',
              error: `Conflict with Tier 2: ${allowed.name} (${allowed.domain}) is an essential productivity platform and cannot be blocked in Zenith.`,
            };
          }
        }
      }
    } else {
      // Application conflict validation
      if (isAllowlist) {
        for (const blocked of ALWAYS_BLOCKED_APPS) {
          if (this.matchesAppPattern(clean, blocked.name)) {
            return {
              valid: false,
              conflictTier: 'TIER_1',
              error: `Conflict with Tier 1: ${blocked.name} is a core distraction application and cannot be added to allowlist.`,
            };
          }
        }
      }

      if (!isAllowlist) {
        for (const allowed of ALWAYS_ALLOWED_APPS) {
          if (this.matchesAppPattern(clean, allowed.name)) {
            return {
              valid: false,
              conflictTier: 'TIER_2',
              error: `Conflict with Tier 2: ${allowed.name} is an essential tool and cannot be blocked in Zenith.`,
            };
          }
        }
      }
    }

    return { valid: true };
  }

  public static evaluateDestination(url: string, context: PolicyContext): PolicyEvaluation {
    if (!url) {
      return { action: 'ALLOW', tier: 'SYSTEM', reason: 'Empty destination' };
    }

    if (this.isSystemOrBrowserUrl(url)) {
      return { action: 'ALLOW', tier: 'SYSTEM', reason: 'Internal browser scheme or empty tab' };
    }

    if (this.isZenithAppUrl(url, context.activeRoomUrl)) {
      return { action: 'ALLOW', tier: 'SYSTEM', reason: 'Zenith core application workspace' };
    }

    if (!context.isSessionActive) {
      return { action: 'ALLOW', tier: 'SYSTEM', reason: 'Focus session is not active (Enforcement Standby)' };
    }

    const host = this.normalizeDomain(url);
    if (!host) {
      return { action: 'ALLOW', tier: 'SYSTEM', reason: 'Unresolvable host' };
    }

    for (const item of ALWAYS_BLOCKED_DOMAINS) {
      if (this.matchesDomainPattern(host, item.domain)) {
        return {
          action: 'BLOCK',
          tier: 'TIER_1',
          matchedRule: item.domain,
          cleanIdentifier: host,
          reason: `Tier 1: ${item.name} is a protected distraction platform.`,
        };
      }
    }

    for (const item of ALWAYS_ALLOWED_DOMAINS) {
      if (this.matchesDomainPattern(host, item.domain)) {
        return {
          action: 'ALLOW',
          tier: 'TIER_2',
          matchedRule: item.domain,
          cleanIdentifier: host,
          reason: `Tier 2: ${item.name} is a protected learning and work platform.`,
        };
      }
    }

    if (context.userRules && context.userRules.length > 0) {
      const matchingAllow = context.userRules.find(
        (r) => r.enabled && r.isAllowlist && r.type === 'WEBSITE' && this.matchesDomainPattern(host, r.identifier)
      );
      if (matchingAllow) {
        return {
          action: 'ALLOW',
          tier: 'TIER_3',
          matchedRule: matchingAllow.identifier,
          cleanIdentifier: host,
          reason: `Tier 3: Allowed by user custom rule (${matchingAllow.displayName || matchingAllow.identifier}).`,
        };
      }

      const matchingBlock = context.userRules.find(
        (r) => r.enabled && !r.isAllowlist && r.type === 'WEBSITE' && this.matchesDomainPattern(host, r.identifier)
      );
      if (matchingBlock) {
        return {
          action: 'BLOCK',
          tier: 'TIER_3',
          matchedRule: matchingBlock.identifier,
          cleanIdentifier: host,
          reason: `Tier 3: Blocked by user custom rule (${matchingBlock.displayName || matchingBlock.identifier}).`,
        };
      }
    }

    if (context.customAllowedWebsites) {
      for (const allowed of context.customAllowedWebsites) {
        if (this.matchesDomainPattern(host, allowed)) {
          return {
            action: 'ALLOW',
            tier: 'TIER_3',
            matchedRule: allowed,
            cleanIdentifier: host,
            reason: `Tier 3: Allowed by user custom configuration.`,
          };
        }
      }
    }

    if (context.customBlockedWebsites) {
      for (const blocked of context.customBlockedWebsites) {
        if (this.matchesDomainPattern(host, blocked)) {
          return {
            action: 'BLOCK',
            tier: 'TIER_3',
            matchedRule: blocked,
            cleanIdentifier: host,
            reason: `Tier 3: Blocked by user custom configuration.`,
          };
        }
      }
    }

    const mode = context.sessionMode || 'STRICT';
    if (mode === 'STRICT') {
      return {
        action: 'BLOCK',
        tier: 'UNKNOWN',
        cleanIdentifier: host,
        reason: 'Strict Focus Mode: Unapproved destination blocked under default-deny policy.',
      };
    }

    return {
      action: 'ALLOW',
      tier: 'UNKNOWN',
      cleanIdentifier: host,
      reason: 'Standard Mode: Destination is not explicitly blocked.',
    };
  }

  public static evaluateApplication(appName: string, context: ApplicationPolicyContext): PolicyEvaluation {
    if (!appName || !appName.trim()) {
      return { action: 'ALLOW', tier: 'SYSTEM', reason: 'Empty application name' };
    }

    const cleanApp = appName.trim();

    if (!context.isSessionActive) {
      return {
        action: 'ALLOW',
        tier: 'SYSTEM',
        reason: 'Focus session is not active (Enforcement Standby)',
      };
    }

    for (const item of ALWAYS_ALLOWED_APPS) {
      if (this.matchesAppPattern(cleanApp, item.name)) {
        return {
          action: 'ALLOW',
          tier: 'TIER_2',
          matchedRule: item.name,
          cleanIdentifier: cleanApp,
          reason: `Tier 2: ${item.name} is a protected productivity application.`,
        };
      }
    }

    for (const item of ALWAYS_BLOCKED_APPS) {
      if (this.matchesAppPattern(cleanApp, item.name)) {
        return {
          action: 'BLOCK',
          tier: 'TIER_1',
          matchedRule: item.name,
          cleanIdentifier: cleanApp,
          reason: `Tier 1: ${item.name} is a protected distraction application.`,
        };
      }
    }

    if (context.userRules && context.userRules.length > 0) {
      const matchingAllow = context.userRules.find(
        (r) => r.enabled && r.isAllowlist && r.type === 'APPLICATION' && this.matchesAppPattern(cleanApp, r.identifier)
      );
      if (matchingAllow) {
        return {
          action: 'ALLOW',
          tier: 'TIER_3',
          matchedRule: matchingAllow.identifier,
          cleanIdentifier: cleanApp,
          reason: `Tier 3: Allowed by user custom rule (${matchingAllow.displayName || matchingAllow.identifier}).`,
        };
      }

      const matchingBlock = context.userRules.find(
        (r) => r.enabled && !r.isAllowlist && r.type === 'APPLICATION' && this.matchesAppPattern(cleanApp, r.identifier)
      );
      if (matchingBlock) {
        return {
          action: 'BLOCK',
          tier: 'TIER_3',
          matchedRule: matchingBlock.identifier,
          cleanIdentifier: cleanApp,
          reason: `Tier 3: Blocked by user custom rule (${matchingBlock.displayName || matchingBlock.identifier}).`,
        };
      }
    }

    if (context.customAllowedApps) {
      for (const allowed of context.customAllowedApps) {
        if (this.matchesAppPattern(cleanApp, allowed)) {
          return {
            action: 'ALLOW',
            tier: 'TIER_3',
            matchedRule: allowed,
            cleanIdentifier: cleanApp,
            reason: `Tier 3: Allowed by user custom configuration.`,
          };
        }
      }
    }

    if (context.customBlockedApps) {
      for (const blocked of context.customBlockedApps) {
        if (this.matchesAppPattern(cleanApp, blocked)) {
          return {
            action: 'BLOCK',
            tier: 'TIER_3',
            matchedRule: blocked,
            cleanIdentifier: cleanApp,
            reason: `Tier 3: Blocked by user custom configuration.`,
          };
        }
      }
    }

    const mode = context.sessionMode || 'STRICT';
    if (mode === 'STRICT') {
      return {
        action: 'BLOCK',
        tier: 'UNKNOWN',
        cleanIdentifier: cleanApp,
        reason: 'Strict Focus Mode: Unapproved application blocked under default-deny policy.',
      };
    }

    return {
      action: 'ALLOW',
      tier: 'UNKNOWN',
      cleanIdentifier: cleanApp,
      reason: 'Standard Mode: Application is not explicitly blocked.',
    };
  }
}
