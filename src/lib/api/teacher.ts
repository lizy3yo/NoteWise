/*
 * Copyright 2025 Kharl Ryan M. De Jesus
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Types from the assessment model
export interface IQuestion {
  id: string;
  type: 'short' | 'paragraph' | 'mcq' | 'checkboxes' | 'identification' | 'enumeration' | 'match' | 'title' | 'image' | 'section';
  title: string;
  required?: boolean;
  options?: string[];
  answer?: string;
  items?: string[];
  pairs?: { left: string; right?: string }[];
  description?: string;
  src?: string;
  alt?: string;
  points?: number;
}

export interface IAssessment {
  _id?: string;
  title: string;
  description?: string;
  type: 'MCQ' | 'TF' | 'Practical' | 'Written' | 'Mixed';
  category: 'Quiz' | 'Exam' | 'Activity';
  format?: 'online' | 'file_submission'; // Add format field
  questions: IQuestion[];
  // classId removed - classes functionality removed
  teacherId?: string;
  timeLimitMins?: number;
  maxAttempts?: number;
  published?: boolean;
  accessCode?: string;
  dueDate?: Date | string;
  availableFrom?: Date | string;
  availableUntil?: Date | string;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showResults?: 'immediately' | 'after_due' | 'never';
  allowReview?: boolean;
  passingScore?: number;
  totalPoints?: number;
  instructions?: string;
  attachments?: {
    name: string;
    url: string;
    type: string;
    size?: number;
  }[];
  settings?: {
    lockdown?: boolean;
    showProgress?: boolean;
    allowBacktrack?: boolean;
    autoSubmit?: boolean;
  };
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// IClass interface removed - classes functionality removed

// API response types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  message?: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data?: {
    assessments?: T[];
    // classes removed - classes functionality removed
    pagination: {
      current: number;
      total: number;
      count: number;
      totalItems: number;
    };
  };
  error?: string;
}

// Get authentication token from wherever it's stored (localStorage, cookies, etc.)
function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    console.log('Retrieved auth token:', token ? 'Token exists' : 'No token found');
    return token;
  }
  return null;
}

// Base API configuration
const API_BASE = '/api/teacher_page';

// Common headers for API requests
function getHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
  console.log('API Headers:', { ...headers, Authorization: token ? 'Bearer [REDACTED]' : 'None' });
  return headers;
}

// Assessment API functions
export const assessmentApi = {
  // Get all assessments for teacher
  async getAssessments(params?: {
    // classId removed - classes functionality removed
    category?: 'Quiz' | 'Exam' | 'Activity';
    published?: boolean;
    limit?: number;
    page?: number;
  }): Promise<PaginatedResponse<IAssessment>> {
    const searchParams = new URLSearchParams();
    // classId parameter removed
    if (params?.category) searchParams.set('category', params.category);
    if (params?.published !== undefined) searchParams.set('published', params.published.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.page) searchParams.set('page', params.page.toString());

    const response = await fetch(`${API_BASE}/assessment?${searchParams}`, {
      method: 'GET',
      headers: getHeaders()
    });

    return response.json();
  },

  // Get specific assessment by ID
  async getAssessment(id: string): Promise<ApiResponse<{ assessment: IAssessment }>> {
    const response = await fetch(`${API_BASE}/assessment/${id}`, {
      method: 'GET',
      headers: getHeaders()
    });

    return response.json();
  },

  // Create new assessment
  async createAssessment(assessment: Omit<IAssessment, '_id' | 'teacherId' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<{ assessment: IAssessment }>> {
    try {
      console.log('Creating assessment with API:', assessment);
      
      const response = await fetch(`${API_BASE}/assessment`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(assessment)
      });

      console.log('API Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error response:', errorText);
        
        try {
          const errorJson = JSON.parse(errorText);
          return {
            success: false,
            error: errorJson.error || `HTTP ${response.status}: ${response.statusText}`,
            details: errorJson.details
          };
        } catch {
          return {
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}`,
            details: errorText
          };
        }
      }

      const result = await response.json();
      console.log('API Success response:', result);
      return result;

    } catch (error) {
      console.error('Network error in createAssessment:', error);
      return {
        success: false,
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error instanceof Error ? error.stack : undefined
      };
    }
  },

  // Update assessment
  async updateAssessment(id: string, assessment: Partial<IAssessment>): Promise<ApiResponse<{ assessment: IAssessment }>> {
    const response = await fetch(`${API_BASE}/assessment/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(assessment)
    });

    return response.json();
  },

  // Delete assessment
  async deleteAssessment(id: string): Promise<ApiResponse<{ message: string }>> {
    const response = await fetch(`${API_BASE}/assessment/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    return response.json();
  },

  // Publish assessment
  async publishAssessment(id: string): Promise<ApiResponse<{ assessment: IAssessment; accessCode: string; message: string }>> {
    const response = await fetch(`${API_BASE}/assessment/${id}/publish`, {
      method: 'POST',
      headers: getHeaders()
    });

    return response.json();
  }
};

// Classes functionality removed

// Assessment attachment API functions
export const attachmentApi = {
  // Upload attachment to assessment
  async uploadAttachment(assessmentId: string, file: File): Promise<ApiResponse<{ attachment: any }>> {
    const formData = new FormData();
    formData.append('file', file);

    // For FormData uploads, we don't include Content-Type header - let browser set it
    const headers = getHeaders();
    delete (headers as any)['Content-Type'];

    const response = await fetch(`${API_BASE}/assessment/${assessmentId}/attachments`, {
      method: 'POST',
      headers,
      body: formData
    });

    return response.json();
  },

  // Get attachments for assessment
  async getAttachments(assessmentId: string): Promise<ApiResponse<{ attachments: any[] }>> {
    const response = await fetch(`${API_BASE}/assessment/${assessmentId}/attachments`, {
      method: 'GET',
      headers: getHeaders()
    });

    return response.json();
  }
};

// Hook for easy React integration
export function useApi() {
  return {
    assessment: assessmentApi,
    attachment: attachmentApi
  };
}