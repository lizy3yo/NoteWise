import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;

    console.log('Email configuration check:');
    console.log('EMAIL_USER:', emailUser ? 'Set' : 'Not set');
    console.log('EMAIL_PASSWORD:', emailPassword ? 'Set' : 'Not set');

    if (!emailUser || !emailPassword) {
      return NextResponse.json({
        success: false,
        message: 'Email credentials not configured',
        details: {
          emailUser: !!emailUser,
          emailPassword: !!emailPassword
        }
      });
    }

    // Test transporter creation
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });

    // Test connection
    try {
      await transporter.verify();
      return NextResponse.json({
        success: true,
        message: 'Email configuration is valid',
        details: {
          service: 'gmail',
          user: emailUser
        }
      });
    } catch (verifyError) {
      console.error('Email verification failed:', verifyError);
      
      let errorMessage = 'Email authentication failed';
      let suggestion = '';
      
      if (verifyError instanceof Error) {
        const errorText = verifyError.message;
        
        if (errorText.includes('Username and Password not accepted')) {
          errorMessage = 'Gmail authentication failed';
          suggestion = 'Please ensure you are using an App Password, not your regular Gmail password. Enable 2-Factor Authentication first, then generate an App Password in your Google Account settings.';
        } else if (errorText.includes('Less secure app access')) {
          errorMessage = 'Gmail security settings issue';
          suggestion = 'Please use an App Password instead of enabling "Less secure app access".';
        }
      }
      
      return NextResponse.json({
        success: false,
        message: errorMessage,
        suggestion,
        error: verifyError instanceof Error ? verifyError.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('Email config test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Error testing email configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}