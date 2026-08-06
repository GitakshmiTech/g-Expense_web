import http from 'http';
import { Server } from 'socket.io';
import { app } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { Company } from './models/Company.js';
import { User } from './models/User.js';
import { startWorkers } from './jobs/queue.js';
import { initSocket } from './sockets/socket.js';

const DEFAULT_COMPANY = {
  name: 'GT Technologies',
  legalName: 'GT Technologies Pvt Ltd',
  domain: 'gt.local',
  status: 'active',
  baseCurrency: 'INR'
};

const DEMO_USERS = [
  { name: 'Asha Admin', email: 'admin@gt.local', password: 'admin123', role: 'company_admin', department: 'Finance' },
  { name: 'Meera Manager', email: 'manager@gt.local', password: 'admin123', role: 'manager', department: 'Engineering' },
  { name: 'Farhan Finance', email: 'finance@gt.local', password: 'admin123', role: 'finance', department: 'Finance' },
  { name: 'Chitra CFO', email: 'cfo@gt.local', password: 'admin123', role: 'cfo', department: 'Finance' },
  { name: 'Neel Employee', email: 'employee@gt.local', password: 'admin123', role: 'employee', department: 'Engineering' },
  { name: 'GT One User', email: 'user@gt-one.com', password: 'User@2026', role: 'employee', department: 'Operations' },
  { name: 'Harsh Davda', email: 'harshdavda@gmail.com', password: '123456', role: 'manager', department: 'Operations' }
];

const seedSuperAdmin = async () => {
  const email = env.superAdminEmail;
  if (email) {
    const existing = await User.findOne({ email }).select('+password');
    if (!existing) {
      await User.create({
        name: 'Product Super Admin',
        email: email,
        password: env.superAdminPassword,
        role: 'super_admin',
        status: 'active'
      });
      logger.info(`Product Super Admin account created automatically. Email: "${email}", Password: "${env.superAdminPassword}"`);
    } else {
      existing.role = 'super_admin';
      existing.companyId = undefined;
      existing.status = 'active';
      const isMatch = await existing.comparePassword(env.superAdminPassword);
      if (!isMatch) {
        existing.password = env.superAdminPassword;
        logger.info(`Super Admin password mismatched in DB. Syncing/updating password to: "${env.superAdminPassword}"`);
      } else {
        logger.info(`Super Admin password matched. Current password: "${env.superAdminPassword}"`);
      }
      await existing.save();
      logger.info(`Synced Product Super Admin account in database. Email: "${email}"`);
    }
  }

  // Ensure koffeekodes@gmail.com exists with password '123456'
  const existingKoffeekodes = await User.findOne({ email: 'koffeekodes@gmail.com' }).select('+password');
  if (!existingKoffeekodes) {
    await User.create({
      name: 'Koffeekodes Admin',
      email: 'koffeekodes@gmail.com',
      password: '123456',
      role: 'super_admin',
      status: 'active'
    });
    logger.info('Default koffeekodes@gmail.com super_admin created locally.');
  } else {
    // Sync password for local direct login ease
    const isMatch = await existingKoffeekodes.comparePassword('123456');
    if (!isMatch) {
      existingKoffeekodes.password = '123456';
      await existingKoffeekodes.save();
      logger.info('Password for koffeekodes@gmail.com synced to 123456 locally.');
    }
  }
};

const ensureDemoUser = async ({ companyId, userData }) => {
  const email = String(userData.email).toLowerCase();
  const existing = await User.findOne({ email }).select('+password');

  if (!existing) {
    await User.create({
      ...userData,
      email,
      companyId,
      status: 'active'
    });
    return;
  }

  existing.companyId = existing.companyId || companyId;
  existing.name = existing.name || userData.name;
  existing.role = userData.role;
  existing.department = existing.department || userData.department;
  existing.status = 'active';

  if (process.env.NODE_ENV !== 'production') {
    const passwordMatches = await existing.comparePassword(userData.password);
    if (!passwordMatches) existing.password = userData.password;
  }

  await existing.save();
};

const seedProductAccessUsers = async () => {
  const company = await Company.findOneAndUpdate(
    { domain: DEFAULT_COMPANY.domain },
    { $setOnInsert: DEFAULT_COMPANY },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  for (const userData of DEMO_USERS) {
    await ensureDemoUser({ companyId: company._id, userData });
  }
};

const bootstrap = async () => {
  await connectDb();
  await seedSuperAdmin();
  await seedProductAccessUsers();
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
