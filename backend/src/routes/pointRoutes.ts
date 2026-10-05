import { Router } from 'express';
import { PointController } from '../controllers/pointController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authMiddleware, PointController.getPoints);

export default router;
