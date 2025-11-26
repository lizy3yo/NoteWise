import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json();

    // Validate input
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Log the contact form submission
    const submissionData = {
      name,
      email,
      subject,
      message,
      timestamp: new Date().toISOString(),
    };
    
    console.log('📧 Contact Form Submission:', submissionData);

    // Send email using Resend (if RESEND_API_KEY is configured)
    if (process.env.RESEND_API_KEY) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'NoteWise Contact <onboarding@resend.dev>',
            to: ['not3wis3@gmail.com'],
            reply_to: email,
            subject: `Contact Form: ${subject}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #14b8a6;">New Contact Form Submission</h2>
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Name:</strong> ${name}</p>
                  <p><strong>Email:</strong> ${email}</p>
                  <p><strong>Subject:</strong> ${subject}</p>
                </div>
                <div style="background: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                  <p><strong>Message:</strong></p>
                  <p style="white-space: pre-wrap;">${message}</p>
                </div>
                <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
                  Sent from NoteWise Contact Form at ${new Date().toLocaleString()}
                </p>
              </div>
            `,
          }),
        });

        if (!response.ok) {
          console.error('Resend API error:', await response.text());
        } else {
          console.log('✅ Email sent successfully via Resend');
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }
    } else {
      console.log('⚠️ RESEND_API_KEY not configured. Email not sent.');
      console.log('📝 To enable email sending:');
      console.log('1. Sign up at https://resend.com');
      console.log('2. Get your API key');
      console.log('3. Add RESEND_API_KEY to your .env file');
    }

    // Always return success (form submission is logged)
    return NextResponse.json({
      success: true,
      message: 'Your message has been received. We will get back to you soon!',
    });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message. Please try again.' },
      { status: 500 }
    );
  }
}
