// Simple test for OpenAI gpt-4.1 using your flashcard key
const fs = require('fs');
const path = require('path');

// Load .env manually (keeps script simple and independent)
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
    const OpenAI = require('openai');
    const apiKey = process.env.GOOGLE_AI_API_KEY_FLASHCARD || process.env.OPENAI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      console.error('No API key found in env (GOOGLE_AI_API_KEY_FLASHCARD / OPENAI_API_KEY)');
      process.exit(1);
    }

    console.log('Using API key preview:', apiKey.substring(0, 10) + '...');

    const client = new OpenAI({ apiKey });

    const prompt = 'Return a JSON object with { "test": "hello" } only.';

    console.log('Calling OpenAI Responses API with model gpt-4.1...');

    const res = await client.responses.create({
      model: 'gpt-4.1',
      input: prompt,
      temperature: 0.1,
      max_output_tokens: 300
    });

    // Try to extract text
    let out = '';
    if (res.output_text) out = res.output_text;
    else if (Array.isArray(res.output)) {
      for (const o of res.output) {
        if (o?.content && Array.isArray(o.content)) {
          for (const c of o.content) {
            if (c?.text) out += c.text;
          }
        } else if (typeof o === 'string') out += o;
      }
    } else if (res.choices && Array.isArray(res.choices)) {
      out = res.choices.map(c => c.text || c.message?.content || '').join('\n');
    }

    console.log('\n--- OpenAI Response (raw object preview) ---');
    console.log(JSON.stringify(res, null, 2).slice(0, 2000));
    console.log('\n--- Extracted Text ---');
    console.log(out.trim());
  } catch (err) {
    console.error('Error calling OpenAI:', err && err.toString ? err.toString() : err);
    if (err?.response) console.error('Response data:', err.response.data || err.response);
    process.exit(1);
  }
})();