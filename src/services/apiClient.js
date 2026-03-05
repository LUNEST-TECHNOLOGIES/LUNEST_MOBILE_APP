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

// Use same key as authService
const AUTH_TOKEN_KEY = "auth_token_secure";

/**
 * Detect the correct API URL based on platform and environment
 * Priority: ENV > Platform Detection > Fallback
 */
const detectAPIURL = () => {
  // Web always uses localhost
  if (Platform.OS === "web") {
    return "http://localhost:3000";
  }

  // Check for explicit ENV override first
  const envURL = process.env.EXPO_PUBLIC_API_URL;
  if (envURL) {
    return envURL;
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
      console.warn("[APIClient] No auth token found - redirecting to login...");
      // Redirect to login if not already there
      if (typeof navigateToLogin === "function") {
        navigateToLogin();
      }
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
   * @returns {void}
   */
  handleError(error) {
    console.error("API Error:", {
      message: error.message,
      status: error.status,
      response: error.response,
    });

    // Show user-friendly error message
    if (Platform.OS === "web") {
      alert(error.message || "An error occurred");
    } else {
      Alert.alert("Error", error.message || "An error occurred", [
        { text: "OK" },
      ]);
    }
  }

  /**
   * GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options (params, headers, etc)
   * @returns {Promise<*>}
   */
  async get(endpoint, options = {}) {
    const url = new URL(endpoint, this.baseURL);

    // Add query parameters
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, value);
        }
      });
    }

    const headers = await this.buildHeaders(options.headers);

    try {
      const response = await Promise.race([
        fetch(url.toString(), {
          method: "GET",
          headers,
          ...options,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), this.timeout),
        ),
      ]);

      if (!response.ok) {
        const errorResponse = await this.parseResponse(response);
        const error = new Error(
          errorResponse?.message || `HTTP ${response.status}`,
        );
        error.status = response.status;
        error.response = errorResponse;
        throw error;
      }

      return await this.parseResponse(response);
    } catch (error) {
      this.handleError(error);
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
    const url = new URL(endpoint, this.baseURL);

    const headers = await this.buildHeaders(options.headers);

    // Debug logging
    console.log("[APIClient] POST Request Details:");
    console.log("  URL:", url.toString());
    console.log("  Data:", JSON.stringify(data));
    console.log("  Headers:", JSON.stringify(headers));

    try {
      const requestBody = JSON.stringify(data);
      console.log("  Request Body:", requestBody);

      // Destructure to avoid options.headers overwriting merged headers
      const { headers: _h, ...restOptions } = options || {};
      const response = await Promise.race([
        fetch(url.toString(), {
          method: "POST",
          headers,
          body: requestBody,
          ...restOptions,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), this.timeout),
        ),
      ]);

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
      this.handleError(error);
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
    const url = new URL(endpoint, this.baseURL);
    const headers = await this.buildHeaders(options.headers);

    try {
      const { headers: _h, ...restOptions } = options || {};
      const response = await Promise.race([
        fetch(url.toString(), {
          method: "PUT",
          headers,
          body: JSON.stringify(data),
          ...restOptions,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), this.timeout),
        ),
      ]);

      if (!response.ok) {
        const errorResponse = await this.parseResponse(response);
        const error = new Error(
          errorResponse?.message || `HTTP ${response.status}`,
        );
        error.status = response.status;
        error.response = errorResponse;
        throw error;
      }

      return await this.parseResponse(response);
    } catch (error) {
      this.handleError(error);
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
    const url = new URL(endpoint, this.baseURL);
    const headers = await this.buildHeaders(options.headers);

    try {
      const response = await Promise.race([
        fetch(url.toString(), {
          method: "DELETE",
          headers,
          ...options,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), this.timeout),
        ),
      ]);

      if (!response.ok) {
        const errorResponse = await this.parseResponse(response);
        const error = new Error(
          errorResponse?.message || `HTTP ${response.status}`,
        );
        error.status = response.status;
        error.response = errorResponse;
        throw error;
      }

      return await this.parseResponse(response);
    } catch (error) {
      this.handleError(error);
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
    const url = new URL(endpoint, this.baseURL);
    const headers = await this.buildHeaders(options.headers);

    try {
      const response = await Promise.race([
        fetch(url.toString(), {
          method: "PATCH",
          headers,
          body: JSON.stringify(data),
          ...options,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), this.timeout),
        ),
      ]);

      if (!response.ok) {
        const errorResponse = await this.parseResponse(response);
        const error = new Error(
          errorResponse?.message || `HTTP ${response.status}`,
        );
        error.status = response.status;
        error.response = errorResponse;
        throw error;
      }

      return await this.parseResponse(response);
    } catch (error) {
      this.handleError(error);
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
