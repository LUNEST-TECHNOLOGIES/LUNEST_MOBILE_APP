/**
 * Log Service
 * Sends client-side logs (errors, info, events) to the backend for better monitoring
 */

import { Platform } from "react-native";
import secureStorageService from "./secureStorageService";

// We use a simple fetch here to avoid circular dependency with apiClient
const LOG_ENDPOINT = "/v1/logs";

class LogService {
  constructor() {
    this.baseURL = null; // Will be set from configService
  }

  async getBaseURL() {
    if (this.baseURL) return this.baseURL;
    try {
      // Lazy import to avoid circular dependency
      const configService = require("./configService").default;
      this.baseURL = await configService.getBaseURL();
      return this.baseURL;
    } catch (error) {
      console.warn("[LogService] Error getting base URL:", error);
      return null;
    }
  }

  /**
   * Log an error to the backend
   * @param {string} message - Error message
   * @param {Object} details - Additional error details (stack, context, etc.)
   */
  async logError(message, details = {}) {
    this.log("ERROR", message, details);
  }

  /**
   * Log info to the backend
   */
  async logInfo(message, details = {}) {
    this.log("INFO", message, details);
  }

  /**
   * Internal log method
   */
  async log(level, message, details = {}) {
    try {
      const baseURL = await this.getBaseURL();
      if (!baseURL) return;

      const token = await secureStorageService.getSecureItem("auth_token_secure");
      const timestamp = new Date().toISOString();
      const deviceInfo = {
        platform: Platform.OS,
        version: Platform.Version,
        isWeb: Platform.OS === 'web',
      };

      // Fire and forget - don't await the fetch to avoid blocking the UI
      fetch(`${baseURL}${LOG_ENDPOINT}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          level,
          message,
          details,
          deviceInfo,
          timestamp,
        }),
      }).catch((err) => {
        // Silently fail if log can't be sent
        console.warn("[LogService] Could not send log to backend:", err.message);
      });

      // Also log to local console
      if (level === "ERROR") {
        console.error(`[Mobile][${level}] ${message}`, details);
      } else {
        console.log(`[Mobile][${level}] ${message}`);
      }
    } catch (error) {
      // Double fallback
      console.warn("[LogService] Critical log failure:", error.message);
    }
  }
}

const logService = new LogService();
export default logService;
