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
  // Connection pool settings for better performance
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 2,  // Minimum number of connections to maintain
  maxIdleTimeMS: 30000, // Close connections after 30s of inactivity
  waitQueueTimeoutMS: 5000, // Wait 5s for a connection from pool
  serverSelectionTimeoutMS: 10000, // Timeout for server selection
  socketTimeoutMS: 45000, // Socket timeout
  family: 4, // Use IPv4, skip trying IPv6
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
    // Return immediately if already connected
    if (isConnected && mongoose.connection.readyState === 1) {
        return;
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
            await mongoose.connect(mongoUri, clientOptions);
            isConnected = true;
            
            console.log('✅ Connected to Database successfully', {
                host: mongoose.connection.host,
                database: mongoose.connection.db?.databaseName,
                poolSize: clientOptions.maxPoolSize,
            });

            // Setup connection event handlers
            setupConnectionHandlers();
        } catch (err) {
            console.error('❌ Failed to connect to the database:', err);
            isConnected = false;
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
 * Setup connection event handlers for monitoring
 */
function setupConnectionHandlers(): void {
    // Prevent duplicate event listeners
    if (mongoose.connection.listenerCount('error') > 0) {
        return;
    }

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