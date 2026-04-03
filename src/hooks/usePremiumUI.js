import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { useSharedValue, withSpring, withTiming, useAnimatedStyle, interpolateColor } from 'react-native-reanimated';
import { Platform } from 'react-native';

/**
 * usePremiumUI - Global hook for high-end UI interactions
 * Provides standardized haptics and animation configs.
 */
export const usePremiumUI = () => {
  
  // Standardised Haptics (Premium Feedback)
  const triggerHaptic = useCallback((type = 'impactLight') => {
    if (Platform.OS === 'web') return;
    
    switch (type) {
      case 'impactLight':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'impactMedium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'impactHeavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'selection':
        Haptics.selectionAsync();
        break;
      default:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  // Standardised Spring Config for Premium Feel
  const springConfig = {
    damping: 15,
    stiffness: 120,
    mass: 1,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 2,
  };

  // Reusable Interaction Logic (e.g. Press Scale)
  const useInteractionScale = (initialScale = 1) => {
    const scale = useSharedValue(initialScale);
    
    const onPressIn = () => {
      scale.value = withSpring(0.96, springConfig);
      triggerHaptic('impactLight');
    };
    
    const onPressOut = () => {
      scale.value = withSpring(1, springConfig);
    };

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return { onPressIn, onPressOut, animatedStyle };
  };

  return {
    triggerHaptic,
    springConfig,
    useInteractionScale,
  };
};

export default usePremiumUI;
