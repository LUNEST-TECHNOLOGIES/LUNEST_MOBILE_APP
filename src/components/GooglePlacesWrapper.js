import React from 'react';
import { Platform } from 'react-native';
import { GooglePlacesAutocomplete as GoogleAutocomplete } from 'react-native-google-places-autocomplete';

/**
 * GooglePlacesWrapper
 * Wraps the GooglePlacesAutocomplete library to provide a consistent interface
 * and safe web fallback if needed.
 */
export const GooglePlacesAutocomplete = React.forwardRef((props, ref) => {
  if (Platform.OS === 'web') {
    // Current web fallback (standard search input)
    const { TextInput, View } = require('react-native');
    return (
      <View style={props.styles?.container}>
        <TextInput
          ref={ref}
          {...props.textInputProps}
          placeholder={props.placeholder}
          style={[props.textInputProps?.style, { height: 50, backgroundColor: '#FAFAFA' }]}
        />
      </View>
    );
  }

  // Native Implementation
  return (
    <GoogleAutocomplete
      ref={ref}
      {...props}
    />
  );
});
