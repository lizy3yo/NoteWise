import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import { logger } from '@/lib/winston';
import { validateContent } from '@/lib/ai/flashcard-generator';
import { UploadFile } from '@/app/lib/upload';
import Flashcard from '@/models/flashcard';
import User from '@/models/user';
import { Types } from 'mongoose';
import { logActivity } from '@/lib/activity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json({
        success: false,
        error: 'Valid user ID is required'
      }, { status: 400 });
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const difficulty = formData.get('difficulty') as string;
    const subject = formData.get('subject') as string;
    const aiProvider = (formData.get('aiProvider') as string) || 'gemini';
    const folderId = formData.get('folderId') as string;
    const tagsString = formData.get('tags') as string;
    const maxCards = parseInt((formData.get('maxCards') as string) || '10');
    const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()) : [];

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }

    // Validate file size (10MB limit)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxFileSize) {
      return NextResponse.json({
        success: false,
        error: 'File size too large',
        details: `File size is ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum allowed size is 10MB.`
      }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Unsupported file type',
        details: 'Please upload PDF, Word, PowerPoint, or text files only.'
      }, { status: 400 });
    }

    logger.info('Starting file-based flashcard generation', {
      userId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      aiProvider
    });

    // Upload file to Cloudinary
    const uploadResult = await UploadFile(file, 'flashcard-files') as any;
    
    if (!uploadResult || !uploadResult.secure_url) {
      return NextResponse.json({
        success: false,
        error: 'Failed to upload file'
      }, { status: 500 });
    }

    logger.info('File uploaded to Cloudinary', {
      publicId: uploadResult.public_id,
      url: uploadResult.secure_url,
      resourceType: uploadResult.resource_type
    });

    // For text files, extract content directly. For binary files, try to extract or use placeholder
    let textContent: string = '';

    if (file.type.includes('text') || file.type.includes('txt')) {
      // For text files, we can extract content directly
      try {
        const response = await fetch(uploadResult.secure_url);
        if (response.ok) {
          textContent = await response.text();
          logger.info('Successfully extracted text from text file', { 
            contentLength: textContent.length 
          });
        }
      } catch (error) {
        logger.warn('Failed to extract text from text file', { error });
      }
    } else if (file.type.includes('pdf') || file.type.includes('application/pdf')) {
      // For PDF files, try to extract text directly using pdf-parse
      try {
        logger.info('Attempting to extract text from PDF directly');
        
        // Import pdf-parse
        const pdfParse = (await import('pdf-parse')).default;
        
        // Get the file buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Parse PDF
        const pdfData = await pdfParse(buffer);
        textContent = pdfData.text;
        
        logger.info('Successfully extracted text from PDF', { 
          contentLength: textContent.length,
          pages: pdfData.numpages
        });
      } catch (error) {
        logger.warn('Failed to extract text from PDF directly', { error });
      }
    } else if (file.type.includes('word') || 
               file.type.includes('application/msword') ||
               file.type.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
               file.name.toLowerCase().endsWith('.doc') || 
               file.name.toLowerCase().endsWith('.docx')) {
      // For Word documents, extract text using mammoth
      try {
        logger.info('Attempting to extract text from Word document');
        
        const mammoth = (await import('mammoth')).default;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const result = await mammoth.extractRawText({ buffer });
        textContent = result.value;
        
        logger.info('Successfully extracted text from Word document', { 
          contentLength: textContent.length
        });
      } catch (error) {
        logger.warn('Failed to extract text from Word document', { error });
      }
    } else if (file.type.includes('presentation') ||
               file.type.includes('application/vnd.ms-powerpoint') ||
               file.type.includes('application/vnd.openxmlformats-officedocument.presentationml.presentation') ||
               file.name.toLowerCase().endsWith('.ppt') || 
               file.name.toLowerCase().endsWith('.pptx')) {
      // For PowerPoint files, we'll try to extract text
      try {
        logger.info('Attempting to extract text from PowerPoint');
        
        // For PPTX files, we can use a simple XML parsing approach
        if (file.name.toLowerCase().endsWith('.pptx')) {
          const AdmZip = (await import('adm-zip')).default;
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const zip = new AdmZip(buffer);
          const zipEntries = zip.getEntries();
          
          let extractedText = '';
          zipEntries.forEach((entry: any) => {
            if (entry.entryName.match(/ppt\/slides\/slide\d+\.xml/)) {
              const content = entry.getData().toString('utf8');
              // Extract text between <a:t> tags
              const matches = content.match(/<a:t>([^<]+)<\/a:t>/g);
              if (matches) {
                matches.forEach((match: string) => {
                  const text = match.replace(/<\/?a:t>/g, '');
                  extractedText += text + ' ';
                });
              }
            }
          });
          
          textContent = extractedText.trim();
          logger.info('Successfully extracted text from PowerPoint', { 
            contentLength: textContent.length
          });
        } else {
          // For .ppt files (older format), suggest converting to PDF
          logger.warn('Old PowerPoint format (.ppt) detected - extraction not fully supported');
          throw new Error('For best results, please convert .ppt files to .pptx or PDF format');
        }
      } catch (error) {
        logger.warn('Failed to extract text from PowerPoint', { error });
      }
    } else {
      logger.info('Unrecognized file type, attempting basic text extraction', { fileType: file.type });
    }

    // Process the extracted text content
    let result: any = null;
    
    if (textContent) {
      // Validate extracted content
      const validation = validateContent(textContent);
      if (validation.isValid) {
        try {
          // Use AI generator for better results
          const { FlashcardGenerator } = await import('@/lib/ai/flashcard-generator');
          const generator = new FlashcardGenerator();
          
          result = await generator.generateFlashcards({
            content: textContent,
            title: title || file.name.replace(/\.[^/.]+$/, ''),
            difficulty: difficulty as 'easy' | 'medium' | 'hard',
            contentType: 'document',
            maxCards: maxCards || 10
          });

          logger.info('AI generation successful for file', {
            fileName: file.name,
            cardsGenerated: result.flashcards.length,
            qualityScore: result.qualityMetrics.overallScore
          });

        } catch (error) {
          logger.error('AI generation failed for file', { error, fileName: file.name });
        }
      } else {
        logger.warn('Extracted content validation failed', { 
          fileName: file.name, 
          validationError: validation.error,
          contentLength: textContent.length 
        });
      }
    }

    // If we couldn't generate cards, return an error
    if (!result || !result.flashcards || result.flashcards.length === 0) {
      logger.warn('No flashcards could be generated from file', {
        fileName: file.name,
        fileType: file.type,
        textContentLength: textContent.length
      });
      
      return NextResponse.json({
        success: false,
        error: 'Could not generate flashcards from file content',
        details: `The file "${file.name}" could not be processed to extract meaningful content for flashcard generation. Please ensure the file contains readable text content.`
      }, { status: 400 });
    }

    // Create enhanced flashcard set in database
    const flashcardData = {
      user: new Types.ObjectId(userId),
      folder: folderId ? new Types.ObjectId(folderId) : undefined,
      title: title || `${file.name} Flashcards`,
      description: `Generated from uploaded file: ${file.name} using AI with ${result.analysis.strategy} strategy. Quality score: ${result.qualityMetrics.overallScore.toFixed(2)}`,
      cards: result.flashcards.map((card: any) => ({
        question: card.question,
        answer: card.answer,
        metadata: {
          difficulty: card.difficulty,
          topic: card.topic,
          type: card.type,
          confidence: card.confidence,
          reasoning: card.reasoning,
          example: card.example,
          commonMistake: card.commonMistake,
          reviewInterval: card.reviewInterval,
          aiGenerated: true
        }
      })),
      difficulty: difficulty || result.analysis.difficulty || 'medium',
      subject: subject || undefined,
      tags: [
        ...tags,
        'ai-generated',
        'file-upload',
        file.type.split('/')[1], // file extension
        result.analysis.subject.toLowerCase(),
        result.analysis.strategy,
        ...result.analysis.keyTopics.map((topic: string) => topic.toLowerCase())
      ],
      accessType: 'private' as const,

      // Enhanced metadata
      aiMetadata: {
        generator: 'internal',
        analysis: result.analysis,
        qualityMetrics: result.qualityMetrics,
        summary: result.summary,
        generatedAt: new Date(),
        processingMethod: 'file-extraction-ai'
      },

      createdAt: new Date(),
      updatedAt: new Date()
    };

    const flashcard = new Flashcard(flashcardData);
    await flashcard.save();

    logger.info('File-based flashcard generation completed', {
      userId,
      flashcardId: flashcard._id,
      fileName: file.name,
      cardsGenerated: result.flashcards.length,
      qualityScore: result.qualityMetrics.overallScore
    });

    // Log activity
    await logActivity({
      userId: String(userId),
      type: 'flashcard.generate',
      action: 'generated from file',
      meta: {
        flashcardId: String(flashcard._id),
        title: flashcard.title,
        cardCount: result.flashcards.length,
        fileName: file.name,
        subject: result.analysis.subject
      },
      progress: 100
    });

    return NextResponse.json({
      success: true,
      flashcard: {
        id: flashcard._id,
        title: flashcard.title,
        cardsGenerated: result.flashcards.length,
        qualityScore: result.qualityMetrics.overallScore,
        subject: result.analysis.subject,
        keyTopics: result.analysis.keyTopics,
        sourceFile: {
          name: file.name,
          size: file.size,
          type: file.type,
          cloudinaryUrl: uploadResult.secure_url
        }
      },
      analysis: result.analysis,
      qualityMetrics: result.qualityMetrics,
      summary: result.summary,
      message: `Successfully generated ${result.flashcards.length} flashcards from ${file.name}`
    });

  } catch (error) {
    logger.error('File-based flashcard generation failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate flashcards from file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}