/**
 * Dynamic Configuration Service
 * Automatically detects environment and provides correct backend URL
 * Handles Android Emulator, iOS Simulator, and Physical Devices
 */

import Constants from "expo-constants";
import { Platform } from "react-native";
import storageService from "./storageService";

class ConfigService {
  constructor() {
    this.isInitialized = false;
    this.cachedBaseURL = null;
  }

  /**
   * Get the correct base URL based on platform and environment
   * @returns {Promise<string>}
   */
  async getBaseURL() {
    // Return cached URL if already determined
    if (this.cachedBaseURL) {
      return this.cachedBaseURL;
    }

    // Check if user has manually set a custom URL
    const customURL = await storageService.getItem("customBackendURL");
    if (customURL) {
      this.cachedBaseURL = customURL;
      return customURL;
    }

    // Auto-detect based on environment
    const detectedURL = await this.detectEnvironmentURL();
    this.cachedBaseURL = detectedURL;
    console.log(`[ConfigService] Detected and cached baseURL: ${detectedURL}`);
    return detectedURL;
  }

  /**
   * Synchronous version of getBaseURL
   * Returns cached value if exists, otherwise fallback
   * @returns {string}
   */
  getBaseURLSync() {
    return this.cachedBaseURL || process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
  }

  /**
   * Detect the correct URL based on platform and environment
   * @returns {Promise<string>}
   */
  async detectEnvironmentURL() {
    // For native platforms (iOS/Android) AND web, ALWAYS prioritize the .env variable
    const envURL = process.env.EXPO_PUBLIC_API_URL;
    
    // Feature: On web, if envURL is a LAN IP but we are on localhost, 
    // we might prefer localhost:3000 to avoid PNA preflight issues 
    // IF the user hasn't explicitly set a custom URL.
    if (Platform.OS === "web" && envURL && envURL.includes("192.168.")) {
       const isCurrentHostLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
       if (isCurrentHostLocal) {
         console.log("🌐 [ConfigService] Web on localhost detected. Using localhost:3000 instead of LAN IP to avoid PNA issues.");
         return "http://localhost:3000";
       }
    }

    if (envURL) {
      console.log(
        "📝 [ConfigService] Using env URL for",
        Platform.OS,
        ":",
        envURL,
      );
      return envURL;
    }

    // Web platform fallback if no env URL
    if (Platform.OS === "web") {
      console.log(
        "🌐 [ConfigService] Web platform detected - using localhost:3000 fallback",
      );
      return "http://localhost:3000";
    }
    if (Platform.OS === "android") {
      return await this.detectAndroidURL();
    }

    if (Platform.OS === "ios") {
      return await this.detectIOSURL();
    }
    // Fallback if no env URL set - use localhost (requires ngrok or same network)
    console.warn("⚠️ [ConfigService] No EXPO_PUBLIC_API_URL in .env");
    console.warn("⚠️ [ConfigService] Using localhost:3000 as fallback");
    console.warn(
      "⚠️ [ConfigService] For physical devices, set EXPO_PUBLIC_API_URL to your machine's IP",
    );
    return "http://localhost:3000";
  }

  /**
   * Detect correct URL for Android platform
   * @returns {Promise<string>}
   */
  async detectAndroidURL() {
    const isEmulator = this.isAndroidEmulator();

    if (isEmulator) {
      console.log(
        "🤖 [ConfigService] Android Emulator detected - using 10.0.2.2:3000",
      );
      console.log(
        "   Note: 10.0.2.2 is the special IP to reach host from Android emulator",
      );
      console.log(
        "   Make sure backend is running on your computer at http://localhost:3000",
      );
      return "http://10.0.2.2:3000";
    }

    // Physical Android device
    console.log("📱 [ConfigService] Physical Android device detected");
    const localIP = await this.getDeviceLocalIP();

    if (localIP) {
      console.log("✓ [ConfigService] Using device local IP:", localIP);
      return `http://${localIP}:3000`;
    }

    // Fallback for physical device
    console.warn("⚠️ [ConfigService] Could not auto-detect device IP");
    console.warn(
      "   Please use BackendConfigScreen or setCustomURL() to set backend URL",
    );
    console.warn(
      "   Format: http://YOUR_IP:3000 (same WiFi network as backend)",
    );
    return "http://localhost:3000";
  }

