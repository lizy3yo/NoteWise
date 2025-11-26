# Data Fetching Architecture Documentation

## Overview
This document describes the professional data fetching service architecture implemented in the NoteWise project. The architecture provides centralized HTTP request handling, intelligent caching, and modular query hooks.

## Architecture Components

### 1. Services Layer (`src/services/`)

#### RequestService.ts
Core HTTP service that handles all API requests with the following features:
- **Automatic Token Management**: Handles access token injection and refresh
- **Error Handling**: Centralized error management with user-friendly messages
- **Token Refresh**: Automatic token refresh on 401 responses
- **Request Interceptors**: Pre-request and post-request processing
- **Type Safety**: Full TypeScript support with generic types

**Key Methods:**
- `get<T>(endpoint, config)` - GET requests
- `post<T>(endpoint, body, config)` - POST requests
- `put<T>(endpoint, body, config)` - PUT requests
- `patch<T>(endpoint, body, config)` - PATCH requests
- `delete<T>(endpoint, config)` - DELETE requests

#### CacheService.ts
In-memory caching service with TTL (Time To Live) support:
- **Smart Caching**: Automatic cache key generation from endpoints and parameters
- **TTL Management**: Configurable expiration times for different data types
- **Cache Invalidation**: Pattern-based and specific cache invalidation
- **Auto Cleanup**: Periodic cleanup of expired entries

**Key Methods:**
- `get<T>(endpoint, params)` - Retrieve cached data
- `set<T>(endpoint, data, params, ttl)` - Store data in cache
- `invalidate(endpoint, params)` - Remove specific cache entry
- `invalidatePattern(pattern)` - Remove all matching cache entries
- `clear()` - Clear all cache

### 2. Constants Layer (`src/constants/`)

#### endpoints.ts
Centralized API endpoint definitions:
- **API_ENDPOINTS**: All API routes organized by module
- **CACHE_KEYS**: Standardized cache key constants
- **CACHE_TTL**: Predefined TTL values for different data types

**Benefits:**
- Single source of truth for all endpoints
- Easy to update and maintain
- Type-safe endpoint access
- Prevents typos and inconsistencies

### 3. Hooks Layer (`src/hooks/`)

Custom React hooks for each module/feature:

#### useAuthRequest.ts
Authentication operations:
- `login(credentials)` - User login
- `register(data)` - User registration
- `logout()` - User logout
- `forgotPassword(email)` - Request password reset
- `resetPassword(data)` - Reset password with token
- `verifyEmail(data)` - Verify email with code
- `resendVerification(email)` - Resend verification email

#### useFlashcardRequest.ts
Flashcard CRUD operations:
- `fetchFlashcards(useCache)` - Get all flashcards
- `fetchFlashcard(id, useCache)` - Get single flashcard
- `createFlashcard(data)` - Create new flashcard
- `updateFlashcard(id, data)` - Update flashcard
- `deleteFlashcard(id)` - Delete flashcard

#### useSummaryRequest.ts
Summary CRUD operations:
- `fetchSummaries(useCache)` - Get all summaries
- `fetchSummary(id, useCache)` - Get single summary
- `createSummary(data)` - Create new summary
- `updateSummary(id, data)` - Update summary
- `deleteSummary(id)` - Delete summary

#### useUserRequest.ts
User profile operations:
- `fetchCurrentUser(useCache)` - Get current user profile
- `updateProfile(data)` - Update user profile
- `changePassword(data)` - Change user password

## File Structure

```
src/
├── services/
│   ├── RequestService.ts      # Core HTTP service
│   ├── CacheService.ts        # Caching service
│   └── index.ts               # Service exports
├── hooks/
│   ├── useAuthRequest.ts      # Authentication hooks
│   ├── useFlashcardRequest.ts # Flashcard hooks
│   ├── useSummaryRequest.ts   # Summary hooks
│   ├── useUserRequest.ts      # User profile hooks
│   └── index.ts               # Hook exports
└── constants/
    ├── endpoints.ts           # API endpoints & cache keys
    └── index.ts               # Constants exports
```

## Usage Examples

### 1. Authentication

```typescript
import { useAuthRequest } from '@/hooks';

function LoginPage() {
  const { login, isLoading, error } = useAuthRequest();

  const handleLogin = async (email: string, password: string) => {
    const response = await login({ email, password });
    
    if (response.success) {
      // Redirect to dashboard
      router.push('/student_page/dashboard');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      {/* Form fields */}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

### 2. Fetching Flashcards

```typescript
import { useFlashcardRequest } from '@/hooks';

