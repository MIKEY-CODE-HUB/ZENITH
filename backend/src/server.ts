import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import achievementRoutes from './routes/achievementRoutes.js';
import userRoutes from './routes/userRoutes.js';
import blockerRoutes from './routes/blockerRoutes.js';
import interactionRoutes from './routes/interactionRoutes.js';
import pointRoutes from './routes/pointRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeSocket } from './sockets/socketManager.js';

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

// Global Middleware
app.use(
  cors({
    origin: [CLIENT_ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
);
app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ZENITH Immersion Platform API',
    timestamp: new Date().toISOString(),
  });
});

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/users', userRoutes);
app.use('/api/blocker', blockerRoutes);
app.use('/api/interaction', interactionRoutes);
app.use('/api/points', pointRoutes);

// Global Error Handler
app.use(errorHandler);

// Initialize WebSockets
initializeSocket(server);

// Start HTTP + WebSocket Server
server.listen(PORT, () => {
  console.log(`⚡ ZENITH TrapBreaker Backend running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket Server initialized`);
});
