"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Alert from "@/components/ui/alert_template/Alert";
import { useAlert } from "@/hooks/useAlert";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { alert, showError, showSuccess, showInfo, hideAlert } = useAlert();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    hideAlert();

    try {
      const response = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'OAUTH_ACCOUNT') {
          showInfo(data.message, "Google Account Detected");
        } else {
          showError(data.message || "Failed to send reset email", "Error");
        }
        return;
      }

      showSuccess(data.message, "Reset Email Sent");
      
      // Redirect to reset password page after a short delay
      setTimeout(() => {
        router.push(`/auth/reset-password?email=${encodeURIComponent(email)}`);
      }, 2000);

    } catch (error) {
      console.error("Forgot password error:", error);
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
        autoClose={true}
        autoCloseDelay={3000}
        position="top-right"
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
        <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg">Reset your password</p>
      </div>

      <div className="relative z-10 w-full max-w-md sm:max-w-lg p-6 sm:p-8 lg:p-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-[20px] rounded-2xl sm:rounded-3xl shadow-[0_20px_40px_-12px_rgba(20,184,166,0.15)] dark:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.3)] border border-teal-200/50 dark:border-gray-700/50 transition-all duration-300 hover:shadow-[0_32px_64px_-12px_rgba(20,184,166,0.2)] dark:hover:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)]">
        
        {/* Back Button - Inside Container - Hidden on mobile/tablet */}
        <button
          type="button"
          className="hidden lg:flex absolute top-4 left-4 lg:top-6 lg:left-6 items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 text-sm font-medium cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
          onClick={() => router.push("/auth/login")}
          disabled={isLoading}
          aria-label="Go back to login"
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
          <span>Back to Login</span>
        </button>

        <div className="mb-6 sm:mb-8 lg:mt-14 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
            Forgot Password?
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
            Enter your email address and we'll send you a reset code
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Email Field */}
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
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (alert.isVisible) hideAlert();
              }}
              className="w-full px-4 py-3 border border-teal-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/30 outline-none transition-all duration-200 text-base placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Enter your email address"
              disabled={isLoading}
            />
          </div>

          {/* Send Reset Code Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-6 py-3 sm:py-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold rounded-xl hover:from-teal-600 hover:to-cyan-700 focus:ring-4 focus:ring-teal-200 transition-all duration-200 disabled:opacity-50 text-base"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Sending Reset Code...
              </div>
            ) : (
              "Send Reset Code"
            )}
          </button>

          {/* Sign In Link */}
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