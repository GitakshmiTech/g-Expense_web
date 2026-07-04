import mongoose from 'mongoose';
import { User } from './src/models/User.js';
import { env } from './src/config/env.js';

async function reset() {
  await mongoose.connect(env.mongoUri);
  const user = await User.findOne({ email: 'git@gmail.com' });
  if (user) {
    if (user.status === 'Active') {
      user.status = 'active';
    }
    user.password = 'Admin@12345';
    await user.save();
    console.log('Password reset to Admin@12345 for git@gmail.com');
  } else {
    console.log('User not found');
  }
  process.exit(0);
}

reset().catch(console.error);
