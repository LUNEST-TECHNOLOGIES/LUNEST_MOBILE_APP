import React, { useState } from 'react';
import { View, TextInput, Text } from 'react-native';
import { inputStyles, textStyles } from '../constants/styles';
import { COLORS } from '../constants/theme';

/**
 * Reusable Input Component
 * Includes label, hint, and error states
 */
const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  hint,
  error,
  errorMessage,
  secureTextEntry = false,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  editable = true,
  style,
  placeholderTextColor = COLORS.gray[400],
  ...props
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[inputStyles.container, style]}>
      {label && <Text style={inputStyles.label}>{label}</Text>}
      {hint && <Text style={inputStyles.hint}>{hint}</Text>}
      <TextInput
        style={[
          inputStyles.input,
          focused && inputStyles.inputFocused,
          error && inputStyles.inputError,
          multiline && { height: numberOfLines * 50, textAlignVertical: 'top' },
        ]}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {errorMessage && (
        <Text style={[textStyles.caption, textStyles.error]}>
          {errorMessage}
        </Text>
      )}
    </View>
  );
};

export default Input;
