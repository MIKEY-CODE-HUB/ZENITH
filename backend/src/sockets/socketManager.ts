import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyToken } from '../utils/jwt.js';
import { setupRoomHandlers } from './roomSocketHandlers.js';

export function initializeSocket(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-origin)
        if (!origin) return callback(null, true);
        const allowed =
          origin === process.env.CLIENT_ORIGIN ||
          origin === 'http://localhost:3000' ||
          origin === 'http://127.0.0.1:3000' ||
          origin.startsWith('chrome-extension://') ||
          /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
          /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);
        return callback(null, allowed || true);
      },
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
