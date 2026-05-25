import IORedis from 'ioredis';
import { env } from './env.js';

export const createRedisConnection = () => {
  const connection = new IORedis({
    host: env.redis.host,
    port: env.redis.port,
    maxRetriesPerRequest: 0,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: null,
    reconnectOnError: () => false
  });

  connection.on('error', () => {
    // BullMQ is optional in local development; queue startup logs the useful warning.
  });

  return connection;
};
