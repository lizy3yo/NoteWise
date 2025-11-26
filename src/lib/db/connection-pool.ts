/**
 * MongoDB Connection Pool Manager
 * 
 * Implements connection pooling best practices for Next.js
 * Ensures single connection instance is reused across requests
 */

import mongoose from 'mongoose';
import config from '@/lib/config';

interface ConnectionOptions extends mongoose.ConnectOptions {
  dbName: string;
  appName: string;
  serverApi: {
    version: '1';
    strict: boolean;
    deprecationErrors: boolean;
  };
  // Connection pool settings
  maxPoolSize?: number;
  minPoolSize?: number;
  maxIdleTimeMS?: number;
  waitQueueTimeoutMS?: number;
  serverSelectionTimeoutMS?: number;
  socketTimeoutMS?: number;
  family?: number;
}

// Optimized connection options with pooling
const connectionOptions: ConnectionOptions = {
  dbName: 'notewise-db',
  appName: 'NoteWise',
  serverApi: {
    version: '1',
    strict: true,
    deprecationErrors: true,
  },
  // Connection pool configuration
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 2,  // Minimum number of connections to maintain
  maxIdleTimeMS: 30000, // Close connections after 30s of inactivity
  waitQueueTimeoutMS: 5000, // Wait 5s for a connection from pool
  serverSelectionTimeoutMS: 10000, // Timeout for server selection
  socketTimeoutMS: 45000, // Socket timeout
  family: 4, // Use IPv4, skip trying IPv6
};

// Connection state tracking
let isConnected = false;
let connectionPromise: Promise<typeof mongoose> | null = null;

/**
 * Get or create MongoDB connection with pooling
 * Reuses existing connection across requests
 */
export async function getConnection(): Promise<typeof mongoose> {
  // Return existing connection if already connected
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // Return pending connection promise if connection is in progress
  if (connectionPromise) {
    return connectionPromise;
  }

  // Validate MongoDB URI
  if (!config.MONGO_URI) {
    throw new Error('MONGO_URI is not defined in environment variables');
  }

  // Create new connection
  connectionPromise = mongoose.connect(config.MONGO_URI, connectionOptions)
    .then((mongooseInstance) => {
      isConnected = true;
      connectionPromise = null;
      
      console.log('✅ MongoDB connected successfully', {
        host: mongoose.connection.host,
        database: mongoose.connection.db?.databaseName,
        poolSize: connectionOptions.maxPoolSize,
      });

      // Setup connection event handlers
      setupConnectionHandlers();

      return mongooseInstance;
    })
    .catch((error) => {
      connectionPromise = null;
      isConnected = false;
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    });

  return connectionPromise;
}

/**
 * Setup connection event handlers for monitoring
 */
function setupConnectionHandlers(): void {
  // Connection events
  mongoose.connection.on('connected', () => {
    console.log('📡 Mongoose connected to MongoDB');
  });

  mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err);
    isConnected = false;
  });

  mongoose.connection.on('disconnected', () => {
    console.log('📴 Mongoose disconnected from MongoDB');
    isConnected = false;
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('🛑 Mongoose connection closed due to app termination');
    process.exit(0);
  });
}

/**
 * Get connection pool statistics
 */
export function getPoolStats() {
  if (!mongoose.connection.db) {
    return null;
  }

  return {
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    // Additional pool stats can be added here
  };
}

/**
 * Gracefully close connection (for testing or shutdown)
 */
export async function closeConnection(): Promise<void> {
  if (isConnected) {
    await mongoose.connection.close();
    isConnected = false;
    connectionPromise = null;
    console.log('✅ MongoDB connection closed');
  }
}

/**
 * Legacy compatibility - maintains same interface as old connectToDatabase
 */
export const connectToDatabase = getConnection;

export default {
  getConnection,
  connectToDatabase,
  closeConnection,
  getPoolStats,
};
