"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Alert from "@/components/ui/alert_template/Alert";
import { useAlert } from "@/hooks/useAlert";
import "./login-mobile.css";


interface LoginData {
  email: string;
  password: string;
  role: "student" | "instructor";
}

interface Student {
  _id: string; // Add this line
  username: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

interface LoginResponse {
  Student: Student;
  accessToken: string;
}

interface ApiError {
  code: string;
  message: string;
  requiresVerification?: boolean;
  email?: string;
}

export default function Login() {
  const [formData, setFormData] = useState<LoginData>({
    email: "",
    password: "",
    role: "student",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { alert, showError, showSuccess, showInfo, hideAlert } = useAlert();
  const router = useRouter();

  // Simple encoding/decoding functions (not for real security, just obfuscation)
  const encodePassword = (password: string): string => {
    return btoa(password.split('').reverse().join(''));
  };

  const decodePassword = (encoded: string): string => {
    try {
      return atob(encoded).split('').reverse().join('');
    } catch {
      return '';
    }
  };

  // Load saved email and password on component mount
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("rememberedEmail");
      const savedPassword = localStorage.getItem("rememberedPassword");
      const wasRemembered = localStorage.getItem("rememberMe") === "true";

      if (savedEmail && wasRemembered) {
        setFormData(prev => ({
          ...prev,
          email: savedEmail,
          password: savedPassword ? decodePassword(savedPassword) : ''
        }));
        setRememberMe(true);
      }
    } catch (error) {
      // Handle localStorage errors gracefully
      console.warn("Could not load remembered credentials:", error);
    }
  }, []);



