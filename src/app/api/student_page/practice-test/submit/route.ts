import { NextRequest, NextResponse } from 'next/server';
import { PracticeTestSubmission } from '@/models/practice-test-submission';
import { PracticeTest } from '@/models/practice-test';
import { connectToDatabase } from '@/lib/mongoose';
import { logger } from '@/lib/winston';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      practiceTestId,
      practiceTest,
      answers,
      timeSpent
    } = body;

    if (!userId || !answers) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Calculate score for multiple choice questions
    let pointsEarned = 0;
    const gradedAnswers = answers.map((answer: any, idx: number) => {
      if (answer.questionType === 'multiple-choice') {
        const mcQuestionIndex = answer.questionIndex;
        const mcQuestion = practiceTest.multipleChoiceQuestions[mcQuestionIndex];
        
        if (mcQuestion) {
          const isCorrect = answer.selectedAnswer === mcQuestion.correctAnswer;
          const points = isCorrect ? mcQuestion.points : 0;
          pointsEarned += points;
          
          return {
            ...answer,
            isCorrect,
            pointsEarned: points
          };
        }
      }
      // Written questions are not auto-graded
      return {
        ...answer,
        pointsEarned: 0,
        isCorrect: false
      };
    });

    const totalPoints = practiceTest.totalPoints;
    const score = Math.round((pointsEarned / totalPoints) * 100);
    const isPerfectScore = score === 100;

    // Create submission
    const submission = new PracticeTestSubmission({
      userId,
      practiceTestId: practiceTestId || 'temp',
      answers: gradedAnswers,
      score,
      pointsEarned,
      totalPoints,
      timeSpent,
      isPerfectScore,
      completedAt: new Date()
    });

    await submission.save();

    // Update practice test statistics if it's saved
    if (practiceTestId && practiceTestId !== 'temp') {
      try {
        const existingTest = await PracticeTest.findById(practiceTestId);
        if (existingTest) {
          existingTest.attempts = (existingTest.attempts || 0) + 1;
          
          // Calculate new average score
          if (existingTest.averageScore) {
            existingTest.averageScore = 
              ((existingTest.averageScore * (existingTest.attempts - 1)) + score) / existingTest.attempts;
          } else {
            existingTest.averageScore = score;
          }
          
          await existingTest.save();
        }
      } catch (err) {
        logger.warn('Failed to update test statistics', { error: err });
      }
    }

    logger.info('Test submission recorded', {
      userId,
      submissionId: submission._id,
      score,
      pointsEarned,
      totalPoints
    });

    // Log activity
    await logActivity({
      userId: String(userId),
      type: 'practice_test.submit',
      action: 'completed',
      meta: {
        submissionId: String(submission._id),
        practiceTestId: practiceTestId !== 'temp' ? String(practiceTestId) : undefined,
        score,
        pointsEarned,
        totalPoints,
        isPerfectScore
      },
      progress: 100
    });

    return NextResponse.json({
      success: true,
      submission: {
        _id: submission._id,
        score,
        pointsEarned,
        totalPoints,
        isPerfectScore,
        timeSpent
      }
    });

  } catch (error: any) {
    logger.error('Failed to submit test:', {
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to submit test'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve submission details or list of submissions
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const submissionId = searchParams.get('submissionId');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');

    await connectToDatabase();

    // If submissionId is provided, return single submission
    if (submissionId) {
      const submission = await PracticeTestSubmission.findById(submissionId).lean() as any;

      if (!submission) {
        return NextResponse.json(
          { success: false, error: 'Submission not found' },
          { status: 404 }
        );
      }

      // Verify user owns this submission
      if (userId && submission.userId !== userId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        submission
      });
    }

    // If userId is provided, return list of submissions for that user
    if (userId) {
      const submissions = await PracticeTestSubmission.find({ userId })
        .sort({ completedAt: -1 })
        .limit(limit)
        .lean();

      return NextResponse.json({
        success: true,
        submissions
      });
    }

    return NextResponse.json(
      { success: false, error: 'Either submissionId or userId is required' },
      { status: 400 }
    );

  } catch (error: any) {
    logger.error('Failed to retrieve submission:', {
      error: error.message
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve submission'
      },
      { status: 500 }
    );
  }
}
