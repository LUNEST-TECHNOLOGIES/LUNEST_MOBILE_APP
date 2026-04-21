import React from 'react';
import { View } from 'react-native';
import { APP_CONFIG } from '../config/appConfig';

/**
 * Web MapView - Uses Google Maps Embed API for web preview
 * This provides a functional, interactive map for the web platform
 */
const MapView = ({ style, initialRegion, region, children, provider, ...props }) => {
  const currentRegion = region || initialRegion;
  const apiKey = APP_CONFIG.GOOGLE_MAPS_API_KEY;

  if (!currentRegion || !apiKey) {
    return <View style={style} />;
  }

  const { latitude, longitude } = currentRegion;
  // Use zoom 15 as default if delta is not provided
  const zoom = 15;
  
  // Google Maps Embed URL - using "place" mode to show a pin at the coordinates
  const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${latitude},${longitude}&zoom=${zoom}`;

  return (
    <View style={[style, { overflow: 'hidden' }]}>
      <iframe
        width="100%"
        height="100%"
        frameBorder="0"
        style={{ border: 0 }}
        src={embedUrl}
        allowFullScreen
      />
      {/* We render children just in case, though they likely won't be visible over the iframe */}
      {false && children}
    </View>
  );
};

// Marker component for web - simply a stub since the embed API handles the pin
const Marker = () => null;

const PROVIDER_GOOGLE = "google";

export { MapView, Marker, PROVIDER_GOOGLE };
export default MapView;
