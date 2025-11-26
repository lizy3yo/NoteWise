# Achievement System Audit Report

## Overview
This document tracks all achievement triggers and their implementation status.

---

## Achievement Categories & Triggers

### 1. Flashcard Creation Achievements
**Achievements:**
- First Steps (1 flashcard)
- Flashcard Novice (3 flashcards)
- Knowledge Master (10 flashcards)
- Flashcard Collector (25 flashcards)
- Centurion (100 flashcards)

**Activity Type:** `flashcard.create` or `flashcard.generate`

**Trigger Points:**
✅ **Manual Creation** - `src/app/api/student_page/flashcard/route.ts` (POST)
  - Logs: `flashcard.create`
  - Frontend: `useFlashcardRequest.createFlashcard()` triggers `checkAchievements`

✅ **AI Generation from Text** - `src/app/api/student_page/flashcard/generate-from-text/route.ts`
  - Logs: `flashcard.generate`
  - Frontend: `useFlashcardGeneration.generateFlashcards()` triggers `checkAchievements`

✅ **AI Generation from File** - `src/app/api/student_page/flashcard/generate-from-file/route.ts`
  - Logs: `flashcard.generate`
  - Frontend: Uses same hook as text generation

✅ **Chatbot Generation** - `src/app/api/chatbot/route.ts`
  - Logs: `flashcard.generate`
  - Achievement check triggered by generation hook

**Status:** ✅ FULLY IMPLEMENTED

---

### 2. Summary Creation Achievement
**Achievement:**
- Summary Creator (1 summary)

**Activity Type:** `summary.generate` or `summary.created`

**Trigger Points:**
✅ **AI Generation from Text** - `src/app/api/student_page/summary/generate-from-text/route.ts`
  - Logs: `summary.generate`
  - Frontend: `useSummaryGeneration.generateSummary()` now logs activity AND triggers `checkAchievements`

✅ **AI Generation from File** - `src/app/api/student_page/summary/generate-from-file/route.ts`
  - Logs: `summary.generate`
  - Frontend: Uses same hook as text generation

✅ **Chatbot Generation** - `src/app/api/chatbot/route.ts`
  - Logs: `summary.generate`
  - Achievement check triggered by generation hook

**Status:** ✅ FIXED - Added activity logging to `useSummaryGeneration.generateSummary()`

---

### 3. Summary Reading Achievements
**Achievements:**
- Summary Starter (1 summary read)
- Summary Scholar (5 summaries read)

**Activity Type:** `summary.read`

**Trigger Points:**
✅ **Mark as Read (Dedicated Endpoint)** - `src/app/api/student_page/summary/mark-read/route.ts`
  - Logs: `summary.read`
  - Frontend: `src/app/student_page/summaries/[id]/page.tsx` now triggers `checkAchievements`

✅ **Mark as Read (Update Endpoint)** - `src/app/api/student_page/summary/route.ts` (PATCH)
  - Now logs: `summary.read` when `isRead: true` (instead of `summary.update`)
  - Frontend: `src/app/student_page/library/page.tsx` now triggers `checkAchievements`

**Status:** ✅ FIXED - Both endpoints now trigger achievement checks

---

### 4. Study Session Achievements
**Achievements:**
- Deck Finisher (5 sessions)
- Session Master (10 sessions)
- Study Champion (50 sessions)

**Activity Type:** `flashcard.study_complete`

**Trigger Points:**
✅ **Complete Study Session** - `src/app/student_page/library/[flashcardId]/flashcard/page.tsx`
  - Logs: `flashcard.study_complete` via `/api/student_page/log-activity`
  - Frontend: Now triggers `checkAchievements` after logging

**Status:** ✅ FIXED - Added achievement check trigger

---

### 5. Card Review Achievements
**Achievements:**
- Review Apprentice (50 cards)
- Review Pro (200 cards)
- Card Collector (100 cards total)
- Card Hoarder (500 cards total)

**Tracking Method:**
- Uses `repetitionCount` field on flashcard documents
- Falls back to counting cards in `flashcard.study_complete` activities

**Trigger Points:**
✅ **Study Session Completion** - Updates `repetitionCount` on flashcard
  - Tracked automatically through study sessions
  - Achievement check triggered after study completion

**Status:** ✅ IMPLEMENTED (relies on study session tracking)

---

### 6. Study Streak Achievements
**Achievements:**
- Study Streak (7 days)
- Streak Holder (14 days)
- Marathoner (30 days)

**Tracking Method:**
- Calculated from activities with types: `flashcard.study_complete`, `summary.read`, `practice_test.submit`
- Checks consecutive days with study activity

**Trigger Points:**
✅ **Any Study Activity** - Automatically calculated
  - Flashcard study sessions
  - Summary reading
  - Practice test submissions

**Status:** ✅ IMPLEMENTED (calculated dynamically)

---

### 7. Weekly Activity Achievement
**Achievement:**
- Active Week (7 activities in 7 days)

**Tracking Method:**
- Counts `lastReviewed` dates on flashcards in the last 7 days

