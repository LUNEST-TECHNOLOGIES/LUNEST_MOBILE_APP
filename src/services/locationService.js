/**
 * Location Service
 * Handles getting user's current location using expo-location
 * Also provides reverse geocoding to get city/address from coordinates
 */

import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';
import APP_CONFIG from '../config/appConfig';

class LocationService {
    constructor() {
        this.lastLocation = null;
        this.lastAddress = null;
        this.geocodeCache = new Map(); // Simple in-memory cache for geocoding results
    }

    /**
     * Request location permissions
     * @returns {Promise<boolean>} Whether permission was granted
     */
    async requestPermissions() {
        try {
            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

            if (foregroundStatus !== 'granted') {
                Alert.alert(
                    'Location Permission Required',
                    'Please enable location access in your device settings to use this feature.', [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Open Settings',
                            onPress: () => {
                                if (Platform.OS === 'ios') {
                                    Linking.openURL('app-settings:');
                                } else {
                                    Linking.openSettings();
                                }
                            }
                        }
                    ]
                );
                return false;
            }

            return true;
        } catch (error) {
            console.error('❌ [LocationService] Error requesting permissions:', error);
            return false;
        }
    }

    /**
     * Check if location permissions are granted
     * @returns {Promise<boolean>}
     */
    async hasPermissions() {
        try {
            const { status } = await Location.getForegroundPermissionsAsync();
            return status === 'granted';
        } catch (error) {
            console.error('❌ [LocationService] Error checking permissions:', error);
            return false;
        }
    }

    /**
     * Get current location coordinates
     * @param {Object} options - Location options
     * @returns {Promise<Object|null>} Location object with latitude, longitude or null
     */
    async getCurrentLocation(options = {}) {
        try {
            console.log('📍 [LocationService] Getting current location...');

            // Request permissions if not granted
            const hasPermission = await this.hasPermissions();
            if (!hasPermission) {
                const granted = await this.requestPermissions();
                if (!granted) return null;
            }

            // Enhanced acquisition: Try getCurrentPositionAsync with timeout or fallback to getLastKnownPosition
            let location = null;
            try {
                // Set a 10s timeout for high accuracy location
                location = await Promise.race([
                    Location.getCurrentPositionAsync({
                        accuracy: options.accuracy || Location.Accuracy.Balanced,
                        ...options,
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Location request timed out')), 10000)
                    )
                ]);
            } catch (posError) {
                console.warn('⚠️ [LocationService] Position async failed or timed out:', posError.message);
                console.log('📍 [LocationService] Attempting to get last known position...');
                location = await Location.getLastKnownPositionAsync();
            }

            if (!location) {
                console.warn('❌ [LocationService] Failed to obtain any location data.');
                return this.lastLocation; // Return cached if available
            }

            this.lastLocation = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy,
                timestamp: location.timestamp,
            };

            console.log('✅ [LocationService] Location obtained:', this.lastLocation);
            return this.lastLocation;
        } catch (error) {
            console.error('❌ [LocationService] Error getting location:', error);
            return this.lastLocation;
        }
    }

    /**
     * Get address from coordinates (reverse geocoding)
     * @param {number} latitude 
     * @param {number} longitude 
     * @returns {Promise<Object|null>} Address object
     */
    async getAddressFromCoordinates(latitude, longitude) {
        try {
            console.log('🗺️ [LocationService] Reverse geocoding...');

            // 1. Try Expo/Native Reverse Geocoding first
            let addresses = [];
            try {
                addresses = await Location.reverseGeocodeAsync({
                    latitude,
                    longitude,
                });
            } catch (err) {
                console.warn('⚠️ [LocationService] Native reverse geocoding failed:', err.message);
            }

            if (addresses && addresses.length > 0) {
                const address = addresses[0];
                return this._formatNativeAddress(address);
            }

            // 2. Fallback to Google Maps API if available
            const googleKey = APP_CONFIG.GOOGLE_MAPS_API_KEY;
            if (googleKey && googleKey !== 'YOUR_GOOGLE_MAPS_API_KEY') {
                console.log('🌍 [LocationService] Falling back to Google Geocoding API...');
                try {
                    const response = await fetch(
                        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleKey}`
                    );
                    const data = await response.json();
                    if (data.status === 'OK' && data.results.length > 0) {
                        return this._formatGoogleAddress(data.results[0]);
                    } else {
                        console.warn('⚠️ [LocationService] Google Geocoding API returned status:', data.status);
                    }
                } catch (gError) {
                    console.error('❌ [LocationService] Google Geocoding fetch failed:', gError);
                }
            }

            return this.lastAddress;
        } catch (error) {
            console.error('❌ [LocationService] Error reverse geocoding:', error);
            return this.lastAddress;
        }
    }

    /**
     * Helper to format native address object
     * @private
     */
    _formatNativeAddress(address) {
        const formattedAddress = {
            street: address.street || '',
            streetNumber: address.streetNumber || '',
            city: address.city || address.subregion || '',
            district: address.district || '',
            region: address.region || '', // State
            country: address.country || '',
            postalCode: address.postalCode || '',
            name: address.name || '',
            fullAddress: [
                address.streetNumber,
                address.street,
                address.city || address.subregion,
                address.region,
                address.country,
            ].filter(Boolean).join(', '),
        };

        this.lastAddress = formattedAddress;
        console.log('✅ [LocationService] Address obtained (Native):', formattedAddress);
        return formattedAddress;
    }

    /**
     * Helper to format Google Geocoding API result
     * @private
     */
    _formatGoogleAddress(result) {
        const components = result.address_components;
        const getComponent = (type, member = 'long_name') => {
            const comp = components.find(c => c.types.includes(type));
            return comp ? comp[member] : '';
        };

        const formattedAddress = {
            street: getComponent('route'),
            streetNumber: getComponent('street_number'),
            city: getComponent('locality') || getComponent('administrative_area_level_2'),
            district: getComponent('sublocality'),
            region: getComponent('administrative_area_level_1'), // State
            country: getComponent('country'),
            postalCode: getComponent('postal_code'),
            name: '',
            fullAddress: result.formatted_address,
        };

        this.lastAddress = formattedAddress;
        console.log('✅ [LocationService] Address obtained (Google):', formattedAddress);
        return formattedAddress;
    }

    /**
     * Get current location with address
     * @returns {Promise<Object|null>} Object with coordinates and address
     */
    async getCurrentLocationWithAddress() {
        try {
            const location = await this.getCurrentLocation();
            if (!location) return null;

            const address = await this.getAddressFromCoordinates(
                location.latitude,
                location.longitude
            );

            return {
                ...location,
                address,
            };
        } catch (error) {
            console.error('❌ [LocationService] Error getting location with address:', error);
            return null;
        }
    }

    /**
     * Get coordinates from address (forward geocoding)
     * @param {string} address - Address string to geocode
     * @returns {Promise<Object|null>} Coordinates object
     */
    async getCoordinatesFromAddress(address) {
        try {
            if (!address) return null;

            // Check cache first to avoid rate limits
            const normalizedAddress = address.trim().toLowerCase();
            if (this.geocodeCache.has(normalizedAddress)) {
                console.log('🗺️ [LocationService] Using cached coordinates for:', address);
                return this.geocodeCache.get(normalizedAddress);
            }

            console.log('🗺️ [LocationService] Forward geocoding:', address);
            const results = await Location.geocodeAsync(address);

            if (results && results.length > 0) {
                const coords = {
                    latitude: results[0].latitude,
                    longitude: results[0].longitude,
                };
                
                // Store in cache
                this.geocodeCache.set(normalizedAddress, coords);
                
                console.log('✅ [LocationService] Coordinates obtained and cached:', coords);
                return coords;
            }

            return null;
        } catch (error) {
            // Check for rate limit error specifically
            if (error.message && error.message.includes('rate limit')) {
                console.warn('⚠️ [LocationService] Geocoding rate limit exceeded. Using last known or null.');
            } else {
                console.error('❌ [LocationService] Error geocoding address:', error);
            }
            return null;
        }
    }

    /**
     * Watch user's location continuously
     * @param {Function} callback - Called with location updates
     * @param {Object} options - Watch options
     * @returns {Promise<Object|null>} Subscription object to stop watching
     */
    async watchLocation(callback, options = {}) {
        try {
            const hasPermission = await this.hasPermissions();
            if (!hasPermission) {
                const granted = await this.requestPermissions();
                if (!granted) return null;
            }

            const subscription = await Location.watchPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 5000, // Update every 5 seconds
                    distanceInterval: 10, // Or every 10 meters
                    ...options,
                },
                (location) => {
                    const locationData = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        accuracy: location.coords.accuracy,
                        timestamp: location.timestamp,
                    };
                    this.lastLocation = locationData;
                    callback(locationData);
                }
            );

            return subscription;
        } catch (error) {
            console.error('❌ [LocationService] Error watching location:', error);
            return null;
        }
    }

    /**
     * Get last known location (cached)
     * @returns {Object|null}
     */
    getLastLocation() {
        return this.lastLocation;
    }

    /**
     * Get last known address (cached)
     * @returns {Object|null}
     */
    getLastAddress() {
        return this.lastAddress;
    }

    /**
     * Format location for display (e.g., "Lagos, Nigeria")
     * @param {Object} address - Address object from reverse geocoding
     * @returns {string}
     */
    formatLocationDisplay(address) {
        if (!address) return 'Unknown Location';

        const parts = [address.city, address.country].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : 'Unknown Location';
    }
}

const locationService = new LocationService();
export default locationService;
