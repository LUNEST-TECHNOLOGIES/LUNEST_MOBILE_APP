import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ConfirmBookingModal = ({
  visible,
  onClose,
  onConfirm,
  bookingDetails,
  pricing,
}) => {
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
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Confirm Your Booking</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#374151" />
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: SCREEN_WIDTH * 0.9,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
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
    padding: 4,
  },
  content: {
    flexGrow: 0,
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
