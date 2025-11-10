import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/lib/winston';
import { ChatbotContextService, UserContext } from './chatbot-context-service';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export interface ChatbotOptions {
    isAuthenticated: boolean;
    userId?: string;
    conversationHistory?: ChatMessage[];
    uploadedContent?: string;
    uploadedFileName?: string;
}

export interface ChatbotResponse {
    message: string;
    context: 'landing' | 'authenticated';
    suggestions?: string[];
}

export class ChatbotService {
    private genAI: GoogleGenerativeAI;
    private currentModel: string;

    constructor() {
        // Priority order: Use dedicated chatbot key first, then fallback to shared keys
        const apiKey = process.env.GOOGLE_AI_API_KEY_Chatbot
            || process.env.GOOGLE_AI_API_KEY_FLASHCARD
            || process.env.GOOGLE_AI_API_KEY_Summaries;

        if (!apiKey) {
            logger.error('Google AI API key for chatbot not configured');
            throw new Error('Chatbot service is not properly configured. Please contact support.');
        }

        logger.info('ChatbotService initialized', {
            hasApiKey: !!apiKey,
            keyLength: apiKey.length,
            keyPreview: apiKey.substring(0, 20) + '...'
        });

        try {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.currentModel = "gemini-2.5-pro"; // Only working model with current key
        } catch (error) {
            logger.error('Failed to initialize Google AI:', error);
            throw new Error('Failed to initialize chatbot service');
        }
    }

