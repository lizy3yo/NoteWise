import { NextRequest, NextResponse } from 'next/server';
import { ChatbotService, ChatMessage } from '@/lib/ai/chatbot-service';
import { logger } from '@/lib/winston';
import { connectToDatabase } from '@/lib/mongoose';
import { authenticate } from '@/lib/middleware/authenticate';

export async function POST(req: NextRequest) {
  // Declare variables outside try block so they're accessible in catch
  let userId: string | undefined;
  let isAuthenticated = false;

  try {
    await connectToDatabase();

    // Try to authenticate, but don't fail if not authenticated (chatbot works for both)
    const authResult = await authenticate(req);
    if (!(authResult instanceof Response)) {
      // User is authenticated
      userId = authResult.userId.toString();
      isAuthenticated = true;
    }
    // If authResult is a Response, user is not authenticated - that's okay for chatbot

    const body = await req.json();
    const { message, conversationHistory, uploadedContent, uploadedFileName } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    logger.info('Chatbot request received', {
      isAuthenticated,
      userId,
      messageLength: message.length,
      hasUploadedContent: !!uploadedContent
    });

    const chatbot = new ChatbotService();

    const response = await chatbot.chat(message, {
      isAuthenticated,
      userId,
      conversationHistory: conversationHistory as ChatMessage[],
      uploadedContent,
      uploadedFileName
    });

    return NextResponse.json(response);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Chatbot API error:', {
      error: errorMessage,
      stack: errorStack,
      isAuthenticated,
      userId
    });

    return NextResponse.json(
      {
        error: 'Failed to process chat message',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
