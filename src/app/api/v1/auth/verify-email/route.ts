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
import { generateAccessToken, generateRefreshToken } from '@/lib/jwt';
import { logger } from '@/lib/winston';
import config from '@/lib/config';
import User from '@/models/user';
import Token from '@/models/token';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting email verification request...');
    
    await connectToDatabase();
    console.log('Database connected successfully');
    
    const body = await request.json();
    const { email, verificationCode } = body;
    console.log('Request body:', { email, verificationCode: verificationCode ? `${verificationCode.length} chars` : 'missing' });

    if (!email || !verificationCode) {
      console.log('Validation failed: missing email or verification code');
      return NextResponse.json({
        code: 'VALIDATION_ERROR',
        message: 'Email and verification code are required'
      }, { status: 400 });
    }

    // Hash the provided verification code
    const hashedToken = crypto.createHash('sha256').update(verificationCode).digest('hex');
    console.log('Hashed verification code for lookup');

    // First, let's check if user exists at all
    const userExists = await User.findOne({ email });
    console.log('User exists check:', userExists ? 'Yes' : 'No');
    
    if (userExists) {
      console.log('User details:', {
        id: userExists._id,
        email: userExists.email,
        isVerified: userExists.isEmailVerified,
        hasToken: !!userExists.emailVerificationToken,
        tokenExpires: userExists.emailVerificationExpires
      });
    }

    // Find user with matching email and verification token
    const user = await User.findOne({
      email,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() }
    });

    console.log('User found with matching token:', user ? 'Yes' : 'No');

    if (!user) {
      // Let's check what's wrong specifically
      const userWithEmail = await User.findOne({ email });
      if (!userWithEmail) {
        console.log('No user found with this email');
        return NextResponse.json({
          code: 'USER_NOT_FOUND',
          message: 'No user found with this email address'
        }, { status: 400 });
      }

      const userWithToken = await User.findOne({ email, emailVerificationToken: hashedToken });
      if (!userWithToken) {
        console.log('Invalid verification code');
        return NextResponse.json({
          code: 'INVALID_CODE',
          message: 'Invalid verification code'
        }, { status: 400 });
      }

      // If we get here, the token exists but is expired
      console.log('Verification code has expired');
      return NextResponse.json({
        code: 'EXPIRED_TOKEN',
        message: 'Verification code has expired. Please request a new one.'
      }, { status: 400 });
    }

    // Update user as verified and clear verification fields
    await User.findByIdAndUpdate(user._id, {
      isEmailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationExpires: undefined
    });

    // Generate tokens for automatic login
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token in database
    await Token.create({
      token: refreshToken,
      userId: user._id
    });

    console.log('Email verified successfully', {
      userId: user._id,
      email: user.email
    });

    logger.info('Email verified successfully, generating tokens:', {
      userId: user._id,
      email: user.email,
      tokensGenerated: {
        accessToken: !!accessToken,
        refreshToken: !!refreshToken
      }
    });

    // Create response with cookies
    const response = NextResponse.json({
      message: 'Email verified successfully',
      Student: {
        _id: user._id.toString(),
        username: user.username,
        honorifics: user.honorifics,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: true
      },
      accessToken,
      refreshToken, // Include refresh token in response
    });

    // Set cookies
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return response;

  } catch (err) {
    console.error('Error verifying email:', err);
    return NextResponse.json({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An error occurred while verifying email',
      error: err instanceof Error ? err.message : 'Internal Server Error'
    }, { status: 500 });
  }
}