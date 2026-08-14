import React from 'react';
import { View } from 'react-native';
import { APP_CONFIG } from '../config/appConfig';

/**
 * Web MapView - Provides universal map preview on the Web platform.
 * Supports:
 * 1. Coordinates from host property listing (latitude & longitude)
 * 2. Keyless Google Maps search embeds for guaranteed 100% availability
 */
const MapView = ({ style, initialRegion, region, children, provider, query, ...props }) => {
  const currentRegion = region || initialRegion;
  const apiKey = APP_CONFIG?.GOOGLE_MAPS_API_KEY;

  let embedUrl = "";

  const lat = Number(currentRegion?.latitude);
  const lng = Number(currentRegion?.longitude);
  const hasValidCoords = !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0);

  if (hasValidCoords) {
    if (apiKey) {
      embedUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${lat},${lng}&zoom=15`;
    } else {
      // Robust keyless Google Maps search embed showing the pin at exact coordinates
      embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&hl=en&z=15&output=embed`;
    }
  } else if (query) {
    embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&hl=en&z=14&output=embed`;
  } else {
    // Default fallback to Lagos, Nigeria
    embedUrl = `https://maps.google.com/maps?q=6.5244,3.3792&hl=en&z=13&output=embed`;
  }

  return (
    <View style={[style, { overflow: 'hidden', borderRadius: 12, backgroundColor: '#E2E8F0' }]}>
      <iframe
        width="100%"
        height="100%"
        frameBorder="0"
        style={{ border: 0, width: '100%', height: '100%', borderRadius: 12 }}
        src={embedUrl}
        allowFullScreen
        title="Property Location Map"
        loading="lazy"
      />
    </View>
  );
};

// Marker component for web - simply a stub since the embed iframe handles the pin
const Marker = () => null;

const PROVIDER_GOOGLE = "google";

export { MapView, Marker, PROVIDER_GOOGLE };
export default MapView;
