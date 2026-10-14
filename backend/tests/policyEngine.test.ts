import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ZenithPolicyEngine, PolicyContext, UserCustomRule } from '../src/services/policyEngine.js';
import { ALWAYS_BLOCKED_DOMAINS, ALWAYS_ALLOWED_DOMAINS } from '../src/config/shieldDomains.js';

describe('🛡️ Zenith Authoritative Three-Tier Policy Engine', () => {
  const baseActiveContext: PolicyContext = {
    isSessionActive: true,
    sessionMode: 'STRICT',
  };

  const inactiveContext: PolicyContext = {
    isSessionActive: false,
    sessionMode: 'STRICT',
  };

  describe('1. URL Normalization & Pattern Matching', () => {
    it('should normalize URLs with protocols, www, subdomains, ports, and query parameters', () => {
      assert.strictEqual(ZenithPolicyEngine.normalizeDomain('https://www.google.com/search?q=test'), 'google.com');
      assert.strictEqual(ZenithPolicyEngine.normalizeDomain('http://M.YOUTUBE.COM:443/watch?v=123#t=10'), 'youtube.com');
      assert.strictEqual(ZenithPolicyEngine.normalizeDomain('https://reels.instagram.com/p/123/'), 'reels.instagram.com');
      assert.strictEqual(ZenithPolicyEngine.normalizeDomain('http://localhost:3000/focus/room-1'), 'localhost');
      assert.strictEqual(ZenithPolicyEngine.normalizeDomain('http://127.0.0.1:5001/api/health'), '127.0.0.1');
    });

    it('should match exact domains and nested subdomains correctly', () => {
      assert.ok(ZenithPolicyEngine.matchesDomainPattern('instagram.com', 'instagram.com'));
      assert.ok(ZenithPolicyEngine.matchesDomainPattern('www.instagram.com', 'instagram.com'));
      assert.ok(ZenithPolicyEngine.matchesDomainPattern('reels.instagram.com', 'instagram.com'));
      assert.ok(ZenithPolicyEngine.matchesDomainPattern('api.v2.discord.com', 'discord.com'));
      assert.ok(ZenithPolicyEngine.matchesDomainPattern('gist.github.com', 'github.com'));
      assert.ok(ZenithPolicyEngine.matchesDomainPattern('127.0.0.1', 'localhost'));

      // Negative matches (must not match arbitrary substrings)
      assert.ok(!ZenithPolicyEngine.matchesDomainPattern('notinstagram.com', 'instagram.com'));
      assert.ok(!ZenithPolicyEngine.matchesDomainPattern('myreddit.org', 'reddit.com'));
      assert.ok(!ZenithPolicyEngine.matchesDomainPattern('fakegithub.com', 'github.com'));
    });
  });

  describe('2. Scenario A & D: Tier 2 Allowed Destinations & Study Workflows', () => {
    it('should allow Google Search and keep it usable for queries', () => {
      const searchRes = ZenithPolicyEngine.evaluateDestination(
        'https://www.google.com/search?q=binary+search+tree',
        baseActiveContext
      );
      assert.strictEqual(searchRes.action, 'ALLOW');
      assert.strictEqual(searchRes.tier, 'TIER_2');
      assert.strictEqual(searchRes.matchedRule, 'google.com');
    });

    it('should allow essential developer and study tools without penalty', () => {
      const tools = [
        'https://github.com/torvalds/linux',
        'https://github.dev/user/project',
        'https://leetcode.com/problems/two-sum/',
        'https://codeforces.com/contest/123',
        'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
        'https://stackoverflow.com/questions/11227809',
        'https://docs.google.com/document/d/123/edit',
        'https://vscode.dev/',
        'https://chess.com/play/computer',
      ];

      for (const url of tools) {
        const res = ZenithPolicyEngine.evaluateDestination(url, baseActiveContext);
        assert.strictEqual(res.action, 'ALLOW', `Expected ${url} to be allowed`);
        assert.strictEqual(res.tier, 'TIER_2', `Expected ${url} to be Tier 2`);
      }
    });
  });

  describe('3. Scenario B & C: Tier 1 Blocked Destinations & Search Result Interception', () => {
    it('should block all Tier 1 high-distraction platforms', () => {
      const distractions = [
        'https://www.instagram.com/',
        'https://reels.instagram.com/reel/xyz',
        'https://reddit.com/r/all',
        'https://old.reddit.com/',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://m.youtube.com/shorts',
        'https://tiktok.com/@creator/video/123',
        'https://discord.com/channels/@me',
        'https://x.com/explore',
        'https://netflix.com/browse',
        'https://twitch.tv/streamer',
        'https://primevideo.com/',
      ];

      for (const url of distractions) {
        const res = ZenithPolicyEngine.evaluateDestination(url, baseActiveContext);
        assert.strictEqual(res.action, 'BLOCK', `Expected ${url} to be blocked`);
        assert.strictEqual(res.tier, 'TIER_1', `Expected ${url} to be Tier 1`);
      }
    });

    it('should verify Scenario C: Google Search is allowed, but clicking a restricted link is blocked', () => {
      // 1. User performs Google Search
      const searchRes = ZenithPolicyEngine.evaluateDestination(
        'https://www.google.com/search?q=watch+funny+reels',
        baseActiveContext
      );
      assert.strictEqual(searchRes.action, 'ALLOW');
      assert.strictEqual(searchRes.tier, 'TIER_2');

      // 2. Search result navigates to Instagram
      const clickRes = ZenithPolicyEngine.evaluateDestination(
        'https://www.instagram.com/explore/reels',
        baseActiveContext
      );
      assert.strictEqual(clickRes.action, 'BLOCK');
      assert.strictEqual(clickRes.tier, 'TIER_1');
    });
  });

  describe('4. Scenario E: Tier 3 Custom Rules & Precedence Conflicts', () => {
    const customRules: UserCustomRule[] = [
      {
        type: 'WEBSITE',
        identifier: 'news.ycombinator.com',
        displayName: 'Hacker News',
        isAllowlist: true,
        enabled: true,
      },
      {
        type: 'WEBSITE',
        identifier: 'ebay.com',
        displayName: 'eBay Shopping',
        isAllowlist: false,
        enabled: true,
      },
    ];

    const contextWithCustom: PolicyContext = {
      ...baseActiveContext,
      userRules: customRules,
    };

    it('should allow custom user allowed website (Tier 3 Allow)', () => {
      const res = ZenithPolicyEngine.evaluateDestination('https://news.ycombinator.com/news', contextWithCustom);
      assert.strictEqual(res.action, 'ALLOW');
      assert.strictEqual(res.tier, 'TIER_3');
      assert.strictEqual(res.matchedRule, 'news.ycombinator.com');
    });

    it('should block custom user blocked website (Tier 3 Block)', () => {
      const res = ZenithPolicyEngine.evaluateDestination('https://www.ebay.com/itm/12345', contextWithCustom);
      assert.strictEqual(res.action, 'BLOCK');
      assert.strictEqual(res.tier, 'TIER_3');
      assert.strictEqual(res.matchedRule, 'ebay.com');
    });

    it('should reject validation if user attempts to ALLOW a protected Tier 1 domain', () => {
      const validation = ZenithPolicyEngine.validateCustomRule('instagram.com', 'WEBSITE', true);
      assert.strictEqual(validation.valid, false);
      assert.strictEqual(validation.conflictTier, 'TIER_1');
      assert.ok(validation.error?.includes('core distraction platform'));
    });

    it('should reject validation if user attempts to BLOCK a protected Tier 2 domain', () => {
      const validation = ZenithPolicyEngine.validateCustomRule('github.com', 'WEBSITE', false);
      assert.strictEqual(validation.valid, false);
      assert.strictEqual(validation.conflictTier, 'TIER_2');
      assert.ok(validation.error?.includes('essential productivity platform'));
    });

    it('should enforce rule precedence: Tier 1 overrides malicious or stale custom allow rule', () => {
      const rogueContext: PolicyContext = {
        ...baseActiveContext,
        userRules: [
          {
            type: 'WEBSITE',
            identifier: 'instagram.com',
            displayName: 'Rogue Instagram Allow',
            isAllowlist: true, // Attempt to allow Tier 1
            enabled: true,
          },
        ],
      };

      const res = ZenithPolicyEngine.evaluateDestination('https://instagram.com/reels', rogueContext);
      assert.strictEqual(res.action, 'BLOCK', 'Tier 1 must strictly override any custom allow rule');
      assert.strictEqual(res.tier, 'TIER_1');
    });

    it('should enforce rule precedence: Tier 2 overrides accidental custom block rule', () => {
      const rogueContext: PolicyContext = {
        ...baseActiveContext,
        userRules: [
          {
            type: 'WEBSITE',
            identifier: 'github.com',
            displayName: 'Accidental GitHub Block',
            isAllowlist: false, // Attempt to block Tier 2
            enabled: true,
          },
        ],
      };

      const res = ZenithPolicyEngine.evaluateDestination('https://github.com/trending', rogueContext);
      assert.strictEqual(res.action, 'ALLOW', 'Tier 2 must strictly override any custom block rule');
      assert.strictEqual(res.tier, 'TIER_2');
    });
  });

  describe('5. Default-Deny & Unknown Destinations', () => {
    it('should block unknown destinations in STRICT mode (Default-Deny)', () => {
      const res = ZenithPolicyEngine.evaluateDestination('https://some-random-game-site.io/play', baseActiveContext);
      assert.strictEqual(res.action, 'BLOCK');
      assert.strictEqual(res.tier, 'UNKNOWN');
      assert.ok(res.reason.includes('default-deny'));
    });

    it('should allow unknown destinations in standard BLOCK mode if not explicitly blocked', () => {
      const blockModeContext: PolicyContext = {
        ...baseActiveContext,
        sessionMode: 'BLOCK',
      };
      const res = ZenithPolicyEngine.evaluateDestination('https://some-informational-blog.org/post', blockModeContext);
      assert.strictEqual(res.action, 'ALLOW');
      assert.strictEqual(res.tier, 'UNKNOWN');
    });
  });

  describe('6. Lifecycle & System Exemption Scenarios', () => {
    it('should allow all navigation when session is inactive (Enforcement Standby)', () => {
      const res = ZenithPolicyEngine.evaluateDestination('https://instagram.com/', inactiveContext);
      assert.strictEqual(res.action, 'ALLOW');
      assert.strictEqual(res.tier, 'SYSTEM');
      assert.ok(res.reason.includes('not active'));
    });

    it('should exempt internal browser schemes and empty tabs', () => {
      const schemes = [
        'about:blank',
        'about:newtab',
        'chrome://extensions',
        'chrome-extension://abcdefg/blocked.html',
        'edge://settings',
        'devtools://devtools/bundled/inspector.html',
      ];

      for (const url of schemes) {
        const res = ZenithPolicyEngine.evaluateDestination(url, baseActiveContext);
        assert.strictEqual(res.action, 'ALLOW');
        assert.strictEqual(res.tier, 'SYSTEM');
      }
    });

    it('should exempt Zenith application URLs and rooms', () => {
      const zenithUrls = [
        'http://localhost:3000/focus/room-alpha',
        'http://127.0.0.1:3000/dashboard',
        'https://zenith-dusky-theta.vercel.app/focus/room-beta',
        'https://zenith.app/rooms',
      ];

      for (const url of zenithUrls) {
        const res = ZenithPolicyEngine.evaluateDestination(url, baseActiveContext);
        assert.strictEqual(res.action, 'ALLOW');
        assert.strictEqual(res.tier, 'SYSTEM');
      }
    });
  });
});
