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
import { Types } from 'mongoose'; 

//Custom Modules
import { logger } from '@/lib/winston';
import { connectToDatabase } from '@/lib/mongoose';

//Models
import User from '@/models/user';
import Folder from '@/models/folder';

// GET - Fetch folders for a user
export const GET = async (request: NextRequest) => {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID is required' 
      }, { status: 400 });
    }

    const folders = await Folder.find({ userId }).sort({ updatedAt: -1 });

    return NextResponse.json({
      success: true,
      folders
    });
  } catch (error) {
    logger.error('Error fetching folders:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch folders'
    }, { status: 500 });
  }
};

// POST - Create a new folder
export const POST = async (request: NextRequest) => {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID is required' 
      }, { status: 400 });
    }

    const body = await request.json();
    const { title, description } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ 
        success: false, 
        error: 'Folder title is required' 
      }, { status: 400 });
    }

    const folder = new Folder({
      userId: new Types.ObjectId(userId),
      title: title.trim(),
      description: description?.trim(),
      accessType: 'private'
    });

    await folder.save();

    logger.info('Folder created successfully', {
      folderId: folder._id,
      userId,
      title: folder.title
    });

    return NextResponse.json({
      success: true,
      folder: {
        _id: folder._id,
        title: folder.title,
        description: folder.description,
        isFavorite: folder.isFavorite,
        createdAt: folder.createdAt
      }
    });

  } catch (error) {
    logger.error('Error creating folder:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create folder'
    }, { status: 500 });
  }
};

// PATCH - Update folder (rename, toggle favorite, etc.)
export const PATCH = async (request: NextRequest) => {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const folderId = searchParams.get('folderId');

    if (!userId || !folderId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID and Folder ID are required' 
      }, { status: 400 });
    }

    const body = await request.json();
    const { title, description, isFavorite } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;

    const folder = await Folder.findOneAndUpdate(
      { _id: folderId, userId: new Types.ObjectId(userId) },
      updateData,
      { new: true }
    );

    if (!folder) {
      return NextResponse.json({ 
        success: false, 
        error: 'Folder not found' 
      }, { status: 404 });
    }

    logger.info('Folder updated successfully', {
      folderId: folder._id,
      userId,
      updates: updateData
    });

    return NextResponse.json({
      success: true,
      folder: {
        _id: folder._id,
        title: folder.title,
        description: folder.description,
        isFavorite: folder.isFavorite,
        updatedAt: folder.updatedAt
      }
    });

  } catch (error) {
    logger.error('Error updating folder:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update folder'
    }, { status: 500 });
  }
};

// DELETE - Delete a folder
export const DELETE = async (request: NextRequest) => {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const folderId = searchParams.get('folderId');

    if (!userId || !folderId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID and Folder ID are required' 
      }, { status: 400 });
    }

    const folder = await Folder.findOneAndDelete({
      _id: folderId,
      userId: new Types.ObjectId(userId)
    });

    if (!folder) {
      return NextResponse.json({ 
        success: false, 
        error: 'Folder not found' 
      }, { status: 404 });
    }

    logger.info('Folder deleted successfully', {
      folderId: folder._id,
      userId,
      title: folder.title
    });

    return NextResponse.json({
      success: true,
      message: 'Folder deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting folder:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete folder'
    }, { status: 500 });
  }
};
