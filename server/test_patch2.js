import mongoose from 'mongoose';
import { env } from './src/config/env.js';
import { User } from './src/models/User.js';
import jwt from 'jsonwebtoken';

async function testPatch() {
  await mongoose.connect(env.mongoUri);
  const admin = await User.findOne({ role: 'company_admin' });
  if (!admin) {
    console.log('No company_admin found');
    process.exit(1);
  }
  
  const token = jwt.sign({ sub: admin._id }, env.jwtSecret, { expiresIn: '1h' });
  
  console.log(`Testing PATCH /api/companies/${admin.companyId} as ${admin.email}`);
  
  const res = await fetch(`http://localhost:${env.port}/api/companies/${admin.companyId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: 'active' })
  });
  
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Response:', data);
  
  process.exit(0);
}

testPatch().catch(console.error);
