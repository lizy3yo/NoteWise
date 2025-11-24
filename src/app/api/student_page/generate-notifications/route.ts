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

    const notifications = [];

    // Fetch all activities
    const activities = await Activity.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    // Count different activity types
    const flashcardCreates = activities.filter((a: any) => 
      a.type?.toLowerCase().includes('flashcard.create')
    ).length;
    
    const studySessions = activities.filter((a: any) => 
      a.type?.toLowerCase().includes('flashcard.study_complete')
    ).length;
    
    const summariesRead = activities.filter((a: any) => 
      a.type?.toLowerCase().includes('summary.read')
    ).length;

    // Check for milestone notifications
    const milestones = [
      { count: flashcardCreates, type: 'flashcard_milestone', thresholds: [1, 5, 10, 25, 50, 100], 
        title: (n: number) => `${n} Flashcard ${n === 1 ? 'Set' : 'Sets'} Created! 📚`,
        description: (n: number) => `You've created ${n} flashcard ${n === 1 ? 'set' : 'sets'}. You're building an amazing study library!` },
      
      { count: studySessions, type: 'study_milestone', thresholds: [5, 10, 25, 50, 100], 
        title: (n: number) => `${n} Study ${n === 1 ? 'Session' : 'Sessions'} Complete! 🎯`,
        description: (n: number) => `You've completed ${n} study ${n === 1 ? 'session' : 'sessions'}. Your dedication is paying off!` },
      
      { count: summariesRead, type: 'summary_milestone', thresholds: [5, 10, 25, 50], 
        title: (n: number) => `${n} ${n === 1 ? 'Summary' : 'Summaries'} Read! 📖`,
        description: (n: number) => `You've read ${n} ${n === 1 ? 'summary' : 'summaries'}. Knowledge is power!` }
    ];

    for (const milestone of milestones) {
      for (const threshold of milestone.thresholds) {
        if (milestone.count === threshold) {
          // Check if notification already exists
          const existing = await Activity.findOne({
            user: userId,
            type: `notification.${milestone.type}`,
            'meta.count': threshold,
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          });

          if (!existing) {
            const notification = await Activity.create({
              user: userId,
              type: `notification.${milestone.type}`,
              action: milestone.title(threshold),
              meta: {
                count: threshold,
                title: milestone.title(threshold),
                description: milestone.description(threshold),
                icon: '🎉',
                actionText: 'Keep Going!',
                actionLink: '/student_page/library'
              }
            });
            notifications.push(notification);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      notifications
    });
  } catch (error: any) {
    console.error('Error generating notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate notifications' },
      { status: 500 }
    );
  }
}
