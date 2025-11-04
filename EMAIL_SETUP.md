# Email Verification Setup Guide

## Gmail Configuration

To enable email verification, you need to configure Gmail with an App Password:

### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account settings
2. Navigate to Security
3. Enable 2-Factor Authentication if not already enabled

### Step 2: Generate App Password
1. In Google Account Security settings
2. Go to "App passwords"
3. Select "Mail" as the app
4. Select "Other" as the device and name it "NoteWise"
5. Copy the generated 16-character password

### Step 3: Update Environment Variables
Update your `.env` file with:

```env
EMAIL_USER=your-gmail-address@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
```

### Step 4: Alternative Email Services

If you prefer other email services, update the transporter configuration in `src/lib/email.ts`:

#### For Outlook/Hotmail:
```javascript
const transporter = nodemailer.createTransporter({
  service: 'hotmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});
```

#### For Custom SMTP:
```javascript
const transporter = nodemailer.createTransporter({
  host: 'your-smtp-server.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});
```

## Testing

After configuration, test the email verification by:
1. Creating a new account
2. Check your email for the verification code
3. Enter the code on the verification page

## Security Notes

- Never commit your actual email credentials to version control
- Use environment variables for all sensitive information
- Consider using a dedicated email service like SendGrid or AWS SES for production