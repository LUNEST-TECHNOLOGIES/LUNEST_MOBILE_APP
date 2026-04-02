/**
 * Booking Action Confirmation Modal
 * Shows confirmation dialog for booking actions (confirm, cancel)
 * Includes toast notification on success
 */

import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

// Action types
export const BOOKING_ACTION = {
  CONFIRM: 'CONFIRM',
  CANCEL: 'CANCEL',
};

// Icons
const CheckIcon = ({ size = 48, color = '#31EB3D' }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <Circle cx="24" cy="24" r="22" stroke={color} strokeWidth={2} fill={`${color}15`} />
    <Path
      d="M14 24L21 31L34 18"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CloseIcon = ({ size = 48, color = '#FD3131' }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <Circle cx="24" cy="24" r="22" stroke={color} strokeWidth={2} fill={`${color}15`} />
    <Path
      d="M16 16L32 32M32 16L16 32"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const WarningIcon = ({ size = 48, color = '#FDAE31' }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <Circle cx="24" cy="24" r="22" stroke={color} strokeWidth={2} fill={`${color}15`} />
    <Path d="M24 16V28" stroke={color} strokeWidth={3} strokeLinecap="round" />
    <Circle cx="24" cy="34" r="2" fill={color} />
  </Svg>
);

/**
 * Booking Action Modal
 * @param {boolean} visible - Modal visibility
 * @param {string} actionType - BOOKING_ACTION.CONFIRM or BOOKING_ACTION.CANCEL
 * @param {object} booking - Booking data
 * @param {function} onConfirm - Called when action is confirmed
 * @param {function} onClose - Called when modal is closed
 * @param {boolean} isLoading - Loading state during action
 */
const BookingActionModal = ({ 
  visible, 
  actionType, 
  booking, 
  onConfirm, 
  onClose,
  isLoading = false,
}) => {
  const isConfirmAction = actionType === BOOKING_ACTION.CONFIRM;

  const getContent = () => {
    if (isConfirmAction) {
      return {
        icon: <CheckIcon />,
        title: 'Confirm Booking?',
        message: `Are you sure you want to confirm the booking from ${booking?.guestName || 'guest'}? This will notify the guest that their booking has been accepted.`,
        confirmText: 'Yes, Confirm',
        confirmColor: '#31EB3D',
        confirmBg: 'rgba(49, 235, 61, 0.1)',
      };
    } else {
      return {
        icon: <CloseIcon />,
        title: 'Cancel Booking?',
        message: `Are you sure you want to cancel the booking from ${booking?.guestName || 'guest'}? This action cannot be undone and the guest will be notified.`,
        confirmText: 'Yes, Cancel Booking',
        confirmColor: '#FD3131',
        confirmBg: 'rgba(253, 49, 49, 0.1)',
      };
    }
  };

  const content = getContent();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            {content.icon}
          </View>

          {/* Title */}
          <Text style={styles.title}>{content.title}</Text>

          {/* Message */}
          <Text style={styles.message}>{content.message}</Text>

          {/* Booking Details */}
          {booking && (
            <View style={styles.bookingInfo}>
              <Text style={styles.bookingId}>{booking.bookingId}</Text>
              <Text style={styles.propertyName}>{booking.propertyName}</Text>
              <Text style={styles.dates}>{booking.dates}</Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>No, Go Back</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.confirmButton, 
                { backgroundColor: content.confirmBg, borderColor: content.confirmColor }
              ]}
              onPress={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={content.confirmColor} />
              ) : (
                <Text style={[styles.confirmButtonText, { color: content.confirmColor }]}>
                  {content.confirmText}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  bookingInfo: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 20,
  },
  bookingId: {
    fontSize: 12,
    
    color: '#999999',
    marginBottom: 4,
  },
  propertyName: {
    fontSize: 14,
    fontWeight: '500',
    
    color: '#000000',
    marginBottom: 4,
  },
  dates: {
    fontSize: 12,
    
    color: '#666666',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    
    color: '#666666',
  },
  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    
  },
});

export default BookingActionModal;
