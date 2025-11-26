/**
 * API Endpoints - Centralized endpoint definitions
 * Maintains all API routes in a single source of truth
 */

export const API_ENDPOINTS = {
  // Authentication endpoints
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
    LOGOUT: '/api/v1/auth/logout',
    REFRESH: '/api/v1/auth/refresh',
    FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
    RESET_PASSWORD: '/api/v1/auth/reset-password',
    VERIFY_EMAIL: '/api/v1/auth/verify-email',
    RESEND_VERIFICATION: '/api/v1/auth/resend-verification',
  },

  // User endpoints
  USER: {
    CURRENT: '/api/v1/users/current',
    PROFILE: '/api/v1/users/profile',
    UPDATE_PROFILE: '/api/v1/users/profile',
    CHANGE_PASSWORD: '/api/v1/users/change-password',
  },

  // Flashcard endpoints
  FLASHCARD: {
    LIST: '/api/student_page/flashcard',
    CREATE: '/api/student_page/flashcard',
    GET: (id: string) => `/api/student_page/flashcard/${id}`,
    UPDATE: (id: string) => `/api/student_page/flashcard/${id}`,
    DELETE: (id: string) => `/api/student_page/flashcard/${id}`,
    GENERATE: '/api/student_page/flashcard/generate',
  },

  // Summary endpoints
  SUMMARY: {
    LIST: '/api/student_page/summary',
    CREATE: '/api/student_page/summary',
    GET: (id: string) => `/api/student_page/summary/${id}`,
    UPDATE: '/api/student_page/summary',
    DELETE: '/api/student_page/summary',
    GENERATE: '/api/student_page/summary/generate',
  },

  // Folder endpoints
  FOLDER: {
    LIST: '/api/student_page/folder',
    CREATE: '/api/student_page/folder',
    GET: (id: string) => `/api/student_page/folder/${id}`,
    UPDATE: (id: string) => `/api/student_page/folder/${id}`,
    DELETE: (id: string) => `/api/student_page/folder/${id}`,
  },

  // Activity/History endpoints
  ACTIVITY: {
    LIST: '/api/student_page/history',
    CREATE: '/api/student_page/history',
  },

  // Practice Test endpoints
  PRACTICE_TEST: {
    LIST: '/api/student_page/practice-test',
    CREATE: '/api/student_page/practice-test',
    GET: (id: string) => `/api/student_page/practice-test/${id}`,
    SUBMIT: (id: string) => `/api/student_page/practice-test/${id}/submit`,
    RESULTS: (id: string) => `/api/student_page/practice-test/${id}/results`,
  },
} as const;

export const CACHE_KEYS = {
  USER_CURRENT: 'user:current',
  FLASHCARDS: 'flashcards',
  FLASHCARD: 'flashcard',
  SUMMARIES: 'summaries',
  SUMMARY: 'summary',
  FOLDERS: 'folders',
  ACTIVITIES: 'activities',
  PRACTICE_TESTS: 'practice-tests',
  DASHBOARD: 'dashboard',
} as const;

export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 15 * 60 * 1000, // 15 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
} as const;
