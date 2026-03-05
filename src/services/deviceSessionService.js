import authService from './authService';
import storageService from './storageService';
import networkErrorHandler from './networkErrorHandler';

/**
 * Device Session Service
 * Manages device sessions and multi-device login features
 */
class DeviceSessionService {
    constructor() {
        this.baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
    }

    /**
     * Get all active sessions for current user
     */
    async getActiveSessions() {
        try {
            const token = await authService.getToken();
            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await this._secureRequest(
                `${this.baseURL}/v1/sessions/list`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({}),
                }
            );

            if (response.body && Array.isArray(response.body)) {
                return {
                    success: true,
                    data: response.body,
                };
            }

            return {
                success: false,
                message: 'Invalid response format',
                data: [],
            };
        } catch (error) {
            console.error('Error fetching active sessions:', error);
            networkErrorHandler.logError(error, {
                action: 'getActiveSessions',
                endpoint: 'v1/sessions/list',
            });
            return {
                success: false,
                message: error?.message || 'Failed to fetch sessions',
                data: [],
            };
        }
    }

    /**
     * Get other active devices (excluding current)
     */
    async getOtherActiveDevices(currentDeviceId) {
        try {
            const token = await authService.getToken();
            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await this._secureRequest(
                `${this.baseURL}/v1/sessions/other-devices`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ currentDeviceId }),
                }
            );

            if (response.body) {
                return {
                    success: true,
                    data: response.body.devices || [],
                    count: response.body.count || 0,
                };
            }

            return {
                success: false,
                message: 'Invalid response format',
                data: [],
                count: 0,
            };
        } catch (error) {
            console.error('Error fetching other devices:', error);
            networkErrorHandler.logError(error, {
                action: 'getOtherActiveDevices',
                endpoint: 'v1/sessions/other-devices',
            });
            return {
                success: false,
                message: error?.message || 'Failed to fetch devices',
                data: [],
                count: 0,
            };
        }
    }

    /**
     * Logout from a specific device
     */
    async logoutFromDevice(sessionId) {
        try {
            const token = await authService.getToken();
            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await this._secureRequest(
                `${this.baseURL}/v1/sessions/${sessionId}/logout`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({}),
                }
            );

            return {
                success: true,
                message: response.message || 'Device logged out successfully',
            };
        } catch (error) {
            console.error('Error logging out from device:', error);
            networkErrorHandler.logError(error, {
                action: 'logoutFromDevice',
                endpoint: `v1/sessions/${sessionId}/logout`,
            });
            return {
                success: false,
                message: error?.message || 'Failed to logout from device',
            };
        }
    }

    /**
     * Logout from all devices
     */
    async logoutFromAllDevices() {
        try {
            const token = await authService.getToken();
            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await this._secureRequest(
                `${this.baseURL}/v1/sessions/logout-all`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({}),
                }
            );

            // Clear all stored auth data
            await authService.logout();

            return {
                success: true,
                message: response.message || 'Logged out from all devices',
            };
        } catch (error) {
            console.error('Error logging out from all devices:', error);
            networkErrorHandler.logError(error, {
                action: 'logoutFromAllDevices',
                endpoint: 'v1/sessions/logout-all',
            });
            return {
                success: false,
                message: error?.message || 'Failed to logout from all devices',
            };
        }
    }

    /**
     * Update session activity (keep-alive)
     */
    async updateSessionActivity(sessionId) {
        try {
            const token = await authService.getToken();
            if (!token) {
                return { success: false };
            }

            await this._secureRequest(`${this.baseURL}/v1/sessions/${sessionId}/activity`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({}),
            });

            return { success: true };
        } catch (error) {
            console.error('Error updating session activity:', error);
            return { success: false };
        }
    }

    /**
     * Check if current device is the only active session
     */
    async isOnlyActiveDevice(currentDeviceId) {
        try {
            const result = await this.getOtherActiveDevices(currentDeviceId);
            return result.count === 0;
        } catch (error) {
            console.error('Error checking if only device:', error);
            return false;
        }
    }

    /**
     * Get device ID for current app instance
     * Should be called once on app startup and stored
     */
    async getOrCreateDeviceId() {
        try {
            let deviceId = await storageService.getItem('deviceId');

            if (!deviceId) {
                // Generate unique device ID
                deviceId = this._generateDeviceId();
                await storageService.setItem('deviceId', deviceId);
            }

            return deviceId;
        } catch (error) {
            console.error('Error getting device ID:', error);
            return this._generateDeviceId();
        }
    }

    /**
     * Format device info for display
     */
    formatDeviceInfo(session) {
        return {
            name: session.deviceName,
            type: session.deviceType,
            location: session.location || 'Unknown location',
            lastActive: this._formatTime(session.lastActivityAt),
            loginTime: this._formatTime(session.loginAt),
            ipAddress: session.ipAddress,
            isCurrent: session.isCurrent || false,
        };
    }

    /**
     * Private Methods
     */

    async _secureRequest(url, options) {
        const response = await fetch(url, options);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `HTTP ${response.status}`);
        }

        return data;
    }

    _generateDeviceId() {
        // Generate UUID v4-like ID
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    _formatTime(dateString) {
        try {
            const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);

            if (diffMins < 1) return 'Now';
            if (diffMins < 60) return `${diffMins}m ago`;

            const diffHours = Math.floor(diffMs / 3600000);
            if (diffHours < 24) return `${diffHours}h ago`;

            const diffDays = Math.floor(diffMs / 86400000);
            if (diffDays < 7) return `${diffDays}d ago`;

            return date.toLocaleDateString();
        } catch (error) {
            return 'Unknown';
        }
    }
}

export default new DeviceSessionService();
