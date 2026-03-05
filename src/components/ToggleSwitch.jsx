import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

/**
 * ToggleSwitch Component
 * An animated on/off toggle switch
 * 
 * @param {boolean} value - Current toggle state
 * @param {function} onValueChange - Callback when toggle changes
 * @param {boolean} disabled - Whether the toggle is disabled
 * @param {string} size - Toggle size: 'small', 'medium' (default), 'large'
 */
const ToggleSwitch = ({ 
  value = false, 
  onValueChange, 
  disabled = false,
  size = 'medium',
}) => {
  // Calculate dimensions based on size
  const sizeConfig = {
    small: {
      width: 48,
      height: 32,
      knobWidth: 27,
      knobHeight: 27,
      translateXOn: 17,
      translateXOff: 2,
      checkmarkSize: 14,
      borderRadius: 20,
    },
    medium: {
      width: 65,
      height: 44,
      knobWidth: 38,
      knobHeight: 38,
      translateXOn: 24,
      translateXOff: 3,
      checkmarkSize: 22,
      borderRadius: 30,
    },
    large: {
      width: 80,
      height: 54,
      knobWidth: 46,
      knobHeight: 46,
      translateXOn: 30,
      translateXOff: 4,
      checkmarkSize: 24,
      borderRadius: 35,
    },
  };

  const config = sizeConfig[size] || sizeConfig.medium;
  const translateX = useRef(new Animated.Value(value ? config.translateXOn : config.translateXOff)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: value ? config.translateXOn : config.translateXOff,
      useNativeDriver: true,
      damping: 15,
      stiffness: 120,
    }).start();
  }, [value, config.translateXOn, config.translateXOff]);

  const handlePress = () => {
    if (!disabled && onValueChange) {
      onValueChange(!value);
    }
  };

  return (
    <Pressable 
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.container,
        {
          width: config.width,
          height: config.height,
          borderRadius: config.borderRadius,
        },
        value ? styles.containerOn : styles.containerOff,
        disabled && styles.containerDisabled,
        pressed && !disabled && styles.containerPressed,
      ]}
    >
      <Animated.View 
        style={[
          styles.knob,
          {
            width: config.knobWidth,
            height: config.knobHeight,
            borderRadius: config.knobWidth / 2,
            transform: [{ translateX }],
          },
        ]}
      >
        {value && (
          <Ionicons name="checkmark" size={config.checkmarkSize} color="#010135" />
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },
  containerOn: {
    backgroundColor: '#010135',
    borderColor: '#010135',
  },
  containerOff: {
    backgroundColor: '#CCCCCC',
    borderColor: '#999999',
  },
  containerDisabled: {
    opacity: 0.5,
  },
  containerPressed: {
    opacity: 0.8,
  },
  knob: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
});

export default ToggleSwitch;
