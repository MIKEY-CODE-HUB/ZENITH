import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyToken } from '../utils/jwt.js';
import { setupRoomHandlers } from './roomSocketHandlers.js';

export function initializeSocket(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket Auth middleware (optional, allows guest/demo sockets too)
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        (socket as any).user = payload;
      }
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    setupRoomHandlers(io, socket);
  });

  return io;
}
