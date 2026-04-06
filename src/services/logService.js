/**
 * Log Service
 * Sends client-side logs (errors, info, events) to the backend for better monitoring
 * and maintains a local buffer in AsyncStorage for the on-device Debug Logs screen.
 * 
 * ENHANCED: Now intercepts all console logs and captures comprehensive app state.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from 'expo-constants';
import { Platform } from "react-native";
import secureStorageService from "./secureStorageService";

const LOG_ENDPOINT = "/v1/logs";
const LOCAL_LOGS_KEY = "lunest_debug_logs_v2";
const MAX_LOCAL_LOGS = 500; // Increased from 100
const CONSOLE_LOG_KEY = "lunest_console_logs";

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
};

class LogService {
  constructor() {
    this.baseURL = null;
    this.sessionStartTime = new Date().toISOString();
    this.logBuffer = [];
    this.isInterceptorSetup = false;
    this.deviceInfo = null;
    
    // Initialize device info
    this._initDeviceInfo();
  }

  _initDeviceInfo() {
    try {
      this.deviceInfo = {
        platform: Platform.OS,
        platformVersion: Platform.Version,
        isWeb: Platform.OS === 'web',
        appVersion: Constants.expoConfig?.version || '1.0.0',
        buildNumber: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1',
        sessionStart: this.sessionStartTime,
        deviceId: Constants.installationId || 'unknown',
      };
    } catch (e) {
      this.deviceInfo = {
        platform: Platform.OS,
        platformVersion: Platform.Version,
        sessionStart: this.sessionStartTime,
      };
    }
  }

  async getBaseURL() {
    if (this.baseURL) return this.baseURL;
    try {
      const configService = require("./configService").default;
      this.baseURL = await configService.getBaseURL();
      return this.baseURL;
    } catch (error) {
      this._backgroundLog("ERROR", "[LogService] Error getting base URL", { error: error.message });
      return null;
    }
  }

  /**
   * Setup console interceptor to capture ALL logs
   * Call this early in app initialization
   */
  setupConsoleInterceptor() {
    if (this.isInterceptorSetup) return;
    this.isInterceptorSetup = true;

    const captureLog = (level, args) => {
      // Convert args to string message
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');

      // Don't capture our own logging to avoid loops
      if (message.includes('[LogService]') || message.includes('[Mobile]')) {
        return;
      }

      // Store in local buffer without calling console to avoid loops
      this._saveToLocalBuffer({
        level,
        message: message.substring(0, 500), // Limit length
        details: { source: 'console', rawArgs: args.length },
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        deviceInfo: this.deviceInfo,
      });
    };

    // Override console methods
    console.log = (...args) => {
      captureLog('INFO', args);
      originalConsole.log.apply(console, args);
    };

    console.info = (...args) => {
      captureLog('INFO', args);
      originalConsole.info.apply(console, args);
    };

    console.warn = (...args) => {
      captureLog('WARN', args);
      originalConsole.warn.apply(console, args);
    };

    console.error = (...args) => {
      captureLog('ERROR', args);
      originalConsole.error.apply(console, args);
    };

    this._backgroundLog('INFO', '[LogService] Console interceptor setup complete');
  }

  /**
   * Log an error with full context
   */
  async logError(message, details = {}, context = {}) {
    await this.log("ERROR", message, { ...details, ...context, deviceInfo: this.deviceInfo });
  }

  /**
   * Log info with context
   */
  async logInfo(message, details = {}, context = {}) {
    await this.log("INFO", message, { ...details, ...context, deviceInfo: this.deviceInfo });
  }

  /**
   * Log network request/response
   */
  async logNetwork(method, url, status, duration, error = null) {
    const entry = {
      level: error ? 'ERROR' : 'INFO',
      message: `Network: ${method} ${url}`,
      details: {
        method,
        url,
        status,
        duration: `${duration}ms`,
        error: error ? error.message : null,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      deviceInfo: this.deviceInfo,
    };

    await this._saveToLocalBuffer(entry);
    
    // Also send to backend
    try {
      const baseURL = await this.getBaseURL();
      if (!baseURL) return;

      const token = await secureStorageService.getSecureItem("auth_token_secure");

      fetch(`${baseURL}${LOG_ENDPOINT}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...entry,
          type: 'network',
        }),
      }).catch(() => {});
    } catch (error) {
      // Background failure is fine
    }
  }

  /**
   * Log app state change
   */
  async logAppState(state, previousState, details = {}) {
    await this.log("INFO", `App State: ${previousState} -> ${state}`, {
      type: 'app_state',
      previousState,
      currentState: state,
      ...details,
    });
  }

  /**
   * Log navigation events
   */
  async logNavigation(from, to, params = {}) {
    await this.log("INFO", `Navigation: ${from} -> ${to}`, {
      type: 'navigation',
      from,
      to,
      params: JSON.stringify(params).substring(0, 200),
    });
  }

  /**
   * Log user action
   */
  async logUserAction(action, details = {}) {
    await this.log("INFO", `User Action: ${action}`, {
      type: 'user_action',
      action,
      ...details,
    });
  }

  /**
   * Log API errors with full context
   */
  async logApiError(endpoint, error, requestData = null) {
    await this.logError(`API Error: ${endpoint}`, {
      type: 'api_error',
      endpoint,
      errorMessage: error?.message,
      errorCode: error?.code,
      errorStatus: error?.response?.status,
      requestData: requestData ? JSON.stringify(requestData).substring(0, 500) : null,
    });
  }

  /**
   * Internal log method
   */
  async log(level, message, details = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      level,
      message,
      details: { ...details, deviceInfo: this.deviceInfo },
      timestamp,
      platform: Platform.OS,
      deviceInfo: this.deviceInfo,
    };

    // 1. Save to Local Buffer
    await this._saveToLocalBuffer(logEntry);

    // 2. Send to Backend
    this._sendToBackend(logEntry);

    // 3. Console fallback for development
    if (__DEV__) {
      const prefix = `[Mobile][${level}]`;
      if (level === "ERROR") {
        originalConsole.error(prefix, message, details);
      } else {
        originalConsole.log(prefix, message);
      }
    }
  }

  /**
   * Send log to backend
   */
  async _sendToBackend(logEntry) {
    try {
      const baseURL = await this.getBaseURL();
      if (!baseURL) return;

      const token = await secureStorageService.getSecureItem("auth_token_secure");

      fetch(`${baseURL}${LOG_ENDPOINT}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(logEntry),
      }).catch(() => {
        // Silently fail - we still have it in our local buffer!
      });
    } catch (error) {
      // Background failure is fine
    }
  }

  /**
   * Background logging without async/await overhead
   */
  _backgroundLog(level, message, details = {}) {
    const entry = {
      level,
      message,
      details,
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      deviceInfo: this.deviceInfo,
    };
    this._saveToLocalBuffer(entry);
  }

  /**
   * Internal: Save log entry to AsyncStorage (FIFO)
   */
  async _saveToLocalBuffer(entry) {
    try {
      const existingLogsStr = await AsyncStorage.getItem(LOCAL_LOGS_KEY);
      let logs = existingLogsStr ? JSON.parse(existingLogsStr) : [];
      
      // Add to beginning of array (newest first)
      logs.unshift(entry);
      
      // Limit size - keep most recent MAX_LOCAL_LOGS
      if (logs.length > MAX_LOCAL_LOGS) {
        logs = logs.slice(0, MAX_LOCAL_LOGS);
      }
      
      await AsyncStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logs));
    } catch (e) {
      // Silently ignore storage errors
    }
  }

  /**
   * Get all local logs with optional filtering
   */
  async getLocalLogs(filter = { level: null, type: null, since: null }) {
    try {
      const logs = await AsyncStorage.getItem(LOCAL_LOGS_KEY);
      let parsed = logs ? JSON.parse(logs) : [];

      // Apply filters
      if (filter.level) {
        parsed = parsed.filter(l => l.level === filter.level);
      }
      if (filter.type) {
        parsed = parsed.filter(l => l.details?.type === filter.type);
      }
      if (filter.since) {
        const sinceDate = new Date(filter.since);
        parsed = parsed.filter(l => new Date(l.timestamp) >= sinceDate);
      }

      return parsed;
    } catch (e) {
      return [];
    }
  }

  /**
   * Get recent logs (last N entries)
   */
  async getRecentLogs(count = 50) {
    const logs = await this.getLocalLogs();
    return logs.slice(0, count);
  }

  /**
   * Get logs by type
   */
  async getLogsByType(type) {
    return this.getLocalLogs({ type });
  }

  /**
   * Get session summary
   */
  async getSessionSummary() {
    const logs = await this.getLocalLogs();
    const errorCount = logs.filter(l => l.level === 'ERROR').length;
    const warnCount = logs.filter(l => l.level === 'WARN').length;
    const networkLogs = logs.filter(l => l.details?.type === 'network');
    
    return {
      sessionStart: this.sessionStartTime,
      totalLogs: logs.length,
      errorCount,
      warnCount,
      networkRequestCount: networkLogs.length,
      deviceInfo: this.deviceInfo,
    };
  }

  /**
   * Clear local log buffer
   */
  async clearLocalLogs() {
    try {
      await AsyncStorage.removeItem(LOCAL_LOGS_KEY);
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Export logs for sharing
   */
  async exportLogs() {
    const logs = await this.getLocalLogs();
    const summary = await this.getSessionSummary();
    
    return {
      summary,
      logs: logs.map(l => ({
        time: l.timestamp,
        level: l.level,
        message: l.message,
        details: l.details,
      })),
      exportTime: new Date().toISOString(),
    };
  }
}

const logService = new LogService();

// Auto-setup interceptor in ALL environments (dev and production)
logService.setupConsoleInterceptor();

export default logService;

