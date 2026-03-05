import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Arrow Right Icon
 */
const ArrowRightIcon = ({ size = 14, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 12H19M19 12L12 5M19 12L12 19"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Become A Host Card Component
 * Promotional banner for hosting
 */
const BecomeHostCard = ({ onStartHosting }) => {
  const { width } = useWindowDimensions();
  const containerWidth = Math.min(width - 40, 400);

  return (
    <View style={[styles.container, { width: containerWidth }]}>
      {/* Text Content */}
      <View style={styles.textContent}>
        <Text style={styles.title}>Become a Host</Text>
        <Text style={styles.description}>
          Share your home with verified guests and unlock new earning opportunities.
        </Text>
      </View>

      {/* Start Hosting Button */}
      <TouchableOpacity 
        style={styles.button}
        onPress={onStartHosting}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Start Hosting</Text>
        <ArrowRightIcon size={16} />
      </TouchableOpacity>

      {/* Decorative Image (positioned absolutely) */}
      <View style={styles.imageContainer}>
        {/* You can replace this with an actual image */}
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imageEmoji}>🏠</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#010135',
    borderRadius: 10,
    padding: 20,
    paddingBottom: 16,
    overflow: 'hidden',
    minHeight: 153,
    position: 'relative',
  },
  textContent: {
    maxWidth: '75%',
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    
    color: '#FFFFFF',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    
    color: '#D0E1FF',
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6371F1',
    borderRadius: 11,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    
    color: '#FFFFFF',
    lineHeight: 16,
  },
  imageContainer: {
    position: 'absolute',
    top: 17,
    right: 15,
    width: 48,
    height: 85,
  },
  imagePlaceholder: {
    width: 48,
    height: 85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageEmoji: {
    fontSize: 32,
  },
});

export default BecomeHostCard;
