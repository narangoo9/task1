import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisPub, redisSub } from '../config/redis';
import { TokenService } from '../services/TokenService';
import { logger } from '../config/logger';
import { wsConnectionsGauge } from '../config/metrics';
import { config } from '../config/env';

const HEARTBEAT_INTERVAL = 25000; // 25s
const HEARTBEAT_TIMEOUT = 60000;  // 60s

interface AuthenticatedSocket extends Socket {
  userId?: string;
  tenantId?: string;
  role?: string;
}

export function initWebSocket(httpServer: HTTPServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: config.frontendUrl,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: HEARTBEAT_INTERVAL,
    pingTimeout: HEARTBEAT_TIMEOUT,
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2min
      skipMiddlewares: true,
    },
  });

  // Redis adapter for horizontal scaling (K8s)
  io.adapter(createAdapter(redisPub, redisSub));

  // ---- AUTH MIDDLEWARE ----
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) return next(new Error('Authentication required'));

      const payload = TokenService.verifyAccessToken(token);
      socket.userId = payload.sub;
      socket.tenantId = payload.tid;
      socket.role = payload.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // ---- CONNECTION HANDLER ----
  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info({ userId: socket.userId, socketId: socket.id }, 'WS: client connected');
    wsConnectionsGauge.inc();

    // Join tenant room (for tenant-wide events)
    if (socket.tenantId) {
      socket.join(`tenant:${socket.tenantId}`);
    }

    // ---- ROOM MANAGEMENT ----
    socket.on('join:board', (boardId: string) => {
      socket.join(`board:${boardId}`);
      logger.debug({ userId: socket.userId, boardId }, 'WS: joined board room');
    });

    socket.on('leave:board', (boardId: string) => {
      socket.leave(`board:${boardId}`);
    });

    socket.on('join:workspace', (workspaceId: string) => {
      socket.join(`workspace:${workspaceId}`);
    });

    // ---- PRESENCE ----
    socket.on('presence:update', (data: { boardId: string; status: string }) => {
      socket.to(`board:${data.boardId}`).emit('presence:changed', {
        userId: socket.userId,
        status: data.status,
      });
    });

    // ---- TYPING INDICATORS ----
    socket.on('card:typing', (data: { cardId: string; isTyping: boolean }) => {
      socket.broadcast.emit(`card:${data.cardId}:typing`, {
        userId: socket.userId,
        isTyping: data.isTyping,
      });
    });

    // ---- DISCONNECT ----
    socket.on('disconnect', (reason) => {
      wsConnectionsGauge.dec();
      logger.info({ userId: socket.userId, reason }, 'WS: client disconnected');
    });

    socket.on('error', (err) => {
      logger.error({ err, userId: socket.userId }, 'WS: socket error');
    });
  });

  logger.info('✅ WebSocket server initialized with Redis adapter');
  return io;
}
