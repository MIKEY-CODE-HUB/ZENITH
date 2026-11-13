import { Router } from 'express';
import { RoomController } from '../controllers/roomController.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', optionalAuthMiddleware, RoomController.getRooms);
router.get('/:roomId/ice-servers', authMiddleware, RoomController.getIceServers);
router.get('/:idOrCode', optionalAuthMiddleware, RoomController.getRoom);
router.post('/', authMiddleware, RoomController.createRoom);
router.post('/allocate', authMiddleware, RoomController.allocateRoom);
router.post('/:roomId/invite', authMiddleware, RoomController.manageInvite);
router.delete('/:roomId/invite', authMiddleware, RoomController.manageInvite);
router.post('/:roomId/join', authMiddleware, RoomController.joinRoom);
router.post('/:roomId/leave', authMiddleware, RoomController.leaveRoom);

export default router;
