import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import Activity from '@/models/activity';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // Get user from request body
    const body = await req.json();
    const userId = body.userId;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { achievementTitle, achievementDescription, achievementIcon } = body;

    if (!achievementTitle) {
      return NextResponse.json(
        { error: 'Achievement title is required' },
        { status: 400 }
      );
    }

    // Check if this exact achievement was already logged (ever) to prevent duplicates
    // Note: We check for any existing log, not just recent ones, because achievements
    // should only be earned once per user
    const existingActivity = await Activity.findOne({
      user: userId,
      type: 'notification.achievement',
      'meta.achievement': achievementTitle
    }).lean();

    if (existingActivity) {
      console.log('⏭️ Achievement already logged:', achievementTitle);
      return NextResponse.json({
        success: true,
        message: 'Achievement already logged',
        activity: existingActivity,
        alreadyExists: true
      });
    }

    // Create activity log for achievement unlock as a notification card
    const activity = await Activity.create({
      user: userId,
      type: 'notification.achievement',
      action: `Achievement Unlocked: ${achievementTitle}`,
      meta: {
        title: `${achievementIcon || '🏆'} Achievement Unlocked: ${achievementTitle}`,
        description: achievementDescription || 'Congratulations on your achievement!',
        achievement: achievementTitle,
        icon: achievementIcon,
        actionText: 'View Achievements',
        actionLink: '/student_page/achievements',
        timestamp: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      activity
    });
  } catch (error: any) {
    console.error('Error logging achievement:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to log achievement' },
      { status: 500 }
    );
  }
}
