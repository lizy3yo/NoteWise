import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import User from '@/models/user';

export async function GET() {
  try {
    await connectToDatabase();
    
    const users = await User.find({}, {
      email: 1,
      firstName: 1,
      lastName: 1,
      isEmailVerified: 1,
      passwordResetToken: 1,
      passwordResetExpires: 1,
      password: 1
    }).limit(5);
    
    const userInfo = users.map((user: any) => ({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isEmailVerified: user.isEmailVerified,
      hasPassword: !!user.password,
      hasResetToken: !!user.passwordResetToken,
      resetExpires: user.passwordResetExpires
    }));
    
    return NextResponse.json({ users: userInfo });
  } catch (error) {
    console.error('Debug users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}