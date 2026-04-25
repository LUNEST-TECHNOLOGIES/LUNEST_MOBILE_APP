/**
 * Network Error Handler & Diagnostics
 * Comprehensive error handling for network requests across all platforms
 */

import { Platform, Alert } from "react-native";
import storageService from "./storageService";
import logService from "./logService";

class NetworkErrorHandler {
    /**
     * Categorize network errors with platform-specific guidance
     */
    static categorizeError(error) {
        const message = error && error.message ? error.message : "";
        const status = error && error.status ? error.status : null;

        // Offline / No Internet Connectivity
        if (message.includes("Offline") || message.includes("Network Unavailable")) {
            return {
                type: "OFFLINE_ERROR",
                severity: "critical",
                userMessage: "You are currently offline. Please check your internet connection and try again.",
                cause: "Client device is offline",
                platform: Platform.OS,
            };
        }

        // Network connectivity errors (Server reachable but rejected/timeout)
        if (
            message.includes("Network request failed") ||
            message.includes("fetch failed") ||
            message.includes("Unable to connect") ||
            message.includes("ECONNREFUSED") ||
            message.includes("ETIMEDOUT") ||
            message.includes("Network Error")
        ) {
            return {
                type: "NETWORK_ERROR",
                severity: "critical",
                userMessage: "Unable to connect to server. Please check your internet connection and try again.",
                diagnostics: this.getNetworkErrorMessage(),
                cause: "No network connectivity or server unreachable",
                platform: Platform.OS,
            };
        }

        // Timeout errors
        if (message.includes("timeout") || message.includes("Timeout")) {
            return {
                type: "TIMEOUT_ERROR",
                severity: "high",
                userMessage: "The request timed out. Please try again.",
                diagnostics: this.getTimeoutErrorMessage(),
                cause: "Request exceeded timeout threshold",
                platform: Platform.OS,
            };
        }

        // CORS errors (Web only)
        if (message.includes("CORS") || message.includes("cross-origin")) {
            return {
                type: "CORS_ERROR",
                severity: "high",
                userMessage: "Server configuration error. Contact support.",
                cause: "CORS policy violation",
                platform: Platform.OS,
            };
        }

        // Authentication errors
        if (status === 401 || status === 403) {
            return {
                type: "AUTH_ERROR",
                severity: "medium",
                userMessage: "Authentication failed. Please login again.",
                cause: status === 401 ? "Unauthorized" : "Forbidden",
                platform: Platform.OS,
            };
        }

        // Rate Limiting (429)
        if (status === 429) {
            logService.logError("Rate limit exceeded (429)", { message });
            return {
                type: "RATE_LIMIT_ERROR",
                severity: "high",
                userMessage: "You're performing actions too fast! Please wait a moment before trying again.",
                cause: "Too Many Requests (429)",
                platform: Platform.OS,
            };
        }

        // 503 Maintenance Handling
        if (status === 503) {
            return {
                type: "MAINTENANCE_ERROR",
                severity: "high",
                userMessage: "Lunest is temporarily undergoing maintenance. We'll be back in a few minutes!",
                cause: "Service Temporarily Unavailable (503)",
                platform: Platform.OS,
            };
        }

        // Server errors
        if (status >= 500) {
            return {
                type: "SERVER_ERROR",
                severity: "high",
                userMessage: "Server error. Please try again later.",
                cause: `HTTP ${status}`,
                platform: Platform.OS,
            };
        }

        // Client errors
        if (status >= 400) {
            return {
                type: "CLIENT_ERROR",
                severity: "medium",
                userMessage: "Invalid request. Please check your input.",
                cause: `HTTP ${status}`,
                platform: Platform.OS,
            };
        }

        // Unknown errors
        return {
            type: "UNKNOWN_ERROR",
            severity: "medium",
            userMessage: message.includes("Network request failed") || message.includes("fetch failed") || message.includes("Unable to connect") || message.includes("ECONNREFUSED") || message.includes("ETIMEDOUT")
                ? "Unable to connect to server. Check your internet connection and try again."
                : message || "An unexpected error occurred. Please try again.",
            cause: message || "Unknown error",
            platform: Platform.OS,
        };
    }

