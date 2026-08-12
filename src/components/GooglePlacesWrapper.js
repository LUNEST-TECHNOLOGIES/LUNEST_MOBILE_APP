import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { GooglePlacesAutocomplete as GoogleAutocomplete } from 'react-native-google-places-autocomplete';
import configService from '../services/configService';

/**
 * GooglePlacesWrapper - Web Implementation with Autocomplete
 * Uses Google Places API directly for web with proper autocomplete dropdown
 */
const GooglePlacesAutocompleteWeb = React.forwardRef((props, ref) => {
  const [query, setQuery] = useState(props.textInputProps?.value || '');
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);
  const apiKey = props.query?.key || '';

  // Get API key from props or config
  const getApiKey = () => {
    if (props.query?.key) return props.query.key;
    return require('../config/appConfig').APP_CONFIG.GOOGLE_MAPS_API_KEY || '';
  };

  // Fetch predictions from Google Places API with OpenStreetMap fallback
  const fetchPredictions = useCallback(async (input) => {
    if (!input || input.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      const sessionToken = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('places_session_token')) || 
                          Math.random().toString(36).substring(2);
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('places_session_token', sessionToken);
      }

      const baseUrl = await configService.getBaseURL();
      const components = props.query?.components || 'country:ng';
      
      // Call Google Places Proxy (without restrictive types=address to allow cities & neighborhoods)
      const cleanBase = baseUrl.replace(/\/$/, '');
      const proxyUrl = cleanBase.endsWith('/v1') 
        ? `${cleanBase}/listings/proxy-places?type=autocomplete&input=${encodeURIComponent(input)}&components=${components}&sessiontoken=${sessionToken}`
        : `${cleanBase}/v1/listings/proxy-places?type=autocomplete&input=${encodeURIComponent(input)}&components=${components}&sessiontoken=${sessionToken}`;
      
      console.log('[GooglePlacesWeb] Fetching predictions via proxy:', proxyUrl);
      
      const response = await fetch(proxyUrl);
      const data = await response.json();
      
      if (data.status === 'OK' && Array.isArray(data.predictions) && data.predictions.length > 0) {
        setPredictions(data.predictions.slice(0, 6));
        setShowDropdown(true);
        return;
      }
    } catch (error) {
      console.warn('[GooglePlacesWeb] Proxy fetch error, falling back to OSM:', error?.message);
    }

    // OpenStreetMap Nominatim fallback for Web/PWA
    try {
      console.log('[GooglePlacesWeb] Trying OpenStreetMap Nominatim fallback for:', input);
      const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&countrycodes=ng&addressdetails=1&limit=5`;
      const osmRes = await fetch(osmUrl, {
        headers: { 'Accept-Language': 'en' }
      });
      const osmData = await osmRes.json();
      if (Array.isArray(osmData) && osmData.length > 0) {
        const mappedOsm = osmData.map((item) => ({
          description: item.display_name,
          place_id: `osm_${item.place_id}`,
          isOsm: true,
          osmData: {
            lat: Number(item.lat),
            lng: Number(item.lon),
            address: item.address || {},
            displayName: item.display_name,
          }
        }));
        setPredictions(mappedOsm);
        setShowDropdown(true);
        return;
      }
    } catch (osmErr) {
      console.warn('[GooglePlacesWeb] OSM fallback error:', osmErr?.message);
    } finally {
      setLoading(false);
    }

    setPredictions([]);
  }, [props.query]);

  // Debounced search
  const handleInputChange = (text) => {
    setQuery(text);
    if (props.textInputProps?.onChangeText) {
      props.textInputProps.onChangeText(text);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPredictions(text);
    }, 300);
  };

  // Fetch place details when user selects a prediction
  const handleSelectPrediction = async (prediction) => {
    setLoading(true);
    setShowDropdown(false);
    
    try {
      if (prediction.isOsm && prediction.osmData) {
        const osm = prediction.osmData;
        const details = {
          geometry: {
            location: {
              lat: osm.lat,
              lng: osm.lng,
            }
          },
          address_components: [
            { long_name: osm.address?.road || osm.address?.suburb || '', types: ['route'] },
            { long_name: osm.address?.city || osm.address?.state_district || osm.address?.county || '', types: ['locality'] },
            { long_name: osm.address?.state || '', types: ['administrative_area_level_1'] },
            { long_name: osm.address?.country || 'Nigeria', types: ['country'] },
          ],
          formatted_address: osm.displayName,
        };

        const dataObject = {
          description: prediction.description,
          place_id: prediction.place_id,
        };

        setQuery(prediction.description);
        if (props.onPress) {
          props.onPress(dataObject, details);
        }
        return;
      }

      const baseUrl = await configService.getBaseURL();
      const sessionToken = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('places_session_token')) || '';
      const cleanBase = baseUrl.replace(/\/$/, '');
      const url = cleanBase.endsWith('/v1')
        ? `${cleanBase}/listings/proxy-places?type=details&place_id=${prediction.place_id}&sessiontoken=${sessionToken}`
        : `${cleanBase}/v1/listings/proxy-places?type=details&place_id=${prediction.place_id}&sessiontoken=${sessionToken}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.result) {
        const result = data.result;
        const location = result.geometry?.location;
        
        const details = {
          geometry: {
            location: {
              lat: location?.lat || 0,
              lng: location?.lng || 0,
            }
          },
          address_components: result.address_components || [],
          formatted_address: result.formatted_address || prediction.description,
        };

        const dataObject = {
          description: prediction.description,
          place_id: prediction.place_id,
          structured_formatting: prediction.structured_formatting,
        };

        setQuery(prediction.description);
        
        if (props.onPress) {
          props.onPress(dataObject, details);
        }
      }
    } catch (error) {
      console.warn('[GooglePlacesWeb] Place details error:', error);
    } finally {
      setLoading(false);
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('places_session_token');
      }
    }
  };

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    setAddressText: (text) => {
      setQuery(text || '');
      setPredictions([]);
      setShowDropdown(false);
    },
    getAddressText: () => query,
  }));

  // Sync with external value changes
  useEffect(() => {
    if (props.textInputProps?.value !== undefined && props.textInputProps.value !== query) {
      setQuery(props.textInputProps.value);
    }
  }, [props.textInputProps?.value]);

  const inputStyle = props.textInputProps?.style || {};
  const containerStyle = props.styles?.container || {};
  const listViewStyle = props.styles?.listView || {};
  const rowStyle = props.styles?.row || {};
  const separatorStyle = props.styles?.separator || {};

  return (
    <View style={[{ position: 'relative', zIndex: 1000 }, containerStyle]}>
      <TextInput
        {...props.textInputProps}
        value={query}
        onChangeText={handleInputChange}
        onFocus={() => {
          if (predictions.length > 0) setShowDropdown(true);
          if (props.textInputProps?.onFocus) props.textInputProps.onFocus();
        }}
        onBlur={() => {
          // Delay hiding dropdown to allow click on prediction
          setTimeout(() => setShowDropdown(false), 200);
          if (props.textInputProps?.onBlur) props.textInputProps.onBlur();
        }}
        placeholder={props.placeholder || 'Search for your address...'}
        style={[
          { 
            height: 50, 
            backgroundColor: '#FAFAFA',
            paddingHorizontal: 12,
            fontSize: 14,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#e5e7eb',
          }, 
          inputStyle
        ]}
        autoComplete="off"
        autoCorrect={false}
        spellCheck={false}
      />
      
      {loading && (
        <View style={{ position: 'absolute', right: 12, top: 12 }}>
          <ActivityIndicator size="small" color="#666" />
        </View>
      )}

      {/* Help text for manual entry when API fails */}
      {query.length >= 2 && !loading && !showDropdown && (
        <View style={{ marginTop: 4, marginLeft: 4 }}>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>
            Type your address manually
          </Text>
        </View>
      )}

      {showDropdown && predictions.length > 0 && (
        <View 
          style={[
            {
              position: 'absolute',
              top: 55,
              left: 0,
              right: 0,
              backgroundColor: '#fff',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 5,
              maxHeight: 300,
            },
            listViewStyle
          ]}
        >
          <ScrollView keyboardShouldPersistTaps="always">
            {predictions.map((prediction, index) => (
              <Pressable
                key={prediction.place_id}
                onPress={() => handleSelectPrediction(prediction)}
                style={[
                  {
                    padding: 12,
                    borderBottomWidth: index < predictions.length - 1 ? 1 : 0,
                    borderBottomColor: '#f0f0f0',
                  },
                  rowStyle,
                  separatorStyle
                ]}
              >
                <Text 
                  numberOfLines={2}
                  style={{ fontSize: 14, color: '#1f2937' }}
                >
                  {prediction.structured_formatting?.main_text || prediction.description}
                </Text>
                {prediction.structured_formatting?.secondary_text && (
                  <Text 
                    numberOfLines={1}
                    style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}
                  >
                    {prediction.structured_formatting.secondary_text}
                  </Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
});

/**
 * GooglePlacesWrapper
 * Wraps the GooglePlacesAutocomplete library to provide a consistent interface
 * and safe web fallback if needed.
 */
export const GooglePlacesAutocomplete = React.forwardRef((props, ref) => {
  if (Platform.OS === 'web') {
    return <GooglePlacesAutocompleteWeb ref={ref} {...props} />;
  }

  // Native Implementation
  return (
    <GoogleAutocomplete
      ref={ref}
      {...props}
    />
  );
});

