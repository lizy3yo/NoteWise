/*
 * Copyright 2025 Kharl Ryan M. De Jesus
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

//NODE MODULES
import mongoose from "mongoose";

//CUSTOM MODULES
import config from "@/lib/config";

//TYPES
import type {ConnectOptions} from 'mongoose';

//CLIENT OPTION - Optimized with connection pooling
const clientOptions: ConnectOptions = {
  dbName: 'notewise-db',
  appName: 'NoteWise',
  serverApi: {
    version: '1',
    strict: true,
    deprecationErrors: true,
  },
  // Connection pool settings for better performance and stability
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 2,  // Minimum number of connections to maintain
  maxIdleTimeMS: 600000, // Close connections after 10 minutes of inactivity
  waitQueueTimeoutMS: 10000, // Wait 10s for a connection from pool (increased)
  serverSelectionTimeoutMS: 15000, // Timeout for server selection (increased)
  socketTimeoutMS: 60000, // Socket timeout (increased to 60s)
  connectTimeoutMS: 15000, // Connection timeout
  family: 4, // Use IPv4, skip trying IPv6
  retryWrites: true, // Automatically retry write operations
  retryReads: true, // Automatically retry read operations
  autoIndex: false, // Don't build indexes in production
};

let isConnected = false;
let connectionPromise: Promise<void> | null = null;

/**
 * Establishes a connection to the MongoDB database using Mongoose with connection pooling.
 * Reuses existing connection across requests for optimal performance.
 * If an error occurs during the connection process, it throws an error
 * with a descriptive message.
 *
 * - Uses `MONGO_URI` as the connection string.
 * - `clientOptions` contains additional configuration including connection pooling.
 * - Errors are properly handled and rethrown for better debugging.
 */
const connectToDatabase = async (): Promise<void> => {
    // Check if connection is truly alive (not just cached state)
    const readyState = mongoose.connection.readyState;
    
    // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    if (readyState === 1 && isConnected) {
        return;
    }

    // If already connecting, wait for that connection
    if (readyState === 2 && connectionPromise) {
        return connectionPromise;
    }

    // Return pending connection promise if connection is in progress
    if (connectionPromise) {
        return connectionPromise;
    }

    if (!config.MONGO_URI) {
        throw new Error('MONGO_URI is not defined in the environment variables');
    }
    
    const mongoUri = config.MONGO_URI;
    
    connectionPromise = (async () => {
        try {
            const currentState = mongoose.connection.readyState;
            
            // Only connect if truly disconnected (readyState 0)
            if (currentState === 0) {
                await mongoose.connect(mongoUri, clientOptions);
                isConnected = true;
                
                console.log('✅ Connected to Database successfully', {
                    host: mongoose.connection.host,
                    database: mongoose.connection.db?.databaseName,
                    poolSize: clientOptions.maxPoolSize,
                });

                // Setup connection event handlers
                setupConnectionHandlers();
            } else if (currentState === 1) {
                // Already connected, just update flag
                isConnected = true;
            } else {
                // Connection is in a transitional state (connecting/disconnecting)
                // Wait a bit and check again
                await new Promise(resolve => setTimeout(resolve, 500));
                const newState = mongoose.connection.readyState;
                
                switch (newState) {
                    case 1:
                        isConnected = true;
                        break;
                    case 0:
                        // Try connecting again
                        await mongoose.connect(mongoUri, clientOptions);
                        isConnected = true;
                        setupConnectionHandlers();
                        break;
                    default:
                        throw new Error(`Connection in unexpected state: ${newState}`);
                }
            }
        } catch (err) {
            console.error('❌ Failed to connect to the database:', err);
            isConnected = false;
            connectionPromise = null;
            
            if (err instanceof Error) {
                throw err;
            }
            throw new Error('Database connection failed');
        } finally {
            connectionPromise = null;
        }
    })();

    return connectionPromise;
}

/**
 * Setup connection event handlers for monitoring and auto-recovery
 */
function setupConnectionHandlers(): void {
    // Prevent duplicate event listeners
    if (mongoose.connection.listenerCount('error') > 0) {
        return;
    }

    mongoose.connection.on('error', (err) => {
        console.error('❌ Mongoose connection error:', err);
        isConnected = false;
        connectionPromise = null;
    });

    mongoose.connection.on('disconnected', () => {
        console.log('📴 Mongoose disconnected from MongoDB');
        isConnected = false;
        connectionPromise = null;
    });

    mongoose.connection.on('reconnected', () => {
        console.log(' Mongoose reconnected to MongoDB');
        isConnected = true;
    });

    mongoose.connection.on('close', () => {
        console.log('🔒 Mongoose connection closed');
        isConnected = false;
        connectionPromise = null;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('🛑 Mongoose connection closed due to app termination');
        process.exit(0);
    });
}

/**
 * Disconnects from the MongoDB database using Mongoose.
 *
 * This function attempts to disconnect from the database asynchronously.
 * If the disconnection is successful, a success message is logged.
 * If an error occurs, it is either re-thrown as a new Error (if it's an instance of Error)
 * or logged to the console.
 */
const disconnectFromDatabase = async (): Promise<void> => {
    if (!isConnected) {
        return;
    }

    try {
        await mongoose.disconnect();
        isConnected = false;
        console.log('Disconnected from Database successfully', {
            uri: config.MONGO_URI,
            options: clientOptions,
        });
    } catch (err) {
        console.error('Failed to disconnect from the database:', err);
        if (err instanceof Error) {
            throw new Error(err.message);
        }
        throw new Error('Database disconnection failed');
    }
}
export { connectToDatabase, disconnectFromDatabase };
export default mongoose;