    /**
     * Get platform-specific network error message
     */
    static getNetworkErrorMessage() {
        const base =
            "Unable to connect to server. Check your internet connection or try again later.";
        return this.getPlatformErrorMessage(base);
    }

    /**
     * Get platform-specific timeout error message
     */
    static getTimeoutErrorMessage() {
        const base =
            "Request took too long to complete. Server may be slow or unreachable.";
        return this.getPlatformErrorMessage(base);
    }

    /**
     * Get platform-specific error message with helpful guidance
     */
    static getPlatformErrorMessage(baseMessage) {
        switch (Platform.OS) {
            case "ios":
                return this.getIOSErrorMessage(baseMessage);
            case "android":
                return this.getAndroidErrorMessage(baseMessage);
            case "web":
                return this.getWebErrorMessage(baseMessage);
            default:
                return baseMessage;
        }
    }

    /**
     * iOS-specific connection error message
     */
    static getIOSErrorMessage(baseMessage) {
        const troubleshooting = [
            "🍎 iOS Connection Troubleshooting:",
            "",
            "If using iOS Simulator:",
            "  ✓ Backend should be running on http://localhost:3000",
            "  ✓ Make sure simulator and Mac are on same network",
            "  ✓ Check: System Preferences > Network > IPv4 Address",
            "",
            "If using physical iOS device:",
            "  ✓ Find Mac's local IP: ifconfig | grep inet",
            "  ✓ Use: http://<your-mac-ip>:3000",
            "  ✓ Device and Mac MUST be on same WiFi",
            "  ✓ Open app settings to manually set URL",
            "",
            "Common issues:",
            "  • Firewall blocking port 3000",
            "  • Different WiFi networks",
            "  • Stale app cache (try Force Quit)",
        ].join("\n");

        return `${baseMessage}\n\n${troubleshooting}`;
    }

    /**
     * Android-specific connection error message
     */
    static getAndroidErrorMessage(baseMessage) {
        return baseMessage;
    }

    /**
     * Web-specific connection error message
     */
    static getWebErrorMessage(baseMessage) {
        const troubleshooting = [
            "🌐 Web Connection Troubleshooting:",
            "",
            "Backend connection issues:",
            "  ✓ Backend should be running on http://localhost:3000",
            "  ✓ Verify: curl http://localhost:3000/v1",
            "  ✓ Check: npm start (in backend folder)",
            "",
            "CORS configuration:",
            "  ✓ Backend must allow requests from http://localhost:8084",
            "  ✓ Check backend CORS settings",
            "  ✓ Verify Access-Control-Allow-Origin header",
            "",
            "Common issues:",
            "  • Backend not running",
            "  • Wrong backend URL in environment",
            "  • CORS restrictions",
            "  • Network proxy issues",
        ].join("\n");

        return `${baseMessage}\n\n${troubleshooting}`;
    }

    /**
     * Format error for logging
     */
    static formatErrorLog(error, context = {}) {
        // Extract real message and status even if nested in data
        let message = error?.data?.message || error?.message || "Unknown Error";
        const status = error?.status || error?.data?.status || (error?.response && error?.response.status);
        
        // Handle validation errors (Zod, etc.)
        const errors = error?.data?.errors;
        if (Array.isArray(errors) && errors.length > 0) {
            // Flatten errors into the message for easier debugging
            const errorMessages = errors.map(err => {
                if (typeof err === 'string') return err;
                const pathPrefix = err.path ? (Array.isArray(err.path) ? err.path.join(".") : err.path) + ": " : "";
                return `${pathPrefix}${err.message || JSON.stringify(err)}`;
            }).join(', ');
            message = `Validation Error: ${errorMessages}`;
        }
        
        return {
            timestamp: new Date().toISOString(),
            platform: Platform.OS,
            ...context,
            error: {
                name: error?.name || "Error",
                message: message,
                status: status,
                code: error?.code,
                rawErrors: errors, // Keep raw errors for inspection
            },
            stack: error?.stack ? error.stack.split('\n').slice(0, 3).join('\n') : undefined, // Keep stack short
        };
    }

