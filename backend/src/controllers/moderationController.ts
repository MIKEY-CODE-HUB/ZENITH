import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { ModerationService } from '../services/moderationService.js';

export class ModerationController {
  /**
   * POST /api/moderation/report
   * Report a disruptive participant in the current room.
   */
  public static async fileReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { roomId, accusedId, reason, details } = req.body;

      if (!roomId || !accusedId || !reason) {
        res.status(400).json({ error: 'roomId, accusedId, and reason are required fields.' });
        return;
      }

      const incident = await ModerationService.createIncident({
        roomId,
        reporterId: req.user.userId,
        accusedId,
        reason,
        details,
      });

      res.status(201).json({
        message: 'Moderation ballot successfully opened.',
        incident: {
          id: incident.id,
          roomId: incident.roomId,
          accusedId: incident.accusedId,
          accusedName: incident.accused.name,
          reason: incident.reason,
          status: incident.status,
          totalEligible: incident.totalVotersCount,
          requiredVotes: incident.requiredVotes,
          votingExpiresAt: incident.votingExpiresAt,
        },
      });
    } catch (err: any) {
      console.error('fileReport error:', err);
      const statusCode =
        err.message?.includes('FORBIDDEN') || err.message?.includes('UNAUTHORIZED')
          ? 403
          : err.message?.includes('NOT_FOUND')
          ? 404
          : err.message?.includes('ALREADY_ACTIVE')
          ? 409
          : 400;

      res.status(statusCode).json({ error: err.message || 'Failed to file moderation report' });
    }
  }

  /**
   * POST /api/moderation/vote
   * Cast a vote on an active moderation ballot.
   */
  public static async castVote(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { incidentId, decision } = req.body;

      if (!incidentId || !decision || !['YES', 'NO'].includes(decision)) {
        res.status(400).json({ error: 'incidentId and decision ("YES" or "NO") are required.' });
        return;
      }

      const resolution = await ModerationService.castVote({
        incidentId,
        voterId: req.user.userId,
        decision,
      });

      res.status(200).json({
        message: 'Vote recorded successfully',
        resolution,
      });
    } catch (err: any) {
      console.error('castVote error:', err);
      const statusCode =
        err.message?.includes('INELIGIBLE')
          ? 403
          : err.message?.includes('NOT_FOUND')
          ? 404
          : err.message?.includes('DUPLICATE') || err.message?.includes('CLOSED') || err.message?.includes('EXPIRED')
          ? 409
          : 400;

      res.status(statusCode).json({ error: err.message || 'Failed to cast moderation vote' });
    }
  }

  /**
   * GET /api/moderation/active/:roomId
   * Fetch active ballot details for a room.
   */
  public static async getActiveBallot(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;
      const viewerId = req.user?.userId;

      const activeBallot = await ModerationService.getActiveBallotForRoom(roomId, viewerId);
      res.status(200).json({ activeBallot });
    } catch (err: any) {
      console.error('getActiveBallot error:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch active ballot' });
    }
  }

  /**
   * GET /api/moderation/restriction/:roomId
   * Check if current user has an active kick restriction in this room.
   */
  public static async checkRestriction(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { roomId } = req.params;
      const restriction = await ModerationService.checkRoomRestriction(req.user.userId, roomId);

      res.status(200).json(restriction);
    } catch (err: any) {
      console.error('checkRestriction error:', err);
      res.status(500).json({ error: err.message || 'Failed to check room restriction' });
    }
  }
}
