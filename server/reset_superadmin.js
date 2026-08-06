import mongoose from 'mongoose';
import { User } from './src/models/User.js';
import { env } from './src/config/env.js';

async function reset() {
  const email = env.superAdminEmail || 'gtexpence@gmail.com';
  const newPassword = env.superAdminPassword || 'admin123';
  
  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(env.mongoUri);
  
  console.log(`Searching for super admin user: ${email}...`);
  const user = await User.findOne({ email }).select('+password');
  
  if (user) {
    user.password = newPassword;
    user.role = 'super_admin';
    user.status = 'active';
    await user.save();
    console.log(`\nSUCCESS: Password for ${email} has been reset to: ${newPassword}\n`);
  } else {
    // Create it if it doesn't exist
    await User.create({
      name: 'Product Super Admin',
      email: email,
      password: newPassword,
      role: 'super_admin',
      status: 'active'
    });
    console.log(`\nSUCCESS: Super Admin did not exist. Created user ${email} with password: ${newPassword}\n`);
  }
  
  process.exit(0);
}

reset().catch((err) => {
  console.error('Error resetting super admin password:', err);
  process.exit(1);
});
