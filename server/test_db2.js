import mongoose from 'mongoose';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

const uri = 'mongodb://priyamdodiya123_db_user:IOj764CcnboDAv20@ac-waiqzbj-shard-00-00.kjnm1zc.mongodb.net:27017,ac-waiqzbj-shard-00-01.kjnm1zc.mongodb.net:27017,ac-waiqzbj-shard-00-02.kjnm1zc.mongodb.net:27017/gt_expense_management?ssl=true&replicaSet=atlas-6sksvb-shard-0&authSource=admin';

async function test() {
  console.log("Connecting directly to replica set members with replicaSet name and ipv4first...");
  await mongoose.connect(uri);
  console.log("Connected successfully!");
  await mongoose.disconnect();
}

test().catch(console.error);
