/**
 * Notification Service
 * Handles both push-style and in-app notifications
 * UI feedback (Toasts) merged with backend data fetching
 * Supports both native (Expo) and web (Notification API)
 */

import { Platform } from "react-native";
import apiClient from "./apiClient";
import toastService from "./toastService";

class NotificationService {
  constructor() {
    this.listeners = new Set();
    this.webNotificationsSupported = false;
    this.webNotificationsEnabled = false;
    
    // Check web notification support
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      this.webNotificationsSupported = 'Notification' in window;
    }
  }

  /**
   * Request notification permission (works on both web and native)
   */
  async requestPermission() {
    if (Platform.OS === 'web' && this.webNotificationsSupported) {
      try {
        const permission = await Notification.requestPermission();
        this.webNotificationsEnabled = permission === 'granted';
        return permission;
      } catch (error) {
        console.warn('[NotificationService] Web notification permission error:', error);
        return 'denied';
      }
    }
    // For native, Expo handles permissions separately
    return 'granted';
  }

  /**
   * Show a native/web push notification
   */
  async showPushNotification(title, body, options = {}) {
    // Always show in-app toast as fallback
    toastService.show(body, options.type || 'INFO', options.duration || 5000);
    
    // Web push notification
    if (Platform.OS === 'web' && this.webNotificationsSupported && this.webNotificationsEnabled) {
      try {
        const notification = new Notification(title, {
          body,
          icon: options.icon || '/favicon.ico',
          badge: options.badge || '/favicon.ico',
          tag: options.tag || 'lunest-notification',
          requireInteraction: options.requireInteraction || false,
          data: options.data || {},
          ...options,
        });
        
        notification.onclick = () => {
          window.focus();
          if (options.onPress) {
            options.onPress(notification.data);
          }
          notification.close();
        };
        
        return notification;
      } catch (error) {
        console.warn('[NotificationService] Web notification error:', error);
      }
    }
    
    return null;
  }

  /**
   * Delegate subscriptions to ToastService for backward compatibility
   */
  subscribe(callback) {
    return toastService.subscribe(callback);
  }

  show(message, type, duration) {
    toastService.show(message, type, duration);
  }

  showSuccess(message, duration) {
    toastService.showSuccess(message, duration);
  }

  success(message, duration) {
    this.showSuccess(message, duration);
  }

  showError(message, duration) {
    toastService.showError(message, duration);
  }

  error(message, duration) {
    this.showError(message, duration);
  }

  showWarning(message, duration) {
    toastService.showWarning(message, duration);
  }

  warning(message, duration) {
    this.showWarning(message, duration);
  }

  info(message, duration) {
    this.show(message, "INFO", duration);
  }

  // --- WEB PUSH NOTIFICATIONS ---

  /**
   * Initialize web notifications on app startup
   * Call this in your app layout/useEffect
   */
  async initializeWebNotifications() {
    if (Platform.OS === 'web' && this.webNotificationsSupported) {
      // Check if permission already granted
      if (Notification.permission === 'granted') {
        this.webNotificationsEnabled = true;
        console.log('[NotificationService] Web notifications enabled');
      } else if (Notification.permission === 'default') {
        // Optionally auto-request permission
        // await this.requestPermission();
      }
    }
  }

  /**
   * Send a booking notification (works on web and native)
   */
  async sendBookingNotification(title, message, bookingData = {}) {
    return this.showPushNotification(title, message, {
      type: 'SUCCESS',
      duration: 6000,
      tag: `booking-${bookingData.bookingId || 'new'}`,
      data: bookingData,
      onPress: (data) => {
        // Navigate to booking details
        if (data.bookingId && typeof window !== 'undefined') {
          window.location.href = `/bookings/${data.bookingId}`;
        }
      },
    });
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
      }, { silent: true });
      // Backend returns { success: true, body: { notifications: [], unreadCount: 0 } }
      return response.body || { notifications: [] };
    } catch (error) {
      // Re-throw 401 to let global handler redirect to login
      if (error.status === 401 || error.message?.includes("Unauthorized")) {
        throw error;
      }
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
      }, { silent: true });
      // Backend returns { success: true, body: { unreadCount: 0 } }
      return response.body?.unreadCount || 0;
    } catch (error) {
      // Re-throw 401 to let global handler redirect to login
      if (error.status === 401 || error.message?.includes("Unauthorized")) {
        throw error;
      }
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
      const response = await apiClient.get("/v1/notifications/host/dashboard-stats", { silent: true });
      return response.data || {};
    } catch (error) {
      // Re-throw 401 to let global handler redirect to login
      if (error.status === 401 || error.message?.includes("Unauthorized")) {
        throw error;
      }
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
      const response = await apiClient.post("/v1/admin", data);
      return response.data || { notifications: [], unreadCount: 0 };
    } catch (error) {
      // Re-throw 401 to let global handler redirect to login
      if (error.status === 401 || error.message?.includes("Unauthorized")) {
        throw error;
      }
      console.error("[NotificationService] fetchAdminNotifications error:", error);
      return { notifications: [], unreadCount: 0 };
    }
  }

  /**
   * Mark an admin notification as read
   */
  async markAdminAsRead(notificationId) {
    try {
      await apiClient.patch(`/v1/admin/${notificationId}/read`);
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
      await apiClient.patch("/v1/admin/read-all");
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
      booking_ongoing: "time-outline",
      checkout_completed: "log-out-outline",
      payment: "card-outline",
      review: "chatbubble-outline",
      listing_submitted: "document-text-outline",
      listing_approved: "checkmark-circle-outline",
      listing_rejected: "alert-circle-outline",
      listing_unlisted: "eye-off-outline",
      listing_relisted: "checkmark-circle-outline",
      new_listing: "rocket-outline",
      host_application: "person-add-outline",
      message: "mail-outline",
      admin_announcement: "megaphone-outline",
      points_earned: "gift-outline",
      caution_fee_resolved: "wallet-outline",
      caution_fee_disputed: "alert-circle-outline",
      refund_coupon_issued: "ticket-outline",
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
