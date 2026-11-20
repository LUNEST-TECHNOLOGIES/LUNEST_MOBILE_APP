import { isDeviceOffline, reportNetworkFailure, reportNetworkSuccess } from "../services/connectionService";
import axios from "axios";
import authService from "../services/authService";
import configService from "../services/configService";
import notificationService from "../services/notificationService";
import { TOAST_TYPE } from "../components/common/ToastNotification";
import { navigateToLogin } from "../utils/navigationUtils";

/**
 * Global Axios Instance
 * Features:
 * 1. Dynamic BaseURL detection
 * 2. Automatic Auth Token injection via Interceptors
 * 3. Standardized Error Handling
 */
const axiosInstance = axios.create({
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request Interceptor: Inject Auth Token
axiosInstance.interceptors.request.use(
  async (config) => {
    if (isDeviceOffline()) throw new Error('You’re offline. Reconnect to continue.');
    // Dynamically set baseURL if not already set
    if (!config.baseURL) {
      try {
        config.baseURL = await configService.getBaseURL();
      } catch (error) {
        console.error("[Axios] Failed to get baseURL:", error);
        // Fallback to prevent undefined baseURL
        config.baseURL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
      }
    }

    const token = await authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // On Web, remove Content-Type for FormData so browser computes boundary
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

let isRedirectingToLogin = false;

// Response Interceptor: Standard Error Handling with Automatic Token Refresh
axiosInstance.interceptors.response.use(
  (response) => { reportNetworkSuccess(); return response; },
  async (error) => {
    const status = error.response?.status;
    if (!error.response) reportNetworkFailure();
    const originalRequest = error.config;
    const url = originalRequest?.url || 'unknown';

    // Global 401 handler with Automatic Token Refresh Retry
    if (status === 401 && originalRequest && !originalRequest._retry && !isRedirectingToLogin) {
      originalRequest._retry = true;
      console.log("[Axios] Received 401 Unauthorized for:", url, "- Attempting automatic token refresh...");

      try {
        const refreshed = await authService.refreshToken();
        if (refreshed) {
          const newToken = await authService.getToken();
          if (newToken) {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            console.log("✅ [Axios] Token refreshed successfully! Retrying request:", url);
            return axiosInstance(originalRequest);
          }
        }
      } catch (refreshErr) {
        console.error("[Axios] Token refresh failed during 401 retry:", refreshErr?.message || refreshErr);
      }

      // A failed network refresh is not proof that the saved session was revoked.
      if (await authService.hasLocalSession()) {
        reportNetworkFailure();
        return Promise.reject(new Error('Connection interrupted. Your saved session is still available.'));
      }
      // The server explicitly rejected refresh credentials.
      isRedirectingToLogin = true;
      console.warn("[Axios] Token refresh failed — clearing session and redirecting to Login");

      notificationService.show({
        message: "Session expired. Please login again.",
        type: TOAST_TYPE.WARNING,
      });

      authService.logout();
      isRedirectingToLogin = false;
      navigateToLogin();
    }

    // Rate limit detection (429 Too Many Requests)
    if (status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'];
      console.error("[Axios] RATE LIMIT ERROR:", {
        url,
        status,
        retryAfter: retryAfter || 'not provided',
        timestamp: new Date().toISOString(),
        message: error.response?.data?.message || 'Too many requests',
      });
    }

    // Log other server errors for debugging
    if (status >= 500) {
      console.error("[Axios] Server Error:", {
        url,
        status,
        message: error.response?.data?.message || error.message,
      });
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
