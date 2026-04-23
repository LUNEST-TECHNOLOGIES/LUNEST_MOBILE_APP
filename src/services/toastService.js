/**
 * Toast Service
 * Small, decoupled service for UI feedback (Toasts)
 * Does NOT depend on apiClient to avoid circular dependencies
 */

import { TOAST_TYPE } from "../components/common/ToastNotification";

class ToastService {
  constructor() {
    this.listeners = new Set();
  }

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

  showError(message, duration = 4000) {
    this.show(message, TOAST_TYPE.ERROR, duration);
  }

  error(message, duration = 4000) {
    this.showError(message, duration);
  }

  showSuccess(message, duration = 3000) {
    this.show(message, TOAST_TYPE.SUCCESS, duration);
  }

  success(message, duration = 3000) {
    this.showSuccess(message, duration);
  }

  showWarning(message, duration = 3500) {
    this.show(message, TOAST_TYPE.WARNING, duration);
  }

  warning(message, duration = 3500) {
    this.showWarning(message, duration);
  }
  /**
   * Alias for show method to support legacy or alternative naming
   */
  notify(message, type = TOAST_TYPE.INFO, duration = 3000) {
    this.show(message, type, duration);
  }
}

const toastService = new ToastService();
export default toastService;
