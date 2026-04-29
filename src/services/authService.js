/**
 * Auth Service - Secure Authentication Module
 * Handles user authentication (login, signup, logout)
 * Implements secure token storage, validation, and refresh mechanisms
 *
 * Security Features:
 * - Tokens stored in secure encrypted storage (expo-secure-store)
 * - JWT token validation and expiry checking
 * - Automatic token refresh before expiry
 * - Rate limiting protection
 * - Input sanitization
 * - Session management
 * - Inactivity timeout (30 minutes auto-logout)
 */

import { Image as ExpoImage } from "expo-image";
import { Alert, Platform } from "react-native";
import { SECURE_KEYS, STORAGE_KEYS } from "../constants/storageKeys";
import * as ImageUtils from "../utils/imageUtils";
import inactivityTimeoutService from "./inactivityTimeoutService";
import NetworkErrorHandler from "./networkErrorHandler";
import profileService from "./profileService";
import secureStorageService from "./secureStorageService";
import storageService from "./storageService";
import {
  getUserData as getUserDataShared,
  setUserData as setUserDataShared,
} from "./userDataService";
import { Image as ImageCompressor } from 'react-native-compressor';

const networkErrorHandler = NetworkErrorHandler;

/**
 * Get the default base URL based on platform
 * This is a synchronous fallback - actual URL is set during initialize()
 */
const getDefaultBaseURL = () => {
  const url = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
  return url.replace(/\/$/, "");
};

const API_BASE_URL = getDefaultBaseURL();
console.log("[AuthService] Module load - API_BASE_URL:", API_BASE_URL);

// Storage keys are now imported from ../constants/storageKeys.js

// Security constants
const SECURITY_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
  TOKEN_REFRESH_THRESHOLD_MS: 5 * 60 * 1000, // Refresh 5 mins before expiry
  MIN_PASSWORD_LENGTH: 8,
  REQUEST_TIMEOUT_MS: 60000, // 60 seconds for network requests
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Sanitize user input to prevent injection attacks
 */
const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML/script tags
    .slice(0, 500); // Limit length
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
const isValidPassword = (password) => {
  if (password.length < SECURITY_CONFIG.MIN_PASSWORD_LENGTH) return false;
  // Require at least one uppercase, lowercase, number, and special char
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return hasUppercase && hasLowercase && hasNumber && hasSpecial;
};

const base64UrlToBase64 = (input) => {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4;
  if (padding) {
    base64 += "=".repeat(4 - padding);
  }
  return base64;
};

const base64Decode = (input) => {
  if (typeof atob === "function") {
    return atob(input);
  }
  if (
    typeof globalThis !== "undefined" &&
    typeof globalThis.atob === "function"
  ) {
    return globalThis.atob(input);
  }

  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  let i = 0;

  while (i < input.length) {
    const enc1 = chars.indexOf(input.charAt(i++));
    const enc2 = chars.indexOf(input.charAt(i++));
    const enc3 = chars.indexOf(input.charAt(i++));
    const enc4 = chars.indexOf(input.charAt(i++));

    if (enc1 < 0 || enc2 < 0 || enc3 < 0 || enc4 < 0) {
      throw new Error("Invalid base64");
    }

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    output += String.fromCharCode(chr1);
    if (enc3 !== 64) output += String.fromCharCode(chr2);
    if (enc4 !== 64) output += String.fromCharCode(chr3);
  }

  return output;
};

/**
 * Decode JWT token without verification (for client-side expiry check)
 */
const decodeToken = (token) => {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(base64Decode(base64UrlToBase64(parts[1])));
    return payload;
  } catch (error) {
    console.error("Token decode error:", error);
    return null;
  }
};

/**
 * Generate a unique session ID
 */
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

// ============================================
// AUTH SERVICE CLASS
// ============================================

