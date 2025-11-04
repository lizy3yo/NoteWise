import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

import { connectToDatabase } from '@/lib/mongoose';
import { genUsername } from '@/lib/utils';
import User from '@/models/user';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    const { email, firstName = 'Test', lastName = 'User' } = body;

    if (!email) {
      return NextResponse.json({
        success: false,
        message: 'Email is required'
      }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({
        success: false,
        message: 'User already exists',
        user: {
          id: existingUser._id,
          email: existingUser.email,
          isEmailVerified: existingUser.isEmailVerified
        }
      });
    }

    // Create test user with default password (for testing email verification)
    const username = genUsername();
    const newUser = await User.create({
      email,
      password: 'Password123!', // Default password for testing (meets validation requirements)
      role: 'student',
      username,
      firstName,
      lastName,
      isEmailVerified: false
    });

    return NextResponse.json({
      success: true,
      message: 'Test user created successfully',
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        isEmailVerified: newUser.isEmailVerified
      }
    });

  } catch (error) {
    console.error('Error creating test user:', error);
    return NextResponse.json({
      success: false,
      message: 'Error creating test user',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}