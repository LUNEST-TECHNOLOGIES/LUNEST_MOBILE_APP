/**
 * Storage Keys Constants
 * Centralized keys for AsyncStorage and SecureStore to prevent sync issues
 */

// Secure keys (expo-secure-store)
export const SECURE_KEYS = {
  AUTH_TOKEN: "auth_token_secure",
  REFRESH_TOKEN: "refresh_token_secure",
  TOKEN_EXPIRY: "token_expiry",
  SESSION_ID: "session_id",
};

// Regular keys (AsyncStorage)
export const STORAGE_KEYS = {
  USER_DATA: "userData",
  LAST_LOGIN: "lastLogin",
  LOGIN_ATTEMPTS: "loginAttempts",
};

// Legacy support forApiClient
export const AUTH_TOKEN_KEY = SECURE_KEYS.AUTH_TOKEN;
