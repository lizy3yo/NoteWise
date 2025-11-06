import { NextRequest, NextResponse } from 'next/server';
import { PracticeTest } from '@/models/practice-test';
import { connectToDatabase } from '@/lib/mongoose';
import { logger } from '@/lib/winston';

export const dynamic = 'force-dynamic';

// GET endpoint to retrieve a single practice test by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;

    if (!testId) {
      return NextResponse.json(
        { success: false, error: 'Test ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const practiceTest = await PracticeTest.findById(testId).lean();

    if (!practiceTest) {
      return NextResponse.json(
        { success: false, error: 'Practice test not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: practiceTest
    });

  } catch (error: any) {
    const { testId } = await params;
    logger.error('Failed to retrieve practice test:', {
      error: error.message,
      testId
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve practice test'
      },
      { status: 500 }
    );
  }
}

// PATCH endpoint to update a practice test
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!testId) {
      return NextResponse.json(
        { success: false, error: 'Test ID is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const body = await req.json();
    const { title, description, folder, isPublic, isFavorite } = body;

    // Build update object
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (folder !== undefined) updateData.folder = folder;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;

    // Update the practice test (only if it belongs to the user)
    const updatedTest = await PracticeTest.findOneAndUpdate(
      { _id: testId, userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedTest) {
      return NextResponse.json(
        { success: false, error: 'Practice test not found or you do not have permission to update it' },
        { status: 404 }
      );
    }

    logger.info('Practice test updated successfully', {
      testId,
      userId,
      updatedFields: Object.keys(updateData)
    });

    return NextResponse.json({
      success: true,
      message: 'Practice test updated successfully',
      data: updatedTest
    });

  } catch (error: any) {
    const { testId } = await params;
    logger.error('Failed to update practice test:', {
      error: error.message,
      testId
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update practice test'
      },
      { status: 500 }
    );
  }
}
