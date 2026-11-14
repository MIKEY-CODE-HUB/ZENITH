import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const goals = await prisma.focusGoal.findMany({
      where: { userId }, orderBy: [{ completedAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }], take: 30,
    });
    const totals = await prisma.focusSession.groupBy({
      by: ['goalId'], where: { userId, status: 'COMPLETED', goalId: { in: goals.map(goal => goal.id) } },
      _sum: { focusedDuration: true },
    });
    const minutes = new Map(totals.map(total => [total.goalId, Math.floor((total._sum.focusedDuration ?? 0) / 60)]));
    res.setHeader('Cache-Control', 'no-store').json({ success: true, goals: goals.map(goal => ({
      ...goal, focusedMinutes: minutes.get(goal.id) ?? 0,
    })) });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const { title, outcome, notes, targetMinutes, dueDate } = req.body ?? {};
    const due = typeof dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? new Date(`${dueDate}T00:00:00Z`) : null;
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 120 ||
        typeof targetMinutes !== 'number' || !Number.isInteger(targetMinutes) || targetMinutes < 5 || targetMinutes > 10_080 ||
        (dueDate && (!due || !Number.isFinite(due.getTime()) || due.toISOString().slice(0, 10) !== dueDate))) {
      res.status(400).json({ success: false, error: 'Enter a title, a target from 5 to 10,080 minutes, and a valid date if needed.' });
      return;
    }
    const goal = await prisma.focusGoal.create({ data: {
      userId, title: title.trim(), targetMinutes, dueDate: due,
      outcome: typeof outcome === 'string' ? outcome.trim().slice(0, 250) || null : null,
      notes: typeof notes === 'string' ? notes.trim().slice(0, 1000) || null : null,
    } });
    res.status(201).json({ success: true, goal: { ...goal, focusedMinutes: 0 } });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    if (typeof req.body?.completed !== 'boolean') {
      res.status(400).json({ success: false, error: 'Set a completion state.' });
      return;
    }
    const result = await prisma.focusGoal.updateMany({
      where: { id: req.params.id, userId }, data: { completedAt: req.body.completed ? new Date() : null },
    });
    if (!result.count) {
      res.status(404).json({ success: false, error: 'That focus goal is unavailable.' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
