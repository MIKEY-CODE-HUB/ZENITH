import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { PrismaClient } from '@prisma/client';
import { ModerationService } from '../src/services/moderationService.js';
import { generateToken } from '../src/utils/jwt.js';

const prisma = new PrismaClient();

describe('⚖️ CHUNK 11: Community-Based Misbehaviour Reporting & Auto-Kick Engine', () => {
  let testRoomId: string;
  let reporterId: string;
  let accusedId: string;
  let voterIds: string[] = [];

  before(async () => {
    // 1. Create a dedicated test room
    const creator = await prisma.user.create({
      data: {
        name: 'Mod Test Creator',
        username: `mod_creator_${Date.now()}`,
        email: `mod_creator_${Date.now()}@zenith.test`,
      },
    });

    const room = await prisma.room.create({
      data: {
        name: 'Moderation Test Room',
        category: 'EDUCATION',
        creatorId: creator.id,
        roomCode: `MOD-${Date.now()}`,
        maxParticipants: 10,
        status: 'ACTIVE',
      },
    });
    testRoomId = room.id;

    // 2. Create reporter and accused users
    const reporter = await prisma.user.create({
      data: {
        name: 'Alice Reporter',
        username: `alice_${Date.now()}`,
        email: `alice_${Date.now()}@zenith.test`,
      },
    });
    reporterId = reporter.id;

    const accused = await prisma.user.create({
      data: {
        name: 'Bob Disruptor',
        username: `bob_${Date.now()}`,
        email: `bob_${Date.now()}@zenith.test`,
      },
    });
    accusedId = accused.id;

    // 3. Create 4 independent room peers
    voterIds = [];
    for (let i = 1; i <= 4; i++) {
      const peer = await prisma.user.create({
        data: {
          name: `Peer Voter ${i}`,
          username: `peer_${i}_${Date.now()}`,
          email: `peer_${i}_${Date.now()}@zenith.test`,
        },
      });
      voterIds.push(peer.id);
    }

    // 4. Join all participants into the room
    const allUsers = [reporterId, accusedId, ...voterIds];
    for (const uId of allUsers) {
      await prisma.roomParticipant.create({
        data: {
          roomId: testRoomId,
          userId: uId,
          status: 'ACTIVE',
        },
      });
    }
  });

  after(async () => {
    // Cleanup
    await prisma.moderationVote.deleteMany({
      where: { incident: { roomId: testRoomId } },
    });
    await prisma.roomRestriction.deleteMany({
      where: { roomId: testRoomId },
    });
    await prisma.moderationIncident.deleteMany({
      where: { roomId: testRoomId },
    });
    await prisma.roomParticipant.deleteMany({
      where: { roomId: testRoomId },
    });
    await prisma.room.deleteMany({
      where: { id: testRoomId },
    });
  });

  it('11.1 should reject self-reporting attempts', async () => {
    await assert.rejects(
      async () => {
        await ModerationService.createIncident({
          roomId: testRoomId,
          reporterId: accusedId,
          accusedId: accusedId,
          reason: 'Harassment',
        });
      },
      (err: any) => err.message.includes('SELF_REPORT_FORBIDDEN')
    );
  });

  it('11.1 should reject reports if reporter is not an active room participant', async () => {
    await assert.rejects(
      async () => {
        await ModerationService.createIncident({
          roomId: testRoomId,
          reporterId: 'non-existent-user-id',
          accusedId: accusedId,
          reason: 'Harassment',
        });
      },
      (err: any) => err.message.includes('UNAUTHORIZED_REPORTER')
    );
  });

  it('11.2 & 11.3 should freeze eligible voters excluding accused and reporter, capping up to 8', async () => {
    const incident = await ModerationService.createIncident({
      roomId: testRoomId,
      reporterId,
      accusedId,
      reason: 'Deliberate disruption and spamming audio',
      details: 'Repeatedly playing loud audio despite requests',
    });

    assert.ok(incident.id, 'Incident ID should be generated');
    assert.strictEqual(incident.status, 'VOTING');
    assert.strictEqual(incident.accusedId, accusedId);
    assert.strictEqual(incident.reporterId, reporterId);

    // Verify voter exclusion
    assert.strictEqual(incident.eligibleVoters.includes(accusedId), false, 'Accused must be excluded from ballot');
    assert.strictEqual(incident.eligibleVoters.includes(reporterId), false, 'Reporter must be excluded from ballot');

    // Total eligible voters should be the 4 peers
    assert.strictEqual(incident.totalVotersCount, 4);

    // 11.4: Strict majority >50% threshold: floor(4 / 2) + 1 = 3 votes required!
    assert.strictEqual(incident.requiredVotes, 3, '4 voters require strictly >50% which is 3 votes (not 2)');
  });

  it('11.2 should reject duplicate ballot creation while an active ballot is in progress', async () => {
    await assert.rejects(
      async () => {
        await ModerationService.createIncident({
          roomId: testRoomId,
          reporterId,
          accusedId,
          reason: 'Duplicate report attempt',
        });
      },
      (err: any) => err.message.includes('BALLOT_ALREADY_ACTIVE')
    );
  });

  it('11.2 should reject vote from an unauthorized non-eligible participant', async () => {
    const activeBallot = await ModerationService.getActiveBallotForRoom(testRoomId);
    assert.ok(activeBallot, 'Active ballot should exist');

    await assert.rejects(
      async () => {
        await ModerationService.castVote({
          incidentId: activeBallot.incidentId,
          voterId: accusedId, // Accused cannot vote
          decision: 'NO',
        });
      },
      (err: any) => err.message.includes('INELIGIBLE_VOTER')
    );
  });

  it('11.4 should reject duplicate votes from the same eligible voter', async () => {
    const activeBallot = await ModerationService.getActiveBallotForRoom(testRoomId);
    assert.ok(activeBallot);

    const firstVoter = voterIds[0];

    // First vote: SUCCESS
    const res1 = await ModerationService.castVote({
      incidentId: activeBallot.incidentId,
      voterId: firstVoter,
      decision: 'YES',
    });
    assert.strictEqual(res1.status, 'VOTING');
    assert.strictEqual(res1.yesVotes, 1);

    // Second vote: REJECTED DUPLICATE
    await assert.rejects(
      async () => {
        await ModerationService.castVote({
          incidentId: activeBallot.incidentId,
          voterId: firstVoter,
          decision: 'YES',
        });
      },
      (err: any) => err.message.includes('DUPLICATE_VOTE')
    );
  });

  it('11.4 should NOT kick when exactly 50% votes cast (strictly >50% required)', async () => {
    const activeBallot = await ModerationService.getActiveBallotForRoom(testRoomId);
    assert.ok(activeBallot);

    // Second peer votes YES -> Total YES = 2 out of 4 (50%)
    const res2 = await ModerationService.castVote({
      incidentId: activeBallot.incidentId,
      voterId: voterIds[1],
      decision: 'YES',
    });

    assert.strictEqual(res2.yesVotes, 2);
    assert.strictEqual(res2.status, 'VOTING', '2/4 is exactly 50% which is NOT strictly >50% - user must not be kicked');
    assert.strictEqual(res2.kicked, false);

    // Confirm accused participant is still active in room
    const participant = await prisma.roomParticipant.findFirst({
      where: { roomId: testRoomId, userId: accusedId },
    });
    assert.ok(participant, 'Participant should still be in room at 50% vote');
  });

  it('11.5 should kick accused participant immediately once strict majority (>50%) is reached', async () => {
    const activeBallot = await ModerationService.getActiveBallotForRoom(testRoomId);
    assert.ok(activeBallot);

    // Third peer votes YES -> Total YES = 3 out of 4 (75% > 50%)
    const res3 = await ModerationService.castVote({
      incidentId: activeBallot.incidentId,
      voterId: voterIds[2],
      decision: 'YES',
    });

    assert.strictEqual(res3.status, 'CONFIRMED');
    assert.strictEqual(res3.kicked, true, 'User must be kicked upon crossing strictly >50% threshold');
    assert.strictEqual(res3.yesVotes, 3);

    // Verify room membership was deleted
    const participantAfter = await prisma.roomParticipant.findFirst({
      where: { roomId: testRoomId, userId: accusedId },
    });
    assert.strictEqual(participantAfter, null, 'Accused participant record must be deleted from room');

    // Verify 30-minute room restriction was created
    const restriction = await ModerationService.checkRoomRestriction(accusedId, testRoomId);
    assert.strictEqual(restriction.isRestricted, true);
    assert.ok(restriction.remainingSeconds! > 1700, 'Restriction should have approximately 30 minutes remaining');
  });

  it('11.5 should prevent kicked user from re-entering the room', async () => {
    const restriction = await ModerationService.checkRoomRestriction(accusedId, testRoomId);
    assert.strictEqual(restriction.isRestricted, true);

    const nonKickedPeer = voterIds[0];
    const peerRestriction = await ModerationService.checkRoomRestriction(nonKickedPeer, testRoomId);
    assert.strictEqual(peerRestriction.isRestricted, false, 'Unrestricted peer should not be blocked');
  });

  describe('Regression: Active Peer Filtering, Simultaneous Strict Majority, and Expired Ballots', () => {
    let regRoomId: string;
    let regReporterId: string;
    let regAccusedId: string;
    let regActiveVoters: string[] = [];
    let regInactiveVoters: string[] = [];

    before(async () => {
      // Create dedicated test room
      const creator = await prisma.user.create({
        data: {
          name: 'Mod Reg Creator',
          username: `mod_reg_creator_${Date.now()}`,
          email: `mod_reg_creator_${Date.now()}@zenith.test`,
        },
      });

      const room = await prisma.room.create({
        data: {
          name: 'Moderation Regression Room',
          category: 'EDUCATION',
          creatorId: creator.id,
          roomCode: `REG-${Date.now()}`,
          maxParticipants: 10,
          status: 'ACTIVE',
        },
      });
      regRoomId = room.id;

      // Create reporter & accused
      const reporter = await prisma.user.create({
        data: {
          name: 'Reg Reporter',
          username: `reg_rep_${Date.now()}`,
          email: `reg_rep_${Date.now()}@zenith.test`,
        },
      });
      regReporterId = reporter.id;

      const accused = await prisma.user.create({
        data: {
          name: 'Reg Accused',
          username: `reg_acc_${Date.now()}`,
          email: `reg_acc_${Date.now()}@zenith.test`,
        },
      });
      regAccusedId = accused.id;

      // Active room participants: reporter and accused
      await prisma.roomParticipant.create({
        data: { roomId: regRoomId, userId: regReporterId, status: 'ACTIVE' },
      });
      await prisma.roomParticipant.create({
        data: { roomId: regRoomId, userId: regAccusedId, status: 'ACTIVE' },
      });

      // 3 active peers
      regActiveVoters = [];
      for (let i = 1; i <= 3; i++) {
        const u = await prisma.user.create({
          data: {
            name: `Active Peer ${i}`,
            username: `act_peer_${i}_${Date.now()}`,
            email: `act_peer_${i}_${Date.now()}@zenith.test`,
          },
        });
        regActiveVoters.push(u.id);
        await prisma.roomParticipant.create({
          data: { roomId: regRoomId, userId: u.id, status: 'ACTIVE' },
        });
      }

      // 2 inactive peers (status: 'LEFT')
      regInactiveVoters = [];
      for (let i = 1; i <= 2; i++) {
        const u = await prisma.user.create({
          data: {
            name: `Inactive Peer ${i}`,
            username: `inact_peer_${i}_${Date.now()}`,
            email: `inact_peer_${i}_${Date.now()}@zenith.test`,
          },
        });
        regInactiveVoters.push(u.id);
        await prisma.roomParticipant.create({
          data: { roomId: regRoomId, userId: u.id, status: 'LEFT', leftAt: new Date() },
        });
      }
    });

    after(async () => {
      await prisma.moderationVote.deleteMany({
        where: { incident: { roomId: regRoomId } },
      });
      await prisma.roomRestriction.deleteMany({
        where: { roomId: regRoomId },
      });
      await prisma.moderationIncident.deleteMany({
        where: { roomId: regRoomId },
      });
      await prisma.roomParticipant.deleteMany({
        where: { roomId: regRoomId },
      });
      await prisma.room.deleteMany({
        where: { id: regRoomId },
      });
    });

    it('Regression 1: should count ONLY active peers and exclude participants with status LEFT', async () => {
      // Inactive user cannot report
      await assert.rejects(
        async () => {
          await ModerationService.createIncident({
            roomId: regRoomId,
            reporterId: regInactiveVoters[0],
            accusedId: regAccusedId,
            reason: 'Reporting while inactive',
          });
        },
        (err: any) => err.message.includes('UNAUTHORIZED_REPORTER')
      );

      // Cannot report inactive user
      await assert.rejects(
        async () => {
          await ModerationService.createIncident({
            roomId: regRoomId,
            reporterId: regReporterId,
            accusedId: regInactiveVoters[0],
            reason: 'Reporting inactive user',
          });
        },
        (err: any) => err.message.includes('ACUSED_NOT_IN_ROOM')
      );

      // Create valid incident
      const incident = await ModerationService.createIncident({
        roomId: regRoomId,
        reporterId: regReporterId,
        accusedId: regAccusedId,
        reason: 'Testing active peer counting',
      });

      // Total eligible voters must be EXACTLY the 3 ACTIVE peers
      assert.strictEqual(incident.totalVotersCount, 3);
      assert.deepStrictEqual(incident.eligibleVoters.sort(), regActiveVoters.slice().sort());

      // Inactive peers must NOT be in eligible voters
      for (const inactId of regInactiveVoters) {
        assert.strictEqual(incident.eligibleVoters.includes(inactId), false);
      }

      // Required votes: floor(3/2) + 1 = 2 (not floor(5/2)+1 = 3)
      assert.strictEqual(incident.requiredVotes, 2);
    });

    it('Regression 2: should handle simultaneous votes and resolve strict majority exactly once', async () => {
      // Find active ballot
      const activeBallot = await ModerationService.getActiveBallotForRoom(regRoomId);
      assert.ok(activeBallot);
      assert.strictEqual(activeBallot.requiredVotes, 2);

      // Cast 3 simultaneous YES votes concurrently
      const votePromises = regActiveVoters.map((voterId) =>
        ModerationService.castVote({
          incidentId: activeBallot.incidentId,
          voterId,
          decision: 'YES',
        }).catch((err) => ({ error: err.message }))
      );

      const results = await Promise.all(votePromises);

      // Count resolutions that confirmed the kick
      const confirmedResults = results.filter((r: any) => r && r.status === 'CONFIRMED' && r.kicked === true);
      assert.strictEqual(confirmedResults.length, 1, 'Strict majority kick must resolve exactly once');

      // The other results are either VOTING (first vote), or BALLOT_CLOSED (after majority reached)
      for (const res of results) {
        if ('error' in res) {
          assert.ok(res.error.includes('BALLOT_CLOSED'), `Unexpected error: ${res.error}`);
        } else {
          assert.ok(['VOTING', 'CONFIRMED'].includes(res.status));
        }
      }

      // Verify DB state: incident is CONFIRMED
      const incidentInDb = await prisma.moderationIncident.findUnique({
        where: { id: activeBallot.incidentId },
      });
      assert.strictEqual(incidentInDb?.status, 'CONFIRMED');

      // Verify exactly ONE roomRestriction exists for this incident
      const restrictions = await prisma.roomRestriction.findMany({
        where: { roomId: regRoomId, incidentId: activeBallot.incidentId },
      });
      assert.strictEqual(restrictions.length, 1, 'Must create exactly one room restriction');

      // Verify accused is removed from room
      const accusedParticipant = await prisma.roomParticipant.findFirst({
        where: { roomId: regRoomId, userId: regAccusedId },
      });
      assert.strictEqual(accusedParticipant, null, 'Accused participant must be removed');
    });

    it('Regression 3: should automatically close expired ballots and allow new reports', async () => {
      // Re-add accused to room for expiration testing
      await prisma.roomParticipant.create({
        data: { roomId: regRoomId, userId: regAccusedId, status: 'ACTIVE' },
      });
      // Remove restriction for testing
      await prisma.roomRestriction.deleteMany({
        where: { roomId: regRoomId, userId: regAccusedId },
      });

      // Create an expired incident manually in the DB
      const expiredIncident = await prisma.moderationIncident.create({
        data: {
          roomId: regRoomId,
          reporterId: regReporterId,
          accusedId: regAccusedId,
          reason: 'Old expired incident',
          status: 'VOTING',
          eligibleVoters: regActiveVoters,
          requiredVotes: 2,
          minQuorum: 2,
          yesVotesCount: 0,
          noVotesCount: 0,
          totalVotersCount: 3,
          votingExpiresAt: new Date(Date.now() - 10000), // Expired 10 seconds ago
        },
      });

      // A vote arriving before cleanup must close the ballot and reject the vote.
      await assert.rejects(
        ModerationService.castVote({
          incidentId: expiredIncident.id,
          voterId: regActiveVoters[0],
          decision: 'YES',
        }),
        /BALLOT_EXPIRED/
      );
      assert.equal(await prisma.moderationVote.count({ where: { incidentId: expiredIncident.id } }), 0);

      // Check DB: incident is now INCONCLUSIVE
      const refreshed = await prisma.moderationIncident.findUnique({
        where: { id: expiredIncident.id },
      });
      assert.strictEqual(refreshed?.status, 'INCONCLUSIVE');
      assert.ok(refreshed?.resolvedAt, 'ResolvedAt timestamp should be set');
      assert.ok(refreshed?.resolutionReason?.includes('expired'), 'Resolution reason should indicate expiration');

      const activeBallot = await ModerationService.getActiveBallotForRoom(regRoomId);
      assert.equal(activeBallot, null);

      // Creating a new report for the same accused should SUCCEED now (not blocked by expired ballot)
      const newIncident = await ModerationService.createIncident({
        roomId: regRoomId,
        reporterId: regReporterId,
        accusedId: regAccusedId,
        reason: 'New report after expired ballot',
      });
      assert.ok(newIncident.id);
      assert.strictEqual(newIncident.status, 'VOTING');

      // Test closeExpiredBallots explicit method
      const closeRes = await ModerationService.closeExpiredBallots(regRoomId);
      assert.strictEqual(typeof closeRes.closedCount, 'number');
    });
  });
});
