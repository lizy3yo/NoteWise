import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import Activity from '@/models/activity';
import { authenticate } from '@/lib/middleware/authenticate';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Try to authenticate via Authorization header first
    const authResult = await authenticate(request as unknown as Request);
    let userId: string | null = null;

    if ((authResult as Response) instanceof Response) {
      // authResult is a Response (error), fallback to query param
      const url = new URL(request.url);
      userId = url.searchParams.get('userId');
      if (!userId) {
        return authResult as Response;
      }
    } else {
      // authResult is { userId }
      userId = String((authResult as any).userId);
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
    const skip = (page - 1) * limit;

    const activities = await Activity.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({ activities }, { status: 200 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch activities', err);
    return NextResponse.json({ message: 'Failed to fetch activities' }, { status: 500 });
  }
}
