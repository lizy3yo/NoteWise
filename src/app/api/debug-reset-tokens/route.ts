import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import User from '@/models/user';

export async function GET() {
  try {
    await connectToDatabase();

    const users = await User.find({
      passwordResetToken: { $exists: true, $ne: null }
    }, {
      email: 1,
      firstName: 1,
      passwordResetToken: 1,
      passwordResetExpires: 1
    }).limit(10);

    const tokenInfo = users.map((user: any) => ({
      email: user.email,
      firstName: user.firstName,
      hasResetToken: !!user.passwordResetToken,
      resetExpires: user.passwordResetExpires,
      isExpired: user.passwordResetExpires ? new Date() > user.passwordResetExpires : null,
      tokenPreview: user.passwordResetToken ? user.passwordResetToken.substring(0, 10) + '...' : null
    }));

    return NextResponse.json({
      users: tokenInfo,
      currentTime: new Date()
    });
  } catch (error) {
    console.error('Debug reset tokens error:', error);
    return NextResponse.json({ error: 'Failed to fetch reset tokens' }, { status: 500 });
  }
}