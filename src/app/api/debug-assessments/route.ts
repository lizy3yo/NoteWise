import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import Assessment from '@/models/assessment';

/**
 * GET /api/debug-assessments
 * Debug endpoint to check assessments in database
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Get all assessments
    const assessments = await Assessment.find({}).lean();

    return NextResponse.json({
      success: true,
      count: assessments.length,
      assessments: assessments.map((assessment: any) => ({
        id: assessment._id.toString(),
        title: assessment.title,
        classId: assessment.classId,
        teacherId: assessment.teacherId,
        published: assessment.published,
        format: assessment.format,
        category: assessment.category,
        createdAt: assessment.createdAt
      }))
    });

  } catch (error) {
    console.error('Error fetching assessments:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch assessments',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}