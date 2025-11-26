/**
 * MongoDB Index Management
 * 
 * This file defines and creates all necessary indexes for optimal query performance.
 * Run this during application startup or as a migration script.
 */

import mongoose from 'mongoose';
import User from '@/models/user';
import { Summary } from '@/models/summary';
import Flashcard from '@/models/flashcard';
import Activity from '@/models/activity';
import Folder from '@/models/folder';
import ChatSession from '@/models/chatSession';
import StudyProgress from '@/models/study_progress';

interface IndexDefinition {
  model: any;
  indexes: Array<{
    fields: Record<string, 1 | -1>;
    options?: mongoose.IndexOptions;
    description: string;
  }>;
}

/**
 * Comprehensive index definitions for all models
 */
const indexDefinitions: IndexDefinition[] = [
  {
    model: User,
    indexes: [
      {
        fields: { email: 1 },
        options: { unique: true },
        description: 'Unique index for user login and lookups'
      },
      {
        fields: { username: 1 },
        options: { unique: true },
        description: 'Unique index for username lookups'
      },
      {
        fields: { emailVerificationToken: 1 },
        options: { sparse: true },
        description: 'Sparse index for email verification'
      },
      {
        fields: { passwordResetToken: 1 },
        options: { sparse: true },
        description: 'Sparse index for password reset'
      }
    ]
  },
  {
    model: Summary,
    indexes: [
      {
        fields: { userId: 1, createdAt: -1 },
        description: 'Compound index for user summaries sorted by date'
      },
      {
        fields: { userId: 1, isArchived: 1, createdAt: -1 },
        description: 'Compound index for filtering archived summaries'
      },
      {
        fields: { userId: 1, isFavorite: 1, createdAt: -1 },
        description: 'Compound index for favorite summaries'
      },
      {
        fields: { userId: 1, subject: 1 },
        description: 'Compound index for subject filtering'
      },
      {
        fields: { userId: 1, folder: 1 },
        options: { sparse: true },
        description: 'Compound index for folder organization'
      },
      {
        fields: { tags: 1 },
        description: 'Index for tag-based searches'
      },
      {
        fields: { isPublic: 1, createdAt: -1 },
        description: 'Index for public summaries'
      }
    ]
  },
  {
    model: Flashcard,
    indexes: [
      {
        fields: { user: 1, createdAt: -1 },
        description: 'Compound index for user flashcards sorted by date'
      },
      {
        fields: { user: 1, isArchived: 1, createdAt: -1 },
        description: 'Compound index for filtering archived flashcards'
      },
      {
        fields: { user: 1, isFavorite: 1, createdAt: -1 },
        description: 'Compound index for favorite flashcards'
      },
      {
        fields: { user: 1, subject: 1 },
        options: { sparse: true },
        description: 'Compound index for subject filtering'
      },
      {
        fields: { user: 1, folder: 1 },
        options: { sparse: true },
        description: 'Compound index for folder organization'
      },
      {
        fields: { accessType: 1, createdAt: -1 },
        description: 'Index for public flashcard discovery'
      },
      {
        fields: { shareableLink: 1 },
        options: { unique: true, sparse: true },
        description: 'Unique index for shareable links'
      },
      {
        fields: { tags: 1 },
        description: 'Index for tag-based searches'
      },
      {
        fields: { user: 1, nextReview: 1 },
        options: { sparse: true },
        description: 'Compound index for spaced repetition scheduling'
      }
    ]
  },
  {
    model: Activity,
    indexes: [
      {
        fields: { user: 1, createdAt: -1 },
        description: 'Compound index for user activity history'
      },
      {
        fields: { user: 1, type: 1, createdAt: -1 },
        description: 'Compound index for filtering by activity type'
      },
      {
        fields: { user: 1, type: 1, 'meta.summaryId': 1 },
        options: { sparse: true },
        description: 'Compound index for checking existing activities'
      },
      {
        fields: { createdAt: -1 },
        options: { expireAfterSeconds: 7776000 }, // 90 days
        description: 'TTL index to auto-delete old activities'
      }
    ]
  },
  {
    model: Folder,
    indexes: [
      {
        fields: { userId: 1, updatedAt: -1 },
        description: 'Compound index for user folders'
      },
      {
        fields: { userId: 1, name: 1 },
        description: 'Compound index for folder name lookups'
      }
    ]
  },
  {
    model: ChatSession,
    indexes: [
      {
        fields: { userId: 1, updatedAt: -1 },
        description: 'Compound index for user chat sessions'
      },
      {
        fields: { userId: 1, createdAt: -1 },
        description: 'Compound index for recent sessions'
      }
    ]
  },
  {
    model: StudyProgress,
    indexes: [
      {
        fields: { user: 1, flashcard: 1 },
        options: { unique: true },
        description: 'Unique compound index for user flashcard progress'
      },
      {
        fields: { user: 1, updatedAt: -1 },
        description: 'Compound index for recent study activity'
      }
    ]
  }
];

/**
 * Creates all indexes defined above
 */
export async function createIndexes(): Promise<void> {
  console.log('🔍 Starting index creation...');
  
  for (const { model, indexes } of indexDefinitions) {
    const modelName = model.modelName || model.collection?.name || 'Unknown';
    
    for (const { fields, options, description } of indexes) {
      try {
        await model.collection.createIndex(fields, options);
        console.log(`✅ Created index on ${modelName}:`, description);
      } catch (error) {
        console.error(`❌ Failed to create index on ${modelName}:`, description, error);
      }
    }
  }
  
  console.log('✅ Index creation completed');
}

/**
 * Lists all existing indexes for debugging
 */
export async function listIndexes(): Promise<void> {
  console.log('📋 Listing all indexes...\n');
  
  for (const { model } of indexDefinitions) {
    const modelName = model.modelName || model.collection?.name || 'Unknown';
    
    try {
      const indexes = await model.collection.getIndexes();
      console.log(`${modelName} indexes:`);
      console.log(JSON.stringify(indexes, null, 2));
      console.log('');
    } catch (error) {
      console.error(`Failed to list indexes for ${modelName}:`, error);
    }
  }
}

/**
 * Drops all indexes (use with caution!)
 */
export async function dropAllIndexes(): Promise<void> {
  console.log('⚠️  Dropping all indexes...');
  
  for (const { model } of indexDefinitions) {
    const modelName = model.modelName || model.collection?.name || 'Unknown';
    
    try {
      await model.collection.dropIndexes();
      console.log(`✅ Dropped indexes for ${modelName}`);
    } catch (error) {
      console.error(`❌ Failed to drop indexes for ${modelName}:`, error);
    }
  }
  
  console.log('✅ All indexes dropped');
}

export default { createIndexes, listIndexes, dropAllIndexes };
