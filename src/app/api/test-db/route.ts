import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    // Test the database connection
    await connectToDatabase();
    
    // Get connection state
    const connectionState = mongoose.connection.readyState;
    const connectionStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    // Get database info
    const dbName = mongoose.connection.db?.databaseName;
    const host = mongoose.connection.host;
    const port = mongoose.connection.port;

    // Test a simple operation - list collections
    const collections = await mongoose.connection.db?.listCollections().toArray();

    return NextResponse.json({
      success: true,
      message: 'MongoDB connection successful!',
      connectionInfo: {
        state: connectionStates[connectionState as keyof typeof connectionStates],
        database: dbName,
        host: host,
        port: port,
        collections: collections?.map(col => col.name) || []
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database connection test failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'MongoDB connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}