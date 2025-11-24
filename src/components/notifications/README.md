# Notification Center

A comprehensive notification system that displays all user activities in real-time with beautiful notification cards.

## Features

### 🎴 Beautiful Notification Cards
- **Streak Notifications**: "7-Day Study Streak! 🔥" cards with action buttons
- **Milestone Notifications**: Celebrate achievements like "10 Flashcard Sets Created! 📚"
- **Achievement Unlocks**: Special cards for unlocked achievements
- **Activity Feed**: Regular activity items with icons and timestamps

### 🔔 Smart Notifications
- **Auto-generated**: System automatically creates notifications for:
  - Study streaks (3, 7, 14, 30, 60, 100 days)
  - Flashcard milestones (1, 5, 10, 25, 50, 100 sets)
  - Study session milestones (5, 10, 25, 50, 100 sessions)
  - Summary reading milestones (5, 10, 25, 50 summaries)
  - Achievement unlocks

- **Unread Indicator**: Red dot badge shows new activities from the last 24 hours

- **Auto-refresh**: Updates every 30 seconds to show latest activities

- **Responsive Design**: Works on mobile and desktop with dropdown panel

### 📊 Activity Tracking
Shows all user activities including:
- Flashcard creation, studying, and updates
- Summary generation and reading
- Folder management
- Achievement unlocks
- Practice test completions
- Profile updates

## Usage

```tsx
import NotificationCenter from '@/components/notifications/NotificationCenter';

<NotificationCenter userId={userId} />
```

## Activity Types Tracked

### Flashcards
- `flashcard.create` - Created a new flashcard set
- `flashcard.study_complete` - Completed a study session
- `flashcard.generate` - Generated flashcards with AI
- `flashcard.update` - Updated a flashcard set
- `flashcard.delete` - Deleted a flashcard set

### Summaries
- `summary.generate` - Generated a summary
- `summary.read` - Read a summary
- `summary.update` - Updated a summary
- `summary.delete` - Deleted a summary

### Folders
- `folder.create` - Created a new folder
- `folder.rename` - Renamed a folder
- `folder.delete` - Deleted a folder
- `folder.favorite` - Added to favorites

### Achievements
- `achievement.*` - Achievement unlocked

### Practice Tests
- `practice_test.submit` - Completed a practice test
- `practice_test.generate` - Generated a practice test

### Profile
- `profile.update` - Updated profile
- `profile.password_change` - Changed password

## Integration Points

The notification bell is integrated in:
1. **Mobile Header** - Top right corner next to dark mode toggle
2. **Desktop Sidebar** - Next to the hamburger menu when expanded

## Styling

Uses Tailwind CSS with dark mode support. Color-coded icons:
- Teal: Flashcards
- Indigo: Summaries
- Amber: Achievements
- Cyan: Folders
- Yellow: Favorites
- Slate: General activities
