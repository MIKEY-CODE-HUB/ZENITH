import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { PointService } from '../services/pointService.js';

export class InteractionController {
  /**
   * Quote the 30% weekly points cost for joining an Interaction Room
   */
  public static async getQuote(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const quote = await PointService.quoteInteractionCost(userId);
      res.json({ success: true, quote });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to quote interaction cost' });
    }
  }

  /**
   * Authorize entry to an Interaction Room with atomic 30% point deduction
   */
  public static async authorizeEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { roomId } = req.body;

      if (!roomId) {
        res.status(400).json({ success: false, error: 'roomId is required' });
        return;
      }

      const result = await PointService.authorizeInteractionEntry(userId, roomId);
      res.json({
        success: true,
        authorization: result,
        message: `Successfully authorized. Deducted ${result.pointsDeducted} ⭐ (30% weekly points).`,
      });
    } catch (error: any) {
      const status = error.message?.includes('ROOM_FULL') ? 409 : error.message?.includes('INSUFFICIENT_POINTS') ? 402 : 400;
      res.status(status).json({ success: false, error: error.message || 'Authorization failed' });
    }
  }

  /**
   * Report a user in an interaction room
   */
  public static async reportUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const reporterId = req.user!.userId;
      const { reportedId, roomId, reason, details } = req.body;

      if (!reportedId || !reason) {
        res.status(400).json({ success: false, error: 'reportedId and reason are required' });
        return;
      }

      const report = await prisma.userReport.create({
        data: {
          reporterId,
          reportedId,
          roomId: roomId || null,
          reason,
          details: details || null,
        },
      });

      res.status(201).json({ success: true, message: 'Report submitted successfully.', reportId: report.id });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to report user' });
    }
  }

  /**
   * Block a user
   */
  public static async blockUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const blockerId = req.user!.userId;
      const { blockedId } = req.body;

      if (!blockedId || blockerId === blockedId) {
        res.status(400).json({ success: false, error: 'Invalid user to block' });
        return;
      }

      await prisma.userBlock.upsert({
        where: {
          blockerId_blockedId: { blockerId, blockedId },
        },
        update: {},
        create: { blockerId, blockedId },
      });

      res.json({ success: true, message: 'User blocked successfully.' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to block user' });
    }
  }
}
