# NoteWise — AI-Powered Study Platform

NoteWise is a comprehensive, production-ready study platform that leverages artificial intelligence to transform how students learn. Built with Next.js 15, React 19, and MongoDB, it provides an intelligent ecosystem for creating, organizing, and mastering study materials through flashcards, summaries, and interactive learning experiences.

## Overview

NoteWise combines modern web technologies with AI capabilities to deliver a seamless learning experience. The platform features intelligent content generation, gamified achievements, real-time progress tracking, and an AI study assistant that helps students maximize their learning potential.

## Key Features

### Core Learning Tools
- **AI-Powered Flashcard Generation**: Automatically create flashcards from uploaded documents (PDF, DOCX, TXT) or pasted text
- **Intelligent Summarization**: Generate structured summaries with customizable formats (outline, detailed, brief, bullet points)
- **Interactive Study Modes**: Multiple study approaches including learn mode, review mode, and spaced repetition
- **Smart Library Management**: Organize flashcards and summaries with search, filtering, and archiving capabilities

### AI Study Assistant
- **NoteWise AI Chatbot**: Context-aware study assistant that helps with:
  - Answering questions about study materials
  - Generating flashcards and summaries on-demand
  - Providing study tips and guidance
  - Session management with save/load functionality

### Gamification & Progress Tracking
- **Achievement System**: Unlock achievements for study milestones and consistent learning
- **Real-time Notifications**: Get instant feedback on unlocked achievements
- **Progress Dashboard**: Visualize study statistics, streaks, and performance metrics
- **Activity History**: Track all learning activities with detailed timestamps

### User Experience
- **Dark Mode Support**: Seamless theme switching with system preference detection
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Real-time Updates**: BroadcastChannel API for instant cross-tab synchronization
- **Accessibility**: WCAG-compliant interface with keyboard navigation support

### Security & Authentication
- **Secure Authentication**: JWT-based auth with access and refresh tokens
- **Email Verification**: Automated email verification workflow
- **Password Security**: Bcrypt hashing with secure password reset flow
- **Protected Routes**: Middleware-based route protection

### Content Management
- **File Upload Support**: Process PDF, DOCX, and TXT files
- **Image Uploads**: Cloudinary integration for flashcard images
- **Archive System**: Soft-delete functionality for content management
- **Export Capabilities**: Download and share study materials

## Technology Stack

### Frontend
- **Next.js 15**: React framework with App Router and Turbopack
- **React 19**: Latest React with concurrent features
- **TypeScript 5**: Type-safe development
- **Tailwind CSS 4**: Utility-first styling with PostCSS
- **Lucide React**: Modern icon library

### Backend
- **Next.js API Routes**: Serverless API endpoints
- **MongoDB**: NoSQL database with Mongoose ODM
- **NextAuth 5**: Authentication and session management
- **JWT**: Secure token-based authentication

### AI & Content Processing
- **Google Generative AI**: Gemini models for content generation
- **OpenAI API**: GPT models for advanced AI features
- **Bytez.js**: Additional AI capabilities
- **Mammoth**: DOCX file parsing
- **PDF-Parse**: PDF text extraction

### Infrastructure
- **Cloudinary**: Image hosting and optimization
- **Nodemailer**: Email delivery system
- **Winston**: Structured logging
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Compression**: Response compression

## Project Structure

```
notewise/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── auth/              # Authentication pages
│   │   ├── student_page/      # Student dashboard & features
│   │   ├── company/           # About, team, blog pages
│   │   ├── support/           # Help center, community
│   │   └── features/          # Feature showcase pages
│   ├── components/            # React components
│   │   ├── achievements/      # Achievement system UI
│   │   ├── chatbot/          # AI assistant interface
│   │   ├── flashcard/        # Flashcard components
│   │   ├── summary/          # Summary components
│   │   ├── notifications/    # Notification system
│   │   └── ui/               # Reusable UI components
│   ├── contexts/             # React contexts
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Core utilities
│   │   ├── ai/              # AI generation logic
│   │   ├── db/              # Database utilities
│   │   └── services/        # Business logic
│   ├── models/              # Mongoose schemas
│   ├── services/            # API service layer
│   ├── types/               # TypeScript definitions
│   └── utils/               # Helper functions
├── public/                  # Static assets
├── scripts/                 # Utility scripts
└── .env                    # Environment variables
```

## Quick Start

### Prerequisites
- Node.js 18+ (20+ recommended)
- npm, yarn, or pnpm
- MongoDB 6+ (local or Atlas)
- Git

### Installation

1. **Clone the repository**
```powershell
git clone <repository-url>
cd notewise
```

