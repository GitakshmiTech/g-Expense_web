import mongoose from 'mongoose';

mongoose.connect('mongodb://ivaharpal_db_user:expense%40123@ac-bachopk-shard-00-00.gg6eurm.mongodb.net:27017,ac-bachopk-shard-00-01.gg6eurm.mongodb.net:27017,ac-bachopk-shard-00-02.gg6eurm.mongodb.net:27017/gt_expence?ssl=true&replicaSet=atlas-gehmt9-shard-0&authSource=admin&retryWrites=true&w=majority')
  .then(() => mongoose.connection.db.collection('users').updateOne({email: 'gtexpence@gmail.com'}, {$set: {role: 'super_admin', status: 'active'}}))
  .then((res) => { console.log('Fixed', res); process.exit(0); })
  .catch((err) => { console.error(err); process.exit(1); });
