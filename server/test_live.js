import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from './src/config/env.js';
import { User } from './src/models/User.js';
import https from 'https';

async function testLive() {
  await mongoose.connect(env.mongoUri);
  const admin = await User.findOne({ role: 'super_admin' });
  
  const token = jwt.sign({ sub: admin._id }, env.jwtSecret, { expiresIn: '1h' });
  
  const { Company } = await import('./src/models/Company.js');
  const company = await Company.findOne();
  
  console.log('Sending PATCH to LIVE server (ignoring SSL)...');
  
  const agent = new https.Agent({ rejectUnauthorized: false });
  const res = await fetch(`https://expense.gitakshmi.com/api/companies/${company._id}`, {
    method: 'PATCH',
    agent,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: 'active' })
  });
  
  const text = await res.text();
  console.log('Live Server Status:', res.status);
  console.log('Live Server Response:', text);
  
  process.exit(0);
}

testLive().catch(console.error);
