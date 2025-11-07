# Activity History Feature - Implementation Guide

## Overview
The History page now tracks **all user actions** across the NoteWise platform with a professional, filterable timeline interface.

## Logged Activities

### Flashcards
- ✅ **flashcard.create** - When user creates a new flashcard set
- ✅ **flashcard.update** - When user edits a flashcard set
- ✅ **flashcard.delete** - When user deletes a flashcard set
- ✅ **flashcard.generate** - When AI generates flashcards (from text/file/analyze)

### Summaries
- ✅ **summary.generate** - When AI generates a summary (from text/file)
- ✅ **summary.update** - When user edits a summary
- ✅ **summary.delete** - When user deletes a summary

### Practice Tests
- ✅ **practice_test.submit** - When user completes and submits a test
- ✅ **practice_test.generate** - When AI generates a practice test

### Folders (Library)
- ✅ **folder.create** - When user creates a new folder
- ✅ **folder.rename** - When user renames a folder
- ✅ **folder.delete** - When user deletes a folder
- ✅ **folder.favorite** - When user adds/removes folder from favorites

### Profile
- ✅ **profile.update** - When user updates email, first name, or last name
- ✅ **profile.password_change** - When user changes their password

### Appearance
- ✅ **appearance.theme_change** - When user changes theme (light/dark/system)

### Authentication
- ✅ **auth.login** - When user logs in
- ✅ **auth.logout** - When user logs out

## Files Modified

### Backend (Activity Logging)
1. **`src/models/activity.ts`** - Activity Mongoose model
2. **`src/lib/activity.ts`** - `logActivity()` helper function
3. **`src/app/api/student_page/history/route.ts`** - GET endpoint for activities
4. **`src/app/api/student_page/flashcard/route.ts`** - Logs create
5. **`src/app/api/student_page/flashcard/[flashcardId]/route.ts`** - Logs update/delete
6. **`src/app/api/student_page/flashcard/analyze/route.ts`** - Logs analyze generation
7. **`src/app/api/student_page/flashcard/generate-from-text/route.ts`** - Logs text generation
8. **`src/app/api/student_page/flashcard/generate-from-file/route.ts`** - Logs file generation
9. **`src/app/api/student_page/summary/route.ts`** - Logs update/delete
10. **`src/app/api/student_page/summary/generate-from-text/route.ts`** - Logs text generation
11. **`src/app/api/student_page/summary/generate-from-file/route.ts`** - Logs file generation
12. **`src/app/api/student_page/practice-test/submit/route.ts`** - Logs submission
13. **`src/app/api/student_page/practice-test/generate/route.ts`** - Logs test generation
14. **`src/app/api/student_page/folder/route.ts`** - Logs folder create/update/delete/favorite
15. **`src/app/api/v1/users/profile/route.ts`** - Logs profile updates
16. **`src/app/api/v1/users/change-password/route.ts`** - Logs password changes

### Frontend (UI)
17. **`src/app/student_page/history/page.tsx`** - Professional activity timeline

## To Be Implemented (Client-Side Events)
- **Theme changes** (`appearance.theme_change`) - Add to theme toggle component
- **Login/Logout** (`auth.login`, `auth.logout`) - Add to auth handlers

## Features

### 📊 Statistics Dashboard
- **Total Activities** - Overall count with trending icon
- **Flashcards** - Count of flashcard-related actions
- **Summaries** - Count of summary-related actions
- **Tests** - Count of practice test submissions

### 🔍 Filters
- **Type Filter**: All Activities | Flashcards | Summaries | Practice Tests
- **Time Filter**: All Time | Today | Last 7 Days | Last 30 Days

### 📅 Timeline View
- **Grouped by Date** - Activities organized by day
- **Color-Coded Icons** - Each activity type has unique icon and color
- **Rich Metadata** - Shows card count, word count, scores, subjects
- **Progress Bars** - For in-progress activities
- **Time Stamps** - Precise time of each action

### 🎨 Professional Design
- **Gradient stat cards** with matching icon colors
- **Smooth animations** and hover effects
- **Dark mode support** throughout
- **Responsive layout** for mobile/tablet/desktop
- **Empty states** with helpful messaging
- **Loading states** with spinner

## Activity Metadata Examples

```typescript
// Flashcard Create
{
  type: 'flashcard.create',
  action: 'created',
  meta: {
    flashcardId: '...',
    title: 'Biology Chapter 5',
    cardCount: 15,
    subject: 'Science'
  }
}

// Summary Generate
{
  type: 'summary.generate',
  action: 'generated from text',
  meta: {
    summaryId: '...',
    title: 'History Notes',
    wordCount: 450,
    subject: 'History'
  }
}

// Practice Test Submit
{
  type: 'practice_test.submit',
  action: 'completed',
  meta: {
    submissionId: '...',
    score: 85,
    pointsEarned: 17,
    totalPoints: 20,
    isPerfectScore: false
  }
}
```

## How to Add More Activities

### 1. Import the helper in your API route:
```typescript
import { logActivity } from '@/lib/activity';
```

### 2. Call after successful action:
```typescript
await logActivity({
  userId: String(userId),
  type: 'category.action',  // e.g., 'profile.update', 'library.add'
  action: 'action description',  // e.g., 'updated', 'added to library'
  meta: {
    // Any relevant data
    itemId: '...',
    title: '...',
    customField: '...'
  },
  progress: 100  // Optional: 0-100 for progress tracking
});
```

### 3. Add icon/color mapping in history page:
```typescript
// In src/app/student_page/history/page.tsx
const activityIcons = {
  // ... existing
  'profile.update': Edit,
  'library.add': Plus,
};

const activityColors = {
  // ... existing
  'profile.update': 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  'library.add': 'text-teal-600 bg-teal-50 dark:bg-teal-900/20',
};
```

## Future Enhancements (Optional)

- [ ] **Export History** - Download as CSV/PDF
- [ ] **Activity Details Modal** - Click to see full details
- [ ] **Search** - Search by title/subject
- [ ] **Achievements** - Badges for milestones (e.g., "100 flashcards created")
- [ ] **Analytics** - Charts showing activity trends over time
- [ ] **Notifications** - Real-time updates when activities complete
- [ ] **Undo Actions** - Restore deleted items from history

## Testing Checklist

- [x] Create a flashcard set → Check history
- [x] Generate AI flashcards → Check history
- [x] Update a flashcard → Check history
- [x] Delete a flashcard → Check history
- [x] Generate a summary → Check history
- [x] Update a summary → Check history
- [x] Delete a summary → Check history
- [x] Submit a practice test → Check history
- [ ] Verify filters work correctly
- [ ] Verify stats update in real-time
- [ ] Test dark mode appearance
- [ ] Test mobile responsiveness

## Notes
- Activity logging is **non-blocking** - failures won't break main flows
- Activities are **paginated** (50 per request by default)
- **Authentication** uses existing token system (Authorization header)
- **Backward compatible** - userId query param still supported
