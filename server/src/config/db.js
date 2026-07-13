import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';
import { spawn } from 'child_process';
import fs from 'fs';

const startLocalMongo = () => {
  return new Promise((resolve) => {
    const mongodPath = "C:\\Program Files\\MongoDB\\Server\\8.3\\bin\\mongod.exe";
    const dbPath = "C:\\Users\\ASUS\\Desktop\\bruno\\Expense-management-system\\server\\.mongo-data";

    if (fs.existsSync(mongodPath)) {
      logger.info("Auto-starting local MongoDB service...");
      try {
        const mongoProcess = spawn(mongodPath, [
          "--dbpath", dbPath,
          "--port", "27017",
          "--bind_ip", "127.0.0.1"
        ], {
          detached: true,
          stdio: 'ignore'
        });
        mongoProcess.unref();
      } catch (err) {
        logger.warn("Failed to spawn mongod process:", err.message);
      }
      setTimeout(resolve, 3000);
    } else {
      resolve();
    }
  });
};

export const connectDb = async () => {
  const isLocal = env.mongoUri.includes('127.0.0.1') || env.mongoUri.includes('localhost');
  if (isLocal) {
    await startLocalMongo();
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 7000 });
    logger.info(`MongoDB connected: ${mongoose.connection.name}`);
  } catch (error) {
    const localMongoHint = env.mongoUri.includes('127.0.0.1') || env.mongoUri.includes('localhost')
      ? 'Local MongoDB is not running. Start MongoDB on port 27017, or replace MONGODB_URI in server/.env with your MongoDB Atlas connection string.'
      : 'Check that MONGODB_URI in server/.env is reachable and that the database user, password, IP access list, and cluster status are correct.';

    logger.error('MongoDB connection failed', {
      uri: env.mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'),
      hint: localMongoHint,
      originalError: error.message
    });

    throw new Error(localMongoHint);
  }
};
