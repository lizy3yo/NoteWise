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

export const runtime = 'nodejs';

import { connectToDatabase } from '@/lib/mongoose';
import { generateAccessToken, generateRefreshToken } from '@/lib/jwt';
import { logger } from '@/lib/winston';
import config from '@/lib/config';
import { genUsername } from '@/lib/utils';
import User from '@/models/user';
import Token from '@/models/token';
import type { IUser } from '@/models/user';

type UserData = Pick<IUser, 'username' | 'firstName' | 'lastName' | 'email' | 'password' | 'role'>;
// Include honorifics in accepted UserData
type UserDataWithHonorifics = UserData & { honorifics?: string };

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
  const body = await request.json() as UserDataWithHonorifics;
  const { firstName, lastName, email, password, role, honorifics } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({
        code: 'VALIDATION_ERROR',
        message: 'Missing required fields'
      }, { status: 400 });
    }

    // Check if admin registration is allowed
    if (role === 'admin' && !config.WHITELIST_ADMINS_MAIL.includes(email)) {
      logger.warn(`User with email ${email} attempted to register as an admin but is not whitelisted.`);
      return NextResponse.json({
        code: 'FORBIDDEN',
        message: 'You are not allowed to register as an admin',
      }, { status: 403 });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({
        code: 'USER_EXISTS',
        message: 'Email is already registered'
      }, { status: 409 });
    }

    // Generate username and create user (without email verification initially)
    const username = genUsername();
    const newUser = await User.create({
      email,
      password,
      role: role || 'student',
      username,
      honorifics,
      firstName,
      lastName,
      isEmailVerified: false // Set to false initially
    });

    // Debugging: log incoming honorifics and what's saved on the created user
    logger.debug('Register: incoming body honorifics', { honorifics });
    logger.debug('Register: created user honorifics', { honorifics: newUser.honorifics });

    // Send verification email
    const crypto = await import('crypto');
    const { sendEmail, generateVerificationEmailHTML, generateVerificationEmailText } = await import('@/lib/email');
    
    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash the verification code for storage
    const hashedToken = crypto.createHash('sha256').update(verificationCode).digest('hex');
    
    // Set expiration time (15 minutes from now)
    const expirationTime = new Date(Date.now() + 15 * 60 * 1000);

    // Update user with verification token
    await User.findByIdAndUpdate(newUser._id, {
      emailVerificationToken: hashedToken,
      emailVerificationExpires: expirationTime
    });

    // Send verification email
    const emailSent = await sendEmail({
      to: email,
      subject: 'Verify Your Email - NoteWise',
      html: generateVerificationEmailHTML(verificationCode, firstName),
      text: generateVerificationEmailText(verificationCode, firstName)
    });

    if (!emailSent) {
      // If email fails, still allow registration but log the error
      logger.error('Failed to send verification email during registration', {
        userId: newUser._id,
        email: newUser.email
      });
    }

    logger.info('User registered successfully:', {
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      emailSent
    });

    // Return response without tokens - user needs to verify email first
    const response = NextResponse.json({
      message: 'Registration successful! Please check your email for verification code.',
      Student: {
        username: newUser.username,
        honorifics: newUser.honorifics,
        email: newUser.email,
        role: newUser.role,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        isEmailVerified: false
      },
      requiresVerification: true
    }, { status: 201 });

    return response;

  } catch (err) {
    logger.error('Error occurred during registration:', err);
    return NextResponse.json({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An error occurred during registration',
      error: 'Internal Server Error'
    }, { status: 500 });
  }
}