import mongoose from 'mongoose';
import logger from '../utils/logger';
import { config } from './index';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000; // 5 seconds
const CONNECTION_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Attempts to connect to MongoDB with retry logic
 */
const connectWithRetry = async (retries = 0): Promise<void> => {
  try {
    logger.info(`Connecting to MongoDB Atlas (attempt ${retries + 1}/${MAX_RETRIES})...`);

    // Create connection timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`MongoDB connection timeout after ${CONNECTION_TIMEOUT_MS}ms`));
      }, CONNECTION_TIMEOUT_MS);
    });

    // Create connection promise
    const connectionPromise = mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: CONNECTION_TIMEOUT_MS,
      socketTimeoutMS: CONNECTION_TIMEOUT_MS,
      connectTimeoutMS: CONNECTION_TIMEOUT_MS,
    });

    // Race between connection and timeout
    await Promise.race([connectionPromise, timeoutPromise]);

    logger.info('✅ MongoDB Atlas connected successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`❌ MongoDB connection attempt ${retries + 1} failed:`, errorMessage);

    if (retries < MAX_RETRIES - 1) {
      logger.info(`Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return connectWithRetry(retries + 1);
    }

    // Max retries reached - fail startup
    logger.error('❌ Failed to connect to MongoDB Atlas after maximum retries');
    logger.error('💡 Please check:');
    logger.error('   - MONGO_URI is correct and points to MongoDB Atlas');
    logger.error('   - Network connectivity to MongoDB Atlas');
    logger.error('   - IP whitelist in MongoDB Atlas cluster settings');
    logger.error('   - Database user credentials are correct');
    throw error;
  }
};

/**
 * Connects to MongoDB Atlas database
 * Fails fast on startup if connection cannot be established
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    // Set up connection event handlers
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Attempt connection with retry
    await connectWithRetry();

    // Verify connection is actually working
    await mongoose.connection.db.admin().ping();
    logger.info('✅ MongoDB Atlas connection verified');
  } catch (error) {
    logger.error('❌ MongoDB Atlas connection failed - application will not start');
    logger.error(error);
    process.exit(1);
  }
};

/**
 * Disconnects from MongoDB Atlas
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
};
