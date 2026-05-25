import http from 'http';
import { Server } from 'socket.io';
import { app } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { User } from './models/User.js';
import { startWorkers } from './jobs/queue.js';
import { initSocket } from './sockets/socket.js';

const seedSuperAdmin = async () => {
  const email = env.superAdminEmail;
  if (!email) return;
  const existing = await User.findOne({ email });
  if (!existing) {
    await User.create({
      name: 'Product Super Admin',
      email: email,
      password: env.superAdminPassword,
      role: 'super_admin',
      status: 'active'
    });
    logger.info('Product Super Admin account created automatically.');
  }
};

const bootstrap = async () => {
  await connectDb();
  await seedSuperAdmin();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: env.clientUrl, credentials: true } });
  initSocket(io);
  await startWorkers();
  server.listen(env.port, () => logger.info(`GT Expense API running on port ${env.port}`));
};

bootstrap().catch((error) => {
  logger.error('Server failed to start', { error: error.message, stack: error.stack });
  process.exit(1);
});