2. **Install dependencies**
```powershell
npm install
```

3. **Configure environment variables**

Create a `.env` file in the project root:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Database
MONGO_URI=mongodb://localhost:27017/notewise

# Authentication
JWT_ACCESS_SECRET=your_secure_access_secret_here
JWT_REFRESH_SECRET=your_secure_refresh_secret_here
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=7d
AUTH_SECRET=your_nextauth_secret_here

# AI Services (Optional)
GOOGLE_AI_API_KEY_FLASHCARD=your_google_ai_key
OPENAI_API_KEY=your_openai_key

# Email Service (Optional)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Cloud Storage (Optional)
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
CLOUD_NAME=your_cloud_name
CLOUD_API_KEY=your_api_key
CLOUD_API_SECRET=your_api_secret

# OAuth (Optional)
AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_client_secret
```

4. **Initialize database indexes**
```powershell
npm run db:init-indexes
```

5. **Start development server**
```powershell
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Build

```powershell
npm run build
npm start
```

## API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/logout` | User logout |
| POST | `/api/v1/auth/refresh-token` | Refresh access token |
| POST | `/api/v1/auth/verify-email` | Verify email address |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Reset password |

### Flashcard Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/student_page/flashcard` | List user flashcards |
| POST | `/api/student_page/flashcard` | Create flashcard set |
| GET | `/api/student_page/flashcard/:id` | Get flashcard details |
| PUT | `/api/student_page/flashcard/:id` | Update flashcard |
| DELETE | `/api/student_page/flashcard/:id` | Delete flashcard |
| PATCH | `/api/student_page/flashcard/:id/archive` | Archive flashcard |
| GET | `/api/student_page/flashcard/:id/progress` | Get study progress |
| PATCH | `/api/student_page/flashcard/:id/progress` | Update study progress |

### Summary Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/student_page/summary` | List user summaries |
| POST | `/api/student_page/summary` | Create summary |
| GET | `/api/student_page/summary/:id` | Get summary details |
| PUT | `/api/student_page/summary/:id` | Update summary |
| DELETE | `/api/student_page/summary/:id` | Delete summary |
| PATCH | `/api/student_page/summary/:id/archive` | Archive summary |

### AI & Generation Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chatbot` | AI assistant chat |
| POST | `/api/chatbot/extract-file` | Extract text from files |
| GET | `/api/chatbot/sessions` | List chat sessions |
| POST | `/api/chatbot/sessions` | Save chat session |
| GET | `/api/chatbot/sessions/:id` | Load chat session |

### User & Activity Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/current` | Get current user |
| PUT | `/api/v1/users/current` | Update user profile |
| GET | `/api/student_page/history` | Get activity history |
| POST | `/api/student_page/log-achievement` | Log achievement |
| GET | `/api/student_page/dashboard` | Get dashboard data |

### Utility Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contact` | Send contact message |
| POST | `/api/upload` | Upload images |

## Database Models

### User Model
- Authentication credentials
- Profile information
- Email verification status
- Created/updated timestamps

### Flashcard Model
- Title and description
- Card collection (question/answer pairs)
- User ownership
- Study progress tracking
- Archive status

### Summary Model
- Title and content
- Summary type and format
- User ownership
- View count
- Archive status

### Activity Model
- Activity type tracking
- User actions logging
- Timestamp records
- Achievement triggers

### StudyProgress Model
- Learning progress
- Mastered cards tracking
- Session management
- Completion status

### ChatSession Model
- Conversation history
- Session metadata
- User ownership
- Timestamp tracking

## Development

### Available Scripts

```powershell
# Development
npm run dev              # Start dev server with Turbopack
npm run build           # Create production build
npm start               # Start production server
npm run lint            # Run ESLint

# Database
npm run db:init-indexes # Initialize database indexes
npm run db:stats        # Check database statistics
```

### Code Structure Guidelines

- **Components**: Reusable UI components in `src/components/`
- **Pages**: Next.js pages and routes in `src/app/`
- **Hooks**: Custom React hooks in `src/hooks/`
- **Services**: Business logic in `src/services/`
- **Models**: Database schemas in `src/models/`
- **Utils**: Helper functions in `src/utils/`

### Best Practices

1. **Type Safety**: Use TypeScript for all new code
2. **Component Structure**: Follow atomic design principles
3. **State Management**: Use React Context for global state
4. **API Design**: RESTful endpoints with proper HTTP methods
5. **Error Handling**: Comprehensive error handling and logging
6. **Security**: Input validation and sanitization
7. **Performance**: Code splitting and lazy loading
8. **Accessibility**: WCAG 2.1 AA compliance

