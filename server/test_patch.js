import mongoose from 'mongoose';
import { env } from './src/config/env.js';
import { User } from './src/models/User.js';
import jwt from 'jsonwebtoken';

async function testPatch() {
  await mongoose.connect(env.mongoUri);
  const admin = await User.findOne({ role: 'super_admin' });
  if (!admin) {
    console.log('No super_admin found');
    process.exit(1);
  }
  
  const token = jwt.sign({ sub: admin._id }, env.jwtSecret, { expiresIn: '1h' });
  
  // Find a company
  const { Company } = await import('./src/models/Company.js');
  const company = await Company.findOne();
  if (!company) {
    console.log('No company found');
    process.exit(1);
  }
  
  console.log(`Testing PATCH /api/companies/${company._id} as ${admin.email}`);
  
  const res = await fetch(`http://localhost:${env.port}/api/companies/${company._id}`, {
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
