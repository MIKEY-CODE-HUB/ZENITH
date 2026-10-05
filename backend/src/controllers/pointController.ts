import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { PointService } from '../services/pointService.js';

export class PointController {
  public static async getPoints(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const summary = await PointService.getUserPointSummary(userId);

      const recentTransactions = await prisma.pointTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      res.json({
        success: true,
        summary,
        transactions: recentTransactions,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Failed to fetch points' });
    }
  }
}
