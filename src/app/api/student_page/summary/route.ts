import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import { Summary } from '@/models/summary';
import { logger } from '@/lib/winston';

// GET - Fetch summaries for a user
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const subject = searchParams.get('subject');
    const isPublic = searchParams.get('isPublic');
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID is required' 
      }, { status: 400 });
    }

    // Build query
    const query: any = { userId };
    
    if (subject && subject !== 'all') {
      query.subject = subject;
    }
    
    if (isPublic !== null) {
      query.isPublic = isPublic === 'true';
    }

    const summaries = await Summary.find(query)
      .sort({ updatedAt: -1 })
      .lean();

    logger.info('Summaries fetched successfully', {
      userId,
      count: summaries.length,
      subject,
      isPublic
    });

    return NextResponse.json({
      success: true,
      summaries
    });

  } catch (error) {
    logger.error('Failed to fetch summaries:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch summaries'
    }, { status: 500 });
  }
}

// DELETE - Delete a summary
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const summaryId = searchParams.get('summaryId');
    
    if (!userId || !summaryId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID and Summary ID are required' 
      }, { status: 400 });
    }

    // Find and delete the summary (only if it belongs to the user)
    const deletedSummary = await Summary.findOneAndDelete({
      _id: summaryId,
      userId
    });

    if (!deletedSummary) {
      return NextResponse.json({
        success: false,
        error: 'Summary not found or you do not have permission to delete it'
      }, { status: 404 });
    }

    logger.info('Summary deleted successfully', {
      summaryId,
      userId,
      title: deletedSummary.title
    });

    return NextResponse.json({
      success: true,
      message: 'Summary deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete summary:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to delete summary'
    }, { status: 500 });
  }
}

// PATCH - Update a summary
export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const summaryId = searchParams.get('summaryId');
    
    if (!userId || !summaryId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID and Summary ID are required' 
      }, { status: 400 });
    }

    const body = await request.json();
    const { title, subject, tags, isPublic } = body;

    // Build update object
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (subject !== undefined) updateData.subject = subject.trim();
    if (tags !== undefined) updateData.tags = tags;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    // Update the summary (only if it belongs to the user)
    const updatedSummary = await Summary.findOneAndUpdate(
      { _id: summaryId, userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedSummary) {
      return NextResponse.json({
        success: false,
        error: 'Summary not found or you do not have permission to update it'
      }, { status: 404 });
    }

    logger.info('Summary updated successfully', {
      summaryId,
      userId,
      updatedFields: Object.keys(updateData)
    });

    return NextResponse.json({
      success: true,
      message: 'Summary updated successfully',
      summary: updatedSummary
    });

  } catch (error) {
    logger.error('Failed to update summary:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to update summary'
    }, { status: 500 });
  }
}