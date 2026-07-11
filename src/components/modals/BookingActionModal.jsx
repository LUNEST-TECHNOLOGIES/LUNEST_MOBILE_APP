/**
 * Booking Action Confirmation Modal
 * Shows confirmation dialog for booking actions (confirm, cancel)
 * Includes toast notification on success
 */

import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
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
 * @param {boolean} isHost - Determines the role canceling the booking (for reason lists)
 */
const BookingActionModal = ({ 
  visible, 
  actionType, 
  booking, 
  onConfirm, 
  onClose,
  isLoading = false,
  isHost = false,
}) => {
  const isConfirmAction = actionType === BOOKING_ACTION.CONFIRM;
  const [selectedReason, setSelectedReason] = useState('');
  const [customNote, setCustomNote] = useState('');

  const GUEST_REASONS = [
    'Change of plans',
    'Found a better accommodation',
    'Travel dates changed',
    'Health or personal emergency',
    'Other'
  ];

  const HOST_REASONS = [
    'Property unavailable',
    'Maintenance or repair issues',
    'Guest violated terms',
    'Other'
  ];

  const reasons = isHost ? HOST_REASONS : GUEST_REASONS;

  useEffect(() => {
    if (visible) {
      setSelectedReason('');
      setCustomNote('');
    }
  }, [visible]);

  const handleConfirm = () => {
    if (isConfirmAction) {
      onConfirm();
    } else {
      if (!selectedReason) return;
      onConfirm({
        cancelReason: selectedReason,
        cancelNote: customNote.trim(),
      });
    }
  };

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
      const isNonRefundable = booking?.listing?.acceptRefund === false;
      const baseMessage = isNonRefundable 
        ? "Important: This listing is non-refundable. If you cancel, no refund will be issued."
        : `Are you sure you want to cancel the booking from ${booking?.guestName || booking?.bookedBy?.fullName || 'guest'}? This action cannot be undone and the party will be notified.`;

      return {
        icon: <CloseIcon />,
        title: 'Cancel Booking?',
        message: isNonRefundable ? `${baseMessage} Do you still wish to proceed?` : baseMessage,
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

          {/* Cancellation Reasons Input */}
          {!isConfirmAction && (
            <View style={styles.reasonContainer}>
              <Text style={styles.sectionLabel}>Reason for cancellation</Text>
              <View style={styles.reasonsGrid}>
                {reasons.map((r) => {
                  const isSelected = selectedReason === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.reasonChip,
                        isSelected && styles.reasonChipSelected
                      ]}
                      onPress={() => setSelectedReason(r)}
                    >
                      <Text style={[
                        styles.reasonChipText,
                        isSelected && styles.reasonChipTextSelected
                      ]}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionLabel}>Additional comments (optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Provide details..."
                placeholderTextColor="#999999"
                value={customNote}
                onChangeText={setCustomNote}
                multiline
                numberOfLines={3}
              />
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
                { backgroundColor: content.confirmBg, borderColor: content.confirmColor },
                (!isConfirmAction && !selectedReason) && styles.confirmButtonDisabled
              ]}
              onPress={handleConfirm}
              disabled={isLoading || (!isConfirmAction && !selectedReason)}
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
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  reasonContainer: {
    width: '100%',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'left',
    width: '100%',
  },
  reasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  reasonChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F9F9F9',
  },
  reasonChipSelected: {
    borderColor: '#FD3131',
    backgroundColor: 'rgba(253, 49, 49, 0.08)',
  },
  reasonChipText: {
    fontSize: 11,
    color: '#666666',
  },
  reasonChipTextSelected: {
    color: '#FD3131',
    fontWeight: '600',
  },
  textInput: {
    width: '100%',
    height: 54,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#333333',
    textAlignVertical: 'top',
  },
});

export default BookingActionModal;
