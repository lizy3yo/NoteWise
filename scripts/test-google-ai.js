const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Load .env file manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  line = line.trim();
  if (!line || line.startsWith('#')) return;
  const equalIndex = line.indexOf('=');
  if (equalIndex > 0) {
    const key = line.substring(0, equalIndex).trim();
    let value = line.substring(equalIndex + 1).trim();
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
});

// Test all API keys
const keys = {
  flashcard: process.env.GOOGLE_AI_API_KEY_FLASHCARD,
  summaries: process.env.GOOGLE_AI_API_KEY_Summaries,
  chatbot: process.env.GOOGLE_AI_API_KEY_Chatbot
};

console.log('🔑 API Keys Found:');
Object.entries(keys).forEach(([name, key]) => {
  console.log(`  ${name}: ${key ? key.substring(0, 20) + '...' : 'NOT SET'}`);
});

async function testKey(name, apiKey) {
  if (!apiKey) {
    console.log(`\n❌ ${name}: No API key found`);
    return;
  }

  console.log(`\n🧪 Testing ${name} key...`);
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp"
    });
    
    console.log(`  ✓ Model initialized`);
    
    const result = await model.generateContent("Say hello in 5 words or less");
    const response = await result.response;
    const text = response.text();
    
    console.log(`  ✅ ${name}: SUCCESS`);
    console.log(`  Response: "${text}"`);
    
  } catch (error) {
    console.log(`  ❌ ${name}: FAILED`);
    console.log(`  Error: ${error.message}`);
    console.log(`  Error Type: ${error.constructor.name}`);
    if (error.response) {
      console.log(`  Response Status: ${error.response.status}`);
      console.log(`  Response Data:`, error.response.data);
    }
  }
}

async function runTests() {
  console.log('\n🚀 Starting API Key Tests...\n');
  console.log('='.repeat(60));
  
  for (const [name, key] of Object.entries(keys)) {
    await testKey(name, key);
    console.log('='.repeat(60));
  }
  
  console.log('\n✅ All tests completed');
}

runTests().catch(console.error);
