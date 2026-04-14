import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { GooglePlacesAutocomplete as GoogleAutocomplete } from 'react-native-google-places-autocomplete';

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
    if (apiKey) return apiKey;
    // Fallback to environment variable
    if (typeof process !== 'undefined' && process.env) {
      return process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 
             process.env.GOOGLE_MAPS_API_KEY || 
             '';
    }
    return '';
  };

  // Fetch predictions from Google Places API
  const fetchPredictions = useCallback(async (input) => {
    const key = getApiKey();
    if (!key || !input || input.length < 2) {
      setPredictions([]);
      return;
    }

    setLoading(true);
    try {
      const sessionToken = sessionStorage.getItem('places_session_token') || 
                          Math.random().toString(36).substring(2);
      sessionStorage.setItem('places_session_token', sessionToken);

      const types = props.query?.types || 'address';
      const components = props.query?.components || 'country:ng';
      
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=${types}&components=${components}&key=${key}&sessiontoken=${sessionToken}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.predictions) {
        setPredictions(data.predictions.slice(0, 5));
        setShowDropdown(true);
      } else {
        setPredictions([]);
      }
    } catch (error) {
      console.warn('[GooglePlacesWeb] Fetch error:', error);
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
    const key = getApiKey();
    if (!key) return;

    setLoading(true);
    setShowDropdown(false);
    
    try {
      const sessionToken = sessionStorage.getItem('places_session_token') || '';
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&key=${key}&sessiontoken=${sessionToken}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.result) {
        const result = data.result;
        const location = result.geometry?.location;
        
        // Build data object compatible with react-native-google-places-autocomplete
        const details = {
          geometry: {
            location: {
              lat: location?.lat || 0,
              lng: location?.lng || 0,
            }
          },
          address_components: result.address_components || [],
          formatted_address: result.formatted_address || prediction.description,
          name: result.name || '',
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
      // Clear session token after selection
      sessionStorage.removeItem('places_session_token');
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

