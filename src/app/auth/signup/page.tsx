"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Alert from "@/components/ui/alert_template/Alert";
import Modal from "@/components/ui/Modal";
import TermsOfService from "@/components/legal/TermsOfService";
import PrivacyPolicy from "@/components/legal/PrivacyPolicy";
import { useAlert } from "@/hooks/useAlert";
import { useAuthRequest } from "@/hooks";
import { validateEmail, validatePassword, validateName, ValidationError } from "@/lib/validation";
import "./signup.css";

interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

interface SignupResponse {
  message?: string;
  Student: {
    username: string;
    honorifics?: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    isEmailVerified?: boolean;
  };
  accessToken?: string;
  requiresVerification?: boolean;
}

interface ApiError {
  code: string;
  message: string;
}

export default function Signup() {
  const [formData, setFormData] = useState<SignupData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const { alert, showError, showSuccess, hideAlert } = useAlert();
  const { register, isLoading } = useAuthRequest();
  const router = useRouter();



  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
    if (alert.isVisible) hideAlert();
  };

  const validateStep1 = () => {
    const firstNameError = validateName(formData.firstName.trim(), "firstName");
    if (firstNameError) {
      showError(firstNameError.message, "Validation Error");
      return false;
    }

    const lastNameError = validateName(formData.lastName.trim(), "lastName");
    if (lastNameError) {
      showError(lastNameError.message, "Validation Error");
      return false;
    }

    const emailError = validateEmail(formData.email.trim());
    if (emailError) {
      showError(emailError.message, "Validation Error");
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      showError(passwordError.message, "Validation Error");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      showError("Passwords do not match", "Validation Error");
      return false;
    }

    if (!formData.agreeToTerms) {
      showError("You must agree to the Terms of Service and Privacy Policy", "Validation Error");
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateStep2()) return;
    
    // Prevent double submission
    if (isLoading) return;

    hideAlert();

    try {
      const response = await register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      if (!response.success) {
        showError(response.error || "Signup failed", "Signup Failed");
        return;
      }

      // Always redirect to verification page after signup
      showSuccess("Account created successfully! Please check your email for verification.", "Check Your Email");
      
      // Navigate to email verification page immediately
      setTimeout(() => {
        router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email.trim())}`);
      }, 1500);
    } catch (error) {
      console.error("Signup error:", error);
      showError(
        "Network error. Please check your connection and try again.",
        "Connection Error"
      );
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden font-[Inter,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 sm:p-6 lg:p-8 transition-colors duration-300">
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

      {/* Background decorations */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl opacity-60"></div>
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cyan-200/30 rounded-full blur-2xl opacity-50"></div>

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
        <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg">Your AI-powered study companion</p>
      </div>

      <div className="relative z-10 w-full max-w-md sm:max-w-lg lg:max-w-xl p-6 sm:p-8 lg:p-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-[20px] rounded-2xl sm:rounded-3xl shadow-[0_20px_40px_-12px_rgba(20,184,166,0.15)] dark:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.3)] border border-teal-200/50 dark:border-gray-700/50 transition-all duration-300 hover:shadow-[0_32px_64px_-12px_rgba(20,184,166,0.2)] dark:hover:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)]">
        {/* Back Button - Visible on all screen sizes */}
        <button
          type="button"
          className="flex absolute top-4 left-4 lg:top-6 lg:left-6 items-center gap-2 px-3 py-2 lg:px-4 lg:py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 text-sm font-medium cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
          onClick={() => router.push("/")}
          disabled={isLoading}
          aria-label="Go back to home"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          <span className="hidden sm:inline">Home</span>
        </button>

        {/* Progress indicator */}
        <div className="flex justify-center mb-6 sm:mb-8 lg:mt-14">
          <div className="flex items-center gap-3 sm:gap-4">
            {[1, 2].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    step <= currentStep
                      ? "bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {step}
                </div>
                {step < 2 && (
                  <div
                    className={`w-8 sm:w-12 h-1 mx-2 rounded-full transition-all duration-300 ${
                      step < currentStep ? "bg-gradient-to-r from-teal-500 to-cyan-600" : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 sm:mb-8 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
            {currentStep === 1 && "Create Your Account"}
            {currentStep === 2 && "Secure Your Account"}
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
            {currentStep === 1 && "Let's start with your basic information"}
            {currentStep === 2 && "Set up your password and preferences"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-5 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-teal-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/30 outline-none transition-all duration-200 text-base placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="Enter your first name"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-teal-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/30 outline-none transition-all duration-200 text-base placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="Enter your last name"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-teal-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/30 outline-none transition-all duration-200 text-base placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Enter your email address"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          {/* Step 2: Password and Terms */}
          {currentStep === 2 && (
            <div className="space-y-5 sm:space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 pr-12 border border-teal-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/30 outline-none transition-all duration-200 text-base placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="Create a strong password"
                    disabled={isLoading}
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
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Password must be at least 8 characters long</p>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 pr-12 border border-teal-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-4 focus:ring-teal-100 dark:focus:ring-teal-900/30 outline-none transition-all duration-200 text-base placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="Confirm your password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                    disabled={isLoading}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
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
              <div className="flex items-start gap-3">
                <input
                  id="agreeToTerms"
                  name="agreeToTerms"
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={handleInputChange}
                  className="mt-1 w-4 h-4 text-teal-600 border-teal-300 rounded focus:ring-teal-500 flex-shrink-0"
                  disabled={isLoading}
                />
                <label htmlFor="agreeToTerms" className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    onClick={() => setShowPrivacyModal(true)}
                    className="text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Privacy Policy
                  </button>
                </label>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-end pt-6">
            {currentStep < 2 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={isLoading}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold rounded-xl hover:from-teal-600 hover:to-cyan-700 focus:ring-4 focus:ring-teal-200 transition-all duration-200 disabled:opacity-50 text-base"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold rounded-xl hover:from-teal-600 hover:to-cyan-700 focus:ring-4 focus:ring-teal-200 transition-all duration-200 disabled:opacity-50 text-base"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Creating Account...
                  </div>
                ) : (
                  "Create Account"
                )}
              </button>
            )}
          </div>
        </form>

        {/* Login link */}
        <div className="text-center pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            Already have an account?{" "}
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
      </div>

      {/* Terms of Service Modal */}
      <Modal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        title="Terms of Service"
      >
        <TermsOfService />
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        title="Privacy Policy"
      >
        <PrivacyPolicy />
      </Modal>
    </div>
  );
}