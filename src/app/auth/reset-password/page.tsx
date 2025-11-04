"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Alert from "@/components/ui/alert_template/Alert";
import { useAlert } from "@/hooks/useAlert";

function ResetPasswordForm() {
  const [formData, setFormData] = useState({
    email: "",
    resetCode: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { alert, showError, showSuccess, hideAlert } = useAlert();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setFormData(prev => ({ ...prev, email: emailParam }));
    }
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (alert.isVisible) hideAlert();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    hideAlert();

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      showError("Passwords do not match", "Password Mismatch");
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (formData.newPassword.length < 8) {
      showError("Password must be at least 8 characters long", "Weak Password");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          resetCode: formData.resetCode,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showError(data.message || "Failed to reset password", "Reset Failed");
        return;
      }

      showSuccess(data.message, "Password Reset Successful");

      // Redirect to login page after a short delay
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);

    } catch (error) {
      console.error("Reset password error:", error);
      showError(
        "Network error. Please check your connection and try again.",
        "Connection Error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden font-[Inter,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl opacity-60"></div>
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cyan-200/30 rounded-full blur-2xl opacity-50"></div>

      <Alert
        type={alert.type}
        message={alert.message}
        title={alert.title}
        isVisible={alert.isVisible}
        onClose={hideAlert}
        autoClose={alert.type === "success"}
        autoCloseDelay={3000}
        position="bottom-right"
      />

      {/* NoteWise Title */}
      <div className="relative z-10 mb-6 sm:mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Image
            src="/notewise.png"
            alt="NoteWise Logo"
            width={40}
            height={40}
            className="object-contain sm:w-12 sm:h-12"
          />
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-br from-teal-600 via-cyan-500 to-emerald-600 bg-clip-text text-transparent tracking-tight">
            NoteWise
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg">Create your new password</p>
      </div>

      <div className="relative z-10 w-full max-w-md sm:max-w-lg p-6 sm:p-8 lg:p-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-[20px] rounded-2xl sm:rounded-3xl shadow-[0_20px_40px_-12px_rgba(20,184,166,0.15)] dark:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.3)] border border-teal-200/50 dark:border-gray-700/50 transition-all duration-300 hover:shadow-[0_32px_64px_-12px_rgba(20,184,166,0.2)] dark:hover:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)]">

        <button
          type="button"
          className="hidden lg:flex absolute top-4 left-4 lg:top-6 lg:left-6 items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl text-gray-700 text-sm font-medium cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
          onClick={() => router.push("/auth/forgot-password")}
          disabled={isLoading}
          aria-label="Go back"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          <span>Back</span>
        </button>

        <div className="mb-6 sm:mb-8 lg:mt-14 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
            Reset Your Password
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
            Enter the reset code from your email and create a new password
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-teal-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/30 outline-none transition-all duration-200 text-base placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Enter your email address"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="resetCode" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Reset Code
            </label>
            <input
              id="resetCode"
              name="resetCode"
              type="text"
              required
              value={formData.resetCode}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-teal-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/30 outline-none transition-all duration-200 text-center font-mono text-lg tracking-widest placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Enter 6-digit code"
              maxLength={6}
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                name="newPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={formData.newPassword}
                onChange={handleInputChange}
                className="w-full px-4 py-3 pr-12 border border-teal-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/30 outline-none transition-all duration-200 text-base placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Enter your new secure password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isLoading}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              <p className="mb-1">Password must contain:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>At least 8 characters</li>
                <li>One uppercase letter (A-Z)</li>
                <li>One lowercase letter (a-z)</li>
                <li>One number (0-9)</li>
                <li>One symbol (@$!%*?&)</li>
              </ul>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-4 py-3 pr-12 border border-teal-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/30 outline-none transition-all duration-200 text-base placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Confirm your new password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-6 py-3 sm:py-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold rounded-xl hover:from-teal-600 hover:to-cyan-700 focus:ring-4 focus:ring-teal-200 transition-all duration-200 disabled:opacity-50 text-base"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Resetting Password...
              </div>
            ) : (
              "Reset Password"
            )}
          </button>

          <div className="text-center pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              Remember your password?{" "}
              <button
                type="button"
                onClick={() => router.push("/auth/login")}
                className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-semibold transition-colors"
                disabled={isLoading}
              >
                Sign in here
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}