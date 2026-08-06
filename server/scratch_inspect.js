import mongoose from 'mongoose';
import { User } from './src/models/User.js';
import { env } from './src/config/env.js';

async function test() {
  await mongoose.connect(env.mongoUri);
  const user = await User.findOne({ email: 'gtexpence@gmail.com' }).select('+password');
  console.log('User found:', !!user);
  if (user) {
    console.log('User password field:', user.password);
    const isMatch = await user.comparePassword('admin123');
    console.log('comparePassword("admin123"):', isMatch);
  }
  process.exit(0);
}
test().catch(console.error);
