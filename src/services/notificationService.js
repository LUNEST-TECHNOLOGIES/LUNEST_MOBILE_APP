/**
 * Notification Service
 * Handles fetching and managing notifications separated by user type (GUEST vs HOST)
 */

import authService from "./authService";
import configService from "./configService";

class NotificationService {
  constructor() {
    this.baseURL = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    try {
      this.baseURL = await configService.getBaseURL();
      this.isInitialized = true;
    } catch (error) {
      console.error("[NotificationService] Initialize error:", error);
    }
  }

  /**
   * Fetch notifications for a specific user type
   * @param {string} userType - 'GUEST' or 'HOST'
   * @returns {Promise<{notifications: Array, unreadCount: number}>}
   */
  async fetchNotifications(userType = "GUEST") {
    try {
      await this.initialize();
      const token = await authService.getToken();

      if (!token) {
        console.log("[NotificationService] No auth token, returning empty");
        return { notifications: [], unreadCount: 0 };
      }

      const response = await fetch(
        `${this.baseURL}/v1/notifications/notification/by-user-type`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userType }),
        },
      );

      const result = await response.json();

      // Check if we have notification data (backend returns body with notifications)
      if (result.body && result.body.notifications !== undefined) {
        return {
          notifications: result.body.notifications || [],
          unreadCount: result.body.unreadCount || 0,
        };
      }

      // Fallback: check for success flag
      if (result.success && result.body) {
        return {
          notifications: result.body.notifications || [],
          unreadCount: result.body.unreadCount || 0,
        };
      }

      console.warn(
        "[NotificationService] Unexpected response format:",
        result.message,
      );
      return { notifications: [], unreadCount: 0 };
    } catch (error) {
      console.error(
        "[NotificationService] Error fetching notifications:",
        error,
      );
      return { notifications: [], unreadCount: 0 };
    }
  }

  /**
   * Fetch user-specific notifications including unique bookings
   * Uses the by-user-type endpoint which filters by GUEST or HOST
   * @param {string} userType - 'GUEST' or 'HOST'
   * @returns {Promise<{notifications: Array, data: Array}>}
   */
  async fetchUserNotifications(userType = "GUEST") {
    try {
      await this.initialize();
      const token = await authService.getToken();

      if (!token) {
        console.log("[NotificationService] No auth token, returning empty");
        return { notifications: [], data: [] };
      }

      // Use the by-user-type endpoint (POST) which uses the logged-in user's ID from token
      const response = await fetch(
        `${this.baseURL}/v1/notifications/notification/by-user-type`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userType }),
        },
      );

      if (!response.ok) {
        console.warn(
          `[NotificationService] Request failed with status: ${response.status}`,
        );
        return { notifications: [], data: [] };
      }

      const result = await response.json();
      console.log("[NotificationService] Fetched notifications:", result);

      // Check multiple response formats
      if (result.body && Array.isArray(result.body.notifications)) {
        return {
          notifications: result.body.notifications,
          data: result.body.notifications,
          unreadCount: result.body.unreadCount || 0,
        };
      }

      if (result.success && result.body) {
        return {
          notifications: result.body.notifications || [],
          data: result.body.notifications || [],
          unreadCount: result.body.unreadCount || 0,
        };
      }

      // Try direct array access
      if (Array.isArray(result.notifications)) {
        return {
          notifications: result.notifications,
          data: result.notifications,
        };
      }

      console.warn(
        "[NotificationService] Could not parse user notifications:",
        result.message,
      );
      return { notifications: [], data: [] };
    } catch (error) {
      console.error(
        "[NotificationService] Error fetching user notifications:",
        error,
      );
      return { notifications: [], data: [] };
    }
  }

  /**
   * Get unread notification count for a user type
   * @param {string} userType - 'GUEST' or 'HOST'
   * @returns {Promise<number>}
   */
  async getUnreadCount(userType = "GUEST") {
    try {
      await this.initialize();
      const token = await authService.getToken();

      if (!token) {
        return 0;
      }

      const response = await fetch(
        `${this.baseURL}/v1/notifications/notification/unread-count`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userType }),
        },
      );

      // Check if response is ok before parsing
      if (!response.ok) {
        console.warn(
          `[NotificationService] Unread count request failed with status: ${response.status}`,
        );
        return 0;
      }

      // Check content type to avoid parsing HTML as JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.warn(
          "[NotificationService] Response is not JSON, skipping unread count",
        );
        return 0;
      }

      const result = await response.json();
      return result.success && result.body && result.body.count
        ? result.body.count
        : 0;
    } catch (error) {
      console.error("[NotificationService] Error getting unread count:", error);
      return 0;
    }
  }

  /**
   * Mark a notification as read
   * @param {string} notificationId
   * @returns {Promise<boolean>}
   */
  async markAsRead(notificationId) {
    try {
      await this.initialize();
      const token = await authService.getToken();

      if (!token) {
        return false;
      }

      const response = await fetch(
        `${this.baseURL}/v1/notifications/notification/${notificationId}/read`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error("[NotificationService] Error marking as read:", error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user type
   * @param {string} userType - 'GUEST' or 'HOST'
   * @returns {Promise<boolean>}
   */
  async markAllAsRead(userType = "GUEST") {
    try {
      await this.initialize();
      const token = await authService.getToken();

      if (!token) {
        return false;
      }

      const response = await fetch(
        `${this.baseURL}/v1/notifications/notification/read-all`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userType }),
        },
      );

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error("[NotificationService] Error marking all as read:", error);
      return false;
    }
  }

  /**
   * Get notification icon type based on notification type
   * @param {string} type - Notification type
   * @returns {string} - Icon name
   */
  getNotificationIcon(type) {
    const iconMap = {
      booking_request: "calendar",
      booking_confirmed: "checkmark-circle",
      booking_cancelled: "close-circle",
      booking_completed: "home",
      message: "chatbubble",
      payment: "card",
      review: "star",
      listing_approved: "checkmark-done",
      listing_rejected: "close",
      new_listing: "home-outline",
      host_application: "person-add",
      admin_announcement: "megaphone",
      upcoming_stay: "time",
      default: "notifications",
    };
    return iconMap[type] || iconMap.default;
  }

  /**
   * Format notification time to relative string
   * @param {string} createdAt - ISO date string
   * @returns {string} - Relative time (e.g., "2 hours ago")
   */
  formatNotificationTime(createdAt) {
    // Validate date input
    if (!createdAt) return "Recently";

    const now = new Date();
    const notifDate = new Date(createdAt);

    // Check for invalid date
    if (isNaN(notifDate.getTime())) {
      console.warn("[NotificationService] Invalid date:", createdAt);
      return "Recently";
    }

    const diffMs = now - notifDate;

    // Handle future dates or negative differences
    if (diffMs < 0) return "Just now";

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return notifDate.toLocaleDateString();
  }
}

const notificationService = new NotificationService();
export default notificationService;
