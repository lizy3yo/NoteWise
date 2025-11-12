# Achievements Page Debugging & Fix Guide

## Issues Fixed

### 1. ✅ Practice Tests Completed Counter
**Problem**: The `practiceTestsCompleted` metric was hardcoded to `0` instead of counting actual activities.

**Fix**: Now properly counts activities with type `practice_test.submit`, `practice_test.completed`, or `test.submit`.

```typescript
// Before (always returned 0)
const practiceTestsCompleted = useMemo(() => {
    return 0;
}, [flashcards, summaries]);

// After (counts real activities)
const practiceTestsCompleted = useMemo(() => {
    try {
        const count = (activities || []).filter(a => {
            const t = (a.type || a.action || '')?.toString().toLowerCase();
            return t.includes('practice_test.submit') || t.includes('practice_test.completed') || t.includes('test.submit');
        }).length;
        console.log('✅ Practice tests completed:', count);
        return count;
    } catch (e) {
        return 0;
    }
}, [activities]);
```

### 2. ✅ Added Debugging Console Logs
Added console logs to help diagnose activity tracking:

- `📊 Activities loaded: X activities` - Total activities fetched
- `📊 Activity types: [...]` - All activity types in the database
- `📚 Flashcard sessions completed: X` - Count of flashcard study sessions
- `📖 Summary sessions completed: X` - Count of summary read sessions
- `✅ Practice tests completed: X` - Count of practice test submissions

### 3. ✅ Fixed useMemo Dependencies
Updated the achievements calculation dependencies to include all used variables:
- Added `summarySessionsCompleted`
- Added `favoritesStudied`

## How the Metrics Work

### Flashcard Sessions Completed
**Activity Type**: `flashcard.study_complete`

**When it's logged**: When a user completes a flashcard study session in the flashcard viewer.

**Location**: `src/app/student_page/library/[flashcardId]/flashcard/page.tsx` (around line 539-555)

```typescript
await fetch('/api/student_page/log-activity', {
  method: 'POST',
  body: JSON.stringify({
    userId: uid,
    type: 'flashcard.study_complete',
    action: 'Studied flashcard set',
    meta: {
      flashcardId: flashcard._id,
      flashcardTitle: flashcard.title,
      cardsStudied,
      studiedFavorites,
      ratingCounts
    },
    progress: 100
  })
});
```

### Summary Sessions Completed
**Activity Type**: `summary.read`

**When it's logged**: When a user clicks "Mark as Read" on a summary.

**Location**: `src/app/api/student_page/summary/mark-read/route.ts` (around line 29)

```typescript
await Activity.create({
  user: userId,
  type: 'summary.read',
  action: 'Read summary',
  meta: { summaryId, title }
});
```

### Practice Tests Completed
**Activity Type**: `practice_test.submit`

**When it's logged**: When a user submits a practice test.

**Location**: `src/app/api/student_page/practice-test/submit/route.ts` (around line 109)

```typescript
await logActivity({
  userId: String(userId),
  type: 'practice_test.submit',
  action: 'completed',
  meta: {
    submissionId: String(submission._id),
    practiceTestId,
    score,
    pointsEarned,
    totalPoints,
    isPerfectScore
  },
  progress: 100
});
```

## Checking if Data is Being Stored

### 1. Check Browser Console
Open the achievements page and check the browser console for the debug logs:

```
📊 Activities loaded: 15 activities
📊 Activity types: ["flashcard.study_complete", "summary.read", "practice_test.submit", ...]
📚 Flashcard sessions completed: 5
📖 Summary sessions completed: 3
✅ Practice tests completed: 2
```

### 2. Check Database Directly
If you have MongoDB access, query the activities collection:

```javascript
// Get all activities for a user
db.activities.find({ user: ObjectId("your-user-id") })

// Count by type
db.activities.aggregate([
  { $match: { user: ObjectId("your-user-id") } },
  { $group: { _id: "$type", count: { $sum: 1 } } }
])
```

### 3. Check API Response
Open DevTools Network tab and check the response from:
`/api/student_page/history?userId=YOUR_USER_ID`

Look for activities with these types:
- `flashcard.study_complete`
- `summary.read`
- `practice_test.submit`

## Common Issues & Solutions

### Issue: All counters show 0

**Possible Causes**:
1. ❌ No activities have been logged yet (user hasn't completed any sessions)
2. ❌ Activities are being logged with different type names
3. ❌ User ID mismatch (activities logged for different user)
4. ❌ Database connection issue

**Solutions**:
1. ✅ Complete a flashcard session, mark a summary as read, or submit a practice test
2. ✅ Check the console logs to see what activity types are actually in the database
3. ✅ Verify the user ID in localStorage matches the activities in the database
4. ✅ Check the `/api/student_page/history` endpoint is returning data

### Issue: Data resets daily / doesn't persist

**Explanation**: The counters are **cumulative totals** that never reset. They count ALL activities ever logged, not just today's activities.

The code does NOT filter by date:
```typescript
// This counts ALL activities, not just today
const count = activities.filter(a => 
  a.type.includes('flashcard.study_complete')
).length;
```

**If you want daily/weekly stats**, you would need to add date filtering:
```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);

const todayCount = activities.filter(a => {
  const activityDate = new Date(a.createdAt);
  activityDate.setHours(0, 0, 0, 0);
  return activityDate.getTime() === today.getTime() && 
         a.type.includes('flashcard.study_complete');
}).length;
```

### Issue: Counter shows data but "Your Progress" is still 0

**Check**:
1. Open browser console
2. Look for the debug logs showing the actual counts
3. If logs show correct numbers but UI shows 0, it's a rendering issue
4. Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## Testing the Fix

### Test Flashcard Sessions:
1. Go to Library
2. Open a flashcard set
3. Study through all cards (or rate them)
4. Complete the session
5. Go back to Achievements page
6. Check "Flashcard sessions completed" counter increased by 1

### Test Summary Sessions:
1. Go to Summaries
2. Open a summary
3. Click "Mark as Read"
4. Go to Achievements page
5. Check "Summary sessions completed" counter increased by 1

### Test Practice Tests:
1. Create or open a practice test
2. Complete and submit it
3. Go to Achievements page
4. Check "Practice tests complete" counter increased by 1

## Data Persistence Verification

The achievements page loads data from these sources:

1. **Flashcards**: `/api/student_page/flashcard?userId=X`
2. **Summaries**: `/api/student_page/summary?userId=X`
3. **Activities**: `/api/student_page/history?userId=X` ← This is the critical one

The activities are stored in MongoDB in the `activities` collection and should persist indefinitely unless manually deleted.

To verify persistence:
1. Complete an activity (e.g., study a flashcard set)
2. Close browser completely
3. Come back tomorrow
4. Open achievements page
5. Counter should still show the same number (or higher if you did more)

## Additional Notes

- The achievements page auto-refreshes when you switch tabs or return to the window
- It uses BroadcastChannel API to sync across multiple tabs
- localStorage is used as a fallback for the study streak only
- All other metrics come from the database via the activities API