function FlashcardLibrary() {
  const userId = localStorage.getItem('userId');
  const { 
    flashcards, 
    fetchFlashcards, 
    deleteFlashcard, 
    isLoading 
  } = useFlashcardRequest(userId);

  // Flashcards are automatically fetched on mount
  // Data is cached for 5 minutes

  const handleDelete = async (id: string) => {
    const response = await deleteFlashcard(id);
    if (response.success) {
      // Cache is automatically invalidated
      // List is automatically refreshed
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {flashcards.map(card => (
        <div key={card._id}>
          <h3>{card.title}</h3>
          <button onClick={() => handleDelete(card._id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

### 3. Creating a Summary

```typescript
import { useSummaryRequest } from '@/hooks';

function CreateSummary() {
  const userId = localStorage.getItem('userId');
  const { createSummary, isLoading, error } = useSummaryRequest(userId);

  const handleSubmit = async (data: CreateSummaryData) => {
    const response = await createSummary(data);
    
    if (response.success) {
      // Cache is automatically invalidated
      // Summary list is automatically refreshed
      router.push('/student_page/library?tab=study_notes');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      {/* Form fields */}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Summary'}
      </button>
    </form>
  );
}
```

### 4. Updating User Profile

```typescript
import { useUserRequest } from '@/hooks';

function ProfilePage() {
  const { user, updateProfile, isLoading, error } = useUserRequest();

  // User is automatically fetched on mount
  // Data is cached for 15 minutes

  const handleUpdate = async (data: UpdateProfileData) => {
    const response = await updateProfile(data);
    
    if (response.success) {
      // Cache is automatically invalidated
      // Profile is automatically refreshed
      // Custom 'profileUpdated' event is dispatched
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Profile</h1>
      <p>Email: {user?.email}</p>
      <p>Name: {user?.firstName} {user?.lastName}</p>
      {/* Update form */}
    </div>
  );
}
```

### 5. Direct Service Usage (Advanced)

```typescript
import { requestService } from '@/services/RequestService';
import { API_ENDPOINTS } from '@/constants/endpoints';

// For custom requests not covered by hooks
async function customRequest() {
  const response = await requestService.get(
    API_ENDPOINTS.FLASHCARD.LIST + '?userId=123&limit=10'
  );
  
  if (response.success) {
    console.log(response.data);
  } else {
    console.error(response.error);
  }
}
```

## Key Features

### 1. Automatic Token Refresh
When a request receives a 401 response, the service automatically:
1. Attempts to refresh the access token
2. Retries the original request with the new token
3. If refresh fails, redirects to login page

### 2. Intelligent Caching
- Data is cached with configurable TTL
- Cache is automatically invalidated on mutations
- Reduces unnecessary API calls
- Improves application performance

### 3. Type Safety
- Full TypeScript support
- Generic types for request/response data
- Compile-time type checking
- Better IDE autocomplete

### 4. Error Handling
- Centralized error management
- User-friendly error messages
- Network error detection
- Request cancellation support

### 5. State Management
- Loading states for all operations
- Error states with descriptive messages
- Automatic state updates on success
- Local state synchronization

## Cache TTL Configuration

```typescript
CACHE_TTL = {
  SHORT: 1 * 60 * 1000,      // 1 minute
  MEDIUM: 5 * 60 * 1000,     // 5 minutes
  LONG: 15 * 60 * 1000,      // 15 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
}
```

**Recommended Usage:**
- **SHORT**: Frequently changing data (activities, notifications)
- **MEDIUM**: Standard data (flashcards, summaries)
- **LONG**: User profile, settings
- **VERY_LONG**: Static data, configuration

## Best Practices

### 1. Always Use Hooks in Components
```typescript
// ✅ Good
function MyComponent() {
  const { flashcards, isLoading } = useFlashcardRequest(userId);
  // ...
}

// ❌ Avoid direct service calls in components
function MyComponent() {
  const [data, setData] = useState([]);
  useEffect(() => {
    requestService.get('/api/flashcard').then(setData);
  }, []);
}
```

### 2. Handle Loading and Error States
```typescript
function MyComponent() {
  const { data, isLoading, error } = useFlashcardRequest(userId);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  
  return <DataDisplay data={data} />;
}
```

### 3. Invalidate Cache After Mutations
```typescript
// Cache is automatically invalidated by hooks
const { updateFlashcard } = useFlashcardRequest(userId);

// Manual invalidation if needed
import { cacheService } from '@/services/CacheService';
cacheService.invalidate(CACHE_KEYS.FLASHCARDS, { userId });
```

### 4. Use Cache Wisely
```typescript
// Use cache for initial load
const { fetchFlashcards } = useFlashcardRequest(userId);

// Skip cache for refresh
const handleRefresh = () => {
  fetchFlashcards(false); // useCache = false
};
```

## Migration Guide

### Before (Old Approach)
```typescript
const [flashcards, setFlashcards] = useState([]);
const [isLoading, setIsLoading] = useState(false);

useEffect(() => {
  async function loadData() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/flashcard?userId=${userId}`);
      const data = await res.json();
      setFlashcards(data.flashcards);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }
  loadData();
}, [userId]);
```

### After (New Approach)
```typescript
const { flashcards, isLoading, error } = useFlashcardRequest(userId);
// That's it! Auto-fetches, caches, and manages state
```

## Environment Variables

Add to your `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Testing

```typescript
// Mock the service in tests
jest.mock('@/services/RequestService', () => ({
  requestService: {
    get: jest.fn(),
    post: jest.fn(),
    // ...
  }
}));
```

## Troubleshooting

### Cache Not Invalidating
- Check if you're using the correct cache key
- Ensure userId is consistent
- Try manual invalidation: `cacheService.clear()`

### Token Refresh Loop
- Check refresh token endpoint
- Verify token storage in localStorage
- Check token expiration times

### Type Errors
- Ensure all interfaces are properly imported
- Check generic type parameters
- Update TypeScript version if needed

## Future Enhancements

1. **React Query Integration**: Consider migrating to React Query for advanced features
2. **Optimistic Updates**: Implement optimistic UI updates
3. **Offline Support**: Add offline data persistence
4. **Request Deduplication**: Prevent duplicate simultaneous requests
5. **WebSocket Support**: Real-time data updates

## Support

For issues or questions, refer to:
- Project documentation
- TypeScript documentation
- React hooks documentation

---

**Version**: 1.0.0  
**Last Updated**: November 2024  
**Author**: NoteWise Development Team
