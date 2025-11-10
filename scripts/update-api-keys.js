const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function updateApiKeys() {
  console.log('\n🔧 NoteWise API Key Update Tool\n');
  console.log('This tool will help you update your Google AI API keys.\n');
  
  console.log('📋 Current API Keys Status:');
  console.log('   GOOGLE_AI_API_KEY_FLASHCARD: INVALID ❌');
  console.log('   GOOGLE_AI_API_KEY_Summaries: INVALID ❌');
  console.log('   GOOGLE_AI_API_KEY_Chatbot: QUOTA EXCEEDED ⚠️\n');
  
  console.log('🌐 Get a new API key at: https://aistudio.google.com/app/apikey\n');
  
  const newKey = await question('Enter your NEW Google AI API key (or "skip" to cancel): ');
  
  if (!newKey || newKey.trim().toLowerCase() === 'skip') {
    console.log('\n❌ Cancelled. No changes made.');
    rl.close();
    return;
  }
  
  const trimmedKey = newKey.trim();
  
  // Validate key format
  if (!trimmedKey.startsWith('AIzaSy') || trimmedKey.length < 35) {
    console.log('\n⚠️  Warning: This doesn\'t look like a valid Google AI API key.');
    console.log('   Valid keys start with "AIzaSy" and are typically 39 characters long.');
    const proceed = await question('   Continue anyway? (yes/no): ');
    if (proceed.toLowerCase() !== 'yes') {
      console.log('\n❌ Cancelled. No changes made.');
      rl.close();
      return;
    }
  }
  
  // Read .env file
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = fs.readFileSync(envPath, 'utf-8');
  
  // Update all Google AI keys
  envContent = envContent
    .replace(/GOOGLE_AI_API_KEY_FLASHCARD=.*/g, `GOOGLE_AI_API_KEY_FLASHCARD=${trimmedKey}`)
    .replace(/GOOGLE_AI_API_KEY_PRACTICE_TEST=.*/g, `GOOGLE_AI_API_KEY_PRACTICE_TEST=${trimmedKey}`)
    .replace(/GOOGLE_AI_API_KEY_Summaries=.*/g, `GOOGLE_AI_API_KEY_Summaries=${trimmedKey}`)
    .replace(/GOOGLE_AI_API_KEY_Chatbot=.*/g, `GOOGLE_AI_API_KEY_Chatbot=${trimmedKey}`);
  
  // Backup old .env
  const backupPath = path.join(__dirname, '..', '.env.backup');
  fs.writeFileSync(backupPath, fs.readFileSync(envPath, 'utf-8'));
  console.log(`\n📦 Backup created: .env.backup`);
  
  // Write new .env
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Updated .env file with new API key\n');
  
  console.log('Updated keys:');
  console.log(`   GOOGLE_AI_API_KEY_FLASHCARD=${trimmedKey.substring(0, 20)}...`);
  console.log(`   GOOGLE_AI_API_KEY_PRACTICE_TEST=${trimmedKey.substring(0, 20)}...`);
  console.log(`   GOOGLE_AI_API_KEY_Summaries=${trimmedKey.substring(0, 20)}...`);
  console.log(`   GOOGLE_AI_API_KEY_Chatbot=${trimmedKey.substring(0, 20)}...`);
  
  console.log('\n🧪 Testing new API key...\n');
  
  rl.close();
  
  // Test the key
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  
  try {
    const genAI = new GoogleGenerativeAI(trimmedKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
    
    console.log('   Sending test request...');
    const result = await model.generateContent("Say hello in 5 words");
    const response = await result.response;
    const text = response.text();
    
    console.log(`   ✅ API KEY WORKS! Response: "${text}"\n`);
    console.log('🎉 Success! Your chatbot should now work.');
    console.log('   Next steps:');
    console.log('   1. Restart your dev server: npm run dev');
    console.log('   2. Test the chatbot in your browser\n');
    
  } catch (error) {
    console.log(`   ❌ API key test failed: ${error.message}\n`);
    console.log('   Please check:');
    console.log('   1. Is the API key correct?');
    console.log('   2. Did you enable the Generative Language API?');
    console.log('   3. Visit: https://aistudio.google.com/app/apikey\n');
  }
}

updateApiKeys().catch(error => {
  console.error('Error:', error);
  rl.close();
});
