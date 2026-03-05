import React from 'react';
import { Pressable, Text, ActivityIndicator } from 'react-native';
import { buttonStyles } from '../constants/styles';
import { COLORS } from '../constants/theme';

/**
 * Reusable Button Component
 * Supports multiple variants and sizes
 */
const Button = ({
  onPress,
  children,
  variant = 'primary', // 'primary', 'secondary', 'tertiary'
  size = 'medium', // 'small', 'medium', 'large'
  disabled = false,
  loading = false,
  style,
  textStyle,
  ...props
}) => {
  // Get variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return [buttonStyles.secondary];
      case 'tertiary':
        return [buttonStyles.tertiary];
      default:
        return [buttonStyles.primary];
    }
  };

  // Get size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return [buttonStyles.small];
      case 'large':
        return [buttonStyles.large];
      default:
        // Medium is the default - uses primary/secondary/tertiary base styles
        return [];
    }
  };

  // Get text styles
  const getTextStyles = () => {
    switch (variant) {
      case 'secondary':
        return [buttonStyles.secondaryText];
      case 'tertiary':
        return [buttonStyles.tertiaryText];
      default:
        return [buttonStyles.primaryText];
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        ...getVariantStyles(),
        ...getSizeStyles(),
        disabled && buttonStyles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? COLORS.white : COLORS.primary}
          size="small"
        />
      ) : (
        <Text style={[...getTextStyles(), textStyle]}>{children}</Text>
      )}
    </Pressable>
  );
};

export default Button;
