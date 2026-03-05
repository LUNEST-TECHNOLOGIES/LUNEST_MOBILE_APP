/**
 * Secure Storage Service
 * Uses expo-secure-store for sensitive data (tokens, credentials)
 * Falls back to encrypted AsyncStorage for web platform
 */

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Encryption key for web fallback (generated once per app install)
const WEB_ENCRYPTION_KEY = 'lunest_secure_key_v1';

class SecureStorageService {
    constructor() {
        this.isSecureStoreAvailable = Platform.OS !== 'web';
        this._encryptionKey = null;
    }

    /**
     * Get or generate encryption key for web platform
     * @private
     */
    async _getWebEncryptionKey() {
        if (this._encryptionKey) return this._encryptionKey;

        try {
            let key = await AsyncStorage.getItem(WEB_ENCRYPTION_KEY);
            if (!key) {
                // Generate a random key for web encryption
                key = await Crypto.digestStringAsync(
                    Crypto.CryptoDigestAlgorithm.SHA256,
                    `${Date.now()}_${Math.random()}_lunest_secure`
                );
                await AsyncStorage.setItem(WEB_ENCRYPTION_KEY, key);
            }
            this._encryptionKey = key;
            return key;
        } catch (error) {
            console.error('Error getting web encryption key:', error);
            return 'fallback_key_not_secure';
        }
    }

    /**
     * Simple XOR encryption for web fallback
     * Note: This is basic obfuscation, not true encryption
     * @private
     */
    async _encryptForWeb(value) {
        try {
            const key = await this._getWebEncryptionKey();
            const encoded = btoa(encodeURIComponent(value));
            let result = '';
            for (let i = 0; i < encoded.length; i++) {
                result += String.fromCharCode(
                    encoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
                );
            }
            return btoa(result);
        } catch (error) {
            console.error('Encryption error:', error);
            return btoa(value);
        }
    }

    /**
     * Decrypt web-stored value
     * @private
     */
    async _decryptForWeb(encryptedValue) {
        try {
            const key = await this._getWebEncryptionKey();
            const decoded = atob(encryptedValue);
            let result = '';
            for (let i = 0; i < decoded.length; i++) {
                result += String.fromCharCode(
                    decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
                );
            }
            return decodeURIComponent(atob(result));
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }

    /**
     * Store a secure value
     * @param {string} key - Storage key
     * @param {string} value - Value to store (must be string)
     * @returns {Promise<boolean>}
     */
    async setSecureItem(key, value) {
        try {
            if (typeof value !== 'string') {
                value = JSON.stringify(value);
            }

            if (this.isSecureStoreAvailable) {
                await SecureStore.setItemAsync(key, value, {
                    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
                });
            } else {
                // Web fallback with basic encryption
                const encrypted = await this._encryptForWeb(value);
                await AsyncStorage.setItem(`secure_${key}`, encrypted);
            }
            return true;
        } catch (error) {
            console.error(`SecureStorage error setting ${key}:`, error);
            return false;
        }
    }

    /**
     * Retrieve a secure value
     * @param {string} key - Storage key
     * @returns {Promise<string|null>}
     */
    async getSecureItem(key) {
        try {
            if (this.isSecureStoreAvailable) {
                return await SecureStore.getItemAsync(key);
            } else {
                // Web fallback
                const encrypted = await AsyncStorage.getItem(`secure_${key}`);
                if (!encrypted) return null;
                return await this._decryptForWeb(encrypted);
            }
        } catch (error) {
            console.error(`SecureStorage error getting ${key}:`, error);
            return null;
        }
    }

    /**
     * Remove a secure value
     * @param {string} key - Storage key
     * @returns {Promise<boolean>}
     */
    async removeSecureItem(key) {
        try {
            if (this.isSecureStoreAvailable) {
                await SecureStore.deleteItemAsync(key);
            } else {
                await AsyncStorage.removeItem(`secure_${key}`);
            }
            return true;
        } catch (error) {
            console.error(`SecureStorage error removing ${key}:`, error);
            return false;
        }
    }

    /**
     * Check if secure storage is available
     * @returns {boolean}
     */
    isAvailable() {
        return this.isSecureStoreAvailable;
    }
}

export default new SecureStorageService();
