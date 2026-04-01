import { Prisma, PrismaClient } from '@prisma/client';
import { logger } from './logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ] as const,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Log slow queries in development
prisma.$on('query', (e: Prisma.QueryEvent) => {
  if (e.duration > 500) {
    logger.warn({ query: e.query, duration: e.duration }, 'Slow query detected');
  }
});

prisma.$on('error', (e: Prisma.LogEvent) => {
  logger.error({ message: e.message }, 'Prisma error');
});
