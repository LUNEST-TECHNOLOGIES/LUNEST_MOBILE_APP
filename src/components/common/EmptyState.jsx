import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { 
  FadeInDown, 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing 
} from 'react-native-reanimated';
import { MdSearchOff } from 'react-icons/md'; // Fallback icon
import { usePremiumUI } from '../../hooks/usePremiumUI';

/**
 * EmptyState - A premium full-page empty state component
 * Includes floating animations and Call to Action (CTA) buttons.
 */
const EmptyState = ({ 
  title = "No Listings Found", 
  message = "Try adjusting your filters or check back later.",
  icon: IconComponent,
  buttonTitle,
  onPress,
}) => {
  const { triggerHaptic } = usePremiumUI();
  const floatAnim = useSharedValue(0);

  // Floating effect for the icon
  React.useEffect(() => {
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2000, easing: Easing.bezier(0.445, 0.05, 0.55, 0.95) }),
        withTiming(0, { duration: 2000, easing: Easing.bezier(0.445, 0.05, 0.55, 0.95) })
      ),
      -1, // Infinite
      true // Reverse
    );
  }, []);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatAnim.value }],
  }));

  const handlePress = () => {
    triggerHaptic('impactMedium');
    if (onPress) onPress();
  };

  return (
    <View style={styles.container}>
      {/* Animated Icon Placeholder */}
      <Animated.View 
        entering={FadeInDown.delay(200).duration(800)}
        style={[styles.iconContainer, animatedIconStyle]}
      >
        {IconComponent ? (
          <IconComponent size={80} color="#010135" opacity={0.1} />
        ) : (
          <View style={styles.placeholderCircle} />
        )}
      </Animated.View>

      {/* Text Content */}
      <Animated.Text 
        entering={FadeInDown.delay(400).duration(800)}
        style={styles.title}
      >
        {title}
      </Animated.Text>
      
      <Animated.Text 
        entering={FadeInDown.delay(600).duration(800)}
        style={styles.message}
      >
        {message}
      </Animated.Text>

      {/* Optional CTA Button */}
      {buttonTitle && (
        <Animated.View entering={FadeInDown.delay(800).duration(800)}>
          <TouchableOpacity 
            onPress={handlePress}
            style={styles.button}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{buttonTitle}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 100,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  iconContainer: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F0F0',
    opacity: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#010135',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Aeonik-Bold',
  },
  message: {
    fontSize: 16,
    color: '#6D6D6D',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    fontFamily: 'Aeonik-Regular',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: '#010135',
    borderRadius: 30,
    shadowColor: '#010135',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Aeonik-Bold',
  },
});

export default EmptyState;
