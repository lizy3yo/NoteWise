import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

import { connectToDatabase } from '@/lib/mongoose';
import User from '@/models/user';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({
        success: false,
        message: 'Email parameter is required'
      }, { status: 400 });
    }

    const user = await User.findOne({ email }).select('email emailVerificationToken emailVerificationExpires isEmailVerified');
    
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        hasVerificationToken: !!user.emailVerificationToken,
        tokenExpires: user.emailVerificationExpires,
        isTokenExpired: user.emailVerificationExpires ? new Date() > user.emailVerificationExpires : null
      }
    });

  } catch (error) {
    console.error('Debug verification error:', error);
    return NextResponse.json({
      success: false,
      message: 'Error debugging verification',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}