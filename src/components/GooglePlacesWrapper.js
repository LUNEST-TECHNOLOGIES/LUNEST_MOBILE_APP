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
    const [webText, setWebText] = React.useState(props.textInputProps?.value || '');
    const { TextInput, View } = require('react-native');

    // Sync state with props.value if it changes
    React.useEffect(() => {
      if (props.textInputProps?.value !== undefined) {
        setWebText(props.textInputProps.value);
      }
    }, [props.textInputProps?.value]);

    React.useImperativeHandle(ref, () => ({
      setAddressText: (text) => setWebText(text || ''),
      getAddressText: () => webText,
    }));

    return (
      <View style={props.styles?.container}>
        <TextInput
          {...props.textInputProps}
          value={webText}
          onChangeText={(text) => {
            setWebText(text);
            if (props.textInputProps?.onChangeText) {
              props.textInputProps.onChangeText(text);
            }
          }}
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
