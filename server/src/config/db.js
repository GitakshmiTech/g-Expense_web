import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

export const connectDb = async () => {
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
