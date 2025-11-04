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
import { UploadImage } from '../../lib/upload';
import { connectToDatabase } from '@/lib/mongoose';
import { authenticate } from '@/lib/middleware/authenticate';
import { logger } from '@/lib/winston';

export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        // Authenticate user
        const authResult = await authenticate(request);
        if (authResult instanceof Response) {
            return authResult;
        }

        const formData = await request.formData();
        const image = formData.get('image') as File;

        if (!image) {
            return NextResponse.json({
                code: 'VALIDATION_ERROR',
                message: 'No image file provided'
            }, { status: 400 });
        }

        // Validate file type
        if (!image.type.startsWith('image/')) {
            return NextResponse.json({
                code: 'VALIDATION_ERROR',
                message: 'File must be an image'
            }, { status: 400 });
        }

        // Validate file size (max 5MB)
        if (image.size > 5 * 1024 * 1024) {
            return NextResponse.json({
                code: 'VALIDATION_ERROR',
                message: 'Image size must be less than 5MB'
            }, { status: 400 });
        }

        // Upload to cloudinary
        const uploadResult = await UploadImage(image, 'profile-images') as any;
        
        if (!uploadResult || !uploadResult.secure_url) {
            throw new Error('Failed to upload image to cloud storage');
        }

        logger.info('Image uploaded successfully:', uploadResult.secure_url);

        return NextResponse.json({
            message: 'Image uploaded successfully',
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id
        });

    } catch (error) {
        logger.error('Error uploading image:', error);
        return NextResponse.json({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to upload image',
            error: 'Internal Server Error'
        }, { status: 500 });
    }
}
    
