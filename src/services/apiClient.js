/**
 * API Client Service
 * Cross-platform HTTP client for REST API calls
 * Works seamlessly on iOS, Android, and Web
 * Automatically detects and uses correct backend URL based on environment
 */

import NetInfo from "@react-native-community/netinfo";
import { Platform } from "react-native";
import { APP_CONFIG } from "../config/appConfig";
import configService from "./configService";
import logService from "./logService";
import secureStorageService from "./secureStorageService";
import { AUTH_TOKEN_KEY } from "../constants/storageKeys";
import toastService from "./toastService";
import NetworkErrorHandler from "./networkErrorHandler";
import { navigateToLogin } from "../utils/navigationUtils";
const ALERT_THROTTLE_MS = 5000; // 5 seconds

const detectAPIURL = () => {
  // Check for explicit ENV override first (Works for native AND web)
  const envURL = process.env.EXPO_PUBLIC_API_URL;
  if (envURL) {
    return envURL;
  }

  // Use environment variable or localhost fallback for all platforms
  const url = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
  return url.replace(/\/$/, "");
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
    this.lastAlertTime = 0;
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
      // Use authService.getToken() instead of direct secure storage access
      // authService.getToken() handles automatic refresh before expiry
      const authService = require("./authService").default;
      const token = await authService.getToken();
      return token;
    } catch (error) {
      console.error("[APIClient] Error getting auth token via authService:", error);
      // Fallback to direct storage if authService fails or isn't available
      return await secureStorageService.getSecureItem(AUTH_TOKEN_KEY);
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
   * Internal helper to create a rich Error object with unwrapped validation messages
   * @private
   */
  _createError(errorResponse, status) {
    let message = errorResponse?.message || `HTTP ${status}`;
    
    // Unwrap validation errors (Zod, etc.)
    if (Array.isArray(errorResponse?.errors) && errorResponse.errors.length > 0) {
      const detailMessages = errorResponse.errors.map(err => {
        if (typeof err === "string") return err;
        const pathPrefix = err.path ? (Array.isArray(err.path) ? err.path.join(".") : err.path) + ": " : "";
        return `${pathPrefix}${err.message || JSON.stringify(err)}`;
      }).join(", ");
      message = `Validation Error: ${detailMessages}`;
    }

    const error = new Error(message);
    error.status = status;
    error.response = errorResponse;
    return error;
  }

  /**
   * Universal error handler with toast throttling
   */
  handleError(diagnostic, silent = false) {
    if (silent) {
       console.log("[APIClient] Silent error suppressed toast:", diagnostic?.userMessage || diagnostic?.message);
       return;
    }

    const now = Date.now();
    if (now - this.lastAlertTime < ALERT_THROTTLE_MS) {
      console.log("[APIClient] Alert throttled:", diagnostic?.userMessage || diagnostic?.message);
      return;
    }

    this.lastAlertTime = now;
    const message = diagnostic?.userMessage || diagnostic?.message || "An unexpected error occurred";
    toastService.showError(message);
  }

  /**
   * Internal helper to check if the device is offline
   * @private
   */
  async _isOffline() {
    if (Platform.OS === 'web') {
      // Direct navigator check for web is fastest
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return true;
      }
    }

    try {
      const state = await NetInfo.fetch();
      // On native, isInternetReachable is a more accurate indicator of real connectivity
      // than isConnected (which just means connected to a router/cell tower)
      if (state.isInternetReachable === false) {
        return true;
      }
      return !state.isConnected;
    } catch (e) {
      // Fallback: If NetInfo fails, assume online and let fetch() handle it
      return false;
    }
  }

  /**
   * Internal fetch with retry and exponential backoff
   * Specifically handles 429 (Too Many Requests)
   * @private
   */
  async _fetchWithRetry(url, options, attempt = 1, silent = false) {
    // Proactive Connectivity Check
    if (await this._isOffline()) {
      const error = new Error("Network Unavailable (Offline)");
      const diagnostic = NetworkErrorHandler.categorizeError(error);
      this.handleError(diagnostic, silent);
      throw error;
    }

    const maxRetries = options.retries || 3;
    const retryDelay = options.retryDelay || 2000;

    try {
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Request timeout")), this.timeout);
      });

      const response = await Promise.race([
        fetch(url, options),
        timeoutPromise,
      ]);
      clearTimeout(timeoutId);

      // Handle Rate Limiting (429) - Automatic Retry
      if (response.status === 429 && attempt <= maxRetries) {
        const backoff = retryDelay * Math.pow(2, attempt - 1);
        console.warn(`[APIClient] 429 Rate Limited. Retrying in ${backoff}ms (Attempt ${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return this._fetchWithRetry(url, options, attempt + 1, silent);
      }

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

        const error = this._createError(errorResponse, response.status);
        throw error;
      }

      return await this.parseResponse(response);
    } catch (error) {
      // Retry on network errors too (timeout, connection failed)
      if (attempt <= maxRetries && (error.message.includes("timeout") || error.message === "Failed to fetch")) {
        const backoff = retryDelay * Math.pow(2, attempt - 1);
        console.warn(`[APIClient] Network Error (${error.message}). Retrying in ${backoff}ms (Attempt ${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return this._fetchWithRetry(url, options, attempt + 1, silent);
      }
      
      const diagnostic = NetworkErrorHandler.categorizeError(error);
      this.handleError(diagnostic, silent);
      throw error;
    }
  }

  /**
   * GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options (params, headers, etc)
   * @returns {Promise<*>}
   */
  async get(endpoint, options = {}) {
    const cleanBase = this.baseURL.replace(/\/$/, "");
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    let urlString = `${cleanBase}${cleanEndpoint}`;

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

    return this._fetchWithRetry(urlString, {
      method: "GET",
      headers,
      ...options,
    }, 1, options.silent || false);
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

    const requestBody = JSON.stringify(data);
    const { headers: _h, ...restOptions } = options || {};

    return this._fetchWithRetry(urlString, {
      method: "POST",
      headers,
      body: requestBody,
      ...restOptions,
    }, 1, options.silent || false);
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
    
    const { headers: customHeaders, ...restOptions } = options || {};
    const headers = await this.buildHeaders(customHeaders);
    
    return this._fetchWithRetry(urlString, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
      ...restOptions,
    }, 1, options.silent || false);
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
    
    const { headers: customHeaders, ...restOptions } = options || {};
    const headers = await this.buildHeaders(customHeaders);

    return this._fetchWithRetry(urlString, {
      method: "DELETE",
      headers,
      ...restOptions,
    }, 1, options.silent || false);
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
    
    const { headers: customHeaders, ...restOptions } = options || {};
    const headers = await this.buildHeaders(customHeaders);

    return this._fetchWithRetry(urlString, {
      method: "PATCH",
      headers,
      body: JSON.stringify(data),
      ...restOptions,
    }, 1, options.silent || false);
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
