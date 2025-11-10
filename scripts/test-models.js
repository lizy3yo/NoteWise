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
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
});

const MODELS_TO_TEST = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
  'gemini-2.0-flash-exp',
  'gemini-pro'
];

async function testModel(apiKey, modelName) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const result = await model.generateContent("Say hi");
    const response = await result.response;
    const text = response.text();
    
    console.log(`  ✅ ${modelName}: SUCCESS - "${text}"`);
    return true;
  } catch (error) {
    if (error.message.includes('429') || error.message.includes('quota')) {
      console.log(`  ⚠️  ${modelName}: QUOTA EXCEEDED`);
    } else if (error.message.includes('404') || error.message.includes('not found')) {
      console.log(`  ℹ️  ${modelName}: Model not found/available`);
    } else if (error.message.includes('API_KEY_INVALID')) {
      console.log(`  ❌ ${modelName}: INVALID API KEY`);
    } else {
      console.log(`  ❌ ${modelName}: ${error.message.substring(0, 100)}`);
    }
    return false;
  }
}

async function runTests() {
  const chatbotKey = process.env.GOOGLE_AI_API_KEY_Chatbot;
  
  console.log('\n🔑 Testing Chatbot API Key:', chatbotKey?.substring(0, 20) + '...');
  console.log('\n🧪 Testing different models...\n');
  
  for (const model of MODELS_TO_TEST) {
    await testModel(chatbotKey, model);
  }
  
  console.log('\n✅ Tests completed');
}

runTests().catch(console.error);
