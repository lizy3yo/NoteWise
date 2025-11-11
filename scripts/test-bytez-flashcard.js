// Test Bytez integration using the flashcard key from .env
const fs = require('fs');
const path = require('path');

// Load .env manually
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const equalIndex = line.indexOf('=');
    if (equalIndex > 0) {
      const key = line.substring(0, equalIndex).trim();
      let value = line.substring(equalIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

(async () => {
  try {
    const Bytez = require('bytez.js');
    const key = process.env.GOOGLE_AI_API_KEY_FLASHCARD;
    if (!key) {
      console.error('No GOOGLE_AI_API_KEY_FLASHCARD found in .env');
      process.exit(1);
    }

    console.log('Using key preview:', key.substring(0, 10) + '...');

    const sdk = new Bytez(key);
    const model = sdk.model('openai/gpt-4.1');

    console.log('Calling model openai/gpt-4.1 via Bytez...');
    const { error, output } = await model.run([
      { role: 'user', content: 'Return only a JSON object: {"ok": true, "msg": "hello"}' }
    ]);

    console.log('\n--- result ---');
    console.log('error:', error);
    console.log('output preview:', typeof output === 'string' ? output.slice(0, 1000) : JSON.stringify(output).slice(0,1000));
  } catch (err) {
    console.error('Test failed:', err && err.toString ? err.toString() : err);
    if (err?.response) console.error('Response:', err.response);
    process.exit(1);
  }
})();