import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

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
 * Clock/Pending Icon
 */
const ClockIcon = ({ size = 16, color = '#F59E0B' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
    <Path
      d="M12 7V12L15 15"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Host Application Status Types
 */
export const HOST_APPLICATION_STATUS = {
  NONE: 'NONE',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

/**
 * Switch to Host Button Component
 * Shows different states based on host application status:
 * - APPROVED: Active "Switch to Host" button
 * - PENDING: Disabled "Host Application in Review" button
 * - REJECTED: "Reapply for Host" button
 * - NONE: Hidden (show BecomeHostCard instead)
 */
const SwitchToHostButton = ({ onPress, status = HOST_APPLICATION_STATUS.APPROVED, onReapply }) => {
  const { width } = useWindowDimensions();
  const containerWidth = Math.min(width - 40, 400);

  // Don't render if status is NONE
  if (status === HOST_APPLICATION_STATUS.NONE) {
    return null;
  }

  // Pending state - disabled button
  if (status === HOST_APPLICATION_STATUS.PENDING) {
    return (
      <View style={[styles.container, styles.pendingContainer, { width: containerWidth }]}>
        <View style={styles.content}>
          <ClockIcon size={16} color="#F59E0B" />
          <Text style={[styles.buttonText, styles.pendingText]}>Host Application in Review</Text>
        </View>
      </View>
    );
  }

  // Rejected state - reapply button
  if (status === HOST_APPLICATION_STATUS.REJECTED) {
    return (
      <TouchableOpacity 
        style={[styles.container, styles.rejectedContainer, { width: containerWidth }]}
        onPress={onReapply || onPress}
        activeOpacity={0.8}
      >
        <View style={styles.content}>
          <Text style={[styles.buttonText, styles.rejectedText]}>Reapply to Become a Host</Text>
          <ArrowRightIcon size={14} color="#DC2626" />
        </View>
      </TouchableOpacity>
    );
  }

  // Approved state - active switch button
  return (
    <TouchableOpacity 
      style={[styles.container, { width: containerWidth }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <Text style={styles.buttonText}>Switch to Host</Text>
        <ArrowRightIcon size={14} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 44,
    backgroundColor: '#010135',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  pendingContainer: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  rejectedContainer: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    
    color: '#FFFFFF',
    lineHeight: 18,
  },
  pendingText: {
    color: '#92400E',
  },
  rejectedText: {
    color: '#DC2626',
  },
});

export default SwitchToHostButton;
