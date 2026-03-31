import { Redis } from 'ioredis';
import { config } from './env';
import { logger } from './logger';

function createRedisClient(name: string): Redis {
  const client = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 10) {
        logger.error(`Redis ${name}: max retries exceeded`);
        return null;
      }
      return Math.min(times * 200, 3000);
    },
    enableReadyCheck: true,
    lazyConnect: false,
  });

  client.on('connect', () => logger.info(`Redis ${name}: connected`));
  client.on('error', (err) => logger.error({ err }, `Redis ${name}: error`));
  client.on('reconnecting', () => logger.warn(`Redis ${name}: reconnecting...`));

  return client;
}

// Separate pub/sub clients (ioredis requires separate instances)
export const redis = createRedisClient('main');
export const redisPub = createRedisClient('pub');
export const redisSub = createRedisClient('sub');
