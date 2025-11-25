import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import { Summary } from '@/models/summary';
import Activity from '@/models/activity';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { userId, summaryId, title } = body;

    if (!userId || !summaryId) {
      return NextResponse.json(
        { success: false, error: 'userId and summaryId are required' },
        { status: 400 }
      );
    }

    // Update the summary to mark it as read
    const summary = await Summary.findByIdAndUpdate(
      summaryId,
      { isRead: true },
      { new: true }
    );

    if (!summary) {
      return NextResponse.json(
        { success: false, error: 'Summary not found' },
        { status: 404 }
      );
    }

    // Check if activity already exists
    const existingActivity = await Activity.findOne({
      user: userId,
      type: 'summary.read',
      'meta.summaryId': summaryId
    });

    if (existingActivity) {
      return NextResponse.json({
        success: true,
        already: true,
        message: 'Summary was already marked as read'
      });
    }

    // Log activity
    await Activity.create({
      user: userId,
      type: 'summary.read',
      action: 'Read summary',
      meta: {
        summaryId,
        summaryTitle: title || summary.title
      },
      progress: 100
    });

    return NextResponse.json({
      success: true,
      already: false,
      message: 'Summary marked as read'
    });

  } catch (error: any) {
    console.error('Mark read error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to mark summary as read' },
      { status: 500 }
    );
  }
}
