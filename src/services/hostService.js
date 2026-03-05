/**
 * Host Service Utilities
 * Centralized functions for fetching and managing host data across the app
 */

import authService from './authService';
import configService from './configService';

/**
 * Fetch complete host data including avatar from backend profile
 * @param {string} hostId - The host's user ID
 * @returns {Promise<{success: boolean, hostData?: object, avatar?: string, error?: string}>}
 */
export const fetchHostData = async(hostId) => {
    try {
        if (!hostId) {
            return { success: false, error: 'Host ID is required' };
        }

        const token = await authService.getToken();
        const baseURL = await configService.getBaseURL();

        if (!token || !baseURL) {
            return { success: false, error: 'Authentication or API configuration missing' };
        }

        // Fetch host profile data from backend
        const response = await fetch(`${baseURL}/v1/users/${hostId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            console.warn(`[HostService] Failed to fetch host profile for ${hostId}:`, response.status);
            return { success: false, error: `Failed to fetch host data: ${response.status}` };
        }

        const data = await response.json();
        const hostProfile = data.body || data;

        if (!hostProfile) {
            return { success: false, error: 'No host data received' };
        }

        console.log(`[HostService] Successfully fetched host data for ${hostId}`);

        return {
            success: true,
            hostData: {
                _id: hostProfile._id,
                fullName: hostProfile.fullName,
                emailAddress: hostProfile.emailAddress || hostProfile.email,
                phoneNumber: hostProfile.phoneNumber,
                avatar: hostProfile.avatar,
                userType: hostProfile.userType,
                hostApplicationStatus: hostProfile.hostApplicationStatus,
                active: hostProfile.active,
                verified: hostProfile.verified,
                nin: hostProfile.nin,
                hostRating: hostProfile.hostRating,
                hostRatingCount: hostProfile.hostRatingCount,
            },
            avatar: hostProfile.avatar
        };

    } catch (error) {
        console.error('[HostService] Error fetching host data:', error);
        return { success: false, error: error.message || 'Unknown error occurred' };
    }
};

/**
 * Get host avatar URL with proper conversion
 * @param {string} avatar - Raw avatar URL from database
 * @returns {string|null} - Converted avatar URL or null
 */
export const getHostAvatarUrl = (avatar) => {
    if (!avatar) return null;

    // If it's already a full URL, return as is
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
        return avatar;
    }

    // Otherwise, assume it's a relative path and convert it
    try {
        const baseURL = configService.getBaseURLSync();
        return avatar.startsWith('/') ? `${baseURL}${avatar}` : `${baseURL}/${avatar}`;
    } catch (error) {
        console.warn('[HostService] Error converting avatar URL:', error);
        return null;
    }
};

/**
 * Get consistent host display data for UI components
 * @param {object} hostInfo - Host info from listing
 * @param {string} freshAvatar - Fresh avatar from profile API (optional)
 * @returns {object} - Standardized host data for UI
 */
export const getHostDisplayData = (hostInfo, freshAvatar = null) => {
    if (!hostInfo) return null;

    const avatar = freshAvatar || hostInfo.avatar;

    return {
        id: hostInfo._id,
        name: hostInfo.fullName || hostInfo.name || 'Unknown Host',
        email: hostInfo.emailAddress || hostInfo.email,
        phone: hostInfo.phoneNumber || hostInfo.phone,
        avatar: avatar,
        avatarUrl: getHostAvatarUrl(avatar),
        userType: hostInfo.userType || 'HOST',
        hostApplicationStatus: hostInfo.hostApplicationStatus,
        isActive: hostInfo.active !== false,
        isVerified: hostInfo.verified || false,
    };
};