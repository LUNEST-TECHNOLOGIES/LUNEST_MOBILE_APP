import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import SkeletonPlaceholder from './SkeletonPlaceholder';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * PropertyListingCardSkeleton - Enhanced loading placeholder for PropertyListingCard
 * Matches the actual card design with image carousel, price badge, amenities
 */
export const PropertyListingCardSkeleton = () => (
  <View style={styles.container}>
    <SkeletonPlaceholder>
      <View style={styles.card}>
        {/* Image Section with Carousel Dots */}
        <View style={styles.imageContainer}>
          <View style={styles.mainImage} />
          
          {/* Image Carousel Dots */}
          <View style={styles.carouselDots}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
          
          {/* Favorite Button */}
          <View style={styles.favoriteButton} />
          
          {/* Verified Badge */}
          <View style={styles.verifiedBadge} />
        </View>
        
        {/* Content Section */}
        <View style={styles.content}>
          {/* Price Row with Period */}
          <View style={styles.priceRow}>
            <View style={styles.price} />
            <View style={styles.pricingPeriod} />
          </View>
          
          {/* Rating Row */}
          <View style={styles.ratingRow}>
            <View style={styles.starIcon} />
            <View style={styles.ratingText} />
            <View style={styles.reviewCount} />
          </View>
          
          {/* Title */}
          <View style={styles.title} />
          
          {/* Location with Icon */}
          <View style={styles.locationRow}>
            <View style={styles.locationIcon} />
            <View style={styles.location} />
          </View>
          
          {/* Amenities */}
          <View style={styles.amenitiesRow}>
            <View style={styles.amenityChip} />
            <View style={styles.amenityChip} />
            <View style={styles.amenityChipShort} />
          </View>
          
          {/* Security Deposit Badge */}
          <View style={styles.depositBadge} />
        </View>
      </View>
    </SkeletonPlaceholder>
  </View>
);

/**
 * HorizontalPropertySkeleton - For horizontal scrolling sections
 */
export const HorizontalPropertySkeleton = () => (
  <View style={styles.horizontalContainer}>
    <SkeletonPlaceholder>
      <View style={styles.horizontalCard}>
        {/* Image */}
        <View style={styles.horizontalImage} />
        
        {/* Content */}
        <View style={styles.horizontalContent}>
          <View style={styles.horizontalPriceRow}>
            <View style={styles.horizontalPrice} />
            <View style={styles.horizontalRating} />
          </View>
          <View style={styles.horizontalTitle} />
          <View style={styles.horizontalLocation} />
        </View>
      </View>
    </SkeletonPlaceholder>
  </View>
);

/**
 * CompactPropertySkeleton - Smaller card for grids
 */
export const CompactPropertySkeleton = () => (
  <View style={styles.compactContainer}>
    <SkeletonPlaceholder>
      <View style={styles.compactCard}>
        <View style={styles.compactImage} />
        <View style={styles.compactContent}>
          <View style={styles.compactPrice} />
          <View style={styles.compactTitle} />
          <View style={styles.compactLocation} />
        </View>
      </View>
    </SkeletonPlaceholder>
  </View>
);

/**
 * PropertyListSkeleton - Multiple cards for list view
 */
export const PropertyListSkeleton = ({ count = 3 }) => (
  <View style={styles.listContainer}>
    {Array.from({ length: count }).map((_, index) => (
      <PropertyListingCardSkeleton key={index} />
    ))}
  </View>
);

/**
 * HorizontalListSkeleton - Row of horizontal cards
 */
export const HorizontalListSkeleton = ({ count = 3 }) => (
  <View style={styles.horizontalList}>
    {Array.from({ length: count }).map((_, index) => (
      <HorizontalPropertySkeleton key={index} />
    ))}
  </View>
);

/**
 * GridListSkeleton - Grid of compact cards
 */
export const GridListSkeleton = ({ count = 4 }) => (
  <View style={styles.gridContainer}>
    {Array.from({ length: count }).map((_, index) => (
      <CompactPropertySkeleton key={index} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  // Main card styles
  container: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    height: 346,
    position: 'relative',
    backgroundColor: '#E1E9EE',
  },
  mainImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E1E9EE',
  },
  carouselDots: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: [{ translateX: -20 }],
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 20,
  },
  favoriteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E1E9EE',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 100,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E1E9EE',
  },
  content: {
    padding: 16,
    gap: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    width: 120,
    height: 24,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  pricingPeriod: {
    width: 50,
    height: 18,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E1E9EE',
  },
  ratingText: {
    width: 30,
    height: 16,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  reviewCount: {
    width: 60,
    height: 14,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  title: {
    width: '85%',
    height: 22,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E1E9EE',
  },
  location: {
    width: '70%',
    height: 16,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  amenitiesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  amenityChip: {
    width: 90,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E1E9EE',
  },
  amenityChipShort: {
    width: 70,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E1E9EE',
  },
  depositBadge: {
    width: 140,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#E1E9EE',
    marginTop: 4,
  },
  
  // Horizontal card styles
  horizontalContainer: {
    marginRight: 16,
  },
  horizontalCard: {
    width: SCREEN_WIDTH * 0.7,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  horizontalImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#E1E9EE',
  },
  horizontalContent: {
    padding: 12,
    gap: 8,
  },
  horizontalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  horizontalPrice: {
    width: 80,
    height: 20,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  horizontalRating: {
    width: 50,
    height: 16,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  horizontalTitle: {
    width: '90%',
    height: 18,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  horizontalLocation: {
    width: '70%',
    height: 14,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  horizontalList: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  
  // Compact card styles
  compactContainer: {
    flex: 1,
    margin: 8,
  },
  compactCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  compactImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#E1E9EE',
  },
  compactContent: {
    padding: 10,
    gap: 6,
  },
  compactPrice: {
    width: 90,
    height: 18,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  compactTitle: {
    width: '100%',
    height: 16,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  compactLocation: {
    width: '80%',
    height: 12,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  
  // List container
  listContainer: {
    paddingVertical: 8,
  },
});


