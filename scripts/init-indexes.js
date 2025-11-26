/**
 * Initialize MongoDB Indexes
 * 
 * Run this script to create all necessary indexes for optimal performance
 * Usage: node scripts/init-indexes.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Import models (adjust paths as needed)
const User = require('../src/models/user').default;
const Summary = require('../src/models/summary').Summary;
const Flashcard = require('../src/models/flashcard').default;
const Activity = require('../src/models/activity').default;

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in environment variables');
  process.exit(1);
}

const indexDefinitions = [
  {
    model: 'User',
    collection: 'users',
    indexes: [
      { fields: { email: 1 }, options: { unique: true }, description: 'Unique email index' },
      { fields: { username: 1 }, options: { unique: true }, description: 'Unique username index' },
      { fields: { emailVerificationToken: 1 }, options: { sparse: true }, description: 'Email verification' },
      { fields: { passwordResetToken: 1 }, options: { sparse: true }, description: 'Password reset' },
    ]
  },
  {
    model: 'Summary',
    collection: 'summaries',
    indexes: [
      { fields: { userId: 1, createdAt: -1 }, description: 'User summaries by date' },
      { fields: { userId: 1, isArchived: 1, createdAt: -1 }, description: 'Archived summaries' },
      { fields: { userId: 1, isFavorite: 1, createdAt: -1 }, description: 'Favorite summaries' },
      { fields: { userId: 1, subject: 1 }, description: 'Subject filtering' },
      { fields: { userId: 1, folder: 1 }, options: { sparse: true }, description: 'Folder organization' },
      { fields: { tags: 1 }, description: 'Tag searches' },
      { fields: { isPublic: 1, createdAt: -1 }, description: 'Public summaries' },
    ]
  },
  {
    model: 'Flashcard',
    collection: 'flashcards',
    indexes: [
      { fields: { user: 1, createdAt: -1 }, description: 'User flashcards by date' },
      { fields: { user: 1, isArchived: 1, createdAt: -1 }, description: 'Archived flashcards' },
      { fields: { user: 1, isFavorite: 1, createdAt: -1 }, description: 'Favorite flashcards' },
      { fields: { user: 1, subject: 1 }, options: { sparse: true }, description: 'Subject filtering' },
      { fields: { user: 1, folder: 1 }, options: { sparse: true }, description: 'Folder organization' },
      { fields: { accessType: 1, createdAt: -1 }, description: 'Public flashcards' },
      { fields: { shareableLink: 1 }, options: { unique: true, sparse: true }, description: 'Shareable links' },
      { fields: { tags: 1 }, description: 'Tag searches' },
      { fields: { user: 1, nextReview: 1 }, options: { sparse: true }, description: 'Spaced repetition' },
    ]
  },
  {
    model: 'Activity',
    collection: 'activities',
    indexes: [
      { fields: { user: 1, createdAt: -1 }, description: 'User activity history' },
      { fields: { user: 1, type: 1, createdAt: -1 }, description: 'Activity type filtering' },
      { fields: { user: 1, type: 1, 'meta.summaryId': 1 }, options: { sparse: true }, description: 'Duplicate check' },
      { fields: { createdAt: -1 }, options: { expireAfterSeconds: 7776000 }, description: 'TTL index (90 days)' },
    ]
  },
  {
    model: 'Folder',
    collection: 'folders',
    indexes: [
      { fields: { userId: 1, updatedAt: -1 }, description: 'User folders' },
      { fields: { userId: 1, name: 1 }, description: 'Folder name lookups' },
    ]
  },
  {
    model: 'ChatSession',
    collection: 'chatsessions',
    indexes: [
      { fields: { userId: 1, updatedAt: -1 }, description: 'User chat sessions' },
      { fields: { userId: 1, createdAt: -1 }, description: 'Recent sessions' },
    ]
  },
  {
    model: 'StudyProgress',
    collection: 'studyprogresses',
    indexes: [
      { fields: { user: 1, flashcard: 1 }, options: { unique: true }, description: 'Unique user-flashcard progress' },
      { fields: { user: 1, updatedAt: -1 }, description: 'Recent study activity' },
    ]
  }
];

async function createIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      dbName: 'notewise-db',
      serverApi: { version: '1', strict: true, deprecationErrors: true }
    });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    for (const { model, collection, indexes } of indexDefinitions) {
      console.log(`\n📦 Creating indexes for ${model}...`);
      
      const coll = db.collection(collection);
      
      for (const { fields, options = {}, description } of indexes) {
        try {
          await coll.createIndex(fields, options);
          console.log(`  ✅ ${description}`);
        } catch (error) {
          if (error.code === 85 || error.code === 86) {
            // Index already exists with different options
            console.log(`  ⚠️  ${description} - already exists, skipping`);
          } else {
            console.error(`  ❌ ${description} - failed:`, error.message);
          }
        }
      }
    }

    console.log('\n✅ Index creation completed!');
    console.log('\n📊 Listing all indexes...\n');

    // List all indexes
    for (const { model, collection } of indexDefinitions) {
      const coll = db.collection(collection);
      const indexes = await coll.indexes();
      console.log(`${model}:`);
      indexes.forEach(idx => {
        console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

createIndexes();
