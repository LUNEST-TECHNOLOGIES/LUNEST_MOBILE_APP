/**
 * Inactivity Timeout Service - Mobile App
 * Handles automatic logout after 30 minutes of inactivity
 * Tracks: app foreground/background state, user interactions
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";

class InactivityTimeoutService {
  constructor() {
    this.inactivityTimer = null;
    this.warningTimer = null;
    this.lastActivityTime = Date.now();
    this.appState = AppState.currentState;
    this.isEnabled = false;
    this.onLogout = null;
    this.onWarning = null;

    // Configuration (in milliseconds)
    this.INACTIVITY_DURATION = 30 * 60 * 1000; // 30 minutes
    this.WARNING_DURATION = 1 * 60 * 1000; // Show warning 1 minute before logout
    this.ACTIVITY_DEBOUNCE = 1000; // Minimum 1 second between activity resets
  }

  /**
   * Initialize the inactivity timeout service
   * @param {Function} onLogout - Callback function when timeout occurs
   * @param {Function} onWarning - Callback function before logout (optional)
   */
  async initialize(onLogout, onWarning = null) {
    console.log("[InactivityTimeoutService] Initializing...");
    this.onLogout = onLogout;
    this.onWarning = onWarning;
    this.isEnabled = true;
    this.lastActivityTime = Date.now();

    // Subscribe to app state changes
    this.appStateSubscription = AppState.addEventListener(
      "change",
      this.handleAppStateChange.bind(this),
    );

    // Start inactivity timer
    this.resetInactivityTimer();

    console.log("[InactivityTimeoutService] Initialized successfully");
  }

  /**
   * Clean up and disable the service
   */
  destroy() {
    console.log("[InactivityTimeoutService] Destroying...");
    this.isEnabled = false;

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }

  /**
   * Handle app state changes (foreground/background)
   */
  handleAppStateChange(state) {
    if (!this.isEnabled) return;

    console.log("[InactivityTimeoutService] App state changed to:", state);

    if (state === "active") {
      // App returned to foreground
      const backgroundDuration = Date.now() - this.lastActivityTime;

      // If been in background for more than inactivity duration, logout
      if (backgroundDuration > this.INACTIVITY_DURATION) {
        console.log(
          "[InactivityTimeoutService] Exceeded inactivity while in background",
        );
        this.handleLogout();
      } else {
        // Otherwise, reset timer
        this.resetInactivityTimer();
      }
    } else if (state === "background" || state === "inactive") {
      // App went to background - still tracking time
      this.lastActivityTime = Date.now();
      this.clearTimers();
    }

    this.appState = state;
  }

  /**
   * Track user activity (touch, press, etc.)
   */
  recordUserActivity() {
    if (!this.isEnabled) return;

    const timeSinceLastActivity = Date.now() - this.lastActivityTime;

    // Only reset if more than ACTIVITY_DEBOUNCE since last activity
    if (timeSinceLastActivity > this.ACTIVITY_DEBOUNCE) {
      console.log("[InactivityTimeoutService] User activity detected");
      this.resetInactivityTimer();
    }
  }

  /**
   * Reset the inactivity timer
   */
  resetInactivityTimer() {
    if (!this.isEnabled) return;

    this.clearTimers();
    this.lastActivityTime = Date.now();

    // Set warning timeout
    this.warningTimer = setTimeout(() => {
      this.handleWarning();
    }, this.INACTIVITY_DURATION - this.WARNING_DURATION);

    // Set logout timeout
    this.inactivityTimer = setTimeout(() => {
      this.handleLogout();
    }, this.INACTIVITY_DURATION);

    console.log("[InactivityTimeoutService] Inactivity timer reset");
  }

  /**
   * Clear all timers
   */
  clearTimers() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  /**
   * Handle warning before logout
   */
  handleWarning() {
    console.log("[InactivityTimeoutService] Showing logout warning");
    if (this.onWarning) {
      this.onWarning();
    }
  }

  /**
   * Handle logout
   */
  async handleLogout() {
    console.log("[InactivityTimeoutService] Logging out due to inactivity");
    this.isEnabled = false;
    this.clearTimers();

    // Clear tokens from storage
    await AsyncStorage.removeItem("authToken");
    await AsyncStorage.removeItem("refreshToken");
    await AsyncStorage.removeItem("userData");

    if (this.onLogout) {
      this.onLogout();
    }
  }

  /**
   * Get time since last activity (in milliseconds)
   */
  getTimeSinceLastActivity() {
    return Date.now() - this.lastActivityTime;
  }

  /**
   * Get remaining time before logout (in milliseconds)
   */
  getRemainingTime() {
    const timeSinceLastActivity = this.getTimeSinceLastActivity();
    const remaining = this.INACTIVITY_DURATION - timeSinceLastActivity;
    return Math.max(0, remaining);
  }

  /**
   * Manually extend the session (for keep-alive interactions)
   */
  extendSession() {
    console.log("[InactivityTimeoutService] Session extended");
    this.recordUserActivity();
  }

  /**
   * Check if service is currently enabled
   */
  isActive() {
    return this.isEnabled;
  }
}

// Export singleton instance
export default new InactivityTimeoutService();
