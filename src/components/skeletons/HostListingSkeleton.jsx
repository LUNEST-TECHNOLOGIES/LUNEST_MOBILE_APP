import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import SkeletonPlaceholder from './SkeletonPlaceholder';

/**
 * HostListingSkeleton - Skeleton placeholder for a host's listing card
 * Matches the layout of ListingCard in HostListingsScreen.jsx
 */
const HostListingSkeleton = () => {
  const { width } = useWindowDimensions();
  const cardWidth = (width - 40 - 15) / 2;

  return (
    <View style={[styles.card, { width: cardWidth }]}>
    <SkeletonPlaceholder>
      {/* Property Image & Status Placeholder */}
      <View style={styles.imageContainer}>
        <View style={styles.statusBadge} />
      </View>
      
      {/* Card Content */}
      <View style={styles.content}>
        {/* Labels (e.g. For Rent/Sale) */}
        <View style={styles.row}>
          <View style={styles.labelBadge} />
          <View style={styles.labelBadge} />
        </View>
        
        {/* Name and Meta */}
        <View style={styles.propertyName} />
        <View style={styles.propertyMeta} />
        
        {/* Bed/Bath/Amenities Row */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem} />
          <View style={styles.detailItem} />
          <View style={styles.detailItem} />
        </View>
        
        {/* Pricing */}
        <View style={styles.priceRow}>
          <View style={styles.priceValue} />
          <View style={styles.priceUnit} />
        </View>
        
        {/* Actions (Edit, Calendar, Chart, Pause) */}
        <View style={styles.actionsRow}>
          <View style={styles.actionCircle} />
          <View style={styles.actionCircle} />
          <View style={styles.actionCircle} />
          <View style={styles.actionCircle} />
        </View>
      </View>
      </SkeletonPlaceholder>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 7,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.9 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 164,
    backgroundColor: '#E1E9EE',
    padding: 10,
  },
  statusBadge: {
    width: 65,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  content: {
    padding: 10,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  labelBadge: {
    width: 54,
    height: 18,
    borderRadius: 5,
    backgroundColor: '#E1E9EE',
  },
  propertyName: {
    width: '85%',
    height: 14,
    borderRadius: 4,
    backgroundColor: '#E1E9EE',
    marginTop: 2,
  },
  propertyMeta: {
    width: '70%',
    height: 12,
    borderRadius: 4,
    backgroundColor: '#E1E9EE',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  detailItem: {
    width: 38,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#E1E9EE',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 4,
  },
  priceValue: {
    width: 70,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#E1E9EE',
  },
  priceUnit: {
    width: 35,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#E1E9EE',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 14,
    marginTop: 5,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E1E9EE',
  },
});

export default HostListingSkeleton;
