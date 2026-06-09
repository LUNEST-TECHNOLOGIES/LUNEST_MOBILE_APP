/**
 * App Initialization Module
 * Runs startup tasks and initializes services
 */

import configService from "../services/configService";
import apiClient from "../services/apiClient";

/**
 * Initialize all app services
 * Call this in your App.jsx or root layout
 */
export async function initializeApp() {
  try {
    console.log("🚀 Initializing Lunest App...");

    // 1. Initialize dynamic backend URL detection
    await apiClient.initialize();
    console.log("✓ API Client initialized");

    // 2. Test connection to backend (optional)
    const connectionTest = await configService.testConnection();
    if (connectionTest.success) {
      console.log("✓ Backend connection successful");
    } else {
      console.warn("⚠ Backend connection failed:", connectionTest.message);
    }

    console.log("✓ App initialization complete");
    return { success: true };
  } catch (error) {
    console.error("✗ App initialization failed:", error);
    return { success: false, error };
  }
}

/**
 * Get current backend URL (for debugging)
 */
export async function getBackendURL() {
  return await configService.getCurrentBackendURL();
}

/**
 * Set custom backend URL
 */
export async function setBackendURL(url) {
  return await configService.setCustomBackendURL(url);
}