  // Show an error when redirected after a rejected Google sign-in (non-Gordon domain)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const reason = params.get("reason");
      if (reason === "domain") {
        showError(
          "Only email addresses from Gordon College are allowed to sign in.",
          "Unauthorized domain"
        );
        // Clear the query string to avoid repeated alerts
        router.replace(window.location.pathname);
      }
    } catch (err) {
      // noop
    }
  }, [router, showError]);



  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (alert.isVisible) hideAlert();
  };

  const handleRememberMeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setRememberMe(checked);

    // If unchecking, immediately clear saved credentials
    if (!checked) {
      try {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedPassword");
        localStorage.removeItem("rememberMe");
      } catch (error) {
        console.warn("Could not clear remembered credentials:", error);
      }
    }
  };



  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    hideAlert();

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as ApiError;

        // Handle email verification requirement
        if (errorData.code === 'EMAIL_NOT_VERIFIED') {
          showInfo("Sending verification code to your email...", "Email Verification Required");

          // Automatically send verification email
          try {
            const verificationResponse = await fetch("/api/v1/auth/send-verification", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ email: formData.email }),
            });

            if (verificationResponse.ok) {
              showInfo("Verification code sent! Please check your email.", "Check Your Email");
              setTimeout(() => {
                router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`);
              }, 1500);
            } else {
              showInfo("Please verify your email address. Redirecting to verification page...", "Email Verification Required");
              setTimeout(() => {
                router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`);
              }, 1500);
            }
          } catch (error) {
            console.error("Failed to send verification email:", error);
            showInfo("Please verify your email address. Redirecting to verification page...", "Email Verification Required");
            setTimeout(() => {
              router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`);
            }, 1500);
          }
          return;
        }

        showError(errorData.message || "Login failed", "Login Failed");
        return;
      }

      const loginData = data as LoginResponse;

      console.log("Login response received:", loginData);

      // Store user data and tokens
      localStorage.setItem("user", JSON.stringify(loginData.Student));
      localStorage.setItem("userId", loginData.Student._id);
      localStorage.setItem("accessToken", loginData.accessToken);

      // Handle Remember Me functionality
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", formData.email);
        localStorage.setItem("rememberedPassword", encodePassword(formData.password));
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedPassword");
        localStorage.removeItem("rememberMe");
      }

      console.log("Data stored in localStorage:", {
        user: localStorage.getItem("user"),
        userId: localStorage.getItem("userId"),
        accessToken: localStorage.getItem("accessToken")
      });

      // Note: Refresh token is stored as HTTP-only cookie by the server

      showSuccess("Login successful! Welcome back to NoteWise!", "Welcome back");

      // Navigate to student dashboard immediately
      console.log("Login successful, redirecting to dashboard...");
      console.log("Current pathname:", window.location.pathname);

      // Force a page reload after setting localStorage to ensure the layout picks up the auth state
      setTimeout(() => {
        window.location.href = "/student_page/dashboard";
      }, 100);
    } catch (error) {
      console.error("Login error:", error);
      showError(
        "Network error. Please check your connection and try again.",
        "Connection Error"
      );
    } finally {
      setIsLoading(false);
    }
  };





  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden font-[Inter,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 p-4 sm:p-6 lg:p-8">
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
        <p className="text-gray-600 text-base sm:text-lg">Your AI-powered study companion</p>
      </div>

      <div className="relative z-10 w-full max-w-md sm:max-w-lg p-6 sm:p-8 lg:p-10 bg-white/95 backdrop-blur-[20px] rounded-2xl sm:rounded-3xl shadow-[0_20px_40px_-12px_rgba(20,184,166,0.15)] border border-teal-200/50 transition-all duration-300 hover:shadow-[0_32px_64px_-12px_rgba(20,184,166,0.2)]">
        {/* Back Button - Inside Container - Hidden on mobile/tablet */}
        <button
          type="button"
          className="hidden lg:flex absolute top-4 left-4 lg:top-6 lg:left-6 items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl text-gray-700 text-sm font-medium cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
          onClick={() => router.push("/")}
          disabled={isLoading}
          aria-label="Go back to home"
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
          <span>Home</span>
        </button>
        <div className="mb-6 sm:mb-8 lg:mt-14 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 tracking-tight">
            Welcome back, Student!
          </h2>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            Sign in to continue your learning journey
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>


          {/* Email Field */}
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
              className="w-full px-4 py-3 border border-teal-200 rounded-xl text-gray-900 bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all duration-200 text-base"
              placeholder="Enter your email address"
              disabled={isLoading}
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-3 pr-12 border border-teal-200 rounded-xl text-gray-900 bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all duration-200 text-base"
                placeholder="Enter your password"
                disabled={isLoading}
                onCopy={(e) => {
                  if (rememberMe && formData.password) {
                    e.preventDefault();
                    return false;
                  }
                }}
                onCut={(e) => {
                  if (rememberMe && formData.password) {
                    e.preventDefault();
                    return false;
                  }
                }}
                onDrag={(e) => {
                  if (rememberMe && formData.password) {
                    e.preventDefault();
                    return false;
                  }
                }}
                onSelect={(e) => {
                  if (rememberMe && formData.password && !showPassword) {
                    e.preventDefault();
                    return false;
                  }
                }}
                style={{
                  userSelect: rememberMe && formData.password && !showPassword ? 'none' : 'auto',
                  WebkitUserSelect: rememberMe && formData.password && !showPassword ? 'none' : 'auto',
                  MozUserSelect: rememberMe && formData.password && !showPassword ? 'none' : 'auto',
                  msUserSelect: rememberMe && formData.password && !showPassword ? 'none' : 'text'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                disabled={isLoading}
                aria-label={showPassword ? "Hide password" : "Show password"}
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
          </div>

          {/* Remember Me and Forgot Password */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <label className="inline-flex items-center cursor-pointer text-sm select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={handleRememberMeChange}
                className="mr-2 form-checkbox w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                disabled={isLoading}
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={() => router.push("/auth/forgot-password")}
              className="text-teal-600 hover:text-teal-700 text-sm font-medium transition-colors text-left sm:text-right"
              disabled={isLoading}
            >
              Forgot password?
            </button>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-6 py-3 sm:py-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold rounded-xl hover:from-teal-600 hover:to-cyan-700 focus:ring-4 focus:ring-teal-200 transition-all duration-200 disabled:opacity-50 text-base"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Signing in...
              </div>
            ) : (
              "Sign in"
            )}
          </button>

          {/* Sign Up Link */}
          <div className="text-center pt-6 border-t border-gray-200">
            <p className="text-gray-600 text-sm sm:text-base">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => router.push("/auth/signup")}
                className="text-teal-600 hover:text-teal-700 font-semibold transition-colors"
                disabled={isLoading}
              >
                Sign up here
              </button>
            </p>
          </div>
        </form>
      </div>


    </div>
  );
}
