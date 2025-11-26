/**
 * Script to verify all existing users in the database
 * Run this once to set isEmailVerified: true for all existing users
 * 
 * Usage: node scripts/verify-existing-users.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Hardcode MongoDB URI for this script
const MONGODB_URI = 'mongodb+srv://dejesuskharl32_db_user:fFIvbnVuSaaYWbmK@notewise.hnpwola.mongodb.net/notewise?retryWrites=true&w=majority&appName=notewise';

if (!MONGODB_URI) {
  console.error('❌ MONGO_URI not found in environment variables');
  process.exit(1);
}

// User schema (minimal version)
const userSchema = new mongoose.Schema({
  email: String,
  isEmailVerified: Boolean,
  emailVerificationToken: String,
  emailVerificationExpires: Date,
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

async function verifyExistingUsers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all users where isEmailVerified is false or undefined
    const unverifiedUsers = await User.find({
      $or: [
        { isEmailVerified: false },
        { isEmailVerified: { $exists: false } },
        { isEmailVerified: null }
      ]
    });

    console.log(`📊 Found ${unverifiedUsers.length} unverified users\n`);

    if (unverifiedUsers.length === 0) {
      console.log('✅ All users are already verified!');
      return;
    }

    // Ask for confirmation
    console.log('Users to be verified:');
    unverifiedUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email}`);
    });

    console.log('\n⚠️  This will set isEmailVerified: true for all these users');
    console.log('⚠️  Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Update all unverified users
    const result = await User.updateMany(
      {
        $or: [
          { isEmailVerified: false },
          { isEmailVerified: { $exists: false } },
          { isEmailVerified: null }
        ]
      },
      {
        $set: {
          isEmailVerified: true,
          emailVerificationToken: undefined,
          emailVerificationExpires: undefined
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} users`);
    console.log('✅ All existing users are now verified!\n');

    // Verify the update
    const stillUnverified = await User.countDocuments({
      $or: [
        { isEmailVerified: false },
        { isEmailVerified: { $exists: false } },
        { isEmailVerified: null }
      ]
    });

    if (stillUnverified === 0) {
      console.log('✅ Verification successful - no unverified users remaining');
    } else {
      console.log(`⚠️  Warning: ${stillUnverified} users still unverified`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

verifyExistingUsers();
