import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import Assessment from '@/models/assessment';

/**
 * GET /api/test-assessment
 * Test endpoint to create a sample assessment for testing
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Get URL parameters for customization
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId') || 'test-class-id';
    const teacherId = searchParams.get('teacherId') || 'test-teacher-id';

    // Create a simple test assessment
    const testAssessment = new Assessment({
      title: 'Test Online Assessment',
      description: 'A simple test assessment for debugging',
      type: 'MCQ',
      category: 'Quiz',
      format: 'online',
      questions: [
        {
          id: 'q1',
          type: 'mcq',
          title: 'What is 2 + 2?',
          required: true,
          options: ['3', '4', '5', '6'],
          answer: '4',
          points: 10
        },
        {
          id: 'q2',
          type: 'short',
          title: 'What is the capital of France?',
          required: true,
          answer: 'Paris',
          points: 10
        },
        {
          id: 'q3',
          type: 'checkboxes',
          title: 'Which of the following are programming languages?',
          required: true,
          options: ['JavaScript', 'HTML', 'Python', 'CSS'],
          answer: ['JavaScript', 'Python'],
          points: 15
        }
      ],
      classId: classId,
      teacherId: teacherId,
      timeLimitMins: 30,
      maxAttempts: 3,
      published: true,
      accessCode: 'TEST123',
      totalPoints: 35,
      instructions: 'This is a test assessment. Please answer all questions carefully.',
      settings: {
        showProgress: true,
        allowBacktrack: true,
        autoSubmit: true,
        lockdown: false
      },
      availableFrom: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    });

    const savedAssessment = await testAssessment.save();

    return NextResponse.json({
      success: true,
      message: 'Test assessment created successfully',
      data: {
        assessmentId: savedAssessment._id.toString(),
        classId: savedAssessment.classId,
        teacherId: savedAssessment.teacherId,
        title: savedAssessment.title,
        accessCode: savedAssessment.accessCode,
        published: savedAssessment.published,
        studentUrl: `/student_page/dashboard`, // Classes functionality removed
        teacherUrl: `/teacher_page/class/${classId}/assessments/quiz/${savedAssessment._id.toString()}`
      }
    });

  } catch (error) {
    console.error('Error creating test assessment:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create test assessment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/test-assessment
 * Clean up test assessments
 */
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();

    // Delete all test assessments
    const result = await Assessment.deleteMany({
      title: { $regex: /test/i }
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} test assessments`
    });

  } catch (error) {
    console.error('Error deleting test assessments:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete test assessments',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}