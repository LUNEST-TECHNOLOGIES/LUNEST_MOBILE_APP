import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Animated,
  PanResponder,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ConfirmBookingModal = ({
  visible,
  onClose,
  onConfirm,
  bookingDetails,
  pricing,
}) => {
  const insets = useSafeAreaInsets();
  
  // Animation and Gestures for Swipe-to-Close
  const panY = useRef(new Animated.Value(0)).current;
  
  const resetPositionAnim = Animated.timing(panY, {
    toValue: 0,
    duration: 300,
    useNativeDriver: true,
  });

  const closeAnim = Animated.timing(panY, {
    toValue: SCREEN_HEIGHT,
    duration: 300,
    useNativeDriver: true,
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          closeAnim.start(onClose);
        } else {
          resetPositionAnim.start();
        }
      },
    })
  ).current;

  // Reset pan position when modal becomes visible
  useEffect(() => {
    if (visible) {
      panY.setValue(0);
    }
  }, [visible, panY]);

  const formatCurrency = (amount) => {
    return `₦${Number(amount || 0).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.modalContainer,
            { 
              paddingBottom: Math.max(insets.bottom, 20),
              transform: [{ translateY: panY }] 
            }
          ]}
        >
          {/* Swipe Handle & Gesture Area for Mobile */}
          {Platform.OS !== 'web' ? (
            <View {...panResponder.panHandlers} style={styles.gestureArea}>
              <View style={styles.swipeHandle} />
            </View>
          ) : null}

          <View style={styles.header}>
            <Text style={styles.title}>Confirm Your Booking</Text>
            <Pressable 
              onPress={onClose} 
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
          </View>

          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContentContainer}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Property Details</Text>
              <Text style={styles.propertyName}>{bookingDetails.propertyName}</Text>
              <View style={styles.row}>
                <Ionicons name="location-outline" size={14} color="#6B7280" />
                <Text style={styles.locationText}>{bookingDetails.location}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stay Information</Text>
              <View style={styles.stayRow}>
                <View style={styles.stayItem}>
                  <Text style={styles.stayLabel}>Check-in</Text>
                  <Text style={styles.stayValue}>{bookingDetails.checkIn}</Text>
                </View>
                <View style={styles.stayItem}>
                  <Text style={styles.stayLabel}>Check-out</Text>
                  <Text style={styles.stayValue}>{bookingDetails.checkOut}</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Summary</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Subtotal</Text>
                <Text style={styles.priceValue}>{formatCurrency(pricing.subtotal)}</Text>
              </View>
              
              {pricing.serviceCharge > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Service Charge</Text>
                  <Text style={styles.priceValue}>{formatCurrency(pricing.serviceCharge)}</Text>
                </View>
              )}

              {pricing.appCharge > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>App Fee & VAT</Text>
                  <Text style={styles.priceValue}>{formatCurrency(pricing.appCharge)}</Text>
                </View>
              )}

              {pricing.securityDeposit > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Security Deposit (Refundable)</Text>
                  <Text style={styles.priceValue}>{formatCurrency(pricing.securityDeposit)}</Text>
                </View>
              )}

              {pricing.couponDiscount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: '#10B981' }]}>Coupon Discount</Text>
                  <Text style={[styles.priceValue, { color: '#10B981' }]}>-{formatCurrency(pricing.couponDiscount)}</Text>
                </View>
              )}

              <View style={[styles.priceRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total to Pay</Text>
                <Text style={styles.totalValue}>{formatCurrency(pricing.total)}</Text>
              </View>
            </View>

            <View style={styles.noticeBox}>
              <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
              <Text style={styles.noticeText}>
                By clicking "Confirm", you agree to our booking policies and house rules.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Back</Text>
            </Pressable>
            <Pressable style={styles.confirmButton} onPress={onConfirm}>
              <Text style={styles.confirmButtonText}>
                {pricing.total === 0 ? "Confirm Booking" : "Confirm & Pay"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: 'center',
  },
  modalContainer: {
    width: Platform.OS === 'web' ? '95%' : '100%',
    maxWidth: Platform.OS === 'web' ? 500 : '100%',
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: Platform.OS === 'web' ? 24 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 24 : 0,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'web' ? 24 : 12,
    paddingBottom: 40,
    maxHeight: Platform.OS === 'web' ? '90%' : '95%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 20,
  },
  gestureArea: {
    width: '100%',
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  swipeHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  content: {
    flexGrow: 0,
  },
  scrollContentContainer: {
    paddingBottom: 10,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stayItem: {
    flex: 1,
  },
  stayLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  stayValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 15,
    color: '#4B5563',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  totalRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#010135',
  },
  noticeBox: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 10,
  },
  noticeText: {
    fontSize: 12,
    color: '#1E40AF',
    flex: 1,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#010135',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});

export default ConfirmBookingModal;
