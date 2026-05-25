import { Queue, Worker } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import { logger } from '../config/logger.js';
import { notifyUser } from '../notification/notification.service.js';

let notificationQueue = null;
let redisConnection = null;
let worker = null;

export const enqueueNotification = async (payload) => {
  if (!notificationQueue) {
    await notifyUser(payload);
    return { queued: false, deliveredDirectly: true, reason: 'queue_unavailable' };
  }
  try {
    await notificationQueue.add('expense-action', payload);
    return { queued: true };
  } catch (error) {
    logger.warn('Notification queue unavailable', { error: error.message });
    return { queued: false, reason: error.message };
  }
};

export const startWorkers = async () => {
  redisConnection = createRedisConnection();

  try {
    await redisConnection.connect();
    notificationQueue = new Queue('notifications', { connection: redisConnection });
  } catch (error) {
    // logger.warn('Redis unavailable; BullMQ workers disabled', { error: error.message });
    notificationQueue = null;
    redisConnection.disconnect();
    redisConnection = null;
    return;
  }

  worker = new Worker(
    'notifications',
    async (job) => {
      await notifyUser(job.data);
    },
    { connection: redisConnection }
  );

  worker.on('failed', (job, error) => logger.error('Notification job failed', { jobId: job?.id, error: error.message }));
};
