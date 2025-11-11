// Simple test: call Bytez openai/gpt-4.1 with a flashcard prompt and print raw output
const fs = require('fs');
const path = require('path');

// Load .env
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
      console.error('No GOOGLE_AI_API_KEY_FLASHCARD in .env');
      process.exit(1);
    }

    const sdk = new Bytez(key);
    const model = sdk.model('openai/gpt-4.1');

    const sampleContent = 'Photosynthesis is the process by which plants convert sunlight into chemical energy. Chlorophyll absorbs light energy while stomata regulate gas exchange. This process produces oxygen and glucose.';
    
    const prompt = `You are an expert flashcard creator. Create 3 flashcards from this content in valid JSON format.

Content: ${sampleContent}

Return ONLY a JSON object with this structure (no markdown, no code blocks):
{
  "analysis": {
    "contentType": "text",
    "subject": "Biology",
    "difficulty": "medium",
    "keyTopics": ["photosynthesis"],
    "optimalCardCount": 3,
    "strategy": "concept"
  },
  "flashcards": [
    {
      "question": "What is photosynthesis?",
      "answer": "Process converting sunlight to energy in plants.",
      "difficulty": "easy",
      "topic": "Photosynthesis",
      "type": "concept",
      "tags": ["biology", "plants"],
      "confidence": 0.9,
      "reasoning": "Core concept",
      "example": "Green leaves in sunlight",
      "commonMistake": "Confusing with respiration",
      "reviewInterval": 3
    }
  ],
  "qualityMetrics": {
    "overallScore": 0.85,
    "avgConfidence": 0.85,
    "topicCoverage": 1.0,
    "difficultyDistribution": {"easy": 1, "medium": 1, "hard": 1},
    "questionTypes": {"concept": 3, "application": 0, "comparison": 0, "process": 0}
  },
  "summary": {
    "cardsGenerated": 3,
    "mainTopics": ["photosynthesis"],
    "learningObjectives": ["Understand photosynthesis"],
    "recommendedUse": "Review basic concepts"
  }
}`;

    console.log('Calling openai/gpt-4.1 via Bytez...\n');
    
    const result = await model.run([{ role: 'user', content: prompt }]);

    console.log('=== RAW RESULT ===');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n=== OUTPUT EXTRACTION ===');
    const output = result.output;
    console.log('Type of output:', typeof output);
    console.log('Is array:', Array.isArray(output));
    
    if (output && typeof output === 'object' && !Array.isArray(output)) {
      console.log('Output keys:', Object.keys(output));
      if (output.role) console.log('  role:', output.role);
      if (output.content) console.log('  content preview:', (output.content || '').substring(0, 500));
    }
    
    // Try to extract text
    let text = '';
    if (!output) text = '';
    else if (typeof output === 'string') text = output;
    else if (typeof output === 'object' && typeof output.content === 'string') text = output.content;
    else if (Array.isArray(output)) {
      for (const item of output) {
        if (typeof item === 'string') text += item;
        else if (item && typeof item.content === 'string') text += item.content;
      }
    }
    
    console.log('\n=== EXTRACTED TEXT ===');
    console.log(text.substring(0, 2000));
    
    // Try parsing
    const clean = text.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start >= 0 && end >= 0) {
      const jsonStr = clean.substring(start, end + 1);
      try {
        const parsed = JSON.parse(jsonStr);
        console.log('\n=== PARSED JSON ===');
        console.log('Keys:', Object.keys(parsed));
        if (parsed.flashcards) console.log('Flashcards count:', parsed.flashcards.length);
      } catch (e) {
        console.log('\n=== PARSE ERROR ===');
        console.log(e.message);
        console.log('JSON snippet:', jsonStr.substring(0, 500));
      }
    } else {
      console.log('\nNo JSON object found in text');
    }
    
  } catch (err) {
    console.error('Error:', err.toString());
    if (err.response) console.error('Response:', err.response);
    process.exit(1);
  }
})();
