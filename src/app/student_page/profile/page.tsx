"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { validateEmail, validatePassword } from "@/lib/validation";
import { useAlert } from "@/hooks/useAlert";

interface UserProfile {
  email: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEmailChangeConfirm, setShowEmailChangeConfirm] = useState(false);
  const [showPasswordChangeConfirm, setShowPasswordChangeConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { alert, showError, showSuccess, showWarning, hideAlert } = useAlert();

  const [profile, setProfile] = useState<UserProfile>({
    email: '',
    firstName: '',
    lastName: '',
    profileImage: ''
  });

  const [originalProfile, setOriginalProfile] = useState<UserProfile>({
    email: '',
    firstName: '',
    lastName: '',
    profileImage: ''
  });

  const [originalEmail, setOriginalEmail] = useState('');

  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });



  // Load user data on component mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/v1/users/current', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const user = data.user;

          const userProfile = {
            email: user.email || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            profileImage: user.profileImage || ''
          };

          setProfile(userProfile);
          setOriginalProfile(userProfile);
          setOriginalEmail(user.email || '');
        }


      } catch (error) {
        console.error('Error loading user data:', error);
        showError('Failed to load profile data', 'Loading Error');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []);

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please select a valid image file', 'Invalid File Type');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('Image size must be less than 5MB', 'File Too Large');
      return;
    }

    setIsUploadingImage(true);
    hideAlert();

    try {
      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrl = data.url;

        // Update the profile state
        setProfile(prev => ({ ...prev, profileImage: imageUrl }));

        // Automatically save the image URL to the database
        try {
          const profileResponse = await fetch('/api/v1/users/profile', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: profile.email,
              firstName: profile.firstName,
              lastName: profile.lastName,
              profileImage: imageUrl
            })
          });

          if (profileResponse.ok) {
            showSuccess('Profile image uploaded and saved successfully!', 'Upload Successful');

            // Update original profile to reflect the saved state
            setOriginalProfile(prev => ({ ...prev, profileImage: imageUrl }));

            // Update localStorage user data
            const userData = localStorage.getItem('user');
            if (userData) {
              const user = JSON.parse(userData);
              const updatedUser = { ...user, profileImage: imageUrl };
              localStorage.setItem('user', JSON.stringify(updatedUser));
            }

            // Dispatch custom event to update navigation
            window.dispatchEvent(new CustomEvent('profileUpdated'));
          } else {
            showWarning('Image uploaded but failed to save to profile. Please save your profile manually.', 'Partial Success');
          }
        } catch (saveError) {
          console.error('Error saving image to profile:', saveError);
          showWarning('Image uploaded but failed to save to profile. Please save your profile manually.', 'Partial Success');
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to upload image' }));

        // Provide more specific error messages
        if (response.status === 400) {
          showError(errorData.message || 'Invalid image file', 'Upload Failed');
        } else if (response.status === 401) {
          showError('Please log in again to upload images', 'Authentication Required');
        } else if (response.status === 500) {
          showError('Server error. Please try again later.', 'Server Error');
        } else {
          showError(errorData.message || 'Failed to upload image', 'Upload Failed');
        }
        return;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      if (error instanceof Error) {
        showError(error.message, 'Upload Error');
      } else {
        showError('Network error. Please check your connection and try again.', 'Network Error');
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if email is being changed and show confirmation
    if (profile.email !== originalEmail) {
      setShowEmailChangeConfirm(true);
      return;
    }

    await submitProfileUpdate();
  };

  const submitProfileUpdate = async () => {
    setIsSaving(true);
    hideAlert();

    try {
      // Validate email
      const emailError = validateEmail(profile.email.trim());
      if (emailError) {
        showError(emailError.message, 'Validation Error');
        return;
      }

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await fetch('/api/v1/users/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: profile.email.trim(),
          firstName: profile.firstName.trim(),
          lastName: profile.lastName.trim(),
          profileImage: profile.profileImage
        })
      });

      if (response.ok) {
        const data = await response.json();

        // Check if email was changed
        if (profile.email !== originalEmail) {
          showWarning('Profile updated! Please check your email to verify your new email address. You will be redirected to the verification page.', 'Email Verification Required');
          // Update original email to new email
          setOriginalEmail(profile.email);

          // Redirect to verification page after a short delay
          setTimeout(() => {
            window.location.href = `/auth/verify-email?email=${encodeURIComponent(profile.email)}`;
          }, 2000);
        } else {
          showSuccess('Profile updated successfully!', 'Profile Saved');
        }

        // Update original profile to reflect the saved state
        setOriginalProfile(profile);

        // Update localStorage user data
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          const updatedUser = { ...user, ...profile };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }

        // Dispatch custom event to update navigation
        window.dispatchEvent(new CustomEvent('profileUpdated'));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showError(
        error instanceof Error ? error.message : 'Failed to update profile',
        'Update Failed'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate new password
    const passwordError = validatePassword(passwordData.newPassword);
    if (passwordError) {
      showError(passwordError.message, 'Password Validation Error');
      return;
    }

    // Check if passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('New passwords do not match', 'Password Mismatch');
      return;
    }

    // Show confirmation dialog
    setShowPasswordChangeConfirm(true);
  };

  const submitPasswordChange = async () => {
    setIsSaving(true);
    hideAlert();

    try {

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await fetch('/api/v1/users/change-password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (response.ok) {
        showSuccess('Password changed successfully! You will be logged out for security reasons.', 'Password Updated');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswordSection(false);

        // Logout user after password change for security
        setTimeout(async () => {
          try {
            // Clear local storage
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('userId');

            // Call logout API
            await fetch('/api/v1/auth/logout', {
              method: 'POST',
              credentials: 'include'
            });

            // Redirect to login
            window.location.href = '/auth/login?message=Password changed successfully. Please log in again.';
          } catch (error) {
            console.error('Logout error:', error);
            // Force redirect even if logout API fails
            window.location.href = '/auth/login';
          }
        }, 2000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showError(
        error instanceof Error ? error.message : 'Failed to change password',
        'Password Change Failed'
      );
    } finally {
      setIsSaving(false);
    }
  };



  // Check if profile has changed
  const hasProfileChanged = 
    profile.email.trim() !== originalProfile.email.trim() ||
    profile.firstName.trim() !== originalProfile.firstName.trim() ||
    profile.lastName.trim() !== originalProfile.lastName.trim();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
            My Profile
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Manage your profile information.
          </p>
        </div>

        {/* Alerts are shown via the global Alert in student_page/layout.tsx */}

        {/* Profile Information */}
        <div className="space-y-4 sm:space-y-6">
            {/* Profile Information Form */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <form onSubmit={handleProfileSubmit} className="space-y-4 sm:space-y-6">
                {/* Profile Picture Section */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-gray-200 dark:border-gray-700 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                      {profile.profileImage ? (
                        // Use regular img tag for Cloudinary images
                        <img
                          src={profile.profileImage}
                          alt="Profile"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Failed to load profile image:', profile.profileImage);
                            // Hide the failed image and show default avatar
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const defaultAvatar = target.parentElement?.querySelector('.default-avatar') as HTMLElement;
                            if (defaultAvatar) {
                              defaultAvatar.classList.remove('hidden');
                            }
                          }}
                        />
                      ) : session?.user?.image ? (
                        <Image
                          src={session.user.image}
                          alt="Profile"
                          fill
                          className="object-cover"
                        />
                      ) : null}

                      {/* Default avatar - shown when no image is available */}
                      <div className={`default-avatar w-full h-full flex items-center justify-center ${(profile.profileImage || session?.user?.image) ? 'hidden' : ''}`}>
                        <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    {/* Upload button overlay */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-7 h-7 sm:w-8 sm:h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                      {isUploadingImage ? (
                        <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                      className="hidden"
                    />
                  </div>
                  <div className="text-center sm:text-left flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white truncate">
                      {profile.firstName} {profile.lastName}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                      {profile.email}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Click the + button to upload a new profile picture
                    </p>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="space-y-4 sm:space-y-6">
                  {/* Email - Full Width */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => {
                        setProfile(prev => ({ ...prev, email: e.target.value }));
                        if (alert.isVisible) hideAlert();
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                    {profile.email !== originalEmail && (
                      <p className="text-[10px] sm:text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        Changing your email will require verification
                      </p>
                    )}
                  </div>

                  {/* First Name and Last Name - Side by Side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={profile.firstName}
                        onChange={(e) => {
                          setProfile(prev => ({ ...prev, firstName: e.target.value }));
                          if (alert.isVisible) hideAlert();
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={profile.lastName}
                        onChange={(e) => {
                          setProfile(prev => ({ ...prev, lastName: e.target.value }));
                          if (alert.isVisible) hideAlert();
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSaving || !hasProfileChanged}
                    className="w-full sm:w-auto bg-teal-600 text-white px-6 py-2.5 text-sm sm:text-base rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>

            {/* Password Change Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                  Password
                </h3>
                <button
                  type="button"
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="text-teal-600 hover:text-teal-700 text-xs sm:text-sm font-medium"
                >
                  {showPasswordSection ? 'Cancel' : 'Change Password'}
                </button>
              </div>

              {showPasswordSection && (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCurrentPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                      Password must be at least 8 characters with uppercase, lowercase, number, and symbol
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full sm:w-auto bg-teal-600 text-white px-4 py-2.5 text-sm sm:text-base rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

        {/* Email Change Confirmation Modal */}
        {showEmailChangeConfirm && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 max-w-md w-full">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                Confirm Email Change
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
                Changing your email will require verification. You'll be redirected to the verification page and will need to verify your new email address.
              </p>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
                <button
                  onClick={() => setShowEmailChangeConfirm(false)}
                  className="w-full sm:w-auto px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowEmailChangeConfirm(false);
                    submitProfileUpdate();
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Password Change Confirmation Modal */}
        {showPasswordChangeConfirm && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 max-w-md w-full">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                Confirm Password Change
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
                For security reasons, you will be logged out after changing your password. You'll need to log in again with your new password.
              </p>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
                <button
                  onClick={() => setShowPasswordChangeConfirm(false)}
                  className="w-full sm:w-auto px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowPasswordChangeConfirm(false);
                    submitPasswordChange();
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Change Password
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}