    /**
     * Log error to console with context
     */
    static logError(error, context = {}) {
        const status = error?.status || (error?.data && error.data.status);
        const isClientError = status >= 400 && status < 500;
        
        if (isClientError) {
            // Use the formatter to get the unwrapped message
            const formatted = this.formatErrorLog(error, context);
            console.log(`ℹ️ [Network] Client Error (${status}): ${formatted.error.message}`, context.action ? `[Action: ${context.action}]` : "");
            return;
        }

        // Detailed log for critical/system errors
        const formatted = this.formatErrorLog(error, context);
        console.error("=== 🛑 CRITICAL NETWORK/SERVER ERROR ===");
        console.error(JSON.stringify(formatted, null, 2));
        console.error("========================");
    }

    /**
     * Show user-friendly error alert
     */
    static showErrorAlert(error, title = "Error") {
        const categorized = this.categorizeError(error);
        const message = this.getPlatformErrorMessage(categorized.userMessage);

        if (Platform.OS === "web") {
            alert(`${title}\n\n${message}`);
        } else {
            Alert.alert(title, message, [{ text: "OK" }]);
        }
    }

    /**
     * Diagnose network configuration
     */
    static async diagnoseNetwork() {
        const diagnostics = {
            platform: Platform.OS,
            timestamp: new Date().toISOString(),
            checks: {},
        };

        try {
            // Test basic fetch capability - use env URL or localhost fallback
            const testUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
            diagnostics.checks.fetchCapability = "available";
            diagnostics.checks.testedUrl = testUrl;

            try {
                const response = await Promise.race([
                    fetch(testUrl, { method: "GET" }),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error("Timeout")), 5000),
                    ),
                ]);
                diagnostics.checks.serverReachable =
                    response.status === 200 || response.status === 405;
                diagnostics.checks.serverStatus = response.status;
            } catch (e) {
                diagnostics.checks.serverReachable = false;
                diagnostics.checks.serverError = e.message;
            }

            // Check stored auth token
            const token = await storageService.getItem("authToken");
            diagnostics.checks.hasAuthToken = !!token;

            // Check environment
            diagnostics.environment = {
                apiUrl: process.env.EXPO_PUBLIC_API_URL || "Not set",
                timeout: process.env.EXPO_PUBLIC_API_TIMEOUT || "Default (30s)",
                debugMode: process.env.EXPO_PUBLIC_ENABLE_DEBUG_MODE || "false",
            };
        } catch (error) {
            diagnostics.diagnosticError = error.message;
        }

        return diagnostics;
    }

    /**
     * Handle retry logic with exponential backoff
     */
    static async retryWithBackoff(fn, maxAttempts = 3, initialDelay = 1000) {
        let lastError;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                const delay = initialDelay * Math.pow(2, attempt - 1);

                if (attempt < maxAttempts) {
                    console.log(
                        `Retry attempt ${attempt}/${maxAttempts}, waiting ${delay}ms...`,
                    );
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }

    /**
     * Get recovery suggestions based on error type
     */
    static getRecoverySuggestions(error) {
        const categorized = this.categorizeError(error);

        const suggestions = {
            NETWORK_ERROR: [
                "Check your internet connection",
                "Verify the server URL in .env",
                "Ensure backend is running on the specified IP/port",
                `Try pinging ${process.env.EXPO_PUBLIC_API_URL || "localhost:3000"}`,
            ],
            TIMEOUT_ERROR: [
                "Increase API_TIMEOUT in .env",
                "Check if server is overloaded",
                "Try again in a few moments",
            ],
            CORS_ERROR: [
                "Update CORS_ORIGIN in backend .env",
                "Ensure backend allows your domain/port",
            ],
            AUTH_ERROR: [
                "Login again to refresh token",
                "Clear app cache and login again",
                "Check if token has expired",
            ],
            SERVER_ERROR: [
                "Check backend logs for errors",
                "Verify database connection",
                "Restart backend server",
            ],
        };

        return suggestions[categorized.type] || suggestions.NETWORK_ERROR;
    }
}

export default NetworkErrorHandler;
