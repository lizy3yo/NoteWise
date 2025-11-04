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

import nodemailer from 'nodemailer';

// Email configuration with better error handling
const createTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;

  if (!emailUser || !emailPassword) {
    console.error('Email credentials not configured. Please set EMAIL_USER and EMAIL_PASSWORD in .env');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });
};

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.error('Email transporter not configured');
      return false;
    }

    // Verify transporter configuration
    try {
      await transporter.verify();
      console.log('Email transporter verified successfully');
    } catch (verifyError) {
      console.error('Email transporter verification failed:', verifyError);
      return false;
    }

    const mailOptions = {
      from: `"NoteWise" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${options.to}`, result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export function generateVerificationEmailHTML(verificationCode: string, firstName: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification - NoteWise</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }
            .container {
                background: white;
                border-radius: 16px;
                padding: 40px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                display: inline-flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
            }
            .logo-icon {
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 24px;
                font-weight: bold;
            }
            .logo-text {
                font-size: 32px;
                font-weight: 800;
                background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .verification-code {
                background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
                color: white;
                padding: 20px;
                border-radius: 12px;
                text-align: center;
                margin: 30px 0;
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                font-family: 'Courier New', monospace;
            }
            .content {
                text-align: center;
                margin-bottom: 30px;
            }
            .content h1 {
                color: #1f2937;
                margin-bottom: 16px;
                font-size: 24px;
            }
            .content p {
                color: #6b7280;
                margin-bottom: 16px;
                font-size: 16px;
            }
            .footer {
                text-align: center;
                padding-top: 30px;
                border-top: 1px solid #e5e7eb;
                color: #9ca3af;
                font-size: 14px;
            }
            .warning {
                background: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 8px;
                padding: 16px;
                margin: 20px 0;
                color: #92400e;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">
                    <div class="logo-icon">📝</div>
                    <div class="logo-text">NoteWise</div>
                </div>
            </div>
            
            <div class="content">
                <h1>Welcome to NoteWise, ${firstName}!</h1>
                <p>Thank you for signing up. To complete your registration, please verify your email address using the verification code below:</p>
                
                <div class="verification-code">
                    ${verificationCode}
                </div>
                
                <p>Enter this code on the verification page to activate your account.</p>
                
                <div class="warning">
                    <strong>Important:</strong> This verification code will expire in 15 minutes. If you didn't request this verification, please ignore this email.
                </div>
            </div>
            
            <div class="footer">
                <p>This email was sent by NoteWise. If you have any questions, please contact our support team.</p>
                <p>&copy; 2025 NoteWise. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

export function generateVerificationEmailText(verificationCode: string, firstName: string): string {
  return `
Welcome to NoteWise, ${firstName}!

Thank you for signing up. To complete your registration, please verify your email address using the verification code below:

Verification Code: ${verificationCode}

Enter this code on the verification page to activate your account.

Important: This verification code will expire in 15 minutes. If you didn't request this verification, please ignore this email.

This email was sent by NoteWise. If you have any questions, please contact our support team.

© 2025 NoteWise. All rights reserved.
  `;
}

export function generatePasswordResetEmailHTML(resetCode: string, firstName: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - NoteWise</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }
            .container {
                background: white;
                border-radius: 16px;
                padding: 40px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                display: inline-flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
            }
            .logo-icon {
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 24px;
                font-weight: bold;
            }
            .logo-text {
                font-size: 32px;
                font-weight: 800;
                background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .reset-code {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
                padding: 20px;
                border-radius: 12px;
                text-align: center;
                margin: 30px 0;
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                font-family: 'Courier New', monospace;
            }
            .content {
                text-align: center;
                margin-bottom: 30px;
            }
            .content h1 {
                color: #1f2937;
                margin-bottom: 16px;
                font-size: 24px;
            }
            .content p {
                color: #6b7280;
                margin-bottom: 16px;
                font-size: 16px;
            }
            .footer {
                text-align: center;
                padding-top: 30px;
                border-top: 1px solid #e5e7eb;
                color: #9ca3af;
                font-size: 14px;
            }
            .warning {
                background: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 8px;
                padding: 16px;
                margin: 20px 0;
                color: #92400e;
                font-size: 14px;
            }
            .security-notice {
                background: #fef2f2;
                border: 1px solid #ef4444;
                border-radius: 8px;
                padding: 16px;
                margin: 20px 0;
                color: #dc2626;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">
                    <div class="logo-icon">📝</div>
                    <div class="logo-text">NoteWise</div>
                </div>
            </div>
            
            <div class="content">
                <h1>Password Reset Request</h1>
                <p>Hello ${firstName},</p>
                <p>We received a request to reset your password for your NoteWise account. Use the reset code below to create a new password:</p>
                
                <div class="reset-code">
                    ${resetCode}
                </div>
                
                <p>Enter this code on the password reset page to set a new password.</p>
                
                <div class="warning">
                    <strong>Important:</strong> This reset code will expire in 15 minutes for security reasons.
                </div>
                
                <div class="security-notice">
                    <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email and consider changing your password if you suspect unauthorized access to your account.
                </div>
            </div>
            
            <div class="footer">
                <p>This email was sent by NoteWise. If you have any questions, please contact our support team.</p>
                <p>&copy; 2025 NoteWise. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

export function generatePasswordResetEmailText(resetCode: string, firstName: string): string {
  return `
Password Reset Request - NoteWise

Hello ${firstName},

We received a request to reset your password for your NoteWise account. Use the reset code below to create a new password:

Reset Code: ${resetCode}

Enter this code on the password reset page to set a new password.

Important: This reset code will expire in 15 minutes for security reasons.

Security Notice: If you didn't request this password reset, please ignore this email and consider changing your password if you suspect unauthorized access to your account.

This email was sent by NoteWise. If you have any questions, please contact our support team.

© 2025 NoteWise. All rights reserved.
  `;
}