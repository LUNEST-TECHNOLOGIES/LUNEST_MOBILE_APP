/**
 * Toast Notification Component
 * Shows temporary success/error messages
 */

import { useEffect, useRef } from 'react';
import {
    Animated,
    Platform,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

// Toast types
export const TOAST_TYPE = {
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  INFO: 'INFO',
};

// Icons
const SuccessIcon = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="#31EB3D" />
    <Path
      d="M8 12L11 15L16 9"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ErrorIcon = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="#FD3131" />
    <Path
      d="M8 8L16 16M16 8L8 16"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const WarningIcon = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="#FDAE31" />
    <Path d="M12 7V13" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
    <Circle cx="12" cy="17" r="1" fill="#FFFFFF" />
  </Svg>
);

const InfoIcon = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="#007BFF" />
    <Path d="M12 11V17" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
    <Circle cx="12" cy="7" r="1" fill="#FFFFFF" />
  </Svg>
);

const getConfig = (type) => {
  switch (type) {
    case TOAST_TYPE.SUCCESS:
      return {
        icon: <SuccessIcon />,
        bgColor: 'rgba(49, 235, 61, 0.1)',
        borderColor: '#31EB3D',
        textColor: '#1B8A22',
      };
    case TOAST_TYPE.ERROR:
      return {
        icon: <ErrorIcon />,
        bgColor: 'rgba(253, 49, 49, 0.1)',
        borderColor: '#FD3131',
        textColor: '#B91C1C',
      };
    case TOAST_TYPE.WARNING:
      return {
        icon: <WarningIcon />,
        bgColor: 'rgba(253, 174, 49, 0.1)',
        borderColor: '#FDAE31',
        textColor: '#92400E',
      };
    case TOAST_TYPE.INFO:
    default:
      return {
        icon: <InfoIcon />,
        bgColor: 'rgba(0, 123, 255, 0.1)',
        borderColor: '#007BFF',
        textColor: '#1D4ED8',
      };
  }
};

/**
 * Toast Notification Component
 * @param {boolean} visible - Show/hide toast
 * @param {string} type - TOAST_TYPE value
 * @param {string} message - Message to display
 * @param {number} duration - Auto-hide duration in ms (default: 3000)
 * @param {function} onHide - Called when toast hides
 */
const ToastNotification = ({ 
  visible, 
  type = TOAST_TYPE.SUCCESS, 
  message,
  duration = 3000,
  onHide,
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show toast
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide && onHide();
    });
  };

  if (!visible) return null;

  const config = getConfig(type);

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        {config.icon}
      </View>
      <Text style={[styles.message, { color: config.textColor }]}>
        {message}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 99999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 50, // High elevation to overlay modals
  },
  iconContainer: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    
    lineHeight: 20,
  },
});

export default ToastNotification;
