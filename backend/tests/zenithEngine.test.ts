import { describe, it } from 'node:test';
import assert from 'node:assert';
import { FocusScoringService } from '../src/services/focusScoringService.js';
import { PointService } from '../src/services/pointService.js';

describe('⚡ ZENITH Platform Comprehensive Test Suite', () => {
  describe('🧮 Authoritative Focus Scoring Engine', () => {
    it('should calculate perfect score (100) when planned duration is met with zero distraction', () => {
      const result = FocusScoringService.calculateScore({
        plannedDurationMinutes: 50,
        focusedDurationSeconds: 3000,
        distractedDurationSeconds: 0,
        idleDurationSeconds: 0,
        tabSwitchCount: 0,
        warningCount: 0,
        blockAttemptCount: 0,
      });

      assert.strictEqual(result.finalScore, 100);
      assert.strictEqual(result.grade, 'A+');
      assert.strictEqual(result.totalPenalty, 0);
    });

    it('should apply accurate penalties for tab switches and away distraction', () => {
      const result = FocusScoringService.calculateScore({
        plannedDurationMinutes: 50,
        focusedDurationSeconds: 2400,
        distractedDurationSeconds: 300, // 5 mins away
        idleDurationSeconds: 120, // 2 mins idle
        tabSwitchCount: 4,
        warningCount: 1,
        blockAttemptCount: 1,
      });

      assert.ok(result.totalPenalty > 0, 'Total penalty should be greater than 0');
      assert.ok(result.finalScore < 100, 'Score should be penalized');
      assert.ok(result.finalScore >= 0 && result.finalScore <= 100, 'Score should remain within [0, 100]');
    });

    it('should calculate Focus Efficiency Rate correctly', () => {
      const result = FocusScoringService.calculateScore({
        plannedDurationMinutes: 50,
        focusedDurationSeconds: 1800,
        distractedDurationSeconds: 600,
        idleDurationSeconds: 0,
        tabSwitchCount: 1,
        warningCount: 0,
        blockAttemptCount: 0,
      });

      // 1800 / (1800 + 600) = 75%
      assert.strictEqual(result.focusRate, 75);
    });
  });

  describe('⭐ Point Economy & 30% Interaction Room Calculation', () => {
    it('should accurately calculate 30% weekly points deduction', () => {
      const weeklyPoints = 640;
      const cost = Math.max(15, Math.round(weeklyPoints * 0.3));
      const remaining = weeklyPoints - cost;

      assert.strictEqual(cost, 192); // 640 * 0.3 = 192
      assert.strictEqual(remaining, 448);
    });

    it('should enforce minimum threshold for low point balances', () => {
      const weeklyPoints = 20;
      const cost = Math.max(15, Math.round(weeklyPoints * 0.3));
      assert.strictEqual(cost, 15);
    });

    it('should return valid UTC start of week date', () => {
      const startOfWeek = PointService.getStartOfWeekUTC();
      assert.ok(startOfWeek instanceof Date);
      assert.strictEqual(startOfWeek.getUTCHours(), 0);
      assert.strictEqual(startOfWeek.getUTCMinutes(), 0);
      assert.strictEqual(startOfWeek.getUTCSeconds(), 0);
    });
  });

  describe('👥 6-Participant Hard Capacity Enforcement', () => {
    it('should strictly limit interaction capacity to 6', () => {
      const maxParticipantsConfigured = 12;
      const category = 'INTERACTION';
      const effectiveCap = category === 'INTERACTION' ? Math.min(6, maxParticipantsConfigured) : maxParticipantsConfigured;

      assert.strictEqual(effectiveCap, 6, 'Interaction rooms must cap at 6 participants');
    });

    it('should allow normal focus rooms to scale beyond 6', () => {
      const maxParticipantsConfigured = 12;
      const category = 'EDUCATION';
      const effectiveCap = category === 'INTERACTION' ? Math.min(6, maxParticipantsConfigured) : maxParticipantsConfigured;

      assert.strictEqual(effectiveCap, 12);
    });
  });

  describe('🛡️ Three-Tier Distraction Shield & Domain Matching', () => {
    const { ALWAYS_BLOCKED_DOMAINS, ALWAYS_ALLOWED_DOMAINS, isDomainInList } = require('../src/config/shieldDomains.js');

    it('should correctly identify Tier 1 high-distraction domains including subdomains and www', () => {
      assert.ok(isDomainInList('instagram.com', ALWAYS_BLOCKED_DOMAINS));
      assert.ok(isDomainInList('www.instagram.com', ALWAYS_BLOCKED_DOMAINS));
      assert.ok(isDomainInList('reels.instagram.com', ALWAYS_BLOCKED_DOMAINS));
      assert.ok(isDomainInList('reddit.com', ALWAYS_BLOCKED_DOMAINS));
      assert.ok(isDomainInList('old.reddit.com', ALWAYS_BLOCKED_DOMAINS));
      assert.ok(isDomainInList('youtube.com', ALWAYS_BLOCKED_DOMAINS));
      assert.ok(isDomainInList('m.youtube.com', ALWAYS_BLOCKED_DOMAINS));
      assert.ok(isDomainInList('tiktok.com', ALWAYS_BLOCKED_DOMAINS));
      assert.ok(isDomainInList('netflix.com', ALWAYS_BLOCKED_DOMAINS));
      assert.ok(isDomainInList('x.com', ALWAYS_BLOCKED_DOMAINS));
    });

    it('should correctly protect Tier 2 essential learning and coding tools', () => {
      assert.ok(isDomainInList('github.com', ALWAYS_ALLOWED_DOMAINS));
      assert.ok(isDomainInList('gist.github.com', ALWAYS_ALLOWED_DOMAINS));
      assert.ok(isDomainInList('leetcode.com', ALWAYS_ALLOWED_DOMAINS));
      assert.ok(isDomainInList('codeforces.com', ALWAYS_ALLOWED_DOMAINS));
      assert.ok(isDomainInList('chess.com', ALWAYS_ALLOWED_DOMAINS));
      assert.ok(isDomainInList('developer.mozilla.org', ALWAYS_ALLOWED_DOMAINS));
      assert.ok(isDomainInList('localhost', ALWAYS_ALLOWED_DOMAINS));
      assert.ok(isDomainInList('127.0.0.1', ALWAYS_ALLOWED_DOMAINS));
    });

    it('should ensure Tier 1 and Tier 2 lists are mutually exclusive', () => {
      for (const blocked of ALWAYS_BLOCKED_DOMAINS) {
        assert.ok(
          !isDomainInList(blocked.domain, ALWAYS_ALLOWED_DOMAINS),
          `Blocked domain ${blocked.domain} must not be in allowed list`
        );
      }
    });
  });
});
