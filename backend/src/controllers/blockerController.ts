import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { BlockerService } from '../services/blockerService.js';

export class BlockerController {
  static async getResources(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const resources = await BlockerService.getResources(userId);
      res.json({ success: true, resources });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createResource(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const resource = await BlockerService.createResource(userId, req.body);
      res.status(201).json({ success: true, resource });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async updateResource(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;
      const resource = await BlockerService.updateResource(userId, id, req.body);
      res.json({ success: true, resource });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async deleteResource(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;
      await BlockerService.deleteResource(userId, id);
      res.json({ success: true, message: 'Resource deleted' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async getStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const stats = await BlockerService.getStatistics(userId);
      res.json({
        success: true,
        status: stats.activeSession ? 'ACTIVE' : 'INACTIVE',
        activeSession: stats.activeSession,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async activate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { focusSessionId, mode } = req.body || {};
      const result = await BlockerService.activateBlocker(userId, focusSessionId, mode);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async deactivate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { focusSessionId } = req.body || {};
      const result = await BlockerService.deactivateBlocker(userId, focusSessionId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async recordAttempt(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const attempt = await BlockerService.recordAttempt(userId, req.body);
      res.status(201).json({ success: true, attempt });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async getStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const data = await BlockerService.getStatistics(userId);
      res.json({ success: true, ...data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getActivityBlockList(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { activityType } = req.params;
      const items = await BlockerService.getActivityBlockList(userId, activityType);
      res.json({ success: true, activityType, items });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async updateActivityBlockList(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { activityType } = req.params;
      const { resourceIds } = req.body;
      const items = await BlockerService.updateActivityBlockList(userId, activityType, resourceIds);
      res.json({ success: true, activityType, items });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  static async updateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const settings = await BlockerService.updateSettings(userId, req.body);
      res.json({ success: true, settings });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
