/**
 * Database Statistics and Performance Monitoring
 * 
 * GET /api/admin/db-stats
 * Returns database connection stats, index usage, and performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import mongoose from 'mongoose';
import { Summary } from '@/models/summary';
import Flashcard from '@/models/flashcard';
import Activity from '@/models/activity';
import User from '@/models/user';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database not connected' },
        { status: 500 }
      );
    }

    // Get database stats
    const dbStats = await db.stats();

    // Get connection pool stats
    const connectionStats = {
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      port: mongoose.connection.port,
    };

    // Get collection stats
    const collections = ['users', 'summaries', 'flashcards', 'activities'];
    const collectionStats: Record<string, any> = {};

    for (const collName of collections) {
      try {
        const coll = db.collection(collName);
        const stats = await db.command({ collStats: collName });
        const indexes = await coll.indexes();

        collectionStats[collName] = {
          count: stats.count,
          size: stats.size,
          avgObjSize: stats.avgObjSize,
          storageSize: stats.storageSize,
          indexes: indexes.map(idx => ({
            name: idx.name,
            keys: idx.key,
            unique: idx.unique || false,
          })),
          indexCount: indexes.length,
        };
      } catch (error) {
        collectionStats[collName] = { error: 'Failed to get stats' };
      }
    }

    // Get slow query info (if available)
    const slowQueries = await getSlowQueries(db);

    return NextResponse.json({
      success: true,
      data: {
        connection: connectionStats,
        database: {
          name: dbStats.db,
          collections: dbStats.collections,
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexes: dbStats.indexes,
          indexSize: dbStats.indexSize,
          avgObjSize: dbStats.avgObjSize,
        },
        collections: collectionStats,
        slowQueries,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error getting database stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get database stats',
      },
      { status: 500 }
    );
  }
}

async function getSlowQueries(db: any): Promise<any[]> {
  try {
    // Get current operations (requires admin privileges)
    const currentOp = await db.admin().command({ currentOp: 1 });
    
    // Filter slow queries (> 100ms)
    const slowOps = currentOp.inprog?.filter((op: any) => 
      op.microsecs_running > 100000
    ) || [];

    return slowOps.map((op: any) => ({
      opid: op.opid,
      op: op.op,
      ns: op.ns,
      duration: Math.round(op.microsecs_running / 1000),
      command: op.command,
    }));
  } catch (error) {
    // Likely don't have admin privileges
    return [];
  }
}
