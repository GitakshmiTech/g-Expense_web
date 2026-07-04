import mongoose from 'mongoose';
import { env } from './src/config/env.js';

async function clearEmployees() {
  await mongoose.connect(env.mongoUri);
  
  const adminRoles = ['super_admin', 'product_super_admin', 'company_admin'];
  
  const result = await mongoose.connection.db.collection('users').deleteMany({
    role: { $nin: adminRoles }
  });
  
  console.log(`Successfully deleted ${result.deletedCount} employee records.`);
  console.log('Admins and Super Admins were preserved to maintain system access.');
  
  process.exit(0);
}

clearEmployees().catch(console.error);
