import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongoose';
import { Summary } from '@/models/summary';
import { InternalSummaryGenerator } from '@/lib/ai/internal-summary-generator';
import { logger } from '@/lib/winston';

// File processing utilities
async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  
  if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    return await file.text();
  }
  
  if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
    const text = await file.text();
    // Convert CSV to readable text
    return text.split('\n').map(line => line.replace(/,/g, ' | ')).join('\n');
  }
  
  // For other file types, we'll need to implement proper extraction
  // For now, we'll throw an error for unsupported types
  if (fileName.endsWith('.pdf')) {
    throw new Error('PDF files are not yet supported. Please copy and paste the text content instead.');
  }
  
  if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
    throw new Error('Word documents are not yet supported. Please copy and paste the text content instead.');
  }
  
  if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) {
    throw new Error('PowerPoint files are not yet supported. Please copy and paste the text content instead.');
  }
  
  throw new Error(`Unsupported file type: ${fileType}. Please use .txt or .csv files, or copy and paste the content.`);
}

export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const subject = formData.get('subject') as string;
    const summaryType = (formData.get('summaryType') as string) || 'detailed';
    const maxLength = parseInt((formData.get('maxLength') as string) || '500');

    if (!file) {
      return NextResponse.json({ 
        success: false, 
        error: 'File is required' 
      }, { status: 400 });
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ 
        success: false, 
        error: 'File too large. Maximum size is 10MB' 
      }, { status: 400 });
    }

    logger.info('Processing file for summary generation', {
      userId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      summaryType,
      subject
    });

    // Extract text from file
    let content: string;
    try {
      content = await extractTextFromFile(file);
    } catch (error) {
      logger.error('File processing failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileName: file.name,
        fileType: file.type
      });
      
      return NextResponse.json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process file' 
      }, { status: 400 });
    }

    if (!content || content.trim().length < 100) {
      return NextResponse.json({ 
        success: false, 
        error: 'File content must be at least 100 characters long' 
      }, { status: 400 });
    }

    if (content.length > 100000) {
      return NextResponse.json({ 
        success: false, 
        error: 'File content too long. Please limit to 100,000 characters' 
      }, { status: 400 });
    }

    // Generate summary using AI
    const generator = new InternalSummaryGenerator();
    const result = await generator.generateSummary({
      content: content.trim(),
      title: title?.trim() || file.name,
      subject: subject?.trim(),
      summaryType: summaryType as any,
      maxLength
    });

    // Save to database
    const summaryDoc = new Summary({
      userId,
      title: result.summary.title,
      content: result.summary.content,
      keyPoints: result.summary.keyPoints,
      mainTopics: result.summary.mainTopics,
      wordCount: result.summary.wordCount,
      readingTime: result.summary.readingTime,
      difficulty: result.summary.difficulty,
      subject: result.summary.subject,
      summaryType: result.summary.summaryType,
      tags: result.summary.tags,
      confidence: result.summary.confidence,
      originalWordCount: result.originalWordCount,
      compressionRatio: result.compressionRatio,
      sourceType: 'file',
      sourceFileName: file.name,
      isPublic: false
    });

    const savedSummary = await summaryDoc.save();

    logger.info('Summary generated from file and saved successfully', {
      summaryId: savedSummary._id,
      userId,
      fileName: file.name,
      wordCount: result.summary.wordCount,
      compressionRatio: result.compressionRatio
    });

    return NextResponse.json({
      success: true,
      message: 'Summary generated successfully from file!',
      summary: {
        id: savedSummary._id,
        title: savedSummary.title,
        wordCount: savedSummary.wordCount,
        compressionRatio: savedSummary.compressionRatio,
        processingTime: result.processingTime,
        qualityScore: result.qualityScore,
        sourceFileName: file.name
      }
    });

  } catch (error) {
    logger.error('File summary generation failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate summary from file'
    }, { status: 500 });
  }
}