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

import api from '@/lib/api';

// Student-specific interfaces
export interface StudentInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// API response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

// Student API client - classes functionality removed
export const studentApi = {
  // Placeholder for future student-specific API functions
  async getProfile(): Promise<ApiResponse<StudentInfo>> {
    try {
      const response = await api.get('/student/profile');
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch profile',
        details: error.body?.details
      };
    }
  }
};