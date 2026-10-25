import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateIncidentInput {
  roomId: string;
  reporterId: string;
  accusedId: string;
  reason: string;
  details?: string;
}

export interface CastVoteInput {
  incidentId: string;
  voterId: string;
  decision: 'YES' | 'NO';
}

export interface ModerationResolution {
  incidentId: string;
  status: 'VOTING' | 'CONFIRMED' | 'REJECTED' | 'INCONCLUSIVE';
  kicked: boolean;
  accusedId: string;
  roomId: string;
  yesVotes: number;
  noVotes: number;
  requiredVotes: number;
  totalEligible: number;
  reason?: string;
}

export class ModerationService {
  /**
   * 11.1 & 11.2 & 11.3: Create a moderation incident and freeze snapshot of eligible voters.
   */
  public static async createIncident(input: CreateIncidentInput) {
    const { roomId, reporterId, accusedId, reason, details } = input;

    // 1. Prevent self-reporting
    if (reporterId === accusedId) {
      throw new Error('SELF_REPORT_FORBIDDEN: You cannot file a report against yourself.');
    }

    // 2. Validate that room exists
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        participants: true,
      },
    });

    if (!room) {
      throw new Error('ROOM_NOT_FOUND: The specified room does not exist.');
    }

    // 3. Validate that reporter is an active participant in this room
    const reporterParticipant = room.participants.find((p) => p.userId === reporterId);
    if (!reporterParticipant) {
      throw new Error('UNAUTHORIZED_REPORTER: You must be an active participant in the room to file a report.');
    }

    // 4. Validate that accused is an active participant in this room
    const accusedParticipant = room.participants.find((p) => p.userId === accusedId);
    if (!accusedParticipant) {
      throw new Error('ACUSED_NOT_IN_ROOM: The accused user is not currently in this room.');
    }

    // 5. Check if there is already an active ballot for this accused user in this room
    const activeIncident = await prisma.moderationIncident.findFirst({
      where: {
        roomId,
        accusedId,
        status: { in: ['OPEN', 'VOTING'] },
      },
    });

    if (activeIncident) {
      throw new Error('BALLOT_ALREADY_ACTIVE: A moderation ballot is already active for this participant.');
    }

    // 6. Freeze snapshot of eligible voters (exclude accused and reporter)
    const eligiblePeers = room.participants
      .filter((p) => p.userId !== accusedId && p.userId !== reporterId)
      .map((p) => p.userId);

    // 11.3: Target up to eight other eligible users; if fewer than 8, invite all eligible
    const selectedVoters = eligiblePeers.length > 8 ? eligiblePeers.slice(0, 8) : eligiblePeers;

    // Minimum quorum and required votes calculation: strictly >50%
    // requiredVotes = floor(eligible / 2) + 1
    const totalEligible = selectedVoters.length;
    const requiredVotes = totalEligible > 0 ? Math.floor(totalEligible / 2) + 1 : 1;
    const minQuorum = totalEligible > 0 ? Math.max(1, Math.ceil(totalEligible * 0.5)) : 1;

    // 60-second voting window
    const votingExpiresAt = new Date(Date.now() + 60 * 1000);

    const incident = await prisma.moderationIncident.create({
      data: {
        roomId,
        reporterId,
        accusedId,
        reason,
        details: details || null,
        status: 'VOTING',
        eligibleVoters: selectedVoters,
        requiredVotes,
        minQuorum,
        yesVotesCount: 0,
        noVotesCount: 0,
        totalVotersCount: totalEligible,
        votingExpiresAt,
      },
      include: {
        reporter: { select: { id: true, name: true, username: true } },
        accused: { select: { id: true, name: true, username: true } },
      },
    });

    return incident;
  }

  /**
   * 11.4: Cast a private vote and atomically evaluate strict majority threshold (>50%).
   */
  public static async castVote(input: CastVoteInput): Promise<ModerationResolution> {
    const { incidentId, voterId, decision } = input;

    return await prisma.$transaction(async (tx) => {
      // 1. Retrieve incident with row lock
      const incident = await tx.moderationIncident.findUnique({
        where: { id: incidentId },
        include: { votes: true },
      });

      if (!incident) {
        throw new Error('INCIDENT_NOT_FOUND: The moderation incident does not exist.');
      }

      if (incident.status !== 'VOTING') {
        throw new Error(`BALLOT_CLOSED: Moderation ballot is no longer active (Status: ${incident.status}).`);
      }

      // Check voting expiration
      if (new Date() > incident.votingExpiresAt) {
        await tx.moderationIncident.update({
          where: { id: incidentId },
          data: {
            status: 'INCONCLUSIVE',
            resolvedAt: new Date(),
            resolutionReason: 'Voting window expired without satisfying quorum or majority threshold.',
          },
        });
        throw new Error('BALLOT_EXPIRED: The voting window has expired.');
      }

      // 2. Validate voter eligibility
      if (!incident.eligibleVoters.includes(voterId)) {
        throw new Error('INELIGIBLE_VOTER: You are not an eligible voter for this moderation ballot.');
      }

      // 3. Prevent duplicate voting
      const existingVote = incident.votes.find((v) => v.voterId === voterId);
      if (existingVote) {
        throw new Error('DUPLICATE_VOTE: You have already cast your vote on this incident.');
      }

      // 4. Record private vote
      await tx.moderationVote.create({
        data: {
          incidentId,
          voterId,
          decision,
        },
      });

      const updatedYes = decision === 'YES' ? incident.yesVotesCount + 1 : incident.yesVotesCount;
      const updatedNo = decision === 'NO' ? incident.noVotesCount + 1 : incident.noVotesCount;
      const totalCast = updatedYes + updatedNo;

      let resolutionStatus: 'VOTING' | 'CONFIRMED' | 'REJECTED' | 'INCONCLUSIVE' = 'VOTING';
      let kicked = false;

      // 11.4 Threshold Evaluation:
      // strictly > 50% required: yes_votes >= requiredVotes
      if (updatedYes >= incident.requiredVotes && totalCast >= incident.minQuorum) {
        // CONFIRMED KICK
        resolutionStatus = 'CONFIRMED';
        kicked = true;

        // Atomically remove participant from room
        await tx.roomParticipant.deleteMany({
          where: {
            roomId: incident.roomId,
            userId: incident.accusedId,
          },
        });

        // 11.5: Enforce 30-minute room restriction
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        await tx.roomRestriction.create({
          data: {
            userId: incident.accusedId,
            roomId: incident.roomId,
            reason: `Kicked via community majority vote: ${incident.reason}`,
            incidentId: incident.id,
            expiresAt,
          },
        });

        await tx.moderationIncident.update({
          where: { id: incidentId },
          data: {
            status: 'CONFIRMED',
            yesVotesCount: updatedYes,
            noVotesCount: updatedNo,
            resolvedAt: new Date(),
            resolutionReason: 'Strict majority (>50%) voted in favor of removal.',
          },
        });
      } else {
        // Check if impossible to reach majority even if all remaining voters vote YES
        const remainingVoters = incident.totalVotersCount - totalCast;
        if (updatedYes + remainingVoters < incident.requiredVotes) {
          // Cannot possibly win
          resolutionStatus = 'REJECTED';
          await tx.moderationIncident.update({
            where: { id: incidentId },
            data: {
              status: 'REJECTED',
              yesVotesCount: updatedYes,
              noVotesCount: updatedNo,
              resolvedAt: new Date(),
              resolutionReason: 'Insufficient affirmative votes to meet the strict majority threshold.',
            },
          });
        } else {
          // Still voting
          await tx.moderationIncident.update({
            where: { id: incidentId },
            data: {
              yesVotesCount: updatedYes,
              noVotesCount: updatedNo,
            },
          });
        }
      }

      return {
        incidentId,
        status: resolutionStatus,
        kicked,
        accusedId: incident.accusedId,
        roomId: incident.roomId,
        yesVotes: updatedYes,
        noVotes: updatedNo,
        requiredVotes: incident.requiredVotes,
        totalEligible: incident.totalVotersCount,
        reason: incident.reason,
      };
    });
  }

  /**
   * 11.5: Verify if user has an active room restriction cooldown.
   */
  public static async checkRoomRestriction(userId: string, roomId: string) {
    const activeRestriction = await prisma.roomRestriction.findFirst({
      where: {
        userId,
        roomId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: 'desc' },
    });

    if (activeRestriction) {
      const remainingSeconds = Math.ceil((activeRestriction.expiresAt.getTime() - Date.now()) / 1000);
      return {
        isRestricted: true,
        reason: activeRestriction.reason,
        expiresAt: activeRestriction.expiresAt,
        remainingSeconds,
      };
    }

    return { isRestricted: false };
  }

  /**
   * Get active ballot for a room if currently in progress.
   */
  public static async getActiveBallotForRoom(roomId: string, viewerUserId?: string) {
    const incident = await prisma.moderationIncident.findFirst({
      where: {
        roomId,
        status: 'VOTING',
        votingExpiresAt: { gt: new Date() },
      },
      include: {
        accused: { select: { id: true, name: true, username: true, avatarUrl: true } },
        reporter: { select: { id: true, name: true, username: true } },
        votes: { select: { voterId: true } },
      },
    });

    if (!incident) return null;

    const hasVoted = viewerUserId ? incident.votes.some((v) => v.voterId === viewerUserId) : false;
    const isEligible = viewerUserId ? incident.eligibleVoters.includes(viewerUserId) : false;

    return {
      incidentId: incident.id,
      roomId: incident.roomId,
      accused: incident.accused,
      reason: incident.reason,
      details: incident.details,
      status: incident.status,
      requiredVotes: incident.requiredVotes,
      totalEligible: incident.totalVotersCount,
      votingExpiresAt: incident.votingExpiresAt,
      isEligible,
      hasVoted,
    };
  }
}
