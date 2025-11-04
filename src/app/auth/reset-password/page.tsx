"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Alert from "@/components/ui/alert_template/Alert";
import { useAlert } from "@/hooks/useAlert";

export default function ResetPassword() {
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
    <div className="h-screen w-screen flex flex-col items-center justify-center relative overflow-hidden font-[Inter,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl opacity-60"></div>
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-indigo-200/30 rounded-full blur-2xl opacity-50"></div>
      
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
      <div className="relative z-10 mb-8 max-md:mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-5xl font-extrabold bg-gradient-to-br from-purple-600 via-indigo-500 to-blue-600 bg-clip-text text-transparent tracking-tight max-md:text-4xl">
            NoteWise
          </h1>
        </div>
        <p className="text-center text-gray-600 text-lg">Create your new password</p>
      </div>

      <div className="relative z-10 max-w-[500px] w-full p-12 bg-white/95 backdrop-blur-[20px] rounded-[32px] shadow-[0_32px_64px_-12px_rgba(139,92,246,0.15)] border border-purple-200/50 transform transition-all duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:translate-y-[-4px] hover:shadow-[0_48px_100px_-12px_rgba(139,92,246,0.2)] max-md:m-0 max-md:p-6 max-md:max-w-full max-md:w-full max-md:flex-1 max-md:rounded-none max-md:bg-white max-md:backdrop-blur-none max-md:shadow-none max-md:border-none max-md:flex max-md:flex-col max-md:justify-center max-md:overflow-y-auto max-md:transform-none max-md:hover:transform-none max-md:hover:shadow-none">
        
        <button
          type="button"
          className="absolute top-6 left-6 flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl text-gray-700 text-sm font-semibold cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_4px_12px_rgba(0,0,0,0.05)] z-10 hover:translate-y-[-2px] hover:shadow-[0_8px_20px_rgba(139,92,246,0.15)] active:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none hover:[&>svg]:translate-x-[-2px] max-lg:hidden"
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
            className="transition-transform duration-300 ease"
          >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          Back
        </button>

        <div className="mb-8 max-md:mb-6">
          <h2 className="text-center text-2xl font-bold text-gray-900 m-0 mb-2 tracking-[-0.02em] max-md:text-xl max-md:font-bold max-md:text-gray-800 max-md:mb-3">
            Reset Your Password
          </h2>
          <p className="text-center text-[0.95rem] text-gray-600 m-0 font-normal leading-6 max-md:text-sm max-md:text-gray-500 max-md:leading-tight">
            Enter the reset code from your email and create a new password
          </p>
        </div>

        <form
          className="flex flex-col gap-6 max-md:gap-5 max-md:w-full max-md:max-w-[320px] max-md:mx-auto max-md:flex-shrink-0"
          onSubmit={handleSubmit}
        >
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
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
              className="w-full px-4 py-3 border border-purple-200 rounded-xl text-gray-900 bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all duration-200"
              placeholder="Enter your email address"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="resetCode" className="block text-sm font-semibold text-gray-700 mb-2">
              Reset Code
            </label>
            <input
              id="resetCode"
              name="resetCode"
              type="text"
              required
              value={formData.resetCode}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-purple-200 rounded-xl text-gray-900 bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all duration-200 text-center font-mono text-lg tracking-widest"
              placeholder="Enter 6-digit code"
              maxLength={6}
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 mb-2">
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
                className="w-full px-4 py-3 pr-12 border border-purple-200 rounded-xl text-gray-900 bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all duration-200"
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
            <div className="mt-2 text-xs text-gray-600">
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
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
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
                className="w-full px-4 py-3 pr-12 border border-purple-200 rounded-xl text-gray-900 bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all duration-200"
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
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-indigo-700 focus:ring-4 focus:ring-purple-200 transition-all duration-200 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-3 max-md:gap-2">
                <span className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin max-md:w-4 max-md:h-4 max-md:border-2 max-md:border-white/30 max-md:border-t-white max-md:rounded-full max-md:animate-spin"></span>
                Resetting Password...
              </div>
            ) : (
              "Reset Password"
            )}
          </button>

          <div className="text-center mt-6 pt-6 border-t border-gray-200">
            <p className="text-gray-600">
              Remember your password?{" "}
              <button
                type="button"
                onClick={() => router.push("/auth/login")}
                className="text-purple-600 hover:text-purple-700 font-semibold transition-colors"
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