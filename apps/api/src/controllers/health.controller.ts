import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { config } from '../config';

/**
 * Health check endpoint
 * Checks:
 * - MongoDB connection
 * - JWT secrets presence
 */
export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      mongodb: {
        status: 'unknown',
        message: '',
      },
      jwt: {
        status: 'unknown',
        message: '',
      },
    },
  };

  let allHealthy = true;

  // Check MongoDB
  try {
    if (mongoose.connection.readyState === 1) {
      // Ping MongoDB to ensure it's actually responsive
      await mongoose.connection.db.admin().ping();
      health.checks.mongodb.status = 'healthy';
      health.checks.mongodb.message = 'MongoDB Atlas connection is active';
    } else {
      health.checks.mongodb.status = 'unhealthy';
      health.checks.mongodb.message = 'MongoDB connection is not established';
      allHealthy = false;
    }
  } catch (error) {
    health.checks.mongodb.status = 'unhealthy';
    health.checks.mongodb.message = `MongoDB error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    allHealthy = false;
  }

  // Check JWT secrets
  try {
    const accessSecretPresent = !!config.jwt.accessSecret && config.jwt.accessSecret.length >= 64;
    const refreshSecretPresent = !!config.jwt.refreshSecret && config.jwt.refreshSecret.length >= 64;
    const secretsDifferent = config.jwt.accessSecret !== config.jwt.refreshSecret;

    if (accessSecretPresent && refreshSecretPresent && secretsDifferent) {
      health.checks.jwt.status = 'healthy';
      health.checks.jwt.message = 'JWT secrets are configured and valid';
    } else {
      health.checks.jwt.status = 'unhealthy';
      health.checks.jwt.message = 'JWT secrets are missing or invalid';
      allHealthy = false;
    }
  } catch (error) {
    health.checks.jwt.status = 'unhealthy';
    health.checks.jwt.message = `JWT check error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    allHealthy = false;
  }

  // Set overall status
  health.status = allHealthy ? 'healthy' : 'unhealthy';

  // Return appropriate status code
  const statusCode = allHealthy ? 200 : 503;
  res.status(statusCode).json(health);
};
