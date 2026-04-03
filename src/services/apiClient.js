/**
 * API Client Service
 * Cross-platform HTTP client for REST API calls
 * Works seamlessly on iOS, Android, and Web
 * Automatically detects and uses correct backend URL based on environment
 */

import { Alert, Platform } from "react-native";

import { navigateToLogin } from "../utils/navigationUtils";
import configService from "./configService";
import secureStorageService from "./secureStorageService";
import notificationService from "./notificationService";
import logService from "./logService";

// Use same key as authService
const AUTH_TOKEN_KEY = "auth_token_secure";

/**
 * Detect the correct API URL based on platform and environment
 * Priority: ENV > Platform Detection > Fallback
 */
const detectAPIURL = () => {
  // Check for explicit ENV override first (Works for native AND web)
  const envURL = process.env.EXPO_PUBLIC_API_URL;
  if (envURL) {
    return envURL;
  }

  // Web fallback if no ENV override
  if (Platform.OS === "web") {
    return "http://localhost:3000";
  }

  // Fallback for development
  return "http://localhost:3000";
};

class APIClient {
  constructor() {
    this.baseURL = detectAPIURL();
    this.timeout = process.env.EXPO_PUBLIC_API_TIMEOUT
      ? parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT)
      : 60000; // Increased default timeout to 60s
    this.headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    this.retryAttempts = 3;
    this.retryDelay = 1000;
    this.isInitialized = false;
  }

  /**
   * Initialize API client with dynamic URL detection
   * Call this once when app starts
   */
  async initialize() {
    if (this.isInitialized) {
      console.log("[APIClient] Already initialized with:", this.baseURL);
      return;
    }

    try {
      this.baseURL = await configService.getBaseURL();
    } catch (error) {
      console.warn(
        "[APIClient] Failed to detect base URL, using fallback:",
        error?.message || error,
      );
      this.baseURL = detectAPIURL();
    }

    this.isInitialized = true;
    console.log("[APIClient] Initialized with baseURL:", this.baseURL);
    console.log("[APIClient] Platform:", Platform.OS);
    console.log("[APIClient] Timeout:", this.timeout, "ms");
  }

  /**
   * Get auth token from secure storage
   * Uses same storage and key as authService for consistency
   * @returns {Promise<string|null>}
   */
  async getAuthToken() {
    try {
      // Use secure storage with same key as authService
      const token = await secureStorageService.getSecureItem(AUTH_TOKEN_KEY);
      return token;
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  }

  /**
   * Build request headers with auth token
   * @returns {Promise<Object>}
   */
  async buildHeaders(customHeaders = {}) {
    const token = await this.getAuthToken();
    const headers = { ...this.headers, ...customHeaders };

    console.log("[APIClient] buildHeaders - token:", token);
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      console.log("[APIClient] Authorization header set:", headers["Authorization"]);
    } else {
      console.log("[APIClient] buildHeaders - No auth token found (Request may be public)");
    }

    return headers;
  }

  /**
   * Parse response based on content-type
   * @param {Response} response - Fetch response object
   * @returns {Promise<*>}
   */
  async parseResponse(response) {
    const contentType =
      response.headers && response.headers.get
        ? response.headers.get("content-type")
        : "";

    if (contentType.includes("application/json")) {
      return await response.json();
    } else if (contentType.includes("text")) {
      return await response.text();
    } else {
      return response;
    }
  }

  /**
   * Handle API errors
   * @param {Error} error - Error object
   * @param {string} url - The URL that failed
   * @returns {void}
   */
  handleError(error, url = "unknown") {
    console.error("❌ [APIClient] API Error:", {
      message: error.message,
      status: error.status,
      url: url,
      baseURL: this.baseURL,
      platform: Platform.OS,
      response: error.response,
    });

    // Show user-friendly error message
    const displayMsg = error.message === "Failed to fetch" 
      ? `Connection Error: Unable to reach server at ${this.baseURL}. Please check your internet or if the backend is running.`
      : (error.message || "An error occurred");

    // Log error to backend
    logService.logError(displayMsg, {
      status: error.status,
      url: url,
      response: error.response,
      originalError: error.message,
    });

    if (Platform.OS === "web") {
      // Avoid spamming alerts on web
      console.warn("[APIClient] Network alert:", displayMsg);
    } else {
      // Use Toast instead of Alert for a non-intrusive experience
      notificationService.showError(displayMsg);
    }
  }

  /**
   * GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options (params, headers, etc)
   * @returns {Promise<*>}
   */
  async get(endpoint, options = {}) {
    // Safety: React Native doesn't always have a global URL constructor
    const cleanBase = this.baseURL.replace(/\/$/, "");
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    let urlString = `${cleanBase}${cleanEndpoint}`;

    // Add query parameters
    if (options.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          searchParams.append(key, value);
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        urlString += (urlString.includes("?") ? "&" : "?") + queryString;
      }
    }

    const headers = await this.buildHeaders(options.headers);

    try {
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Request timeout")), this.timeout);
      });

      const response = await Promise.race([
        fetch(urlString, {
          method: "GET",
          headers,
          ...options,
        }),
        timeoutPromise,
      ]);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorResponse = await this.parseResponse(response);
        
        // Global 401 handler: redirect to login
        if (response.status === 401) {
          console.warn("[APIClient] 401 Unauthorized - redirecting to login...");
          if (typeof navigateToLogin === "function") {
            await secureStorageService.removeSecureItem(AUTH_TOKEN_KEY);
            navigateToLogin();
          }
        }

        const error = new Error(
          errorResponse?.message || `HTTP ${response.status}`,
        );
        error.status = response.status;
        error.response = errorResponse;
        throw error;
      }

      return await this.parseResponse(response);
    } catch (error) {
      this.handleError(error, urlString);
      throw error;
    }
  }

  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {*} data - Request body
   * @param {Object} options - Request options
   * @returns {Promise<*>}
   */
  async post(endpoint, data, options = {}) {
    const cleanBase = this.baseURL.replace(/\/$/, "");
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const urlString = `${cleanBase}${cleanEndpoint}`;

    const headers = await this.buildHeaders(options.headers);

    // Debug logging
    console.log("[APIClient] POST Request Details:");
    console.log("  URL:", urlString);
    console.log("  Data:", JSON.stringify(data));
    console.log("  Headers:", JSON.stringify(headers));

    try {
      const requestBody = JSON.stringify(data);
      console.log("  Request Body:", requestBody);

      // Destructure to avoid options.headers overwriting merged headers
      const { headers: _h, ...restOptions } = options || {};
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Request timeout")), this.timeout);
      });

      const response = await Promise.race([
        fetch(urlString, {
          method: "POST",
          headers,
          body: requestBody,
          ...restOptions,
        }),
        timeoutPromise,
      ]);
      clearTimeout(timeoutId);

      console.log(
        "[APIClient] Response Status:",
        response.status,
        response.statusText,
      );

      if (!response.ok) {
        const errorResponse = await this.parseResponse(response);
        console.error(
          "[APIClient] Error Response:",
          JSON.stringify(errorResponse),
        );
        // Global 401 handler: force logout and redirect to login
        if (response.status === 401) {
          console.warn("[APIClient] 401 Unauthorized - redirecting to login...");
          if (typeof navigateToLogin === "function") {
            await secureStorageService.removeSecureItem(AUTH_TOKEN_KEY);
            navigateToLogin();
          }
        }
        const error = new Error(
          errorResponse?.message || `HTTP ${response.status}`,
        );
        error.status = response.status;
        error.response = errorResponse;
        throw error;
      }

      return await this.parseResponse(response);
    } catch (error) {
      this.handleError(error, urlString);
      throw error;
    }
  }

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {*} data - Request body
   * @param {Object} options - Request options
   * @returns {Promise<*>}
   */
  async put(endpoint, data, options = {}) {
    const cleanBase = this.baseURL.replace(/\/$/, "");
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const urlString = `${cleanBase}${cleanEndpoint}`;
    const headers = await this.buildHeaders(options.headers);

    try {
      const { headers: _h, ...restOptions } = options || {};
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Request timeout")), this.timeout);
      });

      const response = await Promise.race([
        fetch(urlString, {
          method: "PUT",
          headers,
          body: JSON.stringify(data),
          ...restOptions,
        }),
        timeoutPromise,
      ]);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorResponse = await this.parseResponse(response);
        
        // Global 401 handler: redirect to login
        if (response.status === 401) {
          console.warn("[APIClient] 401 Unauthorized - redirecting to login...");
          if (typeof navigateToLogin === "function") {
            await secureStorageService.removeSecureItem(AUTH_TOKEN_KEY);
            navigateToLogin();
          }
        }

        const error = new Error(
          errorResponse?.message || `HTTP ${response.status}`,
        );
        error.status = response.status;
        error.response = errorResponse;
        throw error;
      }

      return await this.parseResponse(response);
    } catch (error) {
      this.handleError(error, urlString);
      throw error;
    }
  }

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise<*>}
   */
  async delete(endpoint, options = {}) {
    const cleanBase = this.baseURL.replace(/\/$/, "");
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const urlString = `${cleanBase}${cleanEndpoint}`;
    const headers = await this.buildHeaders(options.headers);

    try {
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Request timeout")), this.timeout);
      });

      const response = await Promise.race([
        fetch(urlString, {
          method: "DELETE",
          headers,
          ...options,
        }),
        timeoutPromise,
      ]);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorResponse = await this.parseResponse(response);
        
        // Global 401 handler: redirect to login
        if (response.status === 401) {
          console.warn("[APIClient] 401 Unauthorized - redirecting to login...");
          if (typeof navigateToLogin === "function") {
            await secureStorageService.removeSecureItem(AUTH_TOKEN_KEY);
            navigateToLogin();
          }
        }

        const error = new Error(
          errorResponse?.message || `HTTP ${response.status}`,
        );
        error.status = response.status;
        error.response = errorResponse;
        throw error;
      }

      return await this.parseResponse(response);
    } catch (error) {
      this.handleError(error, urlString);
      throw error;
    }
  }

  /**
   * PATCH request
   * @param {string} endpoint - API endpoint
   * @param {*} data - Request body
   * @param {Object} options - Request options
   * @returns {Promise<*>}
   */
  async patch(endpoint, data, options = {}) {
    const cleanBase = this.baseURL.replace(/\/$/, "");
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const urlString = `${cleanBase}${cleanEndpoint}`;
    const headers = await this.buildHeaders(options.headers);

    try {
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Request timeout")), this.timeout);
      });

      const response = await Promise.race([
        fetch(urlString, {
          method: "PATCH",
          headers,
          body: JSON.stringify(data),
          ...options,
        }),
        timeoutPromise,
      ]);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorResponse = await this.parseResponse(response);
        
        // Global 401 handler: redirect to login
        if (response.status === 401) {
          console.warn("[APIClient] 401 Unauthorized - redirecting to login...");
          if (typeof navigateToLogin === "function") {
            await secureStorageService.removeSecureItem(AUTH_TOKEN_KEY);
            navigateToLogin();
          }
        }

        const error = new Error(
          errorResponse?.message || `HTTP ${response.status}`,
        );
        error.status = response.status;
        error.response = errorResponse;
        throw error;
      }

      return await this.parseResponse(response);
    } catch (error) {
      this.handleError(error, urlString);
      throw error;
    }
  }

  /**
   * Set base URL
   * @param {string} url - New base URL
   */
  setBaseURL(url) {
    this.baseURL = url;
  }

  /**
   * Set auth token
   * Note: Prefer using authService for token management
   * @param {string} token - Authentication token
   */
  async setAuthToken(token) {
    if (token) {
      await secureStorageService.setSecureItem(AUTH_TOKEN_KEY, token);
    } else {
      await secureStorageService.removeSecureItem(AUTH_TOKEN_KEY);
    }
  }

  /**
   * Clear auth token
   * Note: Prefer using authService for token management
   */
  async clearAuthToken() {
    await secureStorageService.removeSecureItem(AUTH_TOKEN_KEY);
  }
}

// Export singleton instance
export default new APIClient();
