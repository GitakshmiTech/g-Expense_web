import mongoose from 'mongoose';
import { listManagerPendingApprovals } from './src/services/manager.service.js';

const MONGODB_URI = 'mongodb://127.0.0.1:27017/gt_expense_management';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB.");

  // Define User to load schema
  const User = mongoose.model('User');
  const harsh = await User.findOne({ email: 'harsh@gmail.com' });
  
  const mockReq = {
    user: harsh,
    companyId: harsh.companyId
  };

  const pending = await listManagerPendingApprovals({ req: mockReq });
  console.log(`\nPending approvals found: ${pending.length}`);
  
  for (const p of pending) {
    console.log(`- Kind: ${p.kind}, No: ${p.advanceNo || p.reportNo}, Employee: ${p.employeeId?.name || p.employeeId}, Status: ${p.status}`);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
