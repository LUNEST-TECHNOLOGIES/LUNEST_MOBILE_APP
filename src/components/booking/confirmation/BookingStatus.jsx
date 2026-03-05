import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const BookingStatus = ({ status }) => {
  const getStatusColors = () => {
    const normalizedStatus = status ? status.toLowerCase() : 'confirmed';
    switch(normalizedStatus) {
      case 'confirmed':
        return { bgColor: 'rgba(49, 235, 61, 0.3)', textColor: '#2e7d32' };
      case 'reserved':
        return { bgColor: 'rgba(255, 152, 0, 0.3)', textColor: '#e65100' };
      case 'pending':
        return { bgColor: 'rgba(33, 150, 243, 0.3)', textColor: '#1565c0' };
      case 'completed':
        return { bgColor: 'rgba(49, 235, 61, 0.3)', textColor: '#2e7d32' };
      case 'cancelled':
        return { bgColor: 'rgba(244, 67, 54, 0.3)', textColor: '#c62828' };
      default:
        return { bgColor: 'rgba(49, 235, 61, 0.3)', textColor: '#2e7d32' };
    }
  };

  const colors = getStatusColors();

  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>Booking Status</Text>
      <View style={[styles.statusBadge, { backgroundColor: colors.bgColor }]}>
        <Text style={[styles.statusText, { color: colors.textColor }]}>{status}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  statusBadge: {
    backgroundColor: 'rgba(49, 235, 61, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    
    color: '#2e7d32',
    textAlign: 'left',
  },
});

export default BookingStatus;
