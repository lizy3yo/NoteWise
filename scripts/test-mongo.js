const mongoose = require('mongoose');

// Read MONGO_URI directly from environment or use the one from your .env file
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://dejesuskharl32_db_user:fFIvbnVuSaaYWbmK@notewise.gxq85ej.mongodb.net/';

const clientOptions = {
  dbName: 'notewise-db',
  appName: 'NoteWise',
  serverApi: {
    version: '1',
    strict: true,
    deprecationErrors: true,
  },
};

async function testMongoConnection() {
  console.log('🔍 Testing MongoDB connection with Mongoose...');
  console.log('📍 URI:', MONGO_URI ? MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') : 'Not found');
  
  if (!MONGO_URI) {
    console.error('❌ MONGO_URI not found in environment variables');
    process.exit(1);
  }

  try {
    // Connect to MongoDB using Mongoose
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, clientOptions);
    
    console.log('✅ Successfully connected to MongoDB!');
    
    // Get connection info
    const connectionState = mongoose.connection.readyState;
    const connectionStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    console.log('📊 Connection Info:');
    console.log(`   State: ${connectionStates[connectionState]}`);
    console.log(`   Database: ${mongoose.connection.db.databaseName}`);
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   Port: ${mongoose.connection.port}`);
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`   Collections: ${collections.length}`);
    
    if (collections.length > 0) {
      console.log('   Collection names:');
      collections.forEach(col => {
        console.log(`     - ${col.name}`);
      });
    } else {
      console.log('   No collections found (this is normal for a new database)');
    }
    
    // Test write operation with a simple schema
    console.log('✍️  Testing write operation...');
    
    const TestSchema = new mongoose.Schema({
      message: String,
      timestamp: Date,
      app: String
    });
    
    const TestModel = mongoose.model('ConnectionTest', TestSchema);
    
    const testDoc = new TestModel({
      message: 'Connection test successful',
      timestamp: new Date(),
      app: 'NoteWise'
    });
    
    const savedDoc = await testDoc.save();
    console.log('✅ Write test successful, document ID:', savedDoc._id);
    
    // Clean up test document
    await TestModel.deleteOne({ _id: savedDoc._id });
    console.log('🧹 Cleaned up test document');
    
    console.log('🎉 All tests passed! Your MongoDB connection is working perfectly.');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error('   Error:', error.message);
    
    if (error.message.includes('authentication') || error.message.includes('auth')) {
      console.error('   💡 This looks like an authentication error. Please check:');
      console.error('      - Username and password are correct');
      console.error('      - User has proper permissions');
      console.error('      - IP address is whitelisted in MongoDB Atlas');
    } else if (error.message.includes('network') || error.message.includes('timeout')) {
      console.error('   💡 This looks like a network error. Please check:');
      console.error('      - Internet connection is stable');
      console.error('      - MongoDB cluster is running');
      console.error('      - Firewall settings allow MongoDB connections');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('   💡 DNS resolution failed. Please check:');
      console.error('      - Internet connection is working');
      console.error('      - MongoDB cluster hostname is correct');
    }
    
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Connection closed');
  }
}

// Run the test
testMongoConnection().catch(console.error);