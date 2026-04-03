/**
 * Notification Service
 * Handles both push-style and in-app notifications
 * UI feedback (Toasts) merged with backend data fetching
 */

import { TOAST_TYPE } from "../components/common/ToastNotification";
import apiClient from "./apiClient";

class NotificationService {
  constructor() {
    this.listeners = new Set();
  }

  // --- UI TOAST NOTIFICATIONS (Event Emitter) ---

  /**
   * Subscribe to toast events
   * @param {Function} callback - Function to call when a toast is triggered
   * @returns {Function} - Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Show a toast notification
   */
  show(message, type = TOAST_TYPE.INFO, duration = 3000) {
    this.listeners.forEach((callback) => {
      callback({ message, type, duration });
    });
  }

  showSuccess(message, duration = 3000) {
    this.show(message, TOAST_TYPE.SUCCESS, duration);
  }

  showError(message, duration = 4000) {
    this.show(message, TOAST_TYPE.ERROR, duration);
  }

  showWarning(message, duration = 3500) {
    this.show(message, TOAST_TYPE.WARNING, duration);
  }

  // --- BACKEND NOTIFICATION DATA (Original Implementation) ---

  /**
   * Fetch notifications for a user based on their active mode (GUEST or HOST)
   * @param {string} userType - 'GUEST' or 'HOST'
   */
  async fetchUserNotifications(userType = "GUEST") {
    try {
      const response = await apiClient.post("/v1/notifications/by-user-type", {
        userType,
      });
      return response.data || { data: [] };
    } catch (error) {
      console.error("[NotificationService] fetchUserNotifications error:", error);
      return { data: [] };
    }
  }

  /**
   * Get count of unread notifications
   */
  async getUnreadCount(userType = "GUEST") {
    try {
      const response = await apiClient.post("/v1/notifications/unread-count", {
        userType,
      });
      return response.data?.unreadCount || 0;
    } catch (error) {
      console.error("[NotificationService] getUnreadCount error:", error);
      return 0;
    }
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId) {
    try {
      await apiClient.patch(`/v1/notifications/${notificationId}/read`);
      return true;
    } catch (error) {
      console.error("[NotificationService] markAsRead error:", error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for current user type
   */
  async markAllAsRead(userType = "GUEST") {
    try {
      await apiClient.patch("/v1/notifications/read-all", { userType });
      return true;
    } catch (error) {
      console.error("[NotificationService] markAllAsRead error:", error);
      return false;
    }
  }

  /**
   * Get host dashboard statistics (listings, bookings, earnings)
   */
  async getHostDashboardStats() {
    try {
      const response = await apiClient.get("/v1/notifications/host/dashboard-stats");
      return response.data || {};
    } catch (error) {
      console.error("[NotificationService] getHostDashboardStats error:", error);
      return null;
    }
  }

  // --- ADMIN NOTIFICATIONS (for Admin mode) ---

  /**
   * Fetch admin-level notifications
   */
  async fetchAdminNotifications(data = {}) {
    try {
      const response = await apiClient.post("/admin", data);
      return response.data || { notifications: [], unreadCount: 0 };
    } catch (error) {
      console.error("[NotificationService] fetchAdminNotifications error:", error);
      return { notifications: [], unreadCount: 0 };
    }
  }

  /**
   * Mark an admin notification as read
   */
  async markAdminAsRead(notificationId) {
    try {
      await apiClient.patch(`/admin/${notificationId}/read`);
      return true;
    } catch (error) {
      console.error("[NotificationService] markAdminAsRead error:", error);
      return false;
    }
  }

  /**
   * Mark all admin notifications as read
   */
  async markAllAdminAsRead() {
    try {
      await apiClient.patch("/admin/read-all");
      return true;
    } catch (error) {
      console.error("[NotificationService] markAllAdminAsRead error:", error);
      return false;
    }
  }

  // --- UI HELPERS ---

  /**
   * Return appropriate Ionicon name for notification type
   */
  getNotificationIcon(type) {
    const iconMap = {
      booking_request: "calendar-outline",
      booking_confirmed: "checkmark-circle-outline",
      booking_cancelled: "close-circle-outline",
      booking_completed: "star-outline",
      payment: "card-outline",
      review: "chatbubble-outline",
      listing_approved: "business-outline",
      listing_rejected: "alert-circle-outline",
      new_listing: "rocket-outline",
      host_application: "person-add-outline",
      message: "mail-outline",
      admin_announcement: "megaphone-outline",
      default: "notifications-outline",
    };
    return iconMap[type] || iconMap.default;
  }

  /**
   * Format ISO date string to "X time ago"
   */
  formatNotificationTime(dateString) {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);

      if (diffInSeconds < 60) return "Just now";
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

      return date.toLocaleDateString();
    } catch (e) {
      return "";
    }
  }
}

const notificationService = new NotificationService();
export default notificationService;