class AuthService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.timeout =
      parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT, 10) ||
      SECURITY_CONFIG.REQUEST_TIMEOUT_MS;
    this._tokenRefreshPromise = null;
  }

  /**
   * Initialize auth service with backend URL
   * Called when app starts - uses .env EXPO_PUBLIC_API_URL
   */
  async initialize() {
    try {
      const configService = require("./configService").default;
      const detectedURL = await configService.getBaseURL();
      this.baseURL = detectedURL.replace(/\/$/, "");
      console.log("[AuthService] Initialized with baseURL:", this.baseURL);
    } catch (error) {
      console.error("[AuthService] Error during initialization:", error);
      // Fall back to initial baseURL from module load
    }
  }

  // ============================================
  // RATE LIMITING & BRUTE FORCE PROTECTION
  // ============================================

  /**
   * Check if user is locked out due to too many failed attempts
   */
  async _isLockedOut() {
    try {
      const attempts = await storageService.getItem(
        STORAGE_KEYS.LOGIN_ATTEMPTS,
      );
      if (!attempts) return false;

      const { count, lockoutUntil } = attempts;
      if (lockoutUntil && Date.now() < lockoutUntil) {
        const remainingMs = lockoutUntil - Date.now();
        const remainingMins = Math.ceil(remainingMs / 60000);
        return { locked: true, remainingMins };
      }

      // Reset if lockout expired
      if (lockoutUntil && Date.now() >= lockoutUntil) {
        await this._resetLoginAttempts();
      }

      return { locked: false, count: count || 0 };
    } catch (error) {
      return { locked: false, count: 0 };
    }
  }

  /**
   * Record a failed login attempt
   */
  async _recordFailedAttempt() {
    try {
      const attempts = (await storageService.getItem(
        STORAGE_KEYS.LOGIN_ATTEMPTS,
      )) || { count: 0 };
      const newCount = (attempts.count || 0) + 1;

      const data = { count: newCount };
      if (newCount >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
        data.lockoutUntil = Date.now() + SECURITY_CONFIG.LOCKOUT_DURATION_MS;
      }

      await storageService.setItem(STORAGE_KEYS.LOGIN_ATTEMPTS, data);
      return newCount;
    } catch (error) {
      console.error("Error recording failed attempt:", error);
    }
  }

  /**
   * Reset login attempts after successful login
   */
  async _resetLoginAttempts() {
    try {
      await storageService.removeItem(STORAGE_KEYS.LOGIN_ATTEMPTS);
    } catch (error) {
      console.error("Error resetting login attempts:", error);
    }
  }

  // ============================================
  // TOKEN MANAGEMENT
  // ============================================

  /**
   * Securely store authentication tokens
   */
  async _storeTokens(token, refreshToken = null) {
    try {
      console.log(
        "[AuthService] _storeTokens called with refreshToken:",
        refreshToken ? "present" : "null/undefined",
      );

      // Store main token securely
      await secureStorageService.setSecureItem(SECURE_KEYS.AUTH_TOKEN, token);
      console.log("[AuthService] Auth token stored");

      // Store refresh token if provided
      if (refreshToken) {
        await secureStorageService.setSecureItem(
          SECURE_KEYS.REFRESH_TOKEN,
          refreshToken,
        );
        console.log("[AuthService] Refresh token stored");
      } else {
        console.log("[AuthService] No refresh token to store");
      }

      // Decode and store expiry for quick checks
      const decoded = decodeToken(token);
      if (decoded && decoded.exp) {
        await secureStorageService.setSecureItem(
          SECURE_KEYS.TOKEN_EXPIRY,
          String(decoded.exp * 1000), // Convert to milliseconds
        );
      }

      // Generate and store session ID
      const sessionId = generateSessionId();
      await secureStorageService.setSecureItem(
        SECURE_KEYS.SESSION_ID,
        sessionId,
      );

      return true;
    } catch (error) {
      console.error("Error storing tokens:", error);
      return false;
    }
  }

  /**
   * Clear all authentication tokens
   */
  async _clearTokens() {
    try {
      await Promise.all([
        secureStorageService.removeSecureItem(SECURE_KEYS.AUTH_TOKEN),
        secureStorageService.removeSecureItem(SECURE_KEYS.REFRESH_TOKEN),
        secureStorageService.removeSecureItem(SECURE_KEYS.TOKEN_EXPIRY),
        secureStorageService.removeSecureItem(SECURE_KEYS.SESSION_ID),
      ]);
      return true;
    } catch (error) {
      console.error("Error clearing tokens:", error);
      return false;
    }
  }

  /**
   * Check if token is expired or about to expire
   */
  async _isTokenExpired() {
    try {
      const expiryStr = await secureStorageService.getSecureItem(
        SECURE_KEYS.TOKEN_EXPIRY,
      );
      if (!expiryStr) return true;

      const expiry = parseInt(expiryStr, 10);
      const now = Date.now();

      // Consider expired if within threshold of expiry
      return now >= expiry - SECURITY_CONFIG.TOKEN_REFRESH_THRESHOLD_MS;
    } catch (error) {
      return true;
    }
  }

  /**
   * Validate token format and structure
   */
  _validateTokenFormat(token) {
    if (!token || typeof token !== "string") return false;
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    try {
      // Check if each part is valid base64
      parts.forEach((part) => base64Decode(base64UrlToBase64(part)));
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // HTTP REQUEST HELPERS
  // ============================================

  /**
   * Make a secure API request with timeout and error handling
   * Simplified version without AbortController for better React Native compatibility
   */
  async _secureRequest(endpoint, options = {}, retryCount = 0) {
    const MAX_RETRIES = 2;

    // Debug logging
    console.log("=== API REQUEST DEBUG ===");
    console.log("Endpoint:", endpoint);
    console.log("Method:", options.method || "GET");
    console.log("Timeout:", this.timeout, "ms");
    console.log("Attempt:", retryCount + 1, "of", MAX_RETRIES + 1);

    const startTime = Date.now();

    try {
      console.log("📤 Attempting to connect...");

      const headers = {
        Accept: "application/json",
        ...options.headers,
      };

      const token = await this.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Automaticaly handle Content-Type for FormData
      if (options.body instanceof FormData) {
        // Fetch will automatically set the correct boundary when body is FormData
        // We must NOT set Content-Type manually here
        delete headers["Content-Type"];
      } else if (!headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }

      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          const duration = Date.now() - startTime;
          console.log("⏱️ Request timeout after", duration, "ms");
          reject(new Error("AbortError")); // Simulate AbortError for consistency
        }, this.timeout);
      });

      // Use Promise.race for timeout - more compatible with React Native
      const response = await Promise.race([
        fetch(endpoint, {
          ...options,
          headers,
        }),
        timeoutPromise,
      ]);
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      console.log("✅ Response received in:", duration, "ms");
      console.log("Response status:", response.status);

      // Handle 401 Unauthorized - trigger automatic token refresh
      if (response.status === 401 && retryCount < 1) {
        console.warn("🔐 [AuthService] 401 Unauthorized detected. Attempting token refresh...");
        
        // Don't refresh if we are already in the refresh endpoint
        if (!endpoint.includes("/v1/users/refresh")) {
          const refreshed = await this.refreshToken();
          if (refreshed) {
            console.log("♻️ [AuthService] Token refreshed successfully. Retrying request...");
            // Update token in options if it was manually provided
            const newToken = await this.getToken();
            if (options.headers && options.headers["Authorization"]) {
              options.headers["Authorization"] = `Bearer ${newToken}`;
            }
            return this._secureRequest(endpoint, options, retryCount + 1);
          }
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log("❌ Error response data:", errorData);
        let errorMessage = errorData.message || errorData.error || errorData.msg || `HTTP ${response.status}`;
        
        // Handle validation errors
        if (Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          const detailMessages = errorData.errors.map(err => {
            if (typeof err === "string") return err;
            const pathPrefix = err.path ? (Array.isArray(err.path) ? err.path.join(".") : err.path) + ": " : "";
            return `${pathPrefix}${err.message || err.msg || JSON.stringify(err)}`;
          }).join(", ");
          errorMessage = `Validation Error: ${detailMessages}`;
        }

        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = errorData;
        throw error;
      }

      const data = await response.json();
      console.log("✓ Response data received");
      return data;
    } catch (error) {
      const duration = Date.now() - startTime;

      console.log("=== API REQUEST ERROR ===");
      console.log("Error after:", duration, "ms");
      console.log("Error name:", error.name);
      console.log("Error message:", error.message);

      // Handle timeouts
      if (error.message === "AbortError" || error.message.includes("timed out")) {
        console.log("🚫 Request timeout of", this.timeout, "ms exceeded");
        if (retryCount < MAX_RETRIES) {
          console.log(`🔄 Retrying due to timeout (${retryCount + 1}/3)...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return this._secureRequest(endpoint, options, retryCount + 1);
        }
        throw new Error("Request timed out - please check your internet connection");
      }

      // Handle network changes / failures
      if (
        error.message === "Network request failed" ||
        error.message.includes("Network") ||
        error.message.includes("network changed") ||
        error.message.includes("ERR_NETWORK_CHANGED") ||
        error.message.includes("ECONNREFUSED")
      ) {
        console.log("📡 [AuthService] Network error/change detected:", error.message);
        
        if (retryCount < MAX_RETRIES) {
          console.log(`🔄 Retrying due to network state change (${retryCount + 1}/3)...`);
          // Wait a bit longer for network to stabilize
          await new Promise((resolve) => setTimeout(resolve, 3000));
          return this._secureRequest(endpoint, options, retryCount + 1);
        }
      }

      throw error;
    }
  }

  // ============================================
  // PUBLIC AUTHENTICATION METHODS
  // ============================================

  /**
   * Register a new user
   * Note: NIN and phone number are now optional at signup and can be added later in profile
   */
  async register(userData) {
    try {
      // Input validation
      if (!userData) {
        throw new Error("User data is required");
      }

      const fullName = sanitizeInput(userData.fullName);
      const email = sanitizeInput(userData.email || userData.emailAddress);
      const password = userData.password; // Don't sanitize password

      if (!fullName || fullName.length < 2) {
        throw new Error("Full name must be at least 2 characters");
      }

      if (!email || !isValidEmail(email)) {
        throw new Error("Please enter a valid email address");
      }

      if (!password) {
        throw new Error("Password is required");
      }

      if (!isValidPassword(password)) {
        throw new Error(
          "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
        );
      }

      const payload = {
        fullName,
        emailAddress: email,
        password,
        gender: (userData.gender && userData.gender.toString().toUpperCase()) || "OTHERS",
        isMarketingSubscribed: userData.isMarketingSubscribed || false,
        referralCode: userData.referralCode,
      };

      const data = await this._secureRequest(
        `${this.baseURL}/v1/users/register`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      return {
        success: true,
        message: data.message || "Registration successful. Please verify your email.",
        data: data.body || data,
      };
    } catch (error) {
      networkErrorHandler.logError(error, {
        action: "register",
        endpoint: "v1/users/register",
      });
      return {
        success: false,
        message: error.message || "Registration failed. Please try again.",
      };
    }
  }

  /**
   * Login user with credentials
   */
  async login(credentials) {
    console.log("=== LOGIN ATTEMPT ===");
    console.log("Base URL:", this.baseURL);
    console.log("Full login endpoint:", `${this.baseURL}/v1/users/login`);
    console.log(
      "Credentials email:",
      credentials && (credentials.email || credentials.emailAddress),
    );

    try {
      // Check for lockout
      const lockoutStatus = await this._isLockedOut();
      if (lockoutStatus.locked) {
        throw new Error(
          `Too many failed attempts. Please try again in ${lockoutStatus.remainingMins} minutes.`,
        );
      }

      // Input validation
      if (!credentials) {
        throw new Error("Credentials are required");
      }

      const email = sanitizeInput(
        credentials.email || credentials.emailAddress,
      );
      const password = credentials.password;

      if (!email || !isValidEmail(email)) {
        throw new Error("Please enter a valid email address");
      }

      if (!password) {
        throw new Error("Password is required");
      }

      const payload = {
        emailAddress: email,
        password,
      };

      const data = await this._secureRequest(`${this.baseURL}/v1/users/login`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Handle nested response: { body: { token, refreshToken, user }, message }
      const responseBody = data.body || data;
      const token = responseBody.token;
      const refreshToken = responseBody.refreshToken;
      const user = responseBody.user;

      console.log("[AuthService] Login response received");
      console.log("[AuthService] Token received:", token ? "yes" : "no");
      console.log(
        "[AuthService] Refresh token received:",
        refreshToken ? "yes" : "no",
      );

      // Validate token format
      if (!token || !this._validateTokenFormat(token)) {
        throw new Error("Invalid authentication response");
      }

      // Warn if no refresh token (but don't fail)
      if (!refreshToken) {
        console.warn(
          "[AuthService] No refresh token in login response - token refresh will not work",
        );
      }

      // Store tokens securely
      console.log("[AuthService] Storing token:", token);
      const stored = await this._storeTokens(token, refreshToken);
      if (!stored) {
        throw new Error("Failed to save authentication data");
      }
      // Debug: Immediately read back token from storage
      const storedToken = await this.getToken();
      console.log("[AuthService] Token read back from storage:", storedToken);

      // Store user data (non-sensitive) - include nin for profile verification
      if (user) {
        const safeUserData = {
          id: user.id || user._id,
          email: user.emailAddress,
          fullName: user.fullName,
          userType: user.userType,
          nin: user.nin || null,
          phoneNumber: user.phoneNumber || null,
          verified: user.verified || false,
          hostApplicationStatus: user.hostApplicationStatus || "NONE",
          avatar: user.avatar || null,
        };
        await storageService.setItem(STORAGE_KEYS.USER_DATA, safeUserData);

        // Sync avatar with profile service for BottomNav
        const avatarUrl = ImageUtils.resolveImageUrlSync(user.avatar, this.baseURL);

        // Prefetch avatar for better performance
        if (avatarUrl) {
          ExpoImage.prefetch(avatarUrl);
        }

        await profileService.updateAvatar(avatarUrl);
      }

      // Record successful login
      await this._resetLoginAttempts();
      await storageService.setItem(STORAGE_KEYS.LAST_LOGIN, Date.now());

      // Initialize inactivity timeout
      try {
        const onWarning = () => {
          Alert.alert(
            "Session Expiring",
            "Your session will expire due to inactivity in 1 minute. Any unsaved changes will be lost.",
            [{ text: "OK" }],
          );
        };

        const onLogout = async () => {
          await this._clearTokens();
          await storageService.removeItem(STORAGE_KEYS.USER_DATA);
        };

        await inactivityTimeoutService.initialize(onLogout, onWarning);
        console.log("[AuthService] Inactivity timeout initialized");
      } catch (error) {
        console.warn(
          "[AuthService] Failed to initialize inactivity timeout:",
          error,
        );
        // Don't fail login if inactivity service fails
      }

      return {
        success: true,
        message: "Login successful",
        token, // Return for immediate use if needed
      };
    } catch (error) {
      console.log("=== LOGIN ERROR ===");
      console.log("Error type:", error.constructor.name);
      console.log("Error message:", error.message);
      console.log("Error status:", error.status);
      console.log("Base URL was:", this.baseURL);

      // Record failed attempt if it's an auth error
      if (
        error.status === 401 ||
        (error.message && error.message.includes("Invalid"))
      ) {
        await this._recordFailedAttempt();
      }

      networkErrorHandler.logError(error, {
        action: "login",
        endpoint: "v1/users/login",
      });
      return {
        success: false,
        message:
          error.message || "Login failed. Please check your credentials.",
        data: error.data || {},
        status: error.status,
      };
    }
  }

  /**
   * Request password reset email
   */
  async forgotPassword(email) {
    console.log("=== FORGOT PASSWORD REQUEST ===");
    console.log("Email:", email);

    try {
      if (!email) {
        throw new Error("Email is required");
      }

      const sanitizedEmail = sanitizeInput(email);
      if (!isValidEmail(sanitizedEmail)) {
        throw new Error("Please enter a valid email address");
      }

      const data = await this._secureRequest(
        `${this.baseURL}/v1/users/forgot-password`,
        {
          method: "POST",
          body: JSON.stringify({ emailAddress: sanitizedEmail }),
        },
      );

      return {
        success: true,
        message:
          data.message || "Password reset instructions sent to your email.",
      };
    } catch (error) {
      console.log("Forgot password error:", error.message);
      networkErrorHandler.logError(error, {
        action: "forgotPassword",
        endpoint: "v1/users/forgot-password",
      });

      // Show error if email not found
      if (error.status === 404) {
        return {
          success: false,
          message: "No account found with this email address",
        };
      }

      return {
        success: false,
        message:
          error.message || "Failed to send reset email. Please try again.",
      };
    }
  }

  /**
   * Verify reset code (for OTP flow - future implementation)
   * Note: Currently using token-based reset, this is for when OTP is implemented
   */
  async verifyResetCode(email, code) {
    console.log("=== VERIFY RESET CODE ===");
    console.log("Email:", email);

    try {
      if (!email || !code) {
        throw new Error("Email and code are required");
      }

      const data = await this._secureRequest(
        `${this.baseURL}/v1/users/verify-reset-code`,
        {
          method: "POST",
          body: JSON.stringify({ emailAddress: email, code }),
        },
      );

      return {
        success: true,
        message: data.message || "Code verified successfully",
        data: data.body || data,
      };
    } catch (error) {
      console.log("Verify reset code error:", error.message);
      return {
        success: false,
        message: error.message || "Invalid or expired code",
      };
    }
  }

  /**
   * Resend the verification OTP for a newly registered user
   */
  async sendVerificationOtp(email) {
    try {
      if (!email) throw new Error("Email is required");

      const data = await this._secureRequest(
        `${this.baseURL}/v1/users/send-verification-otp`,
        {
          method: "POST",
          body: JSON.stringify({ emailAddress: email }),
        },
      );

      return {
        success: true,
        message: data.message || "Verification code sent to your email",
      };
    } catch (error) {
      console.error("Send verification OTP error:", error);
      return {
        success: false,
        message: error.message || "Failed to send verification code",
      };
    }
  }

  /**
   * Verify the registration OTP and complete activation
   */
  async verifyRegistrationOtp(email, code) {
    try {
      if (!email || !code) throw new Error("Email and code are required");

      const data = await this._secureRequest(
        `${this.baseURL}/v1/users/verify-registration-otp`,
        {
          method: "POST",
          body: JSON.stringify({ emailAddress: email, code }),
        },
      );

      // Handle successful verification (which also logs the user in)
      const responseBody = data.body || data;
      const { user, tokens } = responseBody;

      if (tokens && tokens.accessToken) {
        await this._storeTokens(tokens.accessToken, tokens.refreshToken);
        
        if (user) {
          const safeUserData = {
            id: user.id || user._id,
            email: user.emailAddress,
            fullName: user.fullName,
            userType: user.userType,
            verified: user.verified || false,
            emailVerified: user.emailVerified || true,
            avatar: user.avatar || null,
          };
          await storageService.setItem(STORAGE_KEYS.USER_DATA, safeUserData);
        }
      }

      return {
        success: true,
        message: data.message || "Email verified successfully",
        data: responseBody,
      };
    } catch (error) {
      console.error("Verify registration OTP error:", error);
      return {
        success: false,
        message: error.message || "Invalid or expired verification code",
      };
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    console.log("=== RESET PASSWORD ===");

    try {
      if (!token || !newPassword) {
        throw new Error("Token and new password are required");
      }

      if (!isValidPassword(newPassword)) {
        throw new Error(
          "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
        );
      }

      const data = await this._secureRequest(
        `${this.baseURL}/v1/users/reset-password`,
        {
          method: "POST",
          body: JSON.stringify({ token, newPassword }),
        },
      );

      return {
        success: true,
        message: data.message || "Password reset successfully.",
      };
    } catch (error) {
      console.log("Reset password error:", error.message);
      networkErrorHandler.logError(error, {
        action: "resetPassword",
        endpoint: "v1/users/reset-password",
      });

      return {
        success: false,
        message: error.message || "Failed to reset password. Please try again.",
      };
    }
  }

  /**
   * Logout user and clear all auth data
   */
  async logout() {
    try {
      // Stop inactivity timeout
      inactivityTimeoutService.destroy();

      // Optionally notify server of logout
      const token = await this.getToken();
      if (token) {
        try {
          await this._secureRequest(`${this.baseURL}/v1/users/logout`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } catch {
          // Continue logout even if server call fails
        }
      }

      // Clear all auth data
      await this._clearTokens();
      await storageService.removeItem(STORAGE_KEYS.USER_DATA);

      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      // Still try to clear local data
      inactivityTimeoutService.destroy();
      await this._clearTokens();
      await storageService.removeItem(STORAGE_KEYS.USER_DATA);
      return { success: true };
    }
  }

  /**
   * Check if user is currently logged in with valid token
   */
  async isLoggedIn() {
    try {
      const token = await secureStorageService.getSecureItem(
        SECURE_KEYS.AUTH_TOKEN,
      );
      if (!token) return false;

      // Validate token format
      if (!this._validateTokenFormat(token)) {
        await this._clearTokens();
        return false;
      }

      // Check if token is expired
      const isExpired = await this._isTokenExpired();
      if (isExpired) {
        // Try to refresh token
        const refreshed = await this.refreshToken();
        return refreshed;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current auth token (refreshes if needed)
   */
  async getToken() {
    try {
      // Check if token needs refresh
      const isExpired = await this._isTokenExpired();
      if (isExpired) {
        await this.refreshToken();
      }

      return await secureStorageService.getSecureItem(SECURE_KEYS.AUTH_TOKEN);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user data from local storage
   */
  async getUserData() {
    return await getUserDataShared();
  }

  /**
   * Set user data in local storage
   */
  async setUserData(userData) {
    return await setUserDataShared(userData);
  }

  /**
   * Refresh the auth token
   */
  async refreshToken() {
    // Prevent multiple simultaneous refresh attempts
    if (this._tokenRefreshPromise) {
      return this._tokenRefreshPromise;
    }

    this._tokenRefreshPromise = (async () => {
      try {
        const refreshToken = await secureStorageService.getSecureItem(
          SECURE_KEYS.REFRESH_TOKEN,
        );

        console.log(
          "[AuthService] Retrieved refresh token from storage:",
          refreshToken ? "present" : "null",
        );

        // Must have a refresh token to refresh
        if (!refreshToken) {
          console.log("[AuthService] No refresh token available");
          return false;
        }

        console.log("[AuthService] Attempting token refresh...");

        // Refresh endpoint doesn't need Authorization header - just the refresh token in body
        const response = await fetch(`${this.baseURL}/v1/users/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        });



        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(
            "[AuthService] Refresh failed:",
            response.status,
            errorData,
          );
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const responseBody = data.body || data;

        if (responseBody.token) {
          await this._storeTokens(
            responseBody.token,
            responseBody.refreshToken,
          );
          console.log("[AuthService] Token refreshed successfully");
          return true;
        }

        return false;
      } catch (error) {
        console.error("Token refresh failed:", error);
        
        // Only clear tokens if the refresh is explicitly rejected by the server (401, 403, 400, 404)
        // This prevents logging out users during temporary network glitches
        const isAuthError = error.status === 401 || error.status === 403 || error.status === 400 || error.status === 404;
        
        if (isAuthError) {
          console.warn("[AuthService] Clearing tokens due to definitive auth failure:", error.status);
          await this._clearTokens();
          try {
            await storageService.removeItem(STORAGE_KEYS.USER_DATA);
            console.log("[AuthService] Auth state and user data cleared");
          } catch (storageError) {
            console.error("[AuthService] Failed to clear user data:", storageError);
          }
        } else {
          console.log("[AuthService] Refresh failed due to non-auth error (e.g. network). Keeping tokens.");
        }
        
        return false;
      } finally {
        this._tokenRefreshPromise = null;
      }
    })();

    return this._tokenRefreshPromise;
  }

  /**
   * Get current session ID
   */
  async getSessionId() {
    try {
      return await secureStorageService.getSecureItem(SECURE_KEYS.SESSION_ID);
    } catch (error) {
      return null;
    }
  }

  /**
   * Change user password
   */
  async changePassword(currentPassword, newPassword) {
    try {
      if (!isValidPassword(newPassword)) {
        throw new Error(
          "New password must be at least 8 characters with uppercase, lowercase, number, and special character",
        );
      }

      const token = await this.getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      await this._secureRequest(`${this.baseURL}/v1/users/change-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      return { success: true, message: "Password changed successfully" };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Failed to change password",
      };
    }
  }

  /**
   * Fetch current user profile from server
   * Returns fresh data including hostApplicationStatus
   */
  async fetchProfile() {
    try {
      const token = await this.getToken();
      if (!token) {
        console.warn("[AuthService] fetchProfile: No token available, user not authenticated");
        return {
          success: false,
          message: "Not authenticated",
          data: null,
          requiresAuth: true,
        };
      }

      const response = await this._secureRequest(
        `${this.baseURL}/v1/users/profile`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // Update local storage with fresh data
      if (response.body) {
        await this.setUserData(response.body);

        // Sync avatar with profile service for BottomNav
        const avatarUrl = ImageUtils.resolveImageUrlSync(response.body.avatar, this.baseURL);
        await profileService.updateAvatar(avatarUrl);
      }

      return {
        success: true,
        data: response.body,
      };
    } catch (error) {
      // Don't log a full error for "Not authenticated" as it's an expected state for guests
      if (error.message === "Not authenticated" || error.status === 401) {
        console.warn("[AuthService] fetchProfile: User is not authenticated");
      } else {
        console.error("Error fetching profile:", error);
      }
      return {
        success: false,
        message: error.message || "Failed to fetch profile",
        data: null,
      };
    }
  }

  /**
   * Update user profile on server
   * Used to update phone number, NIN, and other profile fields
   * @param {Object} profileData - Fields to update (phoneNumber, nin, location, etc.)
   */
  async updateProfile(profileData) {
    try {
      const token = await this.getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Validate NIN if provided
      if (profileData.nin && !/^[0-9]{11}$/.test(profileData.nin.trim())) {
        throw new Error("NIN must be exactly 11 digits");
      }

      // Validate phone number if provided
      if (profileData.phoneNumber) {
        const cleanPhone = profileData.phoneNumber.replace(/[\s\-()]/g, "");
        if (!/^[0-9+]{10,15}$/.test(cleanPhone)) {
          throw new Error("Please enter a valid phone number");
        }
      }

      const response = await this._secureRequest(
        `${this.baseURL}/v1/users/profile`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(profileData),
        },
      );

      // Update local storage with updated data
      if (response.body) {
        await this.setUserData(response.body);

        // Sync avatar with profile service if updated
        const avatarUrl = ImageUtils.resolveImageUrlSync(response.body.avatar, this.baseURL);
        if (avatarUrl !== null || response.body.hasOwnProperty("avatar")) {
          await profileService.updateAvatar(avatarUrl);
        }
      }

      return {
        success: true,
        message: response.message || "Profile updated successfully",
        data: response.body,
      };
    } catch (error) {
      console.error("Error updating profile:", error);
      return {
        success: false,
        message: error.message || "Failed to update profile",
        data: null,
      };
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    try {
      const sanitizedEmail = sanitizeInput(email);
      if (!isValidEmail(sanitizedEmail)) {
        throw new Error("Please enter a valid email address");
      }

      await this._secureRequest(`${this.baseURL}/v1/users/forgot-password`, {
        method: "POST",
        body: JSON.stringify({ emailAddress: sanitizedEmail }),
      });

      return {
        success: true,
        message:
          "If an account exists with this email, you will receive reset instructions.",
      };
    } catch (error) {
      // Don't reveal if email exists or not
      return {
        success: true,
        message:
          "If an account exists with this email, you will receive reset instructions.",
      };
    }
  }

  /**
   * Upload user avatar
   * @param {string} imageUri - Local URI of the image to upload
   */
  async uploadAvatar(imageUri) {
    try {
      console.log("=== UPLOAD AVATAR ===");
      console.log("Image URI:", imageUri);

      if (!imageUri) {
        throw new Error("No image selected");
      }

      // Create form data
      const formData = new FormData();

      if (Platform.OS === "web") {
        // For web, we need to handle both data URLs and blob URLs correctly
        try {
          console.log("[AuthService] Handling web image upload...");
          let blob;
          let filename = "avatar.jpg";
          let type = "image/jpeg";

          if (imageUri.startsWith("data:")) {
            // Data URL (base64) - convert to blob
            const parts = imageUri.split(",");
            const mimeMatch = parts[0].match(/:(.*?);/);
            if (mimeMatch) type = mimeMatch[1];
            const base64Data = parts[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            blob = new Blob([new Uint8Array(byteNumbers)], { type });
          } else {
            // Blob URL or regular URL - fetch and convert
            const res = await fetch(imageUri);
            blob = await res.blob();
            type = blob.type || "image/jpeg";
          }
          
          formData.append("avatar", blob, filename);
        } catch (error) {
          console.error("[AuthService] Web blob conversion failed:", error);
          throw new Error("Failed to process image for upload");
        }
      } else {
        // Native (iOS/Android) behavior
        const filename = imageUri.split("/").pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";

        formData.append("avatar", {
          uri: imageUri,
          name: filename,
          type,
        });
      }

      // Get token (manually since we need custom headers for multipart)
      const token = await secureStorageService.getSecureItem(
        SECURE_KEYS.AUTH_TOKEN,
      );
      if (!token) throw new Error("No auth token found");

      console.log("Uploading to:", `${this.baseURL}/v1/users/upload-avatar`);

      const response = await fetch(`${this.baseURL}/v1/users/upload-avatar`, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      let data;
      try {
        const text = await response.text(); // Get text first
        try {
          data = JSON.parse(text); // Try to parse as JSON
        } catch (e) {
          console.error("Invalid JSON response:", text.substring(0, 200)); // Log first 200 chars
          throw new Error(
            `Server returned invalid response: ${response.status}`,
          );
        }
      } catch (error) {
        throw new Error(error.message || "Failed to parse server response");
      }

      console.log("Upload response:", data);

      if (!response.ok) {
        throw new Error(data.message || "Failed to upload avatar");
      }

      // Sync avatar with profile service
      const avatarUrlPath = data.body?.avatarUrl || data.avatarUrl;
      if (avatarUrlPath) {
        let fullAvatarUrl = avatarUrlPath;
        if (!fullAvatarUrl.startsWith("http")) {
          fullAvatarUrl = `${this.baseURL}${fullAvatarUrl}`;
        }
        await profileService.updateAvatar(fullAvatarUrl);
      }

      // The instruction seems to be for fetchProfile, but the code snippet is for uploadAvatar.
      // Applying the code snippet as provided to the uploadAvatar function.
      // This block seems to be intended to update the avatar in profileService based on the *returned* user data,
      // which might be redundant with the block above if `avatarUrlPath` is the same as `data.data.avatar`.
      // However, following the instruction faithfully.
      if (data.data) {
        const user = data.data;
        // Sync avatar with profile service for BottomNav
        if (user.avatar) {
          let avatarUrl = user.avatar;
          // Ensure we have a full URL if it's a relative path
          if (
            avatarUrl &&
            !avatarUrl.startsWith("http") &&
            !avatarUrl.startsWith("file")
          ) {
            const baseUrl = this.baseURL.replace(/\/$/, "");
            const cleanAvatarPath = avatarUrl.startsWith("/")
              ? avatarUrl
              : `/${avatarUrl}`;
            avatarUrl = `${baseUrl}${cleanAvatarPath}`;
          }
          await profileService.updateAvatar(avatarUrl);
        }
      }

      return {
        success: true,
        data: data.data || data.body || data, // Adjusted to keep original data.body || data if data.data is not present
        message: data.message || "Avatar uploaded successfully", // Kept original message as this is uploadAvatar
      };
    } catch (error) {
      console.error("Upload avatar error:", error);
      return {
        success: false,
        message: error.message || "Failed to upload avatar",
      };
    }
  }

  /**
   * Apply to become a host/landlord
   * Submits host application to backend for admin review
   * @param {Object} applicationData - The host application form data
   */
  async applyForHost(applicationData = {}) {
    try {
      const token = await this.getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const formData = new FormData();

      // Separate images from other data
      const {
        propertyImages,
        validIdImage,
        authorizationLetter,
        ...otherData
      } = applicationData;

      // Append textual data
      Object.keys(otherData).forEach((key) => {
        if (otherData[key] !== undefined && otherData[key] !== null) {
          if (Array.isArray(otherData[key])) {
            // Fix: Backend expects just 'propertyTypes', not 'propertyTypes[]' for certain multipart parsers
            otherData[key].forEach((item) => formData.append(key, item));
          } else if (typeof otherData[key] === "object") {
            formData.append(key, JSON.stringify(otherData[key]));
          } else {
            formData.append(key, otherData[key]);
          }
        }
      });

      // Helper to compress image
      const compressImage = async (uri) => {
        if (!uri) return null;
        try {
          console.log("[AuthService] Compressing image:", uri);
          const compressed = await ImageCompressor.compress(uri, {
            compressionMethod: 'auto',
            quality: 0.7,
            maxWidth: 2048,
            maxHeight: 2048,
          });
          console.log("[AuthService] Compression complete:", compressed);
          return compressed;
        } catch (error) {
          console.warn("[AuthService] Compression failed, using original:", error);
          return uri;
        }
      };

      // Helper to append file to FormData with proper MIME detection
      const appendFile = (fieldName, uri) => {
        if (!uri) return;
        const filename = uri.split("/").pop() || `${fieldName}_upload.jpg`;
        const ext = filename.split('.').pop().toLowerCase();
        
        // Comprehensive MIME type mapping to match backend applicationFileFilter
        let type = 'image/jpeg';
        if (['jpg', 'jpeg'].includes(ext)) type = 'image/jpeg';
        else if (ext === 'png') type = 'image/png';
        else if (ext === 'webp') type = 'image/webp';
        else if (ext === 'gif') type = 'image/gif';
        else if (ext === 'pdf') type = 'application/pdf';
        else if (ext === 'mp4') type = 'video/mp4';
        else if (ext === 'mov' || ext === 'qt') type = 'video/quicktime';
        else if (ext === 'avi') type = 'video/x-msvideo';
        else if (ext === 'mkv') type = 'video/x-matroska';
        else if (ext === 'webm') type = 'video/webm';

        console.log(`[AuthService] Appending ${fieldName}:`, { filename, type, uri });

        formData.append(fieldName, {
          uri: uri, // [STABILIZATION] Keep file:// prefix for all platforms
          name: filename,
          type,
        });
      };

      // Compress and append property images
      if (Array.isArray(propertyImages)) {
        const compressedPropertyImages = await Promise.all(
          propertyImages.map(uri => compressImage(uri))
        );
        compressedPropertyImages.filter(uri => !!uri).forEach((uri) => appendFile("propertyImages", uri));
      }

      // Compress and append single images
      const [compressedId, compressedLetter] = await Promise.all([
        compressImage(validIdImage),
        compressImage(authorizationLetter),
      ]);

      appendFile("validIdImage", compressedId);
      appendFile("authorizationLetter", compressedLetter);

      const response = await this._secureRequest(
        `${this.baseURL}/v1/users/apply-host`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      // Refresh profile data to get updated hostApplicationStatus
      await this.fetchProfile();

      return {
        success: true,
        message: response.message || "Host application submitted successfully",
        data: response.body,
      };
    } catch (error) {
      console.error("Error applying for host:", error);
      return {
        success: false,
        message: error.message || "Failed to submit host application",
      };
    }
  }

  /**
   * Fetch public user profile by ID
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async fetchUserById(userId) {
    try {
      if (!userId) throw new Error("User ID is required");

      const token = await this.getToken();
      if (!token) throw new Error("Not authenticated");

      const response = await this._secureRequest(
        `${this.baseURL}/v1/users/${userId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // Handle nested response body
      const userData = response.body || response.data || response;

      // Resolve avatar URL if present
      if (userData && userData.avatar && !userData.avatar.startsWith('http') && !userData.avatar.startsWith('file')) {
        const baseUrl = this.baseURL.replace(/\/$/, "");
        const cleanAvatarPath = userData.avatar.startsWith("/") ? userData.avatar : `/${userData.avatar}`;
        userData.avatar = `${baseUrl}${cleanAvatarPath}`;
      }

      return {
        success: true,
        user: userData,
      };
    } catch (error) {
      console.error("[AuthService] fetchUserById error:", error);
      return {
        success: false,
        message: error.message || "Failed to fetch user profile",
      };
    }
  }

  /**
   * Send OTP to phone number
   * @param {string} phone - Phone number to send OTP to
   */
  async sendPhoneOTP(phone) {
    try {
      const token = await this.getToken();
      if (!token) {
        return {
          success: false,
          message: "Authentication required. Please log in.",
        };
      }

      console.log("[AuthService] Sending OTP to phone:", phone);

      const response = await fetch(`${this.baseURL}/v1/kyc/verify-phone/send-otp`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();
      console.log("[AuthService] Send OTP response:", data);

      if (response.ok && data.status === "success") {
        return {
          success: true,
          data: data.data,
          message: data.message || "OTP sent successfully",
        };
      }

      // Handle specific error cases
      if (response.status === 409) {
        return {
          success: false,
          message: "This phone number is already verified by another account",
        };
      }

      return {
        success: false,
        message: data.message || "Failed to send OTP",
      };
    } catch (error) {
      console.error("[AuthService] sendPhoneOTP error:", error);
      return {
        success: false,
        message: error.message || "Failed to send OTP",
      };
    }
  }

  /**
   * Verify OTP code for phone number
   * @param {string} phone - Phone number
   * @param {string} otp - OTP code to verify
   */
  async verifyPhoneOTP(phone, otp) {
    try {
      const token = await this.getToken();
      if (!token) {
        return {
          success: false,
          message: "Authentication required. Please log in.",
        };
      }

      console.log("[AuthService] Verifying OTP for phone:", phone);

      const response = await fetch(`${this.baseURL}/v1/kyc/verify-phone/verify-otp`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await response.json();
      console.log("[AuthService] Verify OTP response:", data);

      if (response.ok && data.status === "success") {
        return {
          success: true,
          data: data.data,
          message: data.message || "Phone verified successfully",
        };
      }

      return {
        success: false,
        message: data.message || "Invalid OTP. Please try again.",
      };
    } catch (error) {
      console.error("[AuthService] verifyPhoneOTP error:", error);
      return {
        success: false,
        message: error.message || "Failed to verify OTP",
      };
    }
  }
}

const authService = new AuthService();
export default authService;
