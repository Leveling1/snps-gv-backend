import type { RequestHandler } from 'express';
import rateLimit, {
  MemoryStore,
  type IncrementResponse,
  type Options,
  type Store,
} from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

import { env } from '../../config/env.js';
import { redis } from '../../infra/cache/redis.js';
import { logger } from '../../shared/logger.js';

/**
 * Un upload ne doit jamais échouer à cause du limiteur : si Redis est indisponible
 * ou que la commande échoue (déconnexion, timeout), on bascule sur un compteur en
 * mémoire locale au process plutôt que de laisser l'erreur remonter en 500.
 */
class ResilientRedisStore implements Store {
  private readonly fallbackStore = new MemoryStore();

  constructor(private readonly redisStore: RedisStore) {}

  init(options: Options): void {
    this.redisStore.init(options);
    this.fallbackStore.init(options);
  }

  async increment(key: string): Promise<IncrementResponse> {
    if (redis.isReady) {
      try {
        return await this.redisStore.increment(key);
      } catch (error) {
        logger.warn({ err: error }, 'Échec Redis sur le rate-limit média, repli en mémoire locale');
      }
    }
    return this.fallbackStore.increment(key);
  }

  async decrement(key: string): Promise<void> {
    if (redis.isReady) {
      try {
        await this.redisStore.decrement(key);
        return;
      } catch (error) {
        logger.warn({ err: error }, 'Échec Redis sur le rate-limit média, repli en mémoire locale');
      }
    }
    await this.fallbackStore.decrement(key);
  }

  async resetKey(key: string): Promise<void> {
    if (redis.isReady) {
      try {
        await this.redisStore.resetKey(key);
        return;
      } catch (error) {
        logger.warn({ err: error }, 'Échec Redis sur le rate-limit média, repli en mémoire locale');
      }
    }
    await this.fallbackStore.resetKey(key);
  }
}

export function createMediaUploadRateLimit(): RequestHandler {
  const store =
    env.NODE_ENV === 'test'
      ? undefined
      : new ResilientRedisStore(
          new RedisStore({
            prefix: 'rate-limit:media-upload:',
            sendCommand: (...args: string[]) => redis.sendCommand(args),
          }),
        );

  return rateLimit({
    windowMs: 60_000,
    limit: env.MEDIA_UPLOAD_RATE_LIMIT,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    ...(store ? { store } : {}),
    handler: (_request, response) => {
      response.status(429).type('application/problem+json').json({
        type: 'about:blank',
        title: 'Trop de requêtes',
        status: 429,
        detail: "La limite d'uploads autorisés a été atteinte.",
        requestId: response.locals.requestId,
      });
    },
  });
}