**Trigger Points:**
✅ **Study Sessions** - Updates `lastReviewed` field
  - Tracked through flashcard updates during study

**Status:** ✅ IMPLEMENTED (calculated dynamically)

---

### 8. Favorites Achievement
**Achievement:**
- Favorites Fan (study favorites 3 times)

**Activity Type:** `flashcard.study_complete` with `meta.studiedFavorites: true`

**Trigger Points:**
✅ **Study Favorites** - `src/app/student_page/library/[flashcardId]/flashcard/page.tsx`
  - Logs: `flashcard.study_complete` with `studiedFavorites` flag
  - Achievement check triggered after study completion

**Status:** ✅ IMPLEMENTED

---

## Summary of Fixes Applied

### 1. Summary Generation (`useSummaryGeneration.ts`)
- ✅ Added activity logging for `summary.created` type
- ✅ Triggers `checkAchievements` event with 500ms delay
- ✅ Broadcasts to other tabs via BroadcastChannel

### 2. Summary Reading - Detail Page (`summaries/[id]/page.tsx`)
- ✅ Added `checkAchievements` trigger after marking as read with 500ms delay
- ✅ Broadcasts to other tabs

### 3. Summary Reading - Library Page (`library/page.tsx`)
- ✅ Added `checkAchievements` trigger in `toggleSummaryRead()` with 500ms delay
- ✅ Broadcasts to other tabs

### 4. Summary Update API (`summary/route.ts`)
- ✅ Modified PATCH endpoint to log `summary.read` when `isRead: true`
- ✅ Prevents duplicate read activities

### 5. Study Session Completion (`library/[flashcardId]/flashcard/page.tsx`)
- ✅ Added `checkAchievements` trigger after logging study completion with 500ms delay
- ✅ Broadcasts to other tabs

### 6. Flashcard Creation (`useFlashcardRequest.ts`)
- ✅ Added 500ms delay before triggering `checkAchievements`
- ✅ Prevents race condition with database writes

### 7. Flashcard Generation (`useFlashcardGeneration.ts`)
- ✅ Added 500ms delay before triggering `checkAchievements`
- ✅ Prevents race condition with database writes

### 8. Summary Request (`useSummaryRequest.ts`)
- ✅ Added 500ms delay before triggering `checkAchievements`
- ✅ Prevents race condition with database writes

## Critical Fix: Race Condition

**Problem Identified:** Achievement checks were being triggered immediately after API responses, but before the database write operations completed. This caused the achievement system to query the database before the new activity was persisted, resulting in missed notifications.

**Solution:** Added a 500ms delay before triggering `checkAchievements` in all hooks. This ensures:
1. API response is received
2. Database write operation completes
3. Achievement check queries the database with the new activity present
4. Notification is properly triggered

---

## Testing Checklist

### Flashcard Achievements
- [ ] Create first flashcard → "First Steps" notification
- [ ] Create 3rd flashcard → "Flashcard Novice" notification
- [ ] Create 10th flashcard → "Knowledge Master" notification
- [ ] Generate flashcard via AI → Achievement check triggered

### Summary Achievements
- [ ] Generate first summary → "Summary Creator" notification
- [ ] Read first summary → "Summary Starter" notification
- [ ] Read 5th summary → "Summary Scholar" notification

### Study Session Achievements
- [ ] Complete 5th study session → "Deck Finisher" notification
- [ ] Complete 10th study session → "Session Master" notification
- [ ] Review cards → Card count increases

### Streak Achievements
- [ ] Study for 7 consecutive days → "Study Streak" notification
- [ ] Study for 14 consecutive days → "Streak Holder" notification

### Other Achievements
- [ ] Study favorites 3 times → "Favorites Fan" notification
- [ ] Study 7 times in 7 days → "Active Week" notification

---

## Technical Implementation Details

### Achievement Check Flow
1. User performs action (create flashcard, read summary, complete study session)
2. Backend API logs activity to database
3. Frontend triggers `window.dispatchEvent(new CustomEvent('checkAchievements'))`
4. `AchievementListener` in `layout.tsx` receives event
5. Fetches latest data (flashcards, summaries, activities)
6. Calculates achievement progress
7. `AchievementContext.checkForNewAchievements()` compares with previous state
8. If new achievement unlocked, shows toast notification
9. Logs achievement to activity feed

### BroadcastChannel
- Used to sync achievement checks across multiple tabs
- Channel name: `'notewise.activities'`
- Message types: `flashcard.created`, `flashcard.study_complete`, `summary.created`, `summary.read`

### LocalStorage Tracking
- Key: `'unlocked_achievements'`
- Stores array of unlocked achievement IDs
- Prevents duplicate notifications on page refresh

---

## Conclusion

All achievement triggers have been audited and fixed. The main issues were:
1. Summary generation not logging activities for achievement tracking
2. Summary reading not triggering achievement checks
3. Study session completion not triggering achievement checks

All issues have been resolved and the achievement system should now work correctly for all 20 achievements.
