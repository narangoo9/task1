import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { logger } from './config/logger';
import { config } from './config/env';
import { metricsMiddleware, metricsHandler } from './config/metrics';
import { rateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { initWebSocket } from './websocket/server';
import { prisma } from './config/database';
import { redis } from './config/redis';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import tenantRoutes from './routes/tenants';
import workspaceRoutes from './routes/workspaces';
import boardRoutes from './routes/boards';
import listRoutes from './routes/lists';
import cardRoutes from './routes/cards';
import dashboardRoutes from './routes/dashboard';

const app = express();
const httpServer = createServer(app);

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", config.frontendUrl],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
}));

app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// OBSERVABILITY
// ============================================================
app.use(requestLogger);
app.use(metricsMiddleware);

// ============================================================
// RATE LIMITING
// ============================================================
app.use('/api/', rateLimiter);

// ============================================================
// HEALTH & METRICS
// ============================================================
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version,
    });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: String(err) });
  }
});

app.get('/metrics', metricsHandler);

// ============================================================
// API ROUTES
// ============================================================
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/tenants`, tenantRoutes);
app.use(`${API_PREFIX}/workspaces`, workspaceRoutes);
app.use(`${API_PREFIX}/boards`, boardRoutes);
app.use(`${API_PREFIX}/lists`, listRoutes);
app.use(`${API_PREFIX}/cards`, cardRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

// ============================================================
// WEBSOCKET
// ============================================================
const io = initWebSocket(httpServer);
export { io };

// ============================================================
// STARTUP
// ============================================================
async function bootstrap() {
  try {
    // Test DB connection
    await prisma.$connect();
    logger.info('✅ PostgreSQL connected');

    // Test Redis connection
    await redis.ping();
    logger.info('✅ Redis connected');

    httpServer.listen(config.port, () => {
      logger.info(`🚀 TaskFlow API running on port ${config.port}`);
      logger.info(`📊 Metrics: http://localhost:${config.port}/metrics`);
      logger.info(`🏥 Health: http://localhost:${config.port}/health`);
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  httpServer.close(async () => {
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled Rejection');
});

process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught Exception');
  process.exit(1);
});

bootstrap();
