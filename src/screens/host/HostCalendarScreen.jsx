/**
 * Host Calendar Screen
 * Manage availability and bookings calendar
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HostCalendarScreen = () => {
  const { width } = useWindowDimensions();
  const containerWidth = Math.min(width - 40, 500);
  
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Get current month info
  const currentMonth = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendar</Text>
      </View>

      <View style={[styles.content, { alignItems: 'center' }]}>
        <View style={[styles.calendarPlaceholder, { width: containerWidth }]}>
          <Text style={styles.monthText}>{currentMonth}</Text>
          
          {/* Placeholder Calendar Grid */}
          <View style={styles.calendarGrid}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <Text key={day} style={styles.dayLabel}>{day}</Text>
            ))}
          </View>
          
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Calendar Coming Soon</Text>
            <Text style={styles.emptySubtext}>
              You'll be able to manage your listing availability here
            </Text>
          </View>
        </View>

        {/* Legend */}
        <View style={[styles.legend, { width: containerWidth }]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.legendText}>Booked</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FFC107' }]} />
            <Text style={styles.legendText}>Blocked</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    
    color: '#000000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  calendarPlaceholder: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
  },
  calendarGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '500',
    
    color: '#656565',
    width: 40,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    
    color: '#292929',
  },
  emptySubtext: {
    fontSize: 14,
    
    color: '#656565',
    marginTop: 8,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    
    color: '#656565',
  },
});

export default HostCalendarScreen;
