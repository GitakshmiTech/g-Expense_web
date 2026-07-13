import mongoose from 'mongoose';
import { env } from './src/config/env.js';

async function fix() {
  await mongoose.connect(env.mongoUri);
  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  for (const user of users) {
    let changed = false;
    
    // fix role to lowercase and map properly
    if (user.role && user.role !== user.role.toLowerCase()) {
      let newRole = user.role.toLowerCase();
      if (newRole === 'company_admin') newRole = 'company_admin';
      else if (newRole === 'super_admin') newRole = 'super_admin';
      else if (newRole === 'manager') newRole = 'manager';
      else if (newRole === 'finance') newRole = 'finance';
      else if (newRole === 'cfo') newRole = 'cfo';
      else if (newRole === 'employee') newRole = 'employee';
      // else fallback to employee if unknown? No, just keep the lowercased version

      if (user.role !== newRole) {
        user.role = newRole;
        changed = true;
      }
    }
    
    // fix status to lowercase
    if (user.status && user.status !== user.status.toLowerCase()) {
      user.status = user.status.toLowerCase();
      changed = true;
    }

    if (changed) {
      await mongoose.connection.db.collection('users').updateOne(
        { _id: user._id },
        { 
          $set: { 
            role: user.role,
            status: user.status
          }
        }
      );
      console.log(`Fixed user role/status: ${user.email} -> ${user.role} / ${user.status}`);
    }
  }
  
  console.log('Done fixing users');
  process.exit(0);
}

fix().catch(console.error);
