import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import CalendarIcon from '../../../assets/icons/bookings/calendar.svg';

const BookingDetails = ({ bookingData }) => {
  // Calendar Icon Component
  const CalendarIconComponent = () => {
    return <CalendarIcon width={18} height={18} color="#656565" />;
  };

  return (
    <View style={styles.detailsContainer}>
      {/* Property Name */}
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Property name:</Text>
        <Text style={styles.detailValue} numberOfLines={1}>
          {bookingData.propertyName}
        </Text>
      </View>

      {/* Booking Type */}
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Booking Type:</Text>
        <Text style={styles.detailValue}>{bookingData.bookingType}</Text>
      </View>

      {/* Check-in / Check-out */}
      <View style={styles.dateRow}>
        {/* Check In */}
        <View style={styles.dateItem}>
          <View style={styles.dateLabelRow}>
            <CalendarIconComponent />
            <Text style={styles.dateLabel}>Check in</Text>
          </View>
          <Text style={styles.dateValue}>{bookingData.checkIn}</Text>
        </View>

        {/* Check Out */}
        <View style={styles.dateItem}>
          <View style={styles.dateLabelRow}>
            <CalendarIconComponent />
            <Text style={styles.dateLabel}>Check out</Text>
          </View>
          <Text style={styles.dateValue}>{bookingData.checkOut}</Text>
        </View>
      </View>

      {/* Payment Method */}
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Payment Method:</Text>
        <Text style={styles.detailValue}>{bookingData.paymentMethod}</Text>
      </View>

      {/* Total */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total:</Text>
        <Text style={styles.totalValue}>{bookingData.total}</Text>
      </View>

      {/* Booking Ref Code */}
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Booking ref. code:</Text>
        <Text style={styles.detailValue}>{bookingData.refCode}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  detailsContainer: {
    gap: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#525252',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    flex: 1,
    textAlign: 'right',
  },

  // Date Row
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  dateItem: {
    gap: 10,
    alignItems: 'center',
  },
  dateLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#656565',
  },
  dateValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000000',
  },

  // Total Row
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
});

export default BookingDetails;
