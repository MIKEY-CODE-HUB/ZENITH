import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyToken } from '../utils/jwt.js';
import { logger } from '../config/logger.js';
import { isClientOriginAllowed } from '../config/clientOrigins.js';
import { setupRoomHandlers } from './roomSocketHandlers.js';

export function initializeSocket(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, isClientOriginAllowed(origin)),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    allowRequest: (req, callback) => callback(null, isClientOriginAllowed(req.headers.origin)),
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    const payload = typeof token === 'string' ? verifyToken(token) : null;
    if (!payload?.userId || !payload.username || 'type' in payload) {
      logger.warn('socket.authentication_rejected');
      return next(new Error('UNAUTHORIZED'));
    }
    socket.data.userId = payload.userId;
    next();
  });

  io.on('connection', (socket: Socket) => {
    setupRoomHandlers(io, socket);
  });

  return io;
}
