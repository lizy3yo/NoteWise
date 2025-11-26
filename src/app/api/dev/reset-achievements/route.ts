import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import Activity from '@/models/activity';

// DEVELOPMENT ONLY - Remove in production
export async function POST(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

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

    // Delete all achievement notification activities for this user
    const result = await Activity.deleteMany({
      user: userId,
      type: 'notification.achievement'
    });

    console.log(`🗑️ Deleted ${result.deletedCount} achievement notifications for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} achievement notifications`,
      deletedCount: result.deletedCount
    });
  } catch (error: any) {
    console.error('Error resetting achievements:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset achievements' },
      { status: 500 }
    );
  }
}
