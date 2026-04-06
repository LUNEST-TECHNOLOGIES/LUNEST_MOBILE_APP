// navigationUtils.js
import { router } from "expo-router";
import { Platform } from "react-native";

/**
 * Navigate to the login screen
 * Uses expo-router for consistent navigation across platforms
 */
export function navigateToLogin() {
  console.log("[navigationUtils] Navigating to Login via Expo Router");
  
  try {
    router.replace("/login");
  } catch (error) {
    console.error("[navigationUtils] Navigation error:", error);
    
    // Web fallback
    if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
      try {
        console.log("[navigationUtils] Attempting web redirect to /login");
        window.location.assign("/login");
      } catch (e) {
        console.error("[navigationUtils] Web redirect failed:", e);
      }
    }
  }
}

/**
 * Legacy support - no longer needed for expo-router but kept to avoid broken imports
 */
export function setNavigationRef() {
  // No-op for expo-router
}
