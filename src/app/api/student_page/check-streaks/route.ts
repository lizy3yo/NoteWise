import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import Activity from '@/models/activity';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await req.json();
    const userId = body.userId;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch all study activities
    const activities = await Activity.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(365)
      .lean();

    // Calculate study streak
    const studyDates = new Set<string>();
    activities.forEach((a: any) => {
      const type = (a.type || '').toString().toLowerCase();
      if (type.includes('flashcard.study_complete') || 
          type.includes('summary.read') || 
          type.includes('practice_test.submit')) {
        const date = new Date(a.createdAt);
        date.setHours(0, 0, 0, 0);
        studyDates.add(date.toISOString());
      }
    });

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const key = checkDate.toISOString();
      
      if (studyDates.has(key)) {
        streak++;
      } else {
        if (i === 0) continue;
        break;
      }
    }

    // Check if we should create a streak notification
    const milestones = [3, 7, 14, 30, 60, 100];
    const shouldNotify = milestones.includes(streak);

    if (shouldNotify) {
      // Check if we already created this notification
      const existingNotification = await Activity.findOne({
        user: userId,
        type: 'notification.streak',
        'meta.streakDays': streak,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      if (!existingNotification) {
        // Create streak notification
        const notification = await Activity.create({
          user: userId,
          type: 'notification.streak',
          action: `${streak}-Day Study Streak!`,
          meta: {
            streakDays: streak,
            title: `${streak}-Day Study Streak! 🔥`,
            description: `You are on a ${streak}-day Study Streak. Keep the good work up!`,
            icon: '🔥',
            actionText: "Let's Go!",
            actionLink: '/student_page/library'
          }
        });

        return NextResponse.json({
          success: true,
          streak,
          notification
        });
      }
    }

    return NextResponse.json({
      success: true,
      streak,
      notification: null
    });
  } catch (error: any) {
    console.error('Error checking streaks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check streaks' },
      { status: 500 }
    );
  }
}
