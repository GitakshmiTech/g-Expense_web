import mongoose from 'mongoose';
import { User } from './models/User.js';
import { connectDb } from './config/db.js';

async function run() {
  try {
    await connectDb();
    const users = await User.find({});
    console.log("Local Users in gt_expense_management:");
    users.forEach(u => {
      console.log(`- ${u.name} (${u.email}) - Role: ${u.role}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
run();
