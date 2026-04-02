import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import SkeletonPlaceholder from './SkeletonPlaceholder';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.7;
const CARD_HEIGHT = 280;

/**
 * PropertyCardSkeleton - Loading placeholder for property listing cards
 * Used in horizontal scrolling sections like "Top Picks"
 */
export const PropertyCardSkeleton = () => (
  <View style={styles.cardContainer}>
    <SkeletonPlaceholder>
      <View style={styles.card}>
        {/* Image placeholder */}
        <View style={styles.image} />
        
        {/* Content section */}
        <View style={styles.content}>
          {/* Price row */}
          <View style={styles.priceRow}>
            <View style={styles.price} />
            <View style={styles.rating} />
          </View>
          
          {/* Title */}
          <View style={styles.title} />
          <View style={styles.titleShort} />
          
          {/* Location */}
          <View style={styles.location} />
          
          {/* Amenities row */}
          <View style={styles.amenitiesRow}>
            <View style={styles.amenity} />
            <View style={styles.amenity} />
            <View style={styles.amenity} />
          </View>
        </View>
      </View>
    </SkeletonPlaceholder>
  </View>
);

/**
 * PropertyGridSkeleton - Loading placeholder for grid property cards
 * Used in explore/search results
 */
export const PropertyGridSkeleton = () => (
  <View style={styles.gridContainer}>
    <SkeletonPlaceholder>
      <View style={styles.gridCard}>
        {/* Image */}
        <View style={styles.gridImage} />
        
        {/* Content */}
        <View style={styles.gridContent}>
          <View style={styles.gridPrice} />
          <View style={styles.gridTitle} />
          <View style={styles.gridLocation} />
        </View>
      </View>
    </SkeletonPlaceholder>
  </View>
);

/**
 * HorizontalListSkeleton - Row of property card skeletons
 */
export const HorizontalListSkeleton = ({ count = 3 }) => (
  <View style={styles.horizontalList}>
    {Array.from({ length: count }).map((_, index) => (
      <PropertyCardSkeleton key={index} />
    ))}
  </View>
);

/**
 * GridListSkeleton - Grid of property skeletons
 */
export const GridListSkeleton = ({ count = 6 }) => (
  <View style={styles.gridList}>
    {Array.from({ length: count }).map((_, index) => (
      <PropertyGridSkeleton key={index} />
    ))}
  </View>
);

/**
 * SearchResultSkeleton - Full search results loading state
 */
export const SearchResultSkeleton = () => (
  <View style={styles.searchContainer}>
    {/* Search bar placeholder */}
    <SkeletonPlaceholder>
      <View style={styles.searchBar} />
    </SkeletonPlaceholder>
    
    {/* Filter chips */}
    <View style={styles.chipsRow}>
      <SkeletonPlaceholder><View style={styles.chip} /></SkeletonPlaceholder>
      <SkeletonPlaceholder><View style={styles.chip} /></SkeletonPlaceholder>
      <SkeletonPlaceholder><View style={styles.chip} /></SkeletonPlaceholder>
    </View>
    
    {/* Grid results */}
    <GridListSkeleton count={6} />
  </View>
);

/**
 * HomeScreenSkeleton - Complete home screen loading state
 */
export const HomeScreenSkeleton = () => (
  <View style={styles.homeContainer}>
    {/* Header */}
    <SkeletonPlaceholder>
      <View style={styles.header}>
        <View style={styles.headerTitle} />
        <View style={styles.headerAvatar} />
      </View>
    </SkeletonPlaceholder>
    
    {/* Search bar */}
    <SkeletonPlaceholder>
      <View style={styles.searchBarLarge} />
    </SkeletonPlaceholder>
    
    {/* Category chips */}
    <View style={styles.categoriesRow}>
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonPlaceholder key={i}>
          <View style={styles.categoryChip} />
        </SkeletonPlaceholder>
      ))}
    </View>
    
    {/* Section title */}
    <SkeletonPlaceholder>
      <View style={styles.sectionTitle} />
    </SkeletonPlaceholder>
    
    {/* Horizontal scrolling cards */}
    <HorizontalListSkeleton count={3} />
    
    {/* Another section */}
    <SkeletonPlaceholder>
      <View style={styles.sectionTitle} />
    </SkeletonPlaceholder>
    
    <HorizontalListSkeleton count={3} />
  </View>
);

const styles = StyleSheet.create({
  // Card skeleton styles
  cardContainer: {
    marginRight: 16,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: '#E1E9EE',
  },
  content: {
    padding: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    width: 80,
    height: 20,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  rating: {
    width: 50,
    height: 16,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  title: {
    width: '100%',
    height: 16,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
    marginBottom: 4,
  },
  titleShort: {
    width: '60%',
    height: 16,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
    marginBottom: 8,
  },
  location: {
    width: '80%',
    height: 12,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
    marginBottom: 8,
  },
  amenitiesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  amenity: {
    width: 40,
    height: 12,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  
  // Grid skeleton styles
  gridContainer: {
    flex: 1,
    margin: 8,
  },
  gridCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#E1E9EE',
  },
  gridContent: {
    padding: 12,
  },
  gridPrice: {
    width: 100,
    height: 18,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
    marginBottom: 8,
  },
  gridTitle: {
    width: '100%',
    height: 14,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
    marginBottom: 4,
  },
  gridLocation: {
    width: '70%',
    height: 12,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  
  // List layouts
  horizontalList: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  gridList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  
  // Search skeleton
  searchContainer: {
    flex: 1,
    padding: 16,
  },
  searchBar: {
    width: '100%',
    height: 48,
    backgroundColor: '#E1E9EE',
    borderRadius: 24,
    marginBottom: 16,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    width: 80,
    height: 32,
    backgroundColor: '#E1E9EE',
    borderRadius: 16,
  },
  
  // Home screen skeleton
  homeContainer: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    height: 50,
  },
  headerTitle: {
    width: 120,
    height: 24,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E1E9EE',
  },
  searchBarLarge: {
    width: '100%',
    height: 50,
    backgroundColor: '#E1E9EE',
    borderRadius: 12,
    marginBottom: 16,
  },
  categoriesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  categoryChip: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#E1E9EE',
  },
  sectionTitle: {
    width: 150,
    height: 20,
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
    marginHorizontal: 16,
    marginBottom: 12,
  },
});

export default {
  PropertyCardSkeleton,
  PropertyGridSkeleton,
  HorizontalListSkeleton,
  GridListSkeleton,
  SearchResultSkeleton,
  HomeScreenSkeleton,
};
