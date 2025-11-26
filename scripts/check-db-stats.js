/**
 * Check Database Statistics
 * 
 * Quick script to check database performance and index usage
 * Usage: npm run db:stats
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in environment variables');
  process.exit(1);
}

async function checkStats() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      dbName: 'notewise-db',
      serverApi: { version: '1', strict: true, deprecationErrors: true }
    });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Database stats
    console.log('📊 Database Statistics\n');
    const dbStats = await db.stats();
    console.log(`Database: ${dbStats.db}`);
    console.log(`Collections: ${dbStats.collections}`);
    console.log(`Data Size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Storage Size: ${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Index Size: ${(dbStats.indexSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total Indexes: ${dbStats.indexes}`);
    console.log(`Average Object Size: ${dbStats.avgObjSize} bytes\n`);

    // Collection stats
    const collections = ['users', 'summaries', 'flashcards', 'activities', 'folders'];
    
    console.log('📦 Collection Statistics\n');
    for (const collName of collections) {
      try {
        const coll = db.collection(collName);
        const stats = await coll.stats();
        const indexes = await coll.indexes();

        console.log(`${collName.toUpperCase()}:`);
        console.log(`  Documents: ${stats.count}`);
        console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`  Avg Doc Size: ${stats.avgObjSize} bytes`);
        console.log(`  Indexes: ${indexes.length}`);
        
        indexes.forEach(idx => {
          const keys = Object.keys(idx.key).join(', ');
          const unique = idx.unique ? ' (unique)' : '';
          const sparse = idx.sparse ? ' (sparse)' : '';
          console.log(`    - ${idx.name}: ${keys}${unique}${sparse}`);
        });
        console.log('');
      } catch (error) {
        console.log(`  ⚠️  Collection not found or error: ${error.message}\n`);
      }
    }

    // Connection info
    console.log('🔗 Connection Information\n');
    console.log(`Host: ${mongoose.connection.host}`);
    console.log(`Port: ${mongoose.connection.port}`);
    console.log(`Database: ${mongoose.connection.name}`);
    console.log(`Ready State: ${mongoose.connection.readyState} (1 = connected)`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

checkStats();