    async chat(userMessage: string, options: ChatbotOptions): Promise<ChatbotResponse> {
        const { isAuthenticated, userId, conversationHistory = [], uploadedContent, uploadedFileName } = options;

        try {
            logger.info('Processing chat message', {
                isAuthenticated,
                hasUserId: !!userId,
                messageLength: userMessage.length,
                hasUploadedContent: !!uploadedContent
            });

            // Build context
            let systemContext = '';
            let userContextData: UserContext | null = null;

            if (isAuthenticated && userId) {
                // Authenticated user - get full context
                systemContext = ChatbotContextService.getSystemFeaturesContext();

                try {
                    userContextData = await ChatbotContextService.getUserContext(userId);
                    systemContext += '\n\n' + ChatbotContextService.formatUserContextForAI(userContextData);
                } catch (contextError) {
                    logger.warn('Failed to get user context, continuing without it:', contextError);
                    // Continue without user context - chatbot will still work
                }
            } else {
                // Landing page - only system info
                systemContext = ChatbotContextService.getLandingPageContext();
            }

            // Add uploaded content if present
            if (uploadedContent && uploadedFileName) {
                systemContext += `\n\n# Uploaded File Context:\nFile: ${uploadedFileName}\nContent:\n${uploadedContent.substring(0, 5000)}`;
            }

            // Create prompt
            const prompt = this.createPrompt(systemContext, userMessage, conversationHistory, isAuthenticated);

            // Try multiple models with fallback support
            // Based on testing: only gemini-2.5-pro works with current API key
            const modelsToTry = [
                "gemini-2.5-pro",           // Only working model currently
            ];

            console.log('🎯 Attempting to generate response with gemini-2.5-pro...');

            let result;
            let lastError;
            
            for (const modelName of modelsToTry) {
                try {
                    console.log(`🔄 Trying model: ${modelName}`);
                    
                    const model = this.genAI.getGenerativeModel({
                        model: modelName,
                        generationConfig: {
                            temperature: 0.7,
                            topP: 0.9,
                            topK: 40,
                            maxOutputTokens: 1000,
                        }
                    });

                    result = await model.generateContent(prompt);
                    console.log(`✅ Success with model: ${modelName}`);
                    this.currentModel = modelName; // Remember working model
                    break; // Success! Exit loop
                    
                } catch (error: any) {
                    lastError = error;
                    console.log(`❌ Failed with ${modelName}:`, error.message.substring(0, 100));
                    
                    // If quota exceeded or rate limited, try next model
                    if (error.message.includes('429') || error.message.includes('quota')) {
                        console.log(`  ⚠️  Quota/rate limit, trying next model...`);
                        continue;
                    }
                    
                    // If model not found, try next
                    if (error.message.includes('404') || error.message.includes('not found')) {
                        console.log(`  ℹ️  Model not available, trying next...`);
                        continue;
                    }
                    
                    // If model overloaded, try next
                    if (error.message.includes('503') || error.message.includes('overloaded')) {
                        console.log(`  ⚠️  Service overloaded, trying next...`);
                        continue;
                    }
                    
                    // If invalid API key, no point trying other models
                    if (error.message.includes('API_KEY_INVALID') || error.message.includes('API key not found')) {
                        throw new Error('Invalid API key. Please update your GOOGLE_AI_API_KEY_Chatbot in .env file.');
                    }
                }
            }
            
            if (!result) {
                // All models failed
                console.error('❌ All models failed. Last error:', lastError?.message?.substring(0, 200));
                
                if (lastError?.message?.includes('429') || lastError?.message?.includes('quota')) {
                    throw new Error('AI service is currently rate-limited. Please try again in a few minutes.');
                }
                
                if (lastError?.message?.includes('503') || lastError?.message?.includes('overloaded')) {
                    throw new Error('AI service is temporarily overloaded. Please try again in a moment.');
                }
                
                if (lastError?.message?.includes('404') || lastError?.message?.includes('not found')) {
                    throw new Error('The AI model is not available. Please contact support to update the configuration.');
                }
                
                throw lastError || new Error('Failed to generate response. Please try again.');
            }

            const response = await result.response;
            const responseText = response.text();

            logger.info('Chatbot response generated', {
                responseLength: responseText.length
            });

            // Generate suggestions based on context
            const suggestions = this.generateSuggestions(userMessage, isAuthenticated, userContextData);

            return {
                message: responseText,
                context: isAuthenticated ? 'authenticated' : 'landing',
                suggestions
            };

        } catch (error) {
            logger.error('Chatbot error:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                errorType: error?.constructor?.name,
                fullError: JSON.stringify(error, null, 2),
                isAuthenticated,
                userId
            });

            // Provide more specific error messages
            if (error instanceof Error) {
                if (error.message.includes('API key') || error.message.includes('API_KEY')) {
                    throw new Error('Chatbot service configuration error. Please contact support.');
                }
                if (error.message.includes('quota') || error.message.includes('rate limit') || error.message.includes('429')) {
                    throw new Error('Service is temporarily busy. Please try again in a moment.');
                }
                if (error.message.includes('PERMISSION_DENIED') || error.message.includes('403')) {
                    throw new Error('API key does not have permission. Please check your Google AI API key configuration.');
                }
                if (error.message.includes('INVALID_ARGUMENT') || error.message.includes('400')) {
                    throw new Error('Invalid request to AI service. Please try a different message.');
                }

                throw error; // Pass through the original error
            }

            throw new Error('Failed to generate response. Please try again.');
        }
    }

    private createPrompt(
        systemContext: string,
        userMessage: string,
        conversationHistory: ChatMessage[],
        isAuthenticated: boolean
    ): string {
        const conversationHistoryText = conversationHistory
            .slice(-5) // Last 5 messages
            .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n');

        return `You are NoteWise AI Assistant, a helpful and friendly chatbot for the NoteWise study platform.

${systemContext}

# Your Role:
${isAuthenticated ? `
- Help users understand how to use NoteWise features
- Answer questions about their achievements, history, and progress
- Guide them on generating flashcards, summaries, and practice tests
- Provide study tips and recommendations
- Help with file uploads and content generation
` : `
- Explain what NoteWise is and how it works
- Describe the features and benefits
- Answer questions about the platform
- Encourage users to sign up
- Be enthusiastic about the platform's capabilities
`}

# Conversation Style:
- Be friendly, helpful, and conversational
- Keep responses concise (2-4 paragraphs max)
- Use simple language that students understand
- Be encouraging and supportive
- If asked about features not mentioned in the context, politely say you don't have that information
- For personal data questions (achievements, history), use the provided user context

${conversationHistoryText ? `# Recent Conversation:\n${conversationHistoryText}\n` : ''}

# User Question:
${userMessage}

# Your Response:
Provide a helpful, friendly response based on the context above. Keep it concise and actionable.`;
    }

    private generateSuggestions(
        userMessage: string,
        isAuthenticated: boolean,
        userContext: UserContext | null
    ): string[] {
        if (!isAuthenticated) {
            return [
                "What features does NoteWise offer?",
                "How does the AI summarization work?",
                "Who is NoteWise for?",
                "How do I get started?"
            ];
        }

        // Authenticated suggestions based on context
        const suggestions: string[] = [];

        if (userContext) {
            if (userContext.achievements.totalFlashcards === 0) {
                suggestions.push("How do I create my first flashcard set?");
            }
            if (userContext.achievements.totalSummaries === 0) {
                suggestions.push("How do I generate a summary?");
            }
            if (userContext.achievements.totalPracticeTests === 0) {
                suggestions.push("How do I create a practice test?");
            }
            suggestions.push("What are my recent achievements?");
            suggestions.push("Show me my study history");
        }

        // Default suggestions
        if (suggestions.length < 4) {
            suggestions.push(
                "How do I upload a file?",
                "Can I generate flashcards from a PDF?",
                "What file formats are supported?",
                "How do I organize my study materials?"
            );
        }

        return suggestions.slice(0, 4);
    }
}