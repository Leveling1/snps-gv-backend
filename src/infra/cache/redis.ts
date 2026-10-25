import { createClient } from 'redis';

import { env } from '../../config/env.js';
import { logger } from '../../shared/logger.js';

// O2switch ferme les connexions Redis inactives après ~30 s : un ping périodique
// (voir connectRedis) maintient la connexion active en dessous de ce seuil.
const PING_INTERVAL_MS = 20_000;

const reconnectStrategy = (retries: number): number => Math.min(retries * 200, 5_000);

export const redis = createClient(
  env.REDIS_HOST
    ? {
        socket: {
          host: env.REDIS_HOST,
          port: env.REDIS_PORT,
          keepAlive: true,
          keepAliveInitialDelay: 5_000,
          reconnectStrategy,
        },
        password: env.REDIS_PASSWORD,
      }
    : {
        url: env.REDIS_URL,
        socket: { keepAlive: true, keepAliveInitialDelay: 5_000, reconnectStrategy },
      },
);

redis.on('error', (error: Error) => {
  logger.error({ err: error }, 'Erreur du client Redis');
});

redis.on('reconnecting', () => {
  logger.warn('Reconnexion au serveur Redis en cours');
});

let pingTimer: NodeJS.Timeout | undefined;

export async function connectRedis(): Promise<void> {
  if (!redis.isOpen) await redis.connect();

  pingTimer ??= setInterval(() => {
    if (redis.isReady) {
      redis.ping().catch((error: unknown) => {
        logger.warn({ err: error }, 'Échec du ping Redis périodique');
      });
    }
  }, PING_INTERVAL_MS).unref();
}

export async function checkRedis(): Promise<void> {
  if (!redis.isReady) throw new Error('Redis indisponible');
  await redis.ping();
}

export async function closeRedis(): Promise<void> {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = undefined;
  }
  if (redis.isOpen) await redis.close();
}
