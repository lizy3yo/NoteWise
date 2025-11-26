# Quick Reference Guide - Data Fetching Architecture

## 🚀 Quick Start

### 1. Import the hook you need
```typescript
import { useAuthRequest, useFlashcardRequest, useSummaryRequest, useUserRequest } from '@/hooks';
```

### 2. Use in your component
```typescript
const { flashcards, isLoading, error } = useFlashcardRequest(userId);
```

### 3. That's it! Data is automatically fetched and cached.

---

## 📚 Hook Reference

### useAuthRequest()
```typescript
const {
  login,              // (credentials) => Promise<ApiResponse>
  register,           // (data) => Promise<ApiResponse>
  logout,             // () => Promise<ApiResponse>
  forgotPassword,     // (email) => Promise<ApiResponse>
  resetPassword,      // (data) => Promise<ApiResponse>
  verifyEmail,        // (data) => Promise<ApiResponse>
  resendVerification, // (email) => Promise<ApiResponse>
  isLoading,          // boolean
  error,              // string | null
} = useAuthRequest();
```

### useFlashcardRequest(userId)
```typescript
const {
  flashcards,        // Flashcard[]
  fetchFlashcards,   // (useCache?) => Promise<ApiResponse>
  fetchFlashcard,    // (id, useCache?) => Promise<ApiResponse>
  createFlashcard,   // (data) => Promise<ApiResponse>
  updateFlashcard,   // (id, data) => Promise<ApiResponse>
  deleteFlashcard,   // (id) => Promise<ApiResponse>
  isLoading,         // boolean
  error,             // string | null
} = useFlashcardRequest(userId);
```

### useSummaryRequest(userId)
```typescript
const {
  summaries,         // Summary[]
  fetchSummaries,    // (useCache?) => Promise<ApiResponse>
  fetchSummary,      // (id, useCache?) => Promise<ApiResponse>
  createSummary,     // (data) => Promise<ApiResponse>
  updateSummary,     // (id, data) => Promise<ApiResponse>
  deleteSummary,     // (id) => Promise<ApiResponse>
  isLoading,         // boolean
  error,             // string | null
} = useSummaryRequest(userId);
```

### useUserRequest()
```typescript
const {
  user,              // User | null
  fetchCurrentUser,  // (useCache?) => Promise<ApiResponse>
  updateProfile,     // (data) => Promise<ApiResponse>
  changePassword,    // (data) => Promise<ApiResponse>
  isLoading,         // boolean
  error,             // string | null
} = useUserRequest();
```

---

## 🔑 Common Patterns

### Pattern 1: Fetch Data
```typescript
// Auto-fetches on mount
const { flashcards, isLoading, error } = useFlashcardRequest(userId);

if (isLoading) return <Loading />;
if (error) return <Error message={error} />;
return <Display data={flashcards} />;
```

### Pattern 2: Create Data
```typescript
const { createFlashcard, isLoading } = useFlashcardRequest(userId);

const handleCreate = async (data) => {
  const response = await createFlashcard(data);
  if (response.success) {
    // Success! Cache auto-invalidated, list auto-refreshed
    router.push('/library');
  }
};
```

### Pattern 3: Update Data
```typescript
const { updateFlashcard } = useFlashcardRequest(userId);

const handleUpdate = async (id, data) => {
  const response = await updateFlashcard(id, data);
  if (response.success) {
    // Success! Cache auto-invalidated, list auto-refreshed
  }
};
```

### Pattern 4: Delete Data
```typescript
const { deleteFlashcard } = useFlashcardRequest(userId);

const handleDelete = async (id) => {
  const response = await deleteFlashcard(id);
  if (response.success) {
    // Success! Cache auto-invalidated, list auto-updated
  }
};
```

### Pattern 5: Force Refresh
```typescript
const { fetchFlashcards } = useFlashcardRequest(userId);

const handleRefresh = () => {
  fetchFlashcards(false); // Skip cache
};
```

### Pattern 6: Login
```typescript
const { login, isLoading, error } = useAuthRequest();

const handleLogin = async (email, password) => {
  const response = await login({ email, password });
  if (response.success) {
    // Tokens auto-stored, redirect to dashboard
    router.push('/dashboard');
  }
};
```

### Pattern 7: Logout
```typescript
const { logout } = useAuthRequest();

const handleLogout = async () => {
  await logout();
  // Tokens auto-cleared, cache auto-cleared
  router.push('/login');
};
```

---

## 🎨 TypeScript Interfaces

### Flashcard
```typescript
interface Flashcard {
  _id: string;
  title: string;
  description?: string;
  cards?: Array<{ _id: string; question: string; answer: string }>;
  tags?: string[];
  subject?: string;
  folder?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  lastReviewed?: Date | string;
  repetitionCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
```