## Configuration

### Email Setup

For email verification and password reset functionality:

1. **Gmail**: Use App Passwords (see `EMAIL_SETUP.md`)
2. **SendGrid**: Configure API key for production
3. **AWS SES**: Enterprise email solution

### Cloudinary Setup

For image uploads:

1. Create a Cloudinary account
2. Get your cloud name, API key, and API secret
3. Add credentials to `.env`

### AI Services Setup

#### Google AI (Gemini)
1. Get API key from Google AI Studio
2. Add to `GOOGLE_AI_API_KEY_FLASHCARD`

#### OpenAI (GPT)
1. Get API key from OpenAI platform
2. Add to `OPENAI_API_KEY`

### MongoDB Setup

#### Local MongoDB
```powershell
# Using Docker
docker run --name notewise-mongo -p 27017:27017 -d mongo:6

# Or install MongoDB locally
# https://www.mongodb.com/try/download/community
```

#### MongoDB Atlas (Cloud)
1. Create cluster at mongodb.com/atlas
2. Get connection string
3. Update `MONGO_URI` in `.env`

## Deployment

### Vercel (Recommended)

1. **Connect Repository**
   - Import project to Vercel
   - Connect GitHub repository

2. **Configure Environment Variables**
   - Add all `.env` variables in Vercel dashboard
   - Ensure `NODE_ENV=production`

3. **Deploy**
   - Automatic deployments on push to main branch
   - Preview deployments for pull requests

### Docker Deployment

```dockerfile
# Dockerfile example
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment-Specific Configuration

- **Development**: Use `.env.local`
- **Production**: Use environment variables in hosting platform
- **Testing**: Use `.env.test`

## Security Considerations

### Authentication
- JWT tokens with short expiry times
- Refresh token rotation
- Secure password hashing with bcrypt
- Email verification required

### API Security
- Rate limiting on sensitive endpoints
- CORS configuration
- Helmet security headers
- Input validation and sanitization

### Data Protection
- Environment variables for secrets
- Secure database connections
- HTTPS in production
- XSS and CSRF protection

## Performance Optimization

### Frontend
- Next.js automatic code splitting
- Image optimization with next/image
- Lazy loading components
- React Server Components
- Turbopack for faster builds

### Backend
- Database indexing
- Query optimization
- Response compression
- Caching strategies
- Connection pooling

### Monitoring
- Winston logging
- Error tracking
- Performance metrics
- Database statistics

## Troubleshooting

### Common Issues

**MongoDB Connection Failed**
- Verify `MONGO_URI` is correct
- Check MongoDB service is running
- Ensure network connectivity
- Check firewall rules

**Email Not Sending**
- Verify SMTP credentials
- Check Gmail App Password setup
- Review email service logs
- Test with different email provider

**AI Generation Errors**
- Verify API keys are valid
- Check API quota limits
- Review error logs
- Test with different AI provider

**Build Errors**
- Clear `.next` folder
- Delete `node_modules` and reinstall
- Check Node.js version compatibility
- Review TypeScript errors

**Authentication Issues**
- Clear browser cookies
- Check JWT secrets are set
- Verify token expiry settings
- Review NextAuth configuration

### Debug Mode

Enable detailed logging:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

### Getting Help

- Check existing issues on GitHub
- Review documentation
- Contact support team
- Join community discussions

## Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```powershell
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
   - Follow code style guidelines
   - Add tests if applicable
   - Update documentation
4. **Commit your changes**
   ```powershell
   git commit -m "feat: add your feature description"
   ```
5. **Push to your fork**
   ```powershell
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request**
   - Provide clear description
   - Reference related issues
   - Include testing steps

### Code Style

- Use TypeScript for type safety
- Follow ESLint configuration
- Use Prettier for formatting
- Write meaningful commit messages
- Add comments for complex logic

### Testing

- Test all new features
- Ensure existing tests pass
- Add integration tests for APIs
- Test responsive design
- Verify accessibility

## License

This project is licensed under the Apache License 2.0. See individual file headers for specific licensing information.

## Acknowledgments

- Next.js team for the amazing framework
- MongoDB for the database solution
- Google AI and OpenAI for AI capabilities
- Cloudinary for image hosting
- All contributors and supporters

## Support

For support and questions:
- Email: support@notewise.com
- Documentation: [docs.notewise.com](https://docs.notewise.com)
- Community: [community.notewise.com](https://community.notewise.com)
- Issues: GitHub Issues

## Team

Built with ❤️ by the NoteWise team

---

**NoteWise** - Empowering students through intelligent learning



