import { NextRequest, NextResponse } from 'next/server';
import { InternalAgentService } from '@/lib/services/internal-agent-service';
import { logger } from '@/lib/winston';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      content = "Project management is the application of knowledge, skills, tools, and techniques to project activities to meet project requirements. It involves initiating, planning, executing, monitoring, and closing projects. Key methodologies include Agile, Waterfall, and Scrum approaches.",
      userId = "test_user_123",
      agentMode = "enhanced"
    } = body;

    logger.info('Testing Internal AI Agent with sample content', {
      contentLength: content.length,
      userId,
      agentMode
    });

    // Test the full agent workflow
    const agentResponse = await InternalAgentService.runFullAgentWorkflow({
      content,
      contentType: 'text',
      title: 'Test Agent Flashcards',
      difficulty: 'medium',
      subject: 'Project Management',
      aiProvider: 'gemini',
      userId,
      maxCards: 8,
      agentMode: agentMode as 'standard' | 'enhanced' | 'expert'
    });

    if (agentResponse.success) {
      return NextResponse.json({
        success: true,
        message: 'Internal AI Agent test completed successfully',
        agentId: agentResponse.agentId,
        status: agentResponse.status,
        result: agentResponse.result,
        testData: {
          contentLength: content.length,
          agentMode,
          maxCards: agentResponse.result?.flashcards.length || 0,
          qualityScore: agentResponse.result?.qualityMetrics.overallScore || 0
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: agentResponse.error,
        message: 'Internal AI Agent test failed'
      }, { status: 500 });
    }

  } catch (error) {
    logger.error('Agent test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to test Internal AI Agent'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (agentId) {
      // Check specific agent status
      const status = await InternalAgentService.checkAgentStatus(agentId);
      return NextResponse.json(status);
    }

    // Return test information
    return NextResponse.json({
      success: true,
      message: 'Internal AI Agent Test Endpoint',
      endpoints: {
        test: 'POST /api/test-agent - Test agent with sample content',
        status: 'GET /api/test-agent?agentId=xxx - Check agent status'
      },
      sampleRequest: {
        content: 'Your educational content here...',
        userId: 'user_id',
        agentMode: 'enhanced'
      },
      agentModes: {
        standard: 'Basic flashcard generation (max 8 cards)',
        enhanced: 'Enhanced generation with quality checks (max 15 cards)',
        expert: 'Comprehensive analysis and generation (max 25 cards)'
      }
    });

  } catch (error) {
    logger.error('Agent test GET failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}