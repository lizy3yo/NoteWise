/*
 * Copyright 2025 Kharl Ryan M. De Jesus
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import User from '@/models/user';
import { sendEmail, generatePasswordResetEmailHTML, generatePasswordResetEmailText } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { code: 'MISSING_EMAIL', message: 'Email is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log('User found for forgot password:', user ? 'Yes' : 'No');
    console.log('User email:', email.toLowerCase());

    // Check if user exists
    if (!user) {
      return NextResponse.json(
        { 
          code: 'USER_NOT_FOUND', 
          message: 'No account found with this email address. Please check your email or sign up for a new account.' 
        },
        { status: 404 }
      );
    }

    // Check if user has a password (not OAuth-only account)
    if (!user.password) {
      return NextResponse.json(
        {
          code: 'OAUTH_ACCOUNT',
          message: 'This account uses Google sign-in. Please use "Continue with Google" to access your account.'
        },
        { status: 400 }
      );
    }

    // Generate reset code (6-digit number)
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the reset code for storage
    const hashedResetCode = crypto.createHash('sha256').update(resetCode).digest('hex');

    // Set expiration time (15 minutes from now)
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000);

    console.log('Generated reset code:', resetCode);
    console.log('Hashed reset code:', hashedResetCode);
    console.log('Reset expires:', resetExpires);

    // Update user with reset token and expiration
    const updatedUser = await User.findByIdAndUpdate(user._id, {
      passwordResetToken: hashedResetCode,
      passwordResetExpires: resetExpires,
    }, { new: true });

    console.log('User updated with reset token:', updatedUser ? 'Success' : 'Failed');
    if (updatedUser) {
      console.log('Updated user reset token:', updatedUser.passwordResetToken);
      console.log('Updated user reset expires:', updatedUser.passwordResetExpires);

      // Verify the token was saved by querying again
      const verifyUser = await User.findOne({
        email: email.toLowerCase(),
        passwordResetToken: hashedResetCode
      });
      console.log('Verification query found user:', verifyUser ? 'Yes' : 'No');
    }

    // Send reset email
    const emailSent = await sendEmail({
      to: email,
      subject: 'Password Reset - NoteWise',
      html: generatePasswordResetEmailHTML(resetCode, user.firstName),
      text: generatePasswordResetEmailText(resetCode, user.firstName),
    });

    console.log('Email sent:', emailSent);

    if (!emailSent) {
      console.log('Email failed, but continuing for testing...');
      // Temporarily allow continuation even if email fails for testing
      // return NextResponse.json(
      //   { code: 'EMAIL_FAILED', message: 'Failed to send reset email. Please try again.' },
      //   { status: 500 }
      // );
    }

    // Return success response with clear message
    return NextResponse.json({
      message: 'A password reset code has been sent to your email address. Please check your inbox and enter the code to reset your password.',
      // Temporarily include reset code for testing (remove in production)
      resetCode: resetCode,
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { code: 'SERVER_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}