/**
 * Diagnostic script to check activities in the database
 * Run with: node scripts/check-activities.js
 */

const mongoose = require('mongoose');

// Activity Schema (copied from models/activity.ts)
const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    action: { type: String, required: true },
    meta: { type: mongoose.Schema.Types.Mixed },
    progress: { type: Number, min: 0, max: 100 }
  },
  {
    timestamps: true
  }
);

const Activity = mongoose.models.Activity || mongoose.model('Activity', activitySchema);

async function checkActivities() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGO_URI;
    
    if (!MONGODB_URI) {
      console.error('❌ MONGO_URI not found in environment variables');
      console.log('Please set MONGO_URI in your .env.local file');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all activities
    const allActivities = await Activity.find({}).lean();
    console.log(`📊 Total activities in database: ${allActivities.length}\n`);

    if (allActivities.length === 0) {
      console.log('⚠️  No activities found in the database!');
      console.log('This could mean:');
      console.log('  1. No study sessions have been completed yet');
      console.log('  2. Activities were deleted from the database');
      console.log('  3. There is a database connection issue\n');
    } else {
      // Group by type
      const byType = {};
      const byUser = {};
      
      allActivities.forEach(activity => {
        // Count by type
        const type = activity.type || 'unknown';
        byType[type] = (byType[type] || 0) + 1;
        
        // Count by user
        const userId = activity.user?.toString() || 'unknown';
        byUser[userId] = (byUser[userId] || 0) + 1;
      });

      console.log('📈 Activities by type:');
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
      console.log('');

      console.log('👥 Activities by user:');
      Object.entries(byUser).forEach(([userId, count]) => {
        console.log(`   User ${userId}: ${count} activities`);
      });
      console.log('');

      // Show recent activities
      const recent = allActivities
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10);

      console.log('🕐 10 Most recent activities:');
      recent.forEach((activity, i) => {
        const date = new Date(activity.createdAt).toLocaleString();
        console.log(`   ${i + 1}. [${date}] ${activity.type} - ${activity.action}`);
        if (activity.meta) {
          console.log(`      Meta: ${JSON.stringify(activity.meta).substring(0, 100)}`);
        }
      });
      console.log('');

      // Check for study completion activities
      const flashcardSessions = allActivities.filter(a => 
        a.type?.toLowerCase().includes('flashcard.study_complete')
      );
      const summarySessions = allActivities.filter(a => 
        a.type?.toLowerCase().includes('summary.read')
      );
      const practiceTests = allActivities.filter(a => 
        a.type?.toLowerCase().includes('practice_test.submit')
      );

      console.log('🎯 Achievement-relevant activities:');
      console.log(`   Flashcard sessions completed: ${flashcardSessions.length}`);
      console.log(`   Summary sessions completed: ${summarySessions.length}`);
      console.log(`   Practice tests completed: ${practiceTests.length}`);
      console.log('');
    }

    // Check if activities older than yesterday exist
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const oldActivities = await Activity.find({
      createdAt: { $lt: yesterday }
    }).lean();

    console.log(`📅 Activities older than yesterday: ${oldActivities.length}`);
    
    if (oldActivities.length > 0) {
      console.log('✅ Old activities are still in the database (they were NOT deleted)');
    } else {
      console.log('⚠️  No activities older than yesterday found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkActivities();
