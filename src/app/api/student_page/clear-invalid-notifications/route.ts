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

    // Delete all "Active Week" achievement notifications
    // These were created incorrectly before the fix
    const result = await Activity.deleteMany({
      user: userId,
      $and: [
        {
          $or: [
            { type: 'notification.achievement' },
            { type: 'achievement.unlock' }
          ]
        },
        {
          $or: [
            { 'meta.achievement': 'Active Week' },
            { 'meta.title': { $regex: 'Active Week', $options: 'i' } },
            { action: { $regex: 'Active Week', $options: 'i' } }
          ]
        }
      ]
    });

    console.log('🗑️ Deleted invalid notifications:', result.deletedCount);

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount
    });
  } catch (error: any) {
    console.error('Error clearing notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clear notifications' },
      { status: 500 }
    );
  }
}
