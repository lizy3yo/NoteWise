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
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { validatePassword } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Reset password request body:', body);
    
    const { email, resetCode, newPassword } = body;

    // Trim whitespace from inputs
    const trimmedEmail = email?.trim();
    const trimmedResetCode = resetCode?.trim();
    const trimmedPassword = newPassword?.trim();

    console.log('Parsed fields:', { 
      email: trimmedEmail, 
      resetCode: trimmedResetCode, 
      newPassword: trimmedPassword ? '[REDACTED]' : undefined 
    });

    if (!trimmedEmail || !trimmedResetCode || !trimmedPassword) {
      console.log('Missing fields validation failed');
      return NextResponse.json(
        { code: 'MISSING_FIELDS', message: 'Email, reset code, and new password are required' },
        { status: 400 }
      );
    }

    // Validate password strength using the same validation as signup
    const passwordError = validatePassword(trimmedPassword);
    if (passwordError) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: passwordError.message },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Hash the provided reset code to compare with stored hash
    const hashedResetCode = crypto.createHash('sha256').update(trimmedResetCode).digest('hex');
    console.log('Original reset code:', trimmedResetCode);
    console.log('Hashed reset code:', hashedResetCode);

    // First check if user exists with this email
    const userByEmail = await User.findOne({ email: trimmedEmail.toLowerCase() });
    
    if (!userByEmail) {
      console.log('No user found with email:', trimmedEmail);
      return NextResponse.json(
        { code: 'USER_NOT_FOUND', message: 'No account found with this email address' },
        { status: 404 }
      );
    }

    // Check if user has any reset token
    if (!userByEmail.passwordResetToken) {
      console.log('User has no reset token');
      return NextResponse.json(
        { code: 'NO_RESET_TOKEN', message: 'No password reset request found. Please request a new reset code.' },
        { status: 400 }
      );
    }

    // Check if reset token is expired
    if (userByEmail.passwordResetExpires && new Date() > userByEmail.passwordResetExpires) {
      console.log('Reset token expired');
      return NextResponse.json(
        { code: 'TOKEN_EXPIRED', message: 'Reset code has expired. Please request a new reset code.' },
        { status: 400 }
      );
    }

    // Check if reset code matches
    if (userByEmail.passwordResetToken !== hashedResetCode) {
      console.log('Reset code mismatch');
      console.log('Expected:', userByEmail.passwordResetToken);
      console.log('Received:', hashedResetCode);
      return NextResponse.json(
        { code: 'INVALID_CODE', message: 'Invalid reset code. Please check the code and try again, or request a new one.' },
        { status: 400 }
      );
    }

    // Find user with matching email and valid reset token (final verification)
    const user = await User.findOne({
      email: trimmedEmail.toLowerCase(),
      passwordResetToken: hashedResetCode,
      passwordResetExpires: { $gt: new Date() }, // Token not expired
    });

    console.log('User found:', user ? 'Yes' : 'No');
    if (user) {
      console.log('User reset token:', user.passwordResetToken);
      console.log('User reset expires:', user.passwordResetExpires);
      console.log('Current time:', new Date());
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(trimmedPassword, 10);

    // Update user password and clear reset token
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
    });

    return NextResponse.json({
      message: 'Password has been reset successfully. You can now sign in with your new password.',
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { code: 'SERVER_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}