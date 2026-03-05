/**
 * Host Request Pending Screen
 * Shown after user submits the landlord request form
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';

/**
 * Success/Checkmark Icon
 */
const SuccessIcon = ({ size = 60, color = '#4CAF50' }) => (
  <Svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <Circle cx="30" cy="30" r="28" stroke={color} strokeWidth="4" fill="none" />
    <Path
      d="M18 30L26 38L42 22"
      stroke={color}
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const HostRequestPending = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const containerWidth = Math.min(width - 80, 320);

  const handleBackToProfile = () => {
    router.replace('/(tabs)/profile');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <SuccessIcon size={50} color="#4CAF50" />
          </View>
        </View>

        {/* Message */}
        <View style={[styles.messageContainer, { width: containerWidth }]}>
          <Text style={styles.title}>Thanks for Submitting!</Text>
          <Text style={styles.subtitle}>
            Our team will review your details and get back to you within 24–48 hours.
          </Text>
        </View>

        {/* Back to Profile Button */}
        <TouchableOpacity
          style={[styles.button, { width: containerWidth + 40 }]}
          onPress={handleBackToProfile}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Back to Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    marginBottom: 30,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageContainer: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 40,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    
    color: '#010135',
    textAlign: 'center',
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    
    color: '#010135',
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    height: 54,
    backgroundColor: '#010135',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    
    color: '#FFFFFF',
    lineHeight: 16,
  },
});

export default HostRequestPending;
