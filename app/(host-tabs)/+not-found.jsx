/**
 * Host Tabs Not Found Screen
 * Handles routing errors within the Host (host-tabs) navigation
 * 
 * Ensures users stay in Host mode when a routing error occurs.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

// Warning Icon
const WarningIcon = ({ size = 60, color = '#FD3131' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64 18.3 1.55 18.64 1.55 19C1.55 19.36 1.64 19.7 1.82 20C2 20.3 2.27 20.56 2.59 20.73C2.91 20.91 3.27 21 3.64 21H20.36C20.73 21 21.09 20.91 21.41 20.73C21.73 20.56 22 20.3 22.18 20C22.36 19.7 22.45 19.36 22.45 19C22.45 18.64 22.36 18.3 22.18 18L13.71 3.86C13.53 3.56 13.26 3.32 12.94 3.15C12.62 2.98 12.26 2.89 11.89 2.89C11.52 2.89 11.16 2.98 10.84 3.15C10.52 3.32 10.25 3.56 10.07 3.86H10.29Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Home Icon
const HomeIcon = ({ size = 20, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 20.0391 3 20.5304 3 20V9Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 22V12H15V22"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Arrow Left Icon
const ArrowLeftIcon = ({ size = 20, color = '#010135' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 12H5M5 12L12 19M5 12L12 5"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default function HostTabsNotFoundScreen() {
  const router = useRouter();

  // Navigate to Host dashboard
  const handleGoHome = () => {
    router.replace('/(host-tabs)');
  };

  // Try to go back within Host mode
  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Can't go back, go to Host dashboard
      handleGoHome();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Warning Icon */}
        <View style={styles.iconContainer}>
          <WarningIcon size={60} color="#FD3131" />
        </View>

        {/* Title */}
        <Text style={styles.title}>Page Not Found</Text>

        {/* Description */}
        <Text style={styles.description}>
          This page doesn't exist. Let's get you back on track.
        </Text>

        {/* Mode indicator */}
        <View style={styles.modeIndicator}>
          <Text style={styles.modeText}>
            You're in <Text style={styles.modeBold}>Host/Landlord Mode</Text>
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {/* Go Back Button */}
          <TouchableOpacity style={styles.secondaryButton} onPress={handleGoBack}>
            <ArrowLeftIcon size={18} color="#010135" />
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </TouchableOpacity>

          {/* Go to Dashboard Button */}
          <TouchableOpacity style={styles.primaryButton} onPress={handleGoHome}>
            <HomeIcon size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Go to Host Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    fontWeight: '400',
    
    color: '#656565',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  modeIndicator: {
    backgroundColor: '#FFF5E5',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  modeText: {
    fontSize: 14,
    
    color: '#656565',
  },
  modeBold: {
    fontWeight: '700',
    color: '#FDAE31',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#010135',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#010135',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    
    color: '#010135',
  },
});
