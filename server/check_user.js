import mongoose from 'mongoose';
import { env } from './src/config/env.js';
import { User } from './src/models/User.js';

async function checkUser() {
  await mongoose.connect(env.mongoUri);
  
  const user = await User.findOne({ employeeId: '10064' }).select('+password');
  console.log('User found:', user ? 'Yes' : 'No');
  
  if (user) {
    console.log('Employee ID:', user.employeeId);
    console.log('Email:', user.email);
    console.log('Name:', user.name);
    console.log('Role:', user.role);
    console.log('Password hash exists:', !!user.password);
    
    user.password = 'jaypan@2002';
    await user.save();
    console.log('Password reset successfully to jaypan@2002');
  }
  
  process.exit(0);
}

checkUser().catch(console.error);
