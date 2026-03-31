import { redisPub } from '../config/redis';
import { logger } from '../config/logger';

interface BoardEvent {
  type: string;
  [key: string]: unknown;
}

/**
 * Publish a real-time event via Redis pub/sub.
 * All Socket.io instances (K8s pods) will receive and broadcast to connected clients.
 */
export async function publishEvent(
  room: 'board' | 'workspace' | 'tenant',
  id: string,
  event: BoardEvent
): Promise<void> {
  const channel = `taskflow:${room}:${id}`;
  const payload = JSON.stringify({
    room: `${room}:${id}`,
    event,
    timestamp: Date.now(),
  });

  try {
    await redisPub.publish(channel, payload);
    logger.debug({ channel, type: event.type }, 'WS: event published');
  } catch (err) {
    logger.error({ err, channel }, 'WS: failed to publish event');
  }
}
