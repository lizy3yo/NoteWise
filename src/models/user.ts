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

//NODE MODULES
import {Schema, model, models} from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser{
    username: string;
    email: string;
    password?: string; // made optional
    role: 'student' | 'teacher' | 'admin';
    honorifics?: string; // optional (e.g. 'Ms.', 'Mr.', 'Dr.')
    firstName: string;
    lastName: string;
    isEmailVerified?: boolean;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    socialLinks?: {
        website?: string;
        facebook?: string;
        instagram?: string;
    };
}

// User schema
const userSchema = new Schema<IUser>({
    username: { 
        type: String, 
        required: [true, 'Username is required'],
        maxLength: [20, 'Username must be at most 20 characters long'],
        unique: [true, 'Username must be unique']
    },
    email: { 
        type: String, 
        required: [true, 'Email is required'],
        maxLength: [50, 'Email must be at most 50 characters long'],
        unique: [true, 'Email must be unique']
    },
    password: { 
        type: String, 
        // no longer required for OAuth users
    },
    role: { 
        type: String, 
        required: [true, 'Role is required'],
        enum:{
            values: ['student', 'teacher', 'admin'],
            message: '{VALUE} is not a valid role'
        }, 
        default: 'student',
    },
    firstName: { 
        type: String, 
        maxLength: [20, 'First name must be less than 20 characters long'],
        required: [true, 'First name is required'],
    },
    honorifics: {
        type: String,
        maxLength: [10, 'Honorifics must be less than 10 characters long']
    },
    lastName: { 
        type: String, 
        maxLength: [20, 'Last name must be less than 20 characters long'],
        required: [true, 'Last name is required'],
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: {
        type: String
    },
    emailVerificationExpires: {
        type: Date
    },
    passwordResetToken: {
        type: String
    },
    passwordResetExpires: {
        type: Date
    },
    socialLinks: {
        website: { 
            type: String, 
            maxLength: [100, 'Website URL must be less than 100 characters long'] 
        },
        facebook: { 
            type: String, 
            maxLength: [100, 'Facebook URL must be less than 100 characters long'] 
        },
        instagram: { 
            type: String, 
            maxLength: [100, 'Instagram URL must be less than 100 characters long'] 
        },
    }
}, {
    timestamps: true
});

userSchema.pre('save', async function(next) {
    // If no password present or password not modified, skip hashing
    if (!this.password || !this.isModified('password')) {
        next();
        return;
    }
    // password hashing
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Use models to prevent re-compilation in Next.js
// Force model refresh to ensure verification fields are included
try {
    if (models && (models as any).User) {
        const existing = (models as any).User;
        // Check if the model has the new verification and password reset fields
        if (!existing.schema || !existing.schema.path('isEmailVerified') || !existing.schema.path('emailVerificationToken') || !existing.schema.path('passwordResetToken')) {
            // remove the stale model so it can be recreated with the new schema
            delete (models as any).User;
            console.log('Refreshed User model to include verification and password reset fields');
        }
    }
} catch (e) {
    // ignore and continue to create model
}

export default (models.User as any) || model<IUser>('User', userSchema);