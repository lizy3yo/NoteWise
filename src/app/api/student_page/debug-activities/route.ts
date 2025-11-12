import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import Activity from '@/models/activity';

export const dynamic = 'force-dynamic';

/**
 * Diagnostic endpoint to check activities in the database
 * Access via: /api/student_page/debug-activities?userId=YOUR_USER_ID
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        error: 'userId parameter required',
        example: '/api/student_page/debug-activities?userId=YOUR_USER_ID'
      }, { status: 400 });
    }

    // Get all activities for this user
    const userActivities = await Activity.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();

    // Get total activities in database
    const totalActivities = await Activity.countDocuments({});

    // Group by type
    const byType: Record<string, number> = {};
    userActivities.forEach(activity => {
      const type = activity.type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    });

    // Check for yesterday's activities
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const oldActivities = userActivities.filter(a => 
      new Date(a.createdAt) < yesterday
    );

    // Count achievement-relevant activities
    const flashcardSessions = userActivities.filter(a => 
      a.type?.toLowerCase().includes('flashcard.study_complete')
    );
    const summarySessions = userActivities.filter(a => 
      a.type?.toLowerCase().includes('summary.read')
    );
    const practiceTests = userActivities.filter(a => 
      a.type?.toLowerCase().includes('practice_test.submit')
    );

    return NextResponse.json({
      userId,
      totalActivitiesInDatabase: totalActivities,
      userActivities: {
        total: userActivities.length,
        byType,
        oldActivities: oldActivities.length,
        achievementCounts: {
          flashcardSessions: flashcardSessions.length,
          summarySessions: summarySessions.length,
          practiceTests: practiceTests.length
        }
      },
      recentActivities: userActivities.slice(0, 10).map(a => ({
        type: a.type,
        action: a.action,
        createdAt: a.createdAt,
        meta: a.meta
      })),
      oldestActivity: userActivities.length > 0 ? {
        type: userActivities[userActivities.length - 1].type,
        createdAt: userActivities[userActivities.length - 1].createdAt
      } : null
    }, { status: 200 });

  } catch (err: any) {
    console.error('Debug activities error:', err);
    return NextResponse.json({ 
      error: 'Failed to fetch activities',
      message: err.message 
    }, { status: 500 });
  }
}
