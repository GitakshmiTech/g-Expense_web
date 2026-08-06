import mongoose from 'mongoose';
import { connectDb } from './src/config/db.js';

async function dropIndex() {
  await connectDb();
  try {
    await mongoose.connection.collection('users').dropIndex('companyId_1_employeeCode_1_isDeleted_1');
    console.log('Index dropped successfully');
  } catch (err) {
    console.error('Error dropping index', err);
  }
  process.exit(0);
}

dropIndex();
