import React from 'react';
import { TextInput, View } from 'react-native';

// Web fallback: export a functional component stub so location.jsx doesn't crash
// On web, we'll render a standard TextInput that mimics the basic interface
export const GooglePlacesAutocomplete = React.forwardRef((props, ref) => {
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
});
