import React from 'react';
import { View } from 'react-native';
import { cardStyles } from '../constants/styles';

/**
 * Reusable Card Component
 * Provides styled container with optional shadow
 */
const Card = ({
  children,
  variant = 'base', // 'base', 'baseLarge', 'elevated'
  style,
  ...props
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'baseLarge':
        return cardStyles.baseLarge;
      case 'elevated':
        return cardStyles.elevated;
      default:
        return cardStyles.base;
    }
  };

  return (
    <View style={[getVariantStyle(), style]} {...props}>
      {children}
    </View>
  );
};

export default Card;
