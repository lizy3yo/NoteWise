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
import crypto from 'crypto';

export const runtime = 'nodejs';

import { connectToDatabase } from '@/lib/mongoose';
import { sendEmail, generateVerificationEmailHTML, generateVerificationEmailText } from '@/lib/email';
import User from '@/models/user';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting send-verification request...');

    await connectToDatabase();
    console.log('Database connected successfully');

    const body = await request.json();
    const { email } = body;
    console.log('Request body parsed:', { email });

    if (!email) {
      console.log('Email validation failed: Email is required');
      return NextResponse.json({
        code: 'VALIDATION_ERROR',
        message: 'Email is required'
      }, { status: 400 });
    }

    // Find user
    console.log('Looking for user with email:', email);
    const user = await User.findOne({ email });

    if (!user) {
      console.log('User not found for email:', email);
      return NextResponse.json({
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      }, { status: 404 });
    }

    console.log('User found:', { id: user._id, email: user.email, isVerified: user.isEmailVerified });

    // Allow re-verification even if already verified (to get new tokens after clearing site data)
    console.log('Sending verification code to user:', user._id);

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Generated verification code:', verificationCode);

    // Hash the verification code for storage
    const hashedToken = crypto.createHash('sha256').update(verificationCode).digest('hex');
    console.log('Hashed token created');

    // Set expiration time (15 minutes from now)
    const expirationTime = new Date(Date.now() + 15 * 60 * 1000);
    console.log('Expiration time set:', expirationTime);

    // Update user with verification token
    try {
      const updateResult = await User.findByIdAndUpdate(
        user._id,
        {
          emailVerificationToken: hashedToken,
          emailVerificationExpires: expirationTime
        },
        { new: true } // Return the updated document
      );

      console.log('User update result:', {
        success: !!updateResult,
        hasToken: updateResult?.emailVerificationToken ? 'Yes' : 'No',
        expires: updateResult?.emailVerificationExpires
      });

      if (!updateResult) {
        throw new Error('Failed to update user with verification token');
      }
    } catch (updateError) {
      console.error('Error updating user with verification token:', updateError);
      return NextResponse.json({
        code: 'UPDATE_FAILED',
        message: 'Failed to save verification token'
      }, { status: 500 });
    }

    // Send verification email
    console.log('Attempting to send email...');
    console.log('🔑 VERIFICATION CODE FOR TESTING:', verificationCode);
    console.log('📧 Sending to:', email);
    console.log('⏰ Expires at:', expirationTime);

    const emailSent = await sendEmail({
      to: email,
      subject: 'Verify Your Email - NoteWise',
      html: generateVerificationEmailHTML(verificationCode, user.firstName),
      text: generateVerificationEmailText(verificationCode, user.firstName)
    });

    console.log('Email send result:', emailSent);

    if (!emailSent) {
      console.error('Email sending failed');
      return NextResponse.json({
        code: 'EMAIL_SEND_FAILED',
        message: 'Failed to send verification email. Please check your email configuration.'
      }, { status: 500 });
    }

    console.log('Verification email sent successfully to:', email);

    return NextResponse.json({
      message: 'Verification email sent successfully',
      expiresAt: expirationTime
    });

  } catch (err) {
    console.error('Error in send-verification route:', err);
    return NextResponse.json({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An error occurred while sending verification email',
      error: err instanceof Error ? err.message : 'Internal Server Error'
    }, { status: 500 });
  }
}