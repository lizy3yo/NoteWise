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
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash',
  'gemini-1.5-flash-002',
  'gemini-1.5-pro-002',
  'gemini-2.0-flash-exp',
  'gemini-2.5-pro',
  'gemini-pro'
];

async function testModel(apiKey, modelName) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const result = await model.generateContent("Hi");
    const response = await result.response;
    const text = response.text();
    
    console.log(`  ✅ ${modelName}: SUCCESS - "${text.substring(0, 50)}"`);
    return true;
  } catch (error) {
    if (error.message.includes('429') || error.message.includes('quota')) {
      console.log(`  ⚠️  ${modelName}: QUOTA EXCEEDED`);
    } else if (error.message.includes('503') || error.message.includes('overloaded')) {
      console.log(`  ⚠️  ${modelName}: SERVICE OVERLOADED (try again later)`);
    } else if (error.message.includes('404') || error.message.includes('not found')) {
      console.log(`  ℹ️  ${modelName}: Model not found/available`);
    } else if (error.message.includes('API_KEY_INVALID')) {
      console.log(`  ❌ ${modelName}: INVALID API KEY`);
      return false; // Stop testing if key is invalid
    } else {
      console.log(`  ❌ ${modelName}: ${error.message.substring(0, 80)}`);
    }
    return null; // null = failed but continue testing
  }
}

async function runTests() {
  const chatbotKey = process.env.GOOGLE_AI_API_KEY_Chatbot;
  
  console.log('\n🔑 Testing Chatbot API Key:', chatbotKey?.substring(0, 20) + '...');
  console.log('\n🧪 Testing models to find one that works...\n');
  
  let workingModels = [];
  
  for (const model of MODELS_TO_TEST) {
    const result = await testModel(chatbotKey, model);
    if (result === true) {
      workingModels.push(model);
    } else if (result === false) {
      console.log('\n❌ Invalid API key - stopping tests');
      break;
    }
  }
  
  if (workingModels.length > 0) {
    console.log('\n\n✅ WORKING MODELS FOUND:');
    workingModels.forEach((m, i) => console.log(`   ${i + 1}. ${m}`));
    console.log('\n📝 Recommended priority order for chatbot:');
    console.log(`   Use this in your code: ${JSON.stringify(workingModels, null, 2)}`);
  } else {
    console.log('\n\n❌ NO WORKING MODELS FOUND');
    console.log('   Try again later or use a different API key');
  }
}

runTests().catch(console.error);
