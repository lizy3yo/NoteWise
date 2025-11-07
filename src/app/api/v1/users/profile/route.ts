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

//Custom Modules
import { connectToDatabase } from '@/lib/mongoose';
import { authenticate } from '@/lib/middleware/authenticate';
import { authorize } from '@/lib/middleware/authorize';
import { logger } from '@/lib/winston';
import { validateUsername, validateEmail, validateName } from '@/lib/middleware/validation';
import { logActivity } from '@/lib/activity';

//Models
import User from '@/models/user';

export async function PUT(request: NextRequest) {
    try {
        await connectToDatabase();
        
        // Authenticate user
        const authResult = await authenticate(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const { userId } = authResult;

        // Authorize user
        const authzResult = await authorize(userId, ['student', 'teacher', 'admin']);
        if (authzResult instanceof Response) {
            return authzResult as Response;
        }

        const body = await request.json();
        const { email, firstName, lastName, profileImage } = body;

        // Get current user to check if email is changing
        const currentUser = await User.findById(userId).select('email').exec();
        if (!currentUser) {
            return NextResponse.json({
                code: 'USER_NOT_FOUND',
                message: 'User not found'
            }, { status: 404 });
        }

        const isEmailChanging = email && email !== currentUser.email;

        if (email) {
            const emailError = validateEmail(email);
            if (emailError) {
                return NextResponse.json({ 
                    code: 'VALIDATION_ERROR',
                    message: emailError.message 
                }, { status: 400 });
            }

            // Check if email is already taken
            const userExists = await User.exists({ email, _id: { $ne: userId } });
            if (userExists) {
                return NextResponse.json({ 
                    code: 'VALIDATION_ERROR',
                    message: 'Email is already taken' 
                }, { status: 400 });
            }
        }

        if (firstName) {
            const firstNameError = validateName(firstName, 'firstName');
            if (firstNameError) {
                return NextResponse.json({ 
                    code: 'VALIDATION_ERROR',
                    message: firstNameError.message 
                }, { status: 400 });
            }
        }

        if (lastName) {
            const lastNameError = validateName(lastName, 'lastName');
            if (lastNameError) {
                return NextResponse.json({ 
                    code: 'VALIDATION_ERROR',
                    message: lastNameError.message 
                }, { status: 400 });
            }
        }



        // Prepare update data
        const updateData: any = {};
        if (email) updateData.email = email;
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        if (profileImage !== undefined) updateData.profileImage = profileImage;

        // If email is changing, mark as unverified and generate verification code
        let verificationCode: string | undefined;
        if (isEmailChanging) {
            updateData.isEmailVerified = false;
            // Generate 6-digit verification code
            verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            // Hash the verification code for storage (same as resend verification API)
            updateData.emailVerificationToken = crypto.createHash('sha256').update(verificationCode).digest('hex');
            updateData.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        }

        // Update user
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password').lean().exec() as any;

        if (!updatedUser) {
            return NextResponse.json({
                code: 'USER_NOT_FOUND',
                message: 'User not found'
            }, { status: 404 });
        }

        // Send verification email if email changed
        if (isEmailChanging && verificationCode) {
            try {
                // Import email service
                const { sendVerificationEmail } = await import('@/lib/email');
                await sendVerificationEmail(
                    updatedUser.email,
                    verificationCode, // Use the plain code for email, not the hashed token
                    `${updatedUser.firstName} ${updatedUser.lastName}`
                );
            } catch (emailError) {
                logger.error('Failed to send verification email:', emailError);
                // Don't fail the request if email sending fails
            }
        }

        // Log activity
        const updatedFields = Object.keys(updateData).filter(key => key !== 'emailVerificationToken' && key !== 'emailVerificationExpires' && key !== 'isEmailVerified');
        if (updatedFields.length > 0) {
            await logActivity({
                userId: String(userId),
                type: 'profile.update',
                action: 'updated',
                meta: {
                    fields: updatedFields,
                    email: email || undefined,
                    firstName: firstName || undefined,
                    lastName: lastName || undefined
                },
                progress: 100
            });
        }

        return NextResponse.json({ 
            message: 'Profile updated successfully',
            user: updatedUser,
            emailVerificationRequired: isEmailChanging
        });

    } catch (err) {
        logger.error('Error occurred while updating user profile:', err);
        return NextResponse.json({ 
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An error occurred while updating user profile',
            error: 'Internal Server Error' 
        }, { status: 500 });
    }
}