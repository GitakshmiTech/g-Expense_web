import mongoose from 'mongoose';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dns.setDefaultResultOrder('ipv4first');

const uri = 'mongodb+srv://priyamdodiya123_db_user:IOj764CcnboDAv20@cluster0.kjnm1zc.mongodb.net/gt_expense_management?retryWrites=true&w=majority&appName=Cluster0';

async function test() {
  console.log("Connecting with custom DNS servers...");
  await mongoose.connect(uri);
  console.log("Connected successfully!");
  await mongoose.disconnect();
}

test().catch(console.error);