### Summary
```typescript
interface Summary {
  _id: string;
  title: string;
  content: string;
  subject: string;
  difficulty: string;
  summaryType: string;
  wordCount: number;
  readingTime: number;
  keyPoints: string[];
  mainTopics: string[];
  tags: string[];
  folder?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  isRead?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
```

### User
```typescript
interface User {
  _id?: string;
  id?: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  role?: string;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
```

---

## 🔧 Direct Service Usage (Advanced)

### RequestService
```typescript
import { requestService } from '@/services/RequestService';

// GET request
const response = await requestService.get('/api/endpoint');

// POST request
const response = await requestService.post('/api/endpoint', { data });

// With config
const response = await requestService.get('/api/endpoint', {
  skipAuth: true,  // Skip authorization header
  skipRefresh: true, // Skip token refresh on 401
});
```

### CacheService
```typescript
import { cacheService } from '@/services/CacheService';

// Get from cache
const data = cacheService.get('key', { param: 'value' });

// Set in cache
cacheService.set('key', data, { param: 'value' }, 5 * 60 * 1000);

// Invalidate cache
cacheService.invalidate('key', { param: 'value' });

// Clear all cache
cacheService.clear();
```

---

## 📍 API Endpoints

```typescript
import { API_ENDPOINTS } from '@/constants/endpoints';

// Auth
API_ENDPOINTS.AUTH.LOGIN
API_ENDPOINTS.AUTH.REGISTER
API_ENDPOINTS.AUTH.LOGOUT

// Flashcards
API_ENDPOINTS.FLASHCARD.LIST
API_ENDPOINTS.FLASHCARD.CREATE
API_ENDPOINTS.FLASHCARD.GET(id)
API_ENDPOINTS.FLASHCARD.UPDATE(id)
API_ENDPOINTS.FLASHCARD.DELETE(id)

// Summaries
API_ENDPOINTS.SUMMARY.LIST
API_ENDPOINTS.SUMMARY.CREATE
API_ENDPOINTS.SUMMARY.GET(id)
API_ENDPOINTS.SUMMARY.UPDATE
API_ENDPOINTS.SUMMARY.DELETE

// User
API_ENDPOINTS.USER.CURRENT
API_ENDPOINTS.USER.UPDATE_PROFILE
API_ENDPOINTS.USER.CHANGE_PASSWORD
```

---

## ⏱️ Cache TTL Values

```typescript
import { CACHE_TTL } from '@/constants/endpoints';

CACHE_TTL.SHORT      // 1 minute
CACHE_TTL.MEDIUM     // 5 minutes
CACHE_TTL.LONG       // 15 minutes
CACHE_TTL.VERY_LONG  // 1 hour
```

---

## 🐛 Troubleshooting

### Data not updating?
```typescript
// Force refresh without cache
fetchFlashcards(false);
```

### Cache issues?
```typescript
// Clear all cache
import { cacheService } from '@/services/CacheService';
cacheService.clear();
```

### Token issues?
```typescript
// Check tokens
console.log(localStorage.getItem('accessToken'));
console.log(localStorage.getItem('refreshToken'));
```

### Type errors?
```typescript
// Import interfaces
import type { Flashcard, Summary, User } from '@/hooks';
```

---

## 💡 Pro Tips

1. **Always handle loading and error states**
   ```typescript
   if (isLoading) return <Loading />;
   if (error) return <Error />;
   ```

2. **Use cache wisely**
   ```typescript
   // Use cache for initial load
   fetchFlashcards(true);
   
   // Skip cache for refresh
   fetchFlashcards(false);
   ```

3. **Let hooks manage state**
   ```typescript
   // ✅ Good
   const { flashcards } = useFlashcardRequest(userId);
   
   // ❌ Avoid
   const [flashcards, setFlashcards] = useState([]);
   ```

4. **Check response.success**
   ```typescript
   const response = await createFlashcard(data);
   if (response.success) {
     // Handle success
   } else {
     // Handle error (response.error)
   }
   ```

5. **Use TypeScript types**
   ```typescript
   import type { Flashcard, CreateFlashcardData } from '@/hooks';
   
   const data: CreateFlashcardData = { ... };
   const response = await createFlashcard(data);
   ```

---

## 📖 Full Documentation

For complete documentation, see:
- `DATA_FETCHING_ARCHITECTURE.md` - Full architecture guide
- `USAGE_EXAMPLES.tsx` - Practical examples
- `IMPLEMENTATION_CHECKLIST.md` - Implementation guide

---

**Quick Reference Version**: 1.0.0  
**Last Updated**: November 2024
