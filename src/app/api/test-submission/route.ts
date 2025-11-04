import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import Assessment from '@/models/assessment';
import Submission from '@/models/submission';

/**
 * POST /api/test-submission
 * Test endpoint to create a sample submission
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { assessmentId, classId, studentId } = await request.json();

    if (!assessmentId || !classId || !studentId) {
      return NextResponse.json({
        error: 'Missing required fields: assessmentId, classId, studentId'
      }, { status: 400 });
    }

    // Find the assessment
    const assessment = await Assessment.findById(assessmentId).lean() as any;
    
    if (!assessment) {
      return NextResponse.json({
        error: 'Assessment not found'
      }, { status: 404 });
    }

    // Create a test submission
    const testSubmission = new Submission({
      assessmentId: assessmentId,
      studentId: studentId,
      classId: classId,
      type: 'quiz_submission',
      answers: [
        {
          questionId: 'test-q1',
          answer: 'Test answer'
        }
      ],
      gradedAnswers: [
        {
          questionId: 'test-q1',
          studentAnswer: 'Test answer',
          correctAnswer: 'Test answer',
          isCorrect: true,
          points: 10,
          maxPoints: 10,
          needsManualGrading: false
        }
      ],
      score: 100,
      maxScore: 100,
      submittedAt: new Date(),
      timeSpent: 5,
      status: 'submitted',
      needsManualGrading: false,
      attemptNumber: 1
    });

    await testSubmission.save();

    return NextResponse.json({
      success: true,
      message: 'Test submission created successfully',
      data: {
        submissionId: testSubmission._id.toString(),
        assessmentId: assessment._id.toString(),
        score: testSubmission.score
      }
    });

  } catch (error) {
    console.error('Error creating test submission:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create test submission',
        details: error instanceof Error ? error.message : 'Unknown error',
        debug: {
          errorName: error instanceof Error ? error.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/test-submission
 * Get all submissions for debugging
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const submissions = await Submission.find({}).lean();

    return NextResponse.json({
      success: true,
      count: submissions.length,
      submissions: submissions.map((sub: any) => ({
        id: sub._id.toString(),
        assessmentId: sub.assessmentId,
        studentId: sub.studentId,
        classId: sub.classId,
        type: sub.type,
        score: sub.score,
        status: sub.status,
        submittedAt: sub.submittedAt,
        answersCount: sub.answers?.length || 0,
        gradedAnswersCount: sub.gradedAnswers?.length || 0
      }))
    });

  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch submissions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}