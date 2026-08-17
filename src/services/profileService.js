/**
 * Profile Service
 * Handles user profile data persistence per user
 * Profile data persists across logout/login for the same user
 */

import storageService from "./storageService";
import { getUserData } from "./userDataService";

// Storage key prefix for profile data
const PROFILE_DATA_PREFIX = "profile_";

class ProfileService {
  /**
   * Get the storage key for the current user's profile
   * @returns {Promise<string|null>}
   */
  async getProfileKey() {
    try {
      const userData = await getUserData();
      if (userData?.id || userData?.email) {
        // Use user ID or email as unique identifier
        const identifier = userData.id || userData.email;
        return `${PROFILE_DATA_PREFIX}${identifier}`;
      }
      return null;
    } catch (error) {
      console.error("Error getting profile key:", error);
      return null;
    }
  }

  /**
   * Get the current user's profile data
   * @returns {Promise<Object|null>}
   */
  async getProfileData() {
    try {
      const key = await this.getProfileKey();
      if (!key) return null;

      const profileData = await storageService.getItem(key);
      return profileData;
    } catch (error) {
      console.error("Error getting profile data:", error);
      return null;
    }
  }

  /**
   * Save the current user's profile data
   * @param {Object} profileData - Profile data to save
   * @returns {Promise<boolean>}
   */
  async saveProfileData(profileData) {
    try {
      const key = await this.getProfileKey();
      if (!key) {
        console.error("Cannot save profile: No user logged in");
        return false;
      }

      await storageService.setItem(key, profileData);

      // Also emit an event for listeners (e.g., bottom nav)
      this.notifyListeners(profileData);

      return true;
    } catch (error) {
      console.error("Error saving profile data:", error);
      return false;
    }
  }

  /**
   * Update specific fields in the profile
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated profile data
   */
  async updateProfile(updates) {
    try {
      const currentProfile = (await this.getProfileData()) || {};
      const updatedProfile = { ...currentProfile, ...updates };

      const success = await this.saveProfileData(updatedProfile);
      return success ? updatedProfile : null;
    } catch (error) {
      console.error("Error updating profile:", error);
      return null;
    }
  }

  /**
   * Update avatar URI
   * @param {string} avatarUri - URI of the avatar image
   * @returns {Promise<boolean>}
   */
  async updateAvatar(avatarUri) {
    try {
      const result = await this.updateProfile({ avatarUri });
      return result !== null;
    } catch (error) {
      console.error("Error updating avatar:", error);
      return false;
    }
  }

  /**
   * Get avatar URI for current user
   * @returns {Promise<string|null>}
   */
  async getAvatarUri() {
    try {
      const userData = await getUserData();
      if (userData && (userData.avatar === null || userData.avatar === undefined || userData.avatar === "")) {
        return null;
      }
      const profileData = await this.getProfileData();
      return profileData?.avatarUri || userData?.avatar || null;
    } catch (error) {
      console.error("Error getting avatar:", error);
      return null;
    }
  }

  /**
   * Clear profile data for current user
   * @returns {Promise<boolean>}
   */
  async clearProfileData() {
    try {
      const key = await this.getProfileKey();
      if (!key) return false;

      await storageService.removeItem(key);
      return true;
    } catch (error) {
      console.error("Error clearing profile data:", error);
      return false;
    }
  }

  // Listener management for profile changes
  listeners = [];

  /**
   * Add a listener for profile changes
   * @param {Function} callback - Function to call when profile changes
   * @returns {Function} Unsubscribe function
   */
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Notify all listeners of profile changes
   * @param {Object} profileData - Updated profile data
   */
  notifyListeners(profileData) {
    this.listeners.forEach((callback) => {
      try {
        callback(profileData);
      } catch (error) {
        console.error("Error in profile listener:", error);
      }
    });
  }
}

// Export singleton instance
const profileService = new ProfileService();
export default profileService;
