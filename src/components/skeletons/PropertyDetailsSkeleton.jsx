import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import SkeletonPlaceholder from './SkeletonPlaceholder';

const { width, height } = Dimensions.get('window');

/**
 * PropertyDetailsSkeleton - Full property details page loading state
 * Shows shimmer placeholders for all content sections
 */
export const PropertyDetailsSkeleton = () => (
  <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
    {/* Header Image Carousel Placeholder */}
    <SkeletonPlaceholder>
      <View style={styles.imageCarousel} />
    </SkeletonPlaceholder>

    {/* Content Container */}
    <View style={styles.content}>
      {/* Title & Price Row */}
      <View style={styles.titleRow}>
        <SkeletonPlaceholder>
          <View style={styles.title} />
        </SkeletonPlaceholder>
        <SkeletonPlaceholder>
          <View style={styles.price} />
        </SkeletonPlaceholder>
      </View>

      {/* Rating & Reviews */}
      <View style={styles.ratingRow}>
        <SkeletonPlaceholder>
          <View style={styles.stars} />
        </SkeletonPlaceholder>
        <SkeletonPlaceholder>
          <View style={styles.reviewCount} />
        </SkeletonPlaceholder>
      </View>

      {/* Location */}
      <SkeletonPlaceholder>
        <View style={styles.location} />
      </SkeletonPlaceholder>

      {/* Property Info Chips */}
      <View style={styles.chipsRow}>
        <SkeletonPlaceholder><View style={styles.chip} /></SkeletonPlaceholder>
        <SkeletonPlaceholder><View style={styles.chip} /></SkeletonPlaceholder>
        <SkeletonPlaceholder><View style={styles.chip} /></SkeletonPlaceholder>
        <SkeletonPlaceholder><View style={styles.chip} /></SkeletonPlaceholder>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Host Section */}
      <View style={styles.hostSection}>
        <SkeletonPlaceholder>
          <View style={styles.avatar} />
        </SkeletonPlaceholder>
        <View style={styles.hostInfo}>
          <SkeletonPlaceholder>
            <View style={styles.hostName} />
          </SkeletonPlaceholder>
          <SkeletonPlaceholder>
            <View style={styles.hostStatus} />
          </SkeletonPlaceholder>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Description Section */}
      <SkeletonPlaceholder>
        <View style={styles.sectionTitle} />
      </SkeletonPlaceholder>
      <SkeletonPlaceholder>
        <View style={styles.descriptionLine} />
      </SkeletonPlaceholder>
      <SkeletonPlaceholder>
        <View style={styles.descriptionLine} />
      </SkeletonPlaceholder>
      <SkeletonPlaceholder>
        <View style={styles.descriptionLineShort} />
      </SkeletonPlaceholder>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Amenities Section */}
      <SkeletonPlaceholder>
        <View style={styles.sectionTitle} />
      </SkeletonPlaceholder>
      <View style={styles.amenitiesGrid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonPlaceholder key={i}>
            <View style={styles.amenityItem} />
          </SkeletonPlaceholder>
        ))}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Map Section */}
      <SkeletonPlaceholder>
        <View style={styles.sectionTitle} />
      </SkeletonPlaceholder>
      <SkeletonPlaceholder>
        <View style={styles.mapPlaceholder} />
      </SkeletonPlaceholder>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Reviews Section */}
      <SkeletonPlaceholder>
        <View style={styles.sectionTitle} />
      </SkeletonPlaceholder>
      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <SkeletonPlaceholder>
            <View style={styles.reviewAvatar} />
          </SkeletonPlaceholder>
          <View style={styles.reviewMeta}>
            <SkeletonPlaceholder>
              <View style={styles.reviewName} />
            </SkeletonPlaceholder>
            <SkeletonPlaceholder>
              <View style={styles.reviewDate} />
            </SkeletonPlaceholder>
          </View>
        </View>
        <SkeletonPlaceholder>
          <View style={styles.reviewText} />
        </SkeletonPlaceholder>
        <SkeletonPlaceholder>
          <View style={styles.reviewTextShort} />
        </SkeletonPlaceholder>
      </View>

      {/* Bottom Spacer for Floating Footer */}
      <View style={styles.bottomSpacer} />
    </View>

    {/* Floating Book Button Placeholder */}
    <View style={styles.floatingFooter}>
      <View style={styles.footerContent}>
        <SkeletonPlaceholder>
          <View style={styles.footerPrice} />
        </SkeletonPlaceholder>
        <SkeletonPlaceholder>
          <View style={styles.footerButton} />
        </SkeletonPlaceholder>
      </View>
    </View>
  </ScrollView>
);

/**
 * HostListingsSkeleton - Skeleton for host listings section
 */
export const HostListingsSkeleton = () => (
  <View style={styles.hostListingsContainer}>
    <SkeletonPlaceholder>
      <View style={styles.sectionTitle} />
    </SkeletonPlaceholder>
    <View style={styles.horizontalList}>
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonPlaceholder key={i}>
          <View style={styles.hostListingCard} />
        </SkeletonPlaceholder>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  imageCarousel: {
    width: width,
    height: 300,
    backgroundColor: '#E1E9EE',
  },
  content: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    width: '60%',
    height: 24,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  price: {
    width: 100,
    height: 24,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  stars: {
    width: 80,
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
  location: {
    width: '80%',
    height: 16,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
    marginBottom: 16,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    width: 70,
    height: 28,
    backgroundColor: '#E1E9EE',
    borderRadius: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#E1E9EE',
    marginVertical: 16,
  },
  hostSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E1E9EE',
  },
  hostInfo: {
    flex: 1,
    gap: 6,
  },
  hostName: {
    width: 120,
    height: 18,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  hostStatus: {
    width: 80,
    height: 14,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  sectionTitle: {
    width: 150,
    height: 20,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
    marginBottom: 12,
  },
  descriptionLine: {
    width: '100%',
    height: 14,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
    marginBottom: 6,
  },
  descriptionLineShort: {
    width: '60%',
    height: 14,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  amenityItem: {
    width: (width - 48) / 2,
    height: 40,
    backgroundColor: '#E1E9EE',
    borderRadius: 8,
  },
  mapPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#E1E9EE',
    borderRadius: 12,
  },
  reviewCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E1E9EE',
  },
  reviewMeta: {
    flex: 1,
    gap: 4,
  },
  reviewName: {
    width: 100,
    height: 16,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  reviewDate: {
    width: 80,
    height: 12,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  reviewText: {
    width: '100%',
    height: 14,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
    marginBottom: 4,
  },
  reviewTextShort: {
    width: '70%',
    height: 14,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  bottomSpacer: {
    height: 100,
  },
  floatingFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 16,
    paddingBottom: 30,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerPrice: {
    width: 120,
    height: 24,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  footerButton: {
    width: 140,
    height: 48,
    backgroundColor: '#E1E9EE',
    borderRadius: 12,
  },
  // Host listings styles
  hostListingsContainer: {
    marginTop: 16,
  },
  horizontalList: {
    flexDirection: 'row',
    gap: 12,
  },
  hostListingCard: {
    width: 200,
    height: 240,
    backgroundColor: '#E1E9EE',
    borderRadius: 12,
  },
});

export default PropertyDetailsSkeleton;
