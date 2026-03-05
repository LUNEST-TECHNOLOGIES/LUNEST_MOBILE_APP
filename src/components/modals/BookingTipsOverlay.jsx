/**
 * Booking Tips Overlay Modal
 * Shows helpful tips for managing bookings
 * Displayed when host clicks on Tips button in bookings screen
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Import done/check icon (same as VerifiedInfoOverlay)
import DoneV2Icon from '../../assets/icons/done-v.svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Close Icon
const CloseIcon = ({ size = 24, color = '#292929' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6L18 18"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const BookingTipsOverlay = ({ visible, onClose }) => {
  const tips = [
    'Approve bookings quickly to build trust.',
    'Enable instant booking for verified users',
    'Set check-in/out reminders',
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <View style={styles.container}>
          {/* Close Button */}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <CloseIcon size={24} color="#292929" />
          </Pressable>

          {/* Title */}
          <Text style={styles.title}>Booking Tips?</Text>

          {/* Tips List */}
          <View style={styles.tipsContainer}>
            {tips.map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <View style={styles.iconContainer}>
                  <DoneV2Icon width={18} height={18} />
                </View>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 23,
    paddingBottom: 40,
    minHeight: 190,
  },
  closeButton: {
    position: 'absolute',
    top: 21,
    right: 20,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    
    color: '#000000',
    textAlign: 'center',
    marginBottom: 40,
  },
  tipsContainer: {
    gap: 15,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 18,
    height: 18,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: {
    fontSize: 14,
    fontWeight: '500',
    
    color: '#292929',
    textAlign: 'left',
    flex: 1,
  },
});

export default BookingTipsOverlay;
