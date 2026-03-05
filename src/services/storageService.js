/**
 * Storage Service
 * Cross-platform storage abstraction layer
 * Handles both AsyncStorage (mobile) and localStorage (web)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class StorageService {
  /**
   * Set item in storage
   * @param {string} key - Storage key
   * @param {*} value - Value to store (will be JSON stringified)
   * @returns {Promise<void>}
   */
  async setItem(key, value) {
    try {
      const jsonValue = JSON.stringify(value);
      if (Platform.OS === 'web') {
        // Use localStorage for web
        localStorage.setItem(key, jsonValue);
      } else {
        // Use AsyncStorage for mobile
        await AsyncStorage.setItem(key, jsonValue);
      }
    } catch (error) {
      console.error(`Storage error setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get item from storage
   * @param {string} key - Storage key
   * @returns {Promise<*>} Parsed value or null
   */
  async getItem(key) {
    try {
      let value;
      if (Platform.OS === 'web') {
        // Use localStorage for web
        value = localStorage.getItem(key);
      } else {
        // Use AsyncStorage for mobile
        value = await AsyncStorage.getItem(key);
      }
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Storage error getting ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove item from storage
   * @param {string} key - Storage key
   * @returns {Promise<void>}
   */
  async removeItem(key) {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage for web
        localStorage.removeItem(key);
      } else {
        // Use AsyncStorage for mobile
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Storage error removing ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clear all storage
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      if (Platform.OS === 'web') {
        // Clear localStorage for web
        localStorage.clear();
      } else {
        // Clear AsyncStorage for mobile
        await AsyncStorage.clear();
      }
    } catch (error) {
      console.error('Storage error clearing:', error);
      throw error;
    }
  }

  /**
   * Get all keys in storage
   * @returns {Promise<string[]>}
   */
  async getAllKeys() {
    try {
      if (Platform.OS === 'web') {
        // Get all localStorage keys
        return Object.keys(localStorage);
      } else {
        // Get all AsyncStorage keys
        return await AsyncStorage.getAllKeys();
      }
    } catch (error) {
      console.error('Storage error getting keys:', error);
      return [];
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Storage key
   * @returns {Promise<boolean>}
   */
  async hasItem(key) {
    try {
      const value = await this.getItem(key);
      return value !== null;
    } catch (error) {
      console.error(`Storage error checking ${key}:`, error);
      return false;
    }
  }

  /**
   * Batch set multiple items
   * @param {Object} items - Object with key-value pairs
   * @returns {Promise<void>}
   */
  async setMultiple(items) {
    try {
      const promises = Object.entries(items).map(([key, value]) =>
        this.setItem(key, value)
      );
      await Promise.all(promises);
    } catch (error) {
      console.error('Storage error setting multiple:', error);
      throw error;
    }
  }

  /**
   * Batch get multiple items
   * @param {string[]} keys - Array of keys
   * @returns {Promise<Object>}
   */
  async getMultiple(keys) {
    try {
      const promises = keys.map(key => this.getItem(key));
      const values = await Promise.all(promises);
      const result = {};
      keys.forEach((key, index) => {
        result[key] = values[index];
      });
      return result;
    } catch (error) {
      console.error('Storage error getting multiple:', error);
      return {};
    }
  }

  // ============================================
  // USER-SPECIFIC STORAGE METHODS
  // These methods prefix keys with user ID for
  // data that should be unique per user
  // ============================================

  /**
   * Get user-specific key
   * @param {string} userId - User's unique ID or email
   * @param {string} key - Base key name
   * @returns {string} User-prefixed key
   */
  getUserKey(userId, key) {
    return `user_${userId}_${key}`;
  }

  /**
   * Set user-specific item
   * @param {string} userId - User's unique ID or email
   * @param {string} key - Base key name
   * @param {*} value - Value to store
   * @returns {Promise<void>}
   */
  async setUserItem(userId, key, value) {
    const userKey = this.getUserKey(userId, key);
    return this.setItem(userKey, value);
  }

  /**
   * Get user-specific item
   * @param {string} userId - User's unique ID or email
   * @param {string} key - Base key name
   * @returns {Promise<*>}
   */
  async getUserItem(userId, key) {
    const userKey = this.getUserKey(userId, key);
    return this.getItem(userKey);
  }

  /**
   * Remove user-specific item
   * @param {string} userId - User's unique ID or email
   * @param {string} key - Base key name
   * @returns {Promise<void>}
   */
  async removeUserItem(userId, key) {
    const userKey = this.getUserKey(userId, key);
    return this.removeItem(userKey);
  }

  /**
   * Clear all data for a specific user
   * @param {string} userId - User's unique ID or email
   * @returns {Promise<void>}
   */
  async clearUserData(userId) {
    try {
      const allKeys = await this.getAllKeys();
      const userPrefix = `user_${userId}_`;
      const userKeys = allKeys.filter(key => key.startsWith(userPrefix));
      
      for (const key of userKeys) {
        await this.removeItem(key);
      }
    } catch (error) {
      console.error('Storage error clearing user data:', error);
    }
  }
}

// Export singleton instance
export default new StorageService();
