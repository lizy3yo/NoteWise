import { logger } from '@/lib/winston';
import User from '@/models/user';
import Activity from '@/models/activity';
import Flashcard from '@/models/flashcard';
import { Summary } from '@/models/summary';
import StudyProgress from '@/models/study_progress';

export interface UserContext {
    profile: {
        username: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
    };
    achievements: {
        totalFlashcards: number;
        totalSummaries: number;
        totalActivities: number;
        recentAchievements: string[];
    };
    history: {
        recentActivities: Array<{
            type: string;
            action: string;
            createdAt: Date;
        }>;
        recentFlashcards: Array<{
            title: string;
            createdAt: Date;
        }>;
        recentSummaries: Array<{
            title: string;
            createdAt: Date;
        }>;
    };
    stats: {
        studyStreak: number;
        totalStudyTime: number;
        averageScore: number;
    };
}

export class ChatbotContextService {
    /**
     * Get landing page context - information about the system
     */
    static getLandingPageContext(): string {
        return `
# NoteWise - AI-Powered Study Platform

## What is NoteWise?
NoteWise is an AI-powered study companion that transforms learning materials into interactive experiences, helping students learn smarter and retain knowledge better.

## Key Features:
1. **AI-Powered Summarization**: Automatically generates clear, concise summaries from uploaded notes and documents (PDF, DOCX, TXT support)
2. **Flashcard Generation Engine**: Transforms key concepts from summaries into interactive flashcards for active recall
3. **File Upload Interface**: Drag & drop interface supporting multiple file formats
4. **Summary Customization**: Adjust summary length, focus, or writing style to match study preferences
5. **Flashcard Review Mode**: Interactive quiz-like experience to help test and retain knowledge

## How It Works:
1. **Upload Your Materials**: Drag and drop study notes, PDFs, or documents
2. **Get AI Summaries**: AI analyzes content and creates clear, concise summaries
3. **Study with Flashcards**: Practice with automatically generated flashcards

## Target Users:
- **The Overloaded Student**: Needs quick summaries of long readings
- **The Active Learner**: Enjoys interactive study methods like flashcards
- **The Efficient Achiever**: Values organized and accessible notes

## Benefits:
- Transform learning materials into digestible summaries
- Create interactive flashcards for active learning
- Save time and effort with AI assistance
- Learn faster and smarter
- Focus on understanding rather than memorizing

## Getting Started:
Sign up for free to start transforming your study experience with AI-powered tools.
`;
    }

    /**
     * Get system features context for authenticated users
     */
    static getSystemFeaturesContext(): string {
        return `
# NoteWise System Features (Authenticated)

## Available Features:
1. **Generate Flashcards**: Create flashcards from text, uploaded files, or existing summaries
2. **Generate Summaries**: Create AI-powered summaries from uploaded documents (PDF, DOCX, TXT)
3. **Library Management**: Organize flashcards and summaries in folders
4. **Study Progress Tracking**: Track your learning progress and achievements
5. **Profile Management**: Customize your profile and settings
6. **Activity History**: View your recent study activities

## How to Use:
- **Upload Files**: Go to Summaries or Flashcards section and upload PDF, DOCX, or TXT files
- **Generate from Text**: Paste text directly to generate flashcards or summaries
- **View History**: Check your activity history and achievements in your profile
- **Organize**: Use folders to organize your study materials

## System Purpose:
NoteWise helps you study more efficiently by:
- Converting complex materials into simple summaries
- Creating interactive flashcards for active recall
- Tracking your progress and achievements
- Organizing all your study materials in one place
`;
    }

    /**
     * Get user-specific context (achievements, history, stats)
     */
    static async getUserContext(userId: string): Promise<UserContext> {
        try {
            // Get user profile
            const user = await User.findById(userId).select('username firstName lastName email role');
            if (!user) {
                throw new Error('User not found');
            }

            // Get counts
            const [flashcardCount, summaryCount, activityCount] = await Promise.all([
                Flashcard.countDocuments({ user: userId }),
                Summary.countDocuments({ user: userId }),
                Activity.countDocuments({ user: userId })
            ]);

            // Get recent activities
            const recentActivities = await Activity.find({ user: userId })
                .sort({ createdAt: -1 })
                .limit(10)
                .select('type action createdAt');

            // Get recent flashcards
            const recentFlashcards = await Flashcard.find({ user: userId })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('title createdAt');

            // Get recent summaries
            const recentSummaries = await Summary.find({ userId: userId })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('title createdAt');

            // Get study progress - note: StudyProgress is per flashcard, so we'll just get one for stats
            const studyProgress = await StudyProgress.findOne({ user: userId });

            // Calculate achievements
            const recentAchievements: string[] = [];
            if (flashcardCount >= 10) recentAchievements.push(`Created ${flashcardCount} flashcard sets`);
            if (summaryCount >= 5) recentAchievements.push(`Generated ${summaryCount} summaries`);
            if (activityCount >= 50) recentAchievements.push(`Reached ${activityCount} study activities`);

            return {
                profile: {
                    username: user.username,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    role: user.role
                },
                achievements: {
                    totalFlashcards: flashcardCount,
                    totalSummaries: summaryCount,
                    totalActivities: activityCount,
                    recentAchievements
                },
                history: {
                    recentActivities: recentActivities.map(a => ({
                        type: a.type,
                        action: a.action,
                        createdAt: a.createdAt!
                    })),
                    recentFlashcards: recentFlashcards.map((f: any) => ({
                        title: f.title,
                        createdAt: f.createdAt!
                    })),
                    recentSummaries: recentSummaries.map((s: any) => ({
                        title: s.title,
                        createdAt: s.createdAt
                    }))
                },
                stats: {
                    studyStreak: 0, // StudyProgress doesn't have streak field
                    totalStudyTime: 0, // StudyProgress doesn't have totalStudyTime field
                    averageScore: 0 // Would need to calculate from practice test submissions
                }
            };
        } catch (error) {
            logger.error('Failed to get user context:', error);
            throw error;
        }
    }

    /**
     * Format user context for AI prompt
     */
    static formatUserContextForAI(context: UserContext): string {
        return `
# User Profile:
- Name: ${context.profile.firstName} ${context.profile.lastName}
- Username: ${context.profile.username}
- Email: ${context.profile.email}
- Role: ${context.profile.role}

# Achievements:
- Total Flashcard Sets: ${context.achievements.totalFlashcards}
- Total Summaries: ${context.achievements.totalSummaries}
- Total Activities: ${context.achievements.totalActivities}
${context.achievements.recentAchievements.length > 0 ? `- Recent Achievements:\n${context.achievements.recentAchievements.map(a => `  * ${a}`).join('\n')}` : ''}

# Study Stats:
- Study Streak: ${context.stats.studyStreak} days
- Total Study Time: ${Math.round(context.stats.totalStudyTime / 60)} hours
- Average Score: ${context.stats.averageScore}%

# Recent Activity:
${context.history.recentActivities.slice(0, 5).map(a => `- ${a.action} (${a.type}) - ${new Date(a.createdAt).toLocaleDateString()}`).join('\n')}

# Recent Flashcards:
${context.history.recentFlashcards.map(f => `- ${f.title} - ${new Date(f.createdAt).toLocaleDateString()}`).join('\n')}

# Recent Summaries:
${context.history.recentSummaries.map(s => `- ${s.title} - ${new Date(s.createdAt).toLocaleDateString()}`).join('\n')}
`;
    }
}