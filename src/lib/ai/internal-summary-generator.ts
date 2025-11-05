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
    const { content, title, subject, summaryType = 'detailed', maxLength = 500 } = options;

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
    return `You are an expert academic summarizer specializing in creating high-quality, comprehensive summaries. Analyze the content and generate a well-structured summary with supporting metadata.

INPUT:
- CONTENT: ${content}
- TITLE: ${title || 'Study Material'}
- SUBJECT: ${subject || 'General'}
- SUMMARY TYPE: ${summaryType}
- MAX LENGTH: ${maxLength} words

SUMMARY TYPES:
- brief: Concise overview (100-200 words)
- detailed: Comprehensive summary (300-600 words)
- bullet-points: Key points in bullet format
- outline: Hierarchical structure with main topics and subtopics

PROCESS:
1. CONTENT ANALYSIS
   - Identify main themes, concepts, and arguments
   - Determine subject area and difficulty level
   - Extract key terminology and important details

2. SUMMARY GENERATION
   - Create summary matching the requested type and length
   - Maintain academic tone and clarity
   - Preserve essential information and context
   - Include relevant examples where appropriate

3. METADATA EXTRACTION
   - Generate key points (5-8 main takeaways)
   - Identify main topics covered
   - Determine appropriate tags
   - Assess difficulty and confidence levels

OUTPUT REQUIREMENTS:
- Return ONLY a JSON object
- Summary should be well-structured and academically sound
- Key points should be actionable and specific
- Tags should be relevant and searchable

JSON SCHEMA:
{
  "summary": {
    "title": "Auto-generated or provided title",
    "content": "The main summary content matching the requested type and length",
    "keyPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4", "Key point 5"],
    "mainTopics": ["Topic 1", "Topic 2", "Topic 3"],
    "wordCount": ${maxLength},
    "readingTime": 3,
    "difficulty": "easy|medium|hard",
    "subject": "${subject || 'General'}",
    "summaryType": "${summaryType}",
    "tags": ["tag1", "tag2", "tag3", "tag4"],
    "confidence": 0.9
  }
}

QUALITY REQUIREMENTS:
1. Summary must be coherent and well-structured
2. Key points must be specific and actionable
3. Main topics should cover the breadth of content
4. Word count should be close to target (±10%)
5. Reading time should be realistic (250 words per minute)
6. Confidence should reflect summary quality (0.7-1.0)
7. Tags should be relevant and searchable

FORMATTING RULES:
- Use clear, academic language
- Maintain logical flow and structure
- Include transitions between ideas
- Preserve important terminology
- Ensure summary stands alone without original content

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