  /**
   * Detect correct URL for iOS platform
   * @returns {Promise<string>}
   */
  async detectIOSURL() {
    const isSimulator = this.isIOSSimulator();

    if (isSimulator) {
      console.log("📱 [ConfigService] iOS Simulator detected");
      // First, check if user has set a custom IP
      const customIP = await storageService.getItem("deviceLocalIP");
      if (customIP) {
        console.log(
          "✓ [ConfigService] Using custom IP for simulator:",
          customIP,
        );
        return `http://${customIP}:3000`;
      }

      // Try 127.0.0.1 first (iOS simulator loopback)
      console.log("   Attempting: http://127.0.0.1:3000");
      return "http://127.0.0.1:3000";
    }

    // Physical iOS device
    console.log("🍎 [ConfigService] Physical iOS device detected");
    const localIP = await this.getDeviceLocalIP();

    if (localIP) {
      console.log("✓ [ConfigService] Using device local IP:", localIP);
      return `http://${localIP}:3000`;
    }

    // Fallback for physical device
    console.warn("⚠️ [ConfigService] Could not auto-detect device IP");
    console.warn(
      "   Please use BackendConfigScreen or setCustomURL() to set backend URL",
    );
    return "http://localhost:3000";
  }

  /**
   * Check if running on Android Emulator
   * @returns {boolean}
   */
  isAndroidEmulator() {
    if (Platform.OS !== "android") {
      return false;
    }

    // Check if expoConfig exists and has android property
    if (Constants.expoConfig && Constants.expoConfig.android) {
      if (Constants.expoConfig.android.versionCode === undefined) {
        return true;
      }
    }

    return Platform.isTV === false;
  }

  /**
   * Check if running on iOS Simulator
   * @returns {boolean}
   */
  isIOSSimulator() {
    if (Platform.OS !== "ios") {
      return false;
    }

    // Check if expoConfig exists and has ios property
    if (Constants.expoConfig && Constants.expoConfig.ios) {
      if (Constants.expoConfig.ios.version === undefined) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get local network IP address
   * In a real app, you'd use react-native-network-adapter
   * For now, returns null (would need native module)
   * @returns {Promise<string|null>}
   */
  async getDeviceLocalIP() {
    try {
      // Try to get from AsyncStorage (user sets it once)
      const storedIP = await storageService.getItem("deviceLocalIP");
      if (storedIP) {
        return storedIP;
      }
    } catch (error) {
      console.error("Error getting device IP:", error);
    }
    return null;
  }

  /**
   * Allow user to manually set backend URL
   * Useful when auto-detection fails
   * @param {string} url - Backend URL (e.g., http://192.168.1.100:3000)
   */
  async setCustomBackendURL(url) {
    try {
      await storageService.setItem("customBackendURL", url);
      this.cachedBaseURL = url; // Update cache
      console.log("Custom backend URL set:", url);
      return true;
    } catch (error) {
      console.error("Error setting custom backend URL:", error);
      return false;
    }
  }

  /**
   * Clear custom backend URL and revert to auto-detection
   */
  async clearCustomBackendURL() {
    try {
      await storageService.removeItem("customBackendURL");
      this.cachedBaseURL = null; // Clear cache
      console.log("Custom backend URL cleared");
      return true;
    } catch (error) {
      console.error("Error clearing custom backend URL:", error);
      return false;
    }
  }

  /**
   * Get current backend URL (for display in settings)
   */
  async getCurrentBackendURL() {
    return await this.getBaseURL();
  }

  /**
   * Test connection to backend
   * @returns {Promise<{success: boolean, message: string, latency: number}>}
   */
  async testConnection() {
    const url = await this.getBaseURL();
    const startTime = Date.now();

    try {
      const response = await fetch(`${url}/v1`, {
        method: "GET",
        timeout: 30000,
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        return {
          success: true,
          message: "Connected successfully",
          latency,
          url,
        };
      } else {
        return {
          success: false,
          message: `Server responded with ${response.status}`,
          latency,
          url,
        };
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        success: false,
        message: error.message,
        latency,
        url,
      };
    }
  }

  /**
   * Reset all configuration to defaults
   */
  async reset() {
    try {
      await this.clearCustomBackendURL();
      this.cachedBaseURL = null;
      return true;
    } catch (error) {
      console.error("Error resetting config:", error);
      return false;
    }
  }
}

// Export singleton instance
const configService = new ConfigService();
export { configService };
export default configService;


