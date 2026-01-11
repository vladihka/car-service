import app from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import logger from './utils/logger';

const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();
    
    // Start server
    const server = app.listen(env.port, () => {
      logger.info(`Server running on port ${env.port} in ${env.nodeEnv} mode`);
      logger.info(`API URL: ${env.apiUrl}`);
    });
    
    // Graceful shutdown
    const shutdown = async (): Promise<void> => {
      logger.info('Shutting down server...');
      server.close(async () => {
        logger.info('HTTP server closed');
        await import('./config/database').then(({ disconnectDatabase }) => disconnectDatabase());
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
