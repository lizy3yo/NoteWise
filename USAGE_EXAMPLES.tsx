/**
 * USAGE EXAMPLES - Practical examples of using the data fetching architecture
 * This file demonstrates how to use the new hooks and services in your components
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useAuthRequest,
  useFlashcardRequest,
  useSummaryRequest,
  useUserRequest,
} from '@/hooks';

// ============================================================================
// EXAMPLE 1: Login Component
// ============================================================================

export function LoginExample() {
  const router = useRouter();
  const { login, isLoading, error } = useAuthRequest();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = await login({ email, password, rememberMe: true });

    if (response.success) {
      // Tokens are automatically stored
      // User data is automatically stored
      router.push('/student_page/dashboard');
    }
    // Error is automatically set in the hook
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        disabled={isLoading}
      />
      
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        disabled={isLoading}
      />
      
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}

// ============================================================================
// EXAMPLE 2: Flashcard Library Component
// ============================================================================

export function FlashcardLibraryExample() {
  const router = useRouter();
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  
  const {
    flashcards,
    fetchFlashcards,
    deleteFlashcard,
    updateFlashcard,
    isLoading,
    error,
  } = useFlashcardRequest(userId || undefined);

  // Flashcards are automatically fetched on mount
  // Data is cached for 5 minutes

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this flashcard?')) return;

    const response = await deleteFlashcard(id);
    
    if (response.success) {
      // Cache is automatically invalidated
      // Flashcards list is automatically updated
      console.log('Flashcard deleted successfully');
    }
  };

  const handleToggleFavorite = async (id: string, currentFavorite: boolean) => {
    const response = await updateFlashcard(id, {
      isFavorite: !currentFavorite,
    });

    if (response.success) {
      // Cache is automatically invalidated
      // Flashcards list is automatically refreshed
      console.log('Favorite status updated');
    }
  };

  const handleRefresh = () => {
    // Force refresh without using cache
    fetchFlashcards(false);
  };

  if (isLoading) {
    return <div className="loading">Loading flashcards...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>Error: {error}</p>
        <button onClick={handleRefresh}>Retry</button>
      </div>
    );
  }

  return (
    <div className="flashcard-library">
      <div className="header">
        <h1>My Flashcards ({flashcards.length})</h1>
        <button onClick={handleRefresh}>Refresh</button>
      </div>

      {flashcards.length === 0 ? (
        <div className="empty-state">
          <p>No flashcards yet</p>
          <button onClick={() => router.push('/student_page/flashcards/create')}>
            Create Your First Flashcard
          </button>
        </div>
      ) : (
        <div className="flashcard-grid">
          {flashcards.map((flashcard) => (
            <div key={flashcard._id} className="flashcard-card">
              <h3>{flashcard.title}</h3>
              <p>{flashcard.description}</p>
              <p className="card-count">{flashcard.cards?.length || 0} cards</p>
              
              <div className="actions">
                <button onClick={() => router.push(`/student_page/library/${flashcard._id}`)}>
                  Study
                </button>
                <button onClick={() => handleToggleFavorite(flashcard._id, flashcard.isFavorite || false)}>
                  {flashcard.isFavorite ? '★' : '☆'}
                </button>
                <button onClick={() => handleDelete(flashcard._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: Create Flashcard Component
// ============================================================================

export function CreateFlashcardExample() {
  const router = useRouter();
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const { createFlashcard, isLoading, error } = useFlashcardRequest(userId || undefined);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    cards: [{ question: '', answer: '' }],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = await createFlashcard(formData);

    if (response.success) {
      // Cache is automatically invalidated
      // Flashcard list is automatically refreshed
      router.push('/student_page/library?tab=flashcards');
    }
  };

  const addCard = () => {
    setFormData({
      ...formData,
      cards: [...formData.cards, { question: '', answer: '' }],
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}

      <input
        type="text"
        placeholder="Flashcard Title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
      />

      <textarea
        placeholder="Description (optional)"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
      />

      <input
        type="text"
        placeholder="Subject"
        value={formData.subject}
        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
      />

      <div className="cards-section">
        <h3>Cards</h3>
        {formData.cards.map((card, index) => (
          <div key={index} className="card-input">
            <input
              type="text"
              placeholder="Question"
              value={card.question}
              onChange={(e) => {
                const newCards = [...formData.cards];
                newCards[index].question = e.target.value;
                setFormData({ ...formData, cards: newCards });
              }}
              required
            />
            <input
              type="text"
              placeholder="Answer"
              value={card.answer}
              onChange={(e) => {
                const newCards = [...formData.cards];
                newCards[index].answer = e.target.value;
                setFormData({ ...formData, cards: newCards });
              }}
              required
            />
          </div>
        ))}
        <button type="button" onClick={addCard}>
          Add Card
        </button>
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Flashcard'}
      </button>
    </form>
  );
}

// ============================================================================
// EXAMPLE 4: User Profile Component
// ============================================================================

export function UserProfileExample() {
  const { user, updateProfile, changePassword, isLoading, error } = useUserRequest();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    username: '',
  });

  // User is automatically fetched on mount
  // Data is cached for 15 minutes

  React.useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
      });
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = await updateProfile(profileData);

    if (response.success) {
      // Cache is automatically invalidated
      // User data is automatically refreshed
      // 'profileUpdated' event is dispatched
      setIsEditing(false);
    }
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    const response = await changePassword({
      currentPassword,
      newPassword,
      confirmPassword: newPassword,
    });

    if (response.success) {
      alert('Password changed successfully');
    }
  };

  if (isLoading) {
    return <div className="loading">Loading profile...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!user) {
    return <div>No user data available</div>;
  }

  return (
    <div className="profile-page">
      <h1>Profile</h1>

      {!isEditing ? (
        <div className="profile-view">
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
          <p><strong>Username:</strong> {user.username}</p>
          <button onClick={() => setIsEditing(true)}>Edit Profile</button>
        </div>
      ) : (
        <form onSubmit={handleUpdateProfile}>
          <input
            type="text"
            placeholder="First Name"
            value={profileData.firstName}
            onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
          />
          <input
            type="text"
            placeholder="Last Name"
            value={profileData.lastName}
            onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
          />
          <input
            type="text"
            placeholder="Username"
            value={profileData.username}
            onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
          />
          <div className="actions">
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: Summary List Component
// ============================================================================

export function SummaryListExample() {
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const {
    summaries,
    fetchSummaries,
    updateSummary,
    deleteSummary,
    isLoading,
    error,
  } = useSummaryRequest(userId || undefined);

  const handleMarkAsRead = async (id: string, currentRead: boolean) => {
    const response = await updateSummary(id, {
      isRead: !currentRead,
    });

    if (response.success) {
      console.log('Summary read status updated');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this summary?')) return;

    const response = await deleteSummary(id);

    if (response.success) {
      console.log('Summary deleted');
    }
  };

  if (isLoading) return <div>Loading summaries...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="summary-list">
      <h2>My Summaries ({summaries.length})</h2>
      
      {summaries.map((summary) => (
        <div key={summary._id} className="summary-card">
          <h3>{summary.title}</h3>
          <p>{summary.subject}</p>
          <span className={`badge ${summary.difficulty}`}>
            {summary.difficulty}
          </span>
          
          <div className="actions">
            <button onClick={() => handleMarkAsRead(summary._id, summary.isRead || false)}>
              {summary.isRead ? 'Mark Unread' : 'Mark Read'}
            </button>
            <button onClick={() => handleDelete(summary._id)}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EXAMPLE 6: Logout Component
// ============================================================================

export function LogoutExample() {
  const router = useRouter();
  const { logout, isLoading } = useAuthRequest();

  const handleLogout = async () => {
    const response = await logout();

    // Tokens are automatically cleared
    // Cache is automatically cleared
    // User data is automatically cleared

    if (response.success) {
      router.push('/auth/login?message=Logged out successfully');
    } else {
      // Even if server logout fails, local cleanup is done
      router.push('/auth/login');
    }
  };

  return (
    <button onClick={handleLogout} disabled={isLoading}>
      {isLoading ? 'Logging out...' : 'Logout'}
    </button>
  );
}

// ============================================================================
// EXAMPLE 7: Advanced - Manual Cache Control
// ============================================================================

export function AdvancedCacheExample() {
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const { flashcards, fetchFlashcards } = useFlashcardRequest(userId || undefined);

  // Import cache service for manual control
  const { cacheService } = require('@/services/CacheService');
  const { CACHE_KEYS } = require('@/constants/endpoints');

  const handleClearCache = () => {
    // Clear all cache
    cacheService.clear();
    console.log('All cache cleared');
  };

  const handleInvalidateFlashcards = () => {
    // Invalidate specific cache
    cacheService.invalidate(CACHE_KEYS.FLASHCARDS, { userId });
    console.log('Flashcard cache invalidated');
  };

  const handleForceRefresh = () => {
    // Fetch without using cache
    fetchFlashcards(false);
  };

  return (
    <div>
      <h2>Cache Control</h2>
      <button onClick={handleClearCache}>Clear All Cache</button>
      <button onClick={handleInvalidateFlashcards}>Invalidate Flashcard Cache</button>
      <button onClick={handleForceRefresh}>Force Refresh</button>
      <p>Cache size: {cacheService.size()} entries</p>
    </div>
  );
}

// ============================================================================
// EXAMPLE 8: Error Handling Pattern
// ============================================================================

export function ErrorHandlingExample() {
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const { flashcards, fetchFlashcards, isLoading, error } = useFlashcardRequest(userId || undefined);
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = async () => {
    setRetryCount((prev) => prev + 1);
    await fetchFlashcards(false); // Skip cache on retry
  };

  // Show loading state
  if (isLoading && flashcards.length === 0) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>Loading your flashcards...</p>
      </div>
    );
  }

  // Show error state with retry
  if (error) {
    return (
      <div className="error-state">
        <h3>Oops! Something went wrong</h3>
        <p>{error}</p>
        <button onClick={handleRetry}>
          Retry {retryCount > 0 && `(Attempt ${retryCount + 1})`}
        </button>
      </div>
    );
  }

  // Show empty state
  if (flashcards.length === 0) {
    return (
      <div className="empty-state">
        <p>No flashcards found</p>
        <button>Create Your First Flashcard</button>
      </div>
    );
  }

  // Show data
  return (
    <div className="flashcard-list">
      {flashcards.map((card) => (
        <div key={card._id}>{card.title}</div>
      ))}
    </div>
  );
}
