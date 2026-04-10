import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * ProfileSetupBanner Component
 * Shows a banner prompting users to complete their profile setup
 * Disappears after user completes profile setup
 * 
 * @param {function} onPress - Callback when banner is pressed
 * @param {function} onDismiss - Callback to dismiss the banner
 * @param {boolean} visible - Whether to show the banner
 */
const ProfileSetupBanner = ({ 
  onPress, 
  onDismiss,
  visible = true,
}) => {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;
  const isMediumScreen = width >= 375 && width < 414;
  
  // Responsive values
  const containerHeight = isSmallScreen ? 80 : isMediumScreen ? 86 : 92;
  const titleSize = isSmallScreen ? 14 : isMediumScreen ? 15 : 16;
  const subtitleSize = isSmallScreen ? 10 : isMediumScreen ? 11 : 12;
  const iconButtonSize = isSmallScreen ? 34 : isMediumScreen ? 37 : 40;
  const iconSize = isSmallScreen ? 20 : isMediumScreen ? 23 : 26;
  const paddingH = isSmallScreen ? 12 : isMediumScreen ? 14 : 16;

  if (!visible) return null;

  return (
    <Pressable
      style={({ pressed }) => [
        { height: containerHeight },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.bgContainer}>
        {/* Decorative shapes - top right */}
        <View style={styles.decorativeContainer} pointerEvents="none">
          <View style={[styles.decorativeShape, styles.shape1]} />
          <View style={[styles.decorativeShape, styles.shape2]} />
          <View style={[styles.decorativeShape, styles.shape3]} />
        </View>

        {/* Decorative shapes - bottom left */}
        <View style={styles.decorativeContainerBottom} pointerEvents="none">
          <View style={[styles.decorativeShape, styles.shape4]} />
          <View style={[styles.decorativeShape, styles.shape5]} />
          <View style={[styles.decorativeShape, styles.shape6]} />
        </View>

        {/* Content */}
        <View style={[styles.content, { paddingHorizontal: paddingH }]}> 
          <View style={styles.textContainer}>
            <Text style={[styles.title, { fontSize: titleSize }]}>Finish profile setup</Text>
            <Text style={[styles.subtitle, { fontSize: subtitleSize }]}>We&apos;ll help you get back in.</Text>
          </View>

          {/* Action Button */}
          <View style={[styles.iconButton, { width: iconButtonSize, height: iconButtonSize, borderRadius: iconButtonSize / 2 }]}> 
            <Ionicons name="person-outline" size={iconSize} color="#000000" />
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  bgContainer: {
    width: '100%',
    backgroundColor: '#80BA8B',
    borderRadius: 15,
    overflow: 'hidden',
    position: 'relative',
    // iOS shadow for visibility
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    // Android shadow
    elevation: 2,
    flex: 1,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
  decorativeContainer: {
    position: 'absolute',
    top: -4,
    right: 0,
    width: 140,
    height: 100,
  },
  decorativeContainerBottom: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    width: 140,
    height: 100,
    transform: [{ rotate: '180deg' }],
  },
  decorativeShape: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: 'transparent',
  },
  shape1: {
    width: 128,
    height: 92,
    right: -70,
    top: 0,
    transform: [{ rotate: '4deg' }],
  },
  shape2: {
    width: 88,
    height: 76,
    right: -50,
    top: 4,
    transform: [{ rotate: '-1deg' }],
  },
  shape3: {
    width: 49,
    height: 58,
    right: -20,
    top: 6,
    transform: [{ rotate: '-4deg' }],
  },
  shape4: {
    width: 128,
    height: 92,
    right: -70,
    top: 0,
    transform: [{ rotate: '4deg' }],
  },
  shape5: {
    width: 88,
    height: 76,
    right: -50,
    top: 4,
    transform: [{ rotate: '-1deg' }],
  },
  shape6: {
    width: 49,
    height: 58,
    right: -20,
    top: 6,
    transform: [{ rotate: '-4deg' }],
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  textContainer: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: 3,
    flex: 1,
  },
  title: {
    color: 'white',
    fontWeight: '700',
  },
  subtitle: {
    color: 'white',
    fontWeight: '400',
  },
  iconButton: {
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProfileSetupBanner;
