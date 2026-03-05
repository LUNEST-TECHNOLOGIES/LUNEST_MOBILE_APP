/**
 * Platform Utilities
 * Helper functions for platform-specific logic
 */

import { Platform, Alert } from 'react-native';

/**
 * Get platform-specific value
 * @param {Object} values - { ios: value, android: value, web: value }
 * @returns {*} Platform-specific value
 */
export const getPlatformValue = (values) => {
  return Platform.select({
    ios: values.ios,
    android: values.android,
    web: values.web,
    default: values.default || values.android,
  });
};

/**
 * Check if running on iOS
 * @returns {boolean}
 */
export const isIOS = () => Platform.OS === 'ios';

/**
 * Check if running on Android
 * @returns {boolean}
 */
export const isAndroid = () => Platform.OS === 'android';

/**
 * Check if running on Web
 * @returns {boolean}
 */
export const isWeb = () => Platform.OS === 'web';

/**
 * Check if running on native (iOS or Android)
 * @returns {boolean}
 */
export const isNative = () => Platform.OS !== 'web';

/**
 * Show platform-appropriate alert
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @param {Array} buttons - Alert buttons
 */
export const showAlert = (title, message, buttons = []) => {
  if (isWeb()) {
    // Fallback for web
    const actions = buttons.map(btn => btn.text).join(' / ');
    alert(`${title}: ${message}\n\n[${actions}]`);
  } else {
    // Use native alert for iOS/Android
    Alert.alert(title, message, buttons);
  }
};

/**
 * Get platform-specific padding (e.g., for bottom navigation)
 * @returns {number}
 */
export const getBottomPadding = () => {
  return getPlatformValue({
    ios: 20,
    android: 10,
    web: 0,
  });
};

/**
 * Get platform-specific margin
 * @returns {number}
 */
export const getTopMargin = () => {
  return getPlatformValue({
    ios: 44,
    android: 24,
    web: 0,
  });
};

export default {
  getPlatformValue,
  isIOS,
  isAndroid,
  isWeb,
  isNative,
  showAlert,
  getBottomPadding,
  getTopMargin,
};
