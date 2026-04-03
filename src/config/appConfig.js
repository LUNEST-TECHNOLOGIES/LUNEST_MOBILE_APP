/**
 * Mobile app configuration — single source of truth.
 * Update these values when transitioning from Dev to Production.
 */

// Toggle between environments
const IS_PRODUCTION = false;

const DEV_CONFIG = {
  APP_SCHEME: "lunestmobile",
  // In dev, the backend URL (where /join/:refCode is hosted)
  REFERRAL_DOMAIN: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000",
  ANDROID_PACKAGE: "com.lunest.mobile",
  IOS_STORE_ID: "0000000000",
  GOOGLE_MAPS_API_KEY: "AIzaSyDhZhU0M8ca_puGciEUxELK4xt2nHxzVuw",
};

const PROD_CONFIG = {
  APP_SCHEME: "lunestmobile",
  REFERRAL_DOMAIN: "https://lunest.app", // ← update when live
  ANDROID_PACKAGE: "com.lunest.mobile",  // ← update when live
  IOS_STORE_ID: "0000000000",            // ← update when live
  GOOGLE_MAPS_API_KEY: "AIzaSyDhZhU0M8ca_puGciEUxELK4xt2nHxzVuw",
};

export const APP_CONFIG = IS_PRODUCTION ? PROD_CONFIG : DEV_CONFIG;

export default APP_CONFIG;
