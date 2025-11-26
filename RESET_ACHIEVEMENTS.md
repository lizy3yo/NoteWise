# How to Reset and Test Achievement Notifications

## The Problem
You created your first flashcard but didn't see a notification because the achievement system had already marked it as "unlocked" in localStorage before you could see the notification toast.

## The Solution

### Option 1: Use the Debug Function (Easiest)
1. Open your browser's Developer Console (F12)
2. Type: `window.resetAchievements()`
3. Press Enter
4. Refresh the page
5. You should now see notifications for all your earned achievements

### Option 2: Manual localStorage Clear
1. Open Developer Console (F12)
2. Go to "Application" tab (Chrome) or "Storage" tab (Firefox)
3. Find "Local Storage" → your site URL
4. Delete these keys:
   - `unlocked_achievements`
   - `achievements_initialized`
5. Refresh the page

### Option 3: Clear All Site Data
1. Open Developer Console (F12)
2. Go to "Application" tab
3. Click "Clear site data" button
4. Refresh and log in again

## Testing Achievement Notifications

After resetting, test each achievement:

### Flashcard Achievements
1. **First Steps** - Create your first flashcard
   - Go to Library → Create Set
   - Add cards and save
   - Wait 1 second → Notification should appear 🎉

2. **Flashcard Novice** - Create 3 flashcard sets
3. **Knowledge Master** - Create 10 flashcard sets

### Summary Achievements
1. **Summary Creator** - Generate your first summary
   - Go to Generate page
   - Upload text or file
   - Generate summary
   - Wait 1 second → Notification should appear 🎉

2. **Summary Starter** - Read your first summary
   - Go to a summary detail page
   - Click "Mark as Read"
   - Wait 1 second → Notification should appear 🎉

3. **Summary Scholar** - Read 5 summaries

### Study Session Achievements
1. **Deck Finisher** - Complete 5 study sessions
   - Open a flashcard set
   - Study all cards
   - Complete the session
   - Wait 1 second → Notification should appear 🎉

2. **Session Master** - Complete 10 study sessions
3. **Study Champion** - Complete 50 study sessions

## What Was Fixed

### 1. Race Condition Fix
Added 500ms delay before triggering achievement checks to ensure database writes complete:
- `useFlashcardRequest.ts`
- `useFlashcardGeneration.ts`
- `useSummaryGeneration.ts`
- `useSummaryRequest.ts`
- Study completion page
- Summary reading pages

### 2. Initialization Fix
Changed `isInitialized` to `true` by default so the first achievement check doesn't get skipped.

### 3. First-Time Detection
Added `achievements_initialized` flag to detect first-time users and show all earned achievements.

### 4. Debug Tool
Added `window.resetAchievements()` function for easy testing.

## Expected Behavior

When you earn an achievement:
1. Action completes (create flashcard, read summary, etc.)
2. Backend logs activity to database
3. Frontend waits 500ms
4. Achievement check runs
5. **Notification toast appears** 🎉
6. Achievement is saved to localStorage
7. Achievement page shows it as "Earned"

## Important Notes

- Notifications appear for **newly unlocked** achievements only
- If you already earned an achievement before this fix, you won't see its notification unless you reset
- The 500ms delay is intentional and necessary
- Notifications appear in the top-right corner
- Each notification shows for 5 seconds

## Still Having Issues?

Check the browser console for these logs:
- `🔍 Checking for new achievements...`
- `🎯 Currently unlocked achievements:`
- `✨ Newly unlocked achievement:`
- `🎉 SHOWING ACHIEVEMENT TOAST:`

If you see these logs but no notification, check:
1. Is the AchievementUnlockToast component rendering?
2. Are there any CSS issues hiding the toast?
3. Check for JavaScript errors in console
