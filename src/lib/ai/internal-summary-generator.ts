import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/lib/winston';

export interface InternalSummaryOptions {
  content: string;
  title?: string;
  subject?: string;
  summaryType?: 'brief' | 'detailed' | 'bullet-points' | 'outline';
  maxLength?: number;
}

export interface GeneratedSummary {
  title: string;
  content: string;
  keyPoints: string[];
  mainTopics: string[];
  wordCount: number;
  readingTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  subject: string;
  summaryType: 'brief' | 'detailed' | 'bullet-points' | 'outline';
  tags: string[];
  confidence: number;
}

export interface SummaryGenerationResult {
  summary: GeneratedSummary;
  originalWordCount: number;
  compressionRatio: number;
  processingTime: number;
  qualityScore: number;
}

export class InternalSummaryGenerator {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY_Summaries;
    if (!apiKey) {
      throw new Error('Google AI API key for summaries not configured. Set GOOGLE_AI_API_KEY_Summaries');
    }

    logger.info('InternalSummaryGenerator initialized', {
      hasApiKey: !!apiKey,
      keyPreview: apiKey.substring(0, 10) + '...',
      keyLength: apiKey.length
    });

    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateSummary(options: InternalSummaryOptions): Promise<SummaryGenerationResult> {
    const startTime = Date.now();
    const { content, title, subject, summaryType = 'detailed', maxLength = 300 } = options;

    if (!content || content.trim().length < 100) {
      throw new Error('Content must be at least 100 characters long');
    }

    if (content.length > 100000) {
      throw new Error('Content too long. Please limit to 100,000 characters');
    }

    const model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.2, // Low for consistent, structured output
        topP: 0.9,
        topK: 2000,
        maxOutputTokens: 2000,
      }
    });

    const prompt = this.createPrompt(content, title, subject, summaryType, maxLength);

    try {
      logger.info('Generating summary with internal AI', {
        contentLength: content.length,
        summaryType,
        maxLength,
        subject
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const generatedText = response.text();

      logger.info('AI response received', {
        responseLength: generatedText.length
      });

      // Parse the JSON response
      const parsedResult = this.parseAIResponse(generatedText);

      // Calculate metrics
      const originalWordCount = content.split(/\s+/).length;
      const summaryWordCount = parsedResult.summary.content.split(/\s+/).length;
      const compressionRatio = Math.max(0, Math.round((1 - summaryWordCount / originalWordCount) * 100));
      const processingTime = Date.now() - startTime;

      const finalResult: SummaryGenerationResult = {
        summary: parsedResult.summary,
        originalWordCount,
        compressionRatio,
        processingTime,
        qualityScore: parsedResult.summary.confidence
      };

      // Validate the result
      this.validateResult(finalResult);

      logger.info('Summary generation completed successfully', {
        originalWords: originalWordCount,
        summaryWords: summaryWordCount,
        compressionRatio,
        processingTime,
        qualityScore: finalResult.qualityScore
      });

      return finalResult;

    } catch (error) {
      logger.error('Internal summary generation failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        contentLength: content.length
      });

      // Create fallback summary
      return this.createFallbackResult(content, title, subject, summaryType, maxLength, startTime);
    }
  }

  private createPrompt(
    content: string,
    title?: string,
    subject?: string,
    summaryType?: string,
    maxLength?: number
  ): string {
    return `You are an expert at creating concise, easy-to-understand summaries for students. Your goal is to distill complex content into clear, digestible summaries that capture the main concepts without getting lost in specific details.

INPUT:
- CONTENT: ${content}
- TITLE: ${title || 'Study Material'}
- SUBJECT: ${subject || 'General'}
- SUMMARY TYPE: ${summaryType}
- MAX LENGTH: ${maxLength} words

SUMMARY APPROACH:
Focus on creating a SHORT, CONCISE summary that:
- Explains the main concepts in simple terms
- Avoids excessive detail and specific examples
- Uses clear, straightforward language
- Helps students understand the big picture
- Is easy to read and remember

SUMMARY TYPES:
- brief: Very concise overview (100-200 words) - focus on core concepts only
- detailed: Balanced summary (300-500 words) - main concepts with some context
- bullet-points: Key concepts as clear bullet points
- outline: Main topics with brief explanations

WRITING STYLE:
- Use simple, clear language that students can easily understand
- Focus on WHAT the topic is about, not specific details
- Explain concepts in a way that makes sense to someone learning
- Avoid jargon unless necessary (and explain it if used)
- Make it conversational but informative

EXAMPLE TRANSFORMATION:
Instead of: "The lecture began by differentiating UI and UX. User Experience (UX) encompasses the overall experience a user has with a website or application, focusing on the flow and layout to ensure ease of understanding and navigation..."

Write: "This covers the basics of UI and UX design. UI (User Interface) is about how things look and what users click on. UX (User Experience) is about making websites and apps easy and enjoyable to use..."

JSON SCHEMA:
{
  "summary": {
    "title": "Clear, descriptive title",
    "content": "Concise, easy-to-understand summary focusing on main concepts",
    "keyPoints": ["Simple key point 1", "Simple key point 2", "Simple key point 3", "Simple key point 4", "Simple key point 5"],
    "mainTopics": ["Main Topic 1", "Main Topic 2", "Main Topic 3"],
    "wordCount": ${maxLength},
    "readingTime": 2,
    "difficulty": "easy|medium|hard",
    "subject": "${subject || 'General'}",
    "summaryType": "${summaryType}",
    "tags": ["relevant", "searchable", "tags"],
    "confidence": 0.9
  }
}

QUALITY REQUIREMENTS:
1. Summary must be CONCISE and focused on main concepts
2. Use SIMPLE language that students can easily understand
3. Avoid unnecessary details and specific examples
4. Make it feel like a helpful study guide, not lecture notes
5. Key points should be clear and memorable
6. Focus on understanding, not memorization

Return ONLY the JSON object. No markdown, no code blocks, no additional text.

CRITICAL OUTPUT FORMAT:
- Return ONLY the JSON object
- NO markdown code blocks
- NO \`\`\`json or \`\`\` tags
- NO additional text or explanations
- Start directly with { and end with }`;
  }

  private parseAIResponse(response: string): { summary: GeneratedSummary } {
    try {
      // Clean the response - remove any markdown formatting
      let cleanResponse = response.trim();

      // Remove markdown code blocks if present
      cleanResponse = cleanResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      // Find JSON object boundaries
      const startIndex = cleanResponse.indexOf('{');
      const lastIndex = cleanResponse.lastIndexOf('}');

      if (startIndex === -1 || lastIndex === -1) {
        throw new Error('No valid JSON object found in response');
      }

      const jsonString = cleanResponse.substring(startIndex, lastIndex + 1);
      const parsed = JSON.parse(jsonString);

      // Validate required structure
      if (!parsed.summary) {
        throw new Error('Invalid response structure - missing summary field');
      }

      return parsed as { summary: GeneratedSummary };

    } catch (error) {
      logger.error('Failed to parse AI response:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        responsePreview: response.substring(0, 200)
      });
      throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
  }

  private validateResult(result: SummaryGenerationResult): void {
    if (!result.summary || !result.summary.content) {
      throw new Error('No summary content generated');
    }

    if (result.summary.content.length < 50) {
      throw new Error('Summary too short');
    }

    if (!result.summary.keyPoints || result.summary.keyPoints.length === 0) {
      throw new Error('No key points generated');
    }

    if (!result.summary.mainTopics || result.summary.mainTopics.length === 0) {
      throw new Error('No main topics identified');
    }

    logger.info('Summary validation passed', {
      contentLength: result.summary.content.length,
      keyPointsCount: result.summary.keyPoints.length,
      mainTopicsCount: result.summary.mainTopics.length,
      confidence: result.summary.confidence
    });
  }

  private createFallbackResult(
    content: string,
    title?: string,
    subject?: string,
    summaryType?: string,
    maxLength?: number,
    startTime?: number
  ): SummaryGenerationResult {
    logger.info('Creating fallback summary due to AI failure');

    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const targetSentences = Math.min(Math.max(3, Math.floor((maxLength || 500) / 50)), sentences.length);

    const fallbackContent = sentences.slice(0, targetSentences).join('. ').trim() + '.';
    const wordCount = fallbackContent.split(/\s+/).length;

    const fallbackSummary: GeneratedSummary = {
      title: title || 'Summary',
      content: fallbackContent,
      keyPoints: sentences.slice(0, 5).map(s => s.trim().substring(0, 100)),
      mainTopics: ['General'],
      wordCount,
      readingTime: Math.ceil(wordCount / 250),
      difficulty: 'medium',
      subject: subject || 'General',
      summaryType: (summaryType as any) || 'detailed',
      tags: ['fallback', 'general'],
      confidence: 0.6
    };

    return {
      summary: fallbackSummary,
      originalWordCount: content.split(/\s+/).length,
      compressionRatio: Math.max(0, Math.round((1 - wordCount / content.split(/\s+/).length) * 100)),
      processingTime: startTime ? Date.now() - startTime : 0,
      qualityScore: 0.6
    };
  }
}