import axios from "axios";
import authService from "../services/authService";
import configService from "../services/configService";

/**
 * Global Axios Instance
 * Features:
 * 1. Dynamic BaseURL detection
 * 2. Automatic Auth Token injection via Interceptors
 * 3. Standardized Error Handling
 */
const axiosInstance = axios.create({
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request Interceptor: Inject Auth Token
axiosInstance.interceptors.request.use(
  async (config) => {
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
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Standard Error Handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || 'unknown';
    
    // Global 401 handler
    if (status === 401) {
      console.warn("[Axios] Unauthorized - redirecting logic may be needed");
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
