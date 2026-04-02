/**
 * Your Listings Carousel Component
 * Horizontal scrolling property cards for host dashboard
 * Card style matches PropertyListingCard (without favorite icon)
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRef, useState } from "react";
import {
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import ShieldTickIcon from "../../assets/icons/shield-tick.svg";
import configService from "../../services/configService";
import { resolveImageUrlSync } from "../../utils/imageUtils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.65; // Reduced from 75% to 65%
const IMAGE_HEIGHT = 160; // Reduced from 200

// Single listing card - styled like PropertyListingCard
const ListingCard = ({ listing, onPress, cardWidth }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [actualCardWidth, setActualCardWidth] = useState(cardWidth);
  const scrollViewRef = useRef(null);

  // Get images array - no fallback, show placeholder if empty
  const displayImages = (
    listing.images && listing.images.length > 0
      ? listing.images
      : listing.image
        ? [listing.image]
        : []
  ).filter(Boolean);

  // Handle container layout to get actual width
  const handleContainerLayout = (event) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setActualCardWidth(width);
    }
  };

  const handleScroll = (event) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / actualCardWidth);
    setCurrentImageIndex(index);
  };

  // Format price with K/M suffixes for large numbers
  const formatPrice = (price) => {
    const numPrice = Math.round(price);
    if (numPrice >= 1000000) {
      const millions = numPrice / 1000000;
      return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
    }
    if (numPrice >= 1000) {
      const thousands = numPrice / 1000;
      return thousands % 1 === 0 ? `${thousands}K` : `${thousands.toFixed(1)}K`;
    }
    return numPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Safe string conversion for all values
  const safeTitle = String(listing.propertyName || listing.title || "Untitled");
  
  // Proper location mapping
  const safeLocation = (() => {
    const city = listing.propertyLocation?.city || listing.city;
    const state = listing.propertyLocation?.state || listing.state;
    
    if (city && state) {
      return `${city}, ${state}`;
    } else if (city) {
      return city;
    } else if (state) {
      return state;
    } else {
      // Try to extract from address field
      const address = listing.propertyLocation?.fullAddress || listing.address;
      if (address && typeof address === 'string') {
        // Look for common patterns like "City, State" or "City State"
        const parts = address.split(',').map(p => p.trim()).filter(p => p);
        if (parts.length >= 2) {
          return `${parts[0]}, ${parts[1]}`;
        } else if (parts.length === 1) {
          // Try to split by space for patterns like "Lagos Nigeria"
          const spaceParts = parts[0].split(' ').filter(p => p.length > 2);
          if (spaceParts.length >= 2) {
            return `${spaceParts[0]}, ${spaceParts[1]}`;
          }
        }
      }
      return address || "Location not provided";
    }
  })();
  
  const safePrice = listing.price ? String(listing.price) : "0";

  // Format pricing period for display
  const formatPricingPeriod = (period) => {
    const periodMap = {
      night: "Night",
      week: "Week",
      month: "Month",
      year: "Year",
    };
    return periodMap[String(period).toLowerCase()] || "Night";
  };
  const safePriceUnit = formatPricingPeriod(
    listing.priceUnit || listing.pricingPeriod || "night",
  );
  const safeFormattedPrice = String(formatPrice(parseFloat(safePrice) || 0));
  const safeAvailability = listing.isAvailable ? "Available" : "Unavailable";

  // Safe rating - ensure it's a valid number before formatting
  // Show rating even if 0 (no reviews yet)
  const numericRating =
    typeof listing.rating === "number"
      ? listing.rating
      : parseFloat(listing.rating);
  const hasValidRating = !isNaN(numericRating);
  const safeRating = hasValidRating ? numericRating.toFixed(1) : null;
  const hasNoReviews = numericRating === 0;

  // Determine status display - only show Available/Unavailable for approved listings
  const listingStatus = listing.status
    ? String(listing.status).toUpperCase()
    : "PENDING";
  const isApproved =
    listingStatus === "LIVE" ||
    listingStatus === "ACTIVE" ||
    listingStatus === "AVAILABLE";

  // Status config for non-approved listings
  const statusConfig = {
    PENDING: { label: "Pending", color: "#FF9800", bgColor: "#FFF3E0" },
    DRAFT: { label: "Draft", color: "#6371F1", bgColor: "#E8EAF6" },
    EXPIRED: { label: "Expired", color: "#9E9E9E", bgColor: "#F5F5F5" },
    PAUSED: { label: "Paused", color: "#FD3131", bgColor: "#FFEBEE" },
    SUSPENDED: { label: "Suspended", color: "#FD3131", bgColor: "#FFEBEE" },
    REJECTED: { label: "Rejected", color: "#FD3131", bgColor: "#FFEBEE" },
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { width: cardWidth },
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      {/* Image Slider */}
      <View
        style={[styles.imageSliderContainer, { width: cardWidth }]}
        onLayout={handleContainerLayout}
      >
        {displayImages.length > 0 ? (
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            style={{ width: actualCardWidth }}
            contentContainerStyle={{
              width: actualCardWidth * displayImages.length,
            }}
          >
            {displayImages.map((image, index) => {
              const baseUrl = configService.getBaseURLSync();
              const resolvedPath =
                typeof image === "string"
                  ? image
                  : image.uri || image.url || null;
              const imageSource = resolvedPath
                ? { uri: resolveImageUrlSync(resolvedPath, baseUrl) }
                : null;

              if (!imageSource) return null;

              return (
                <Image
                  key={index}
                  source={imageSource}
                  style={[styles.slideImage, { width: actualCardWidth }]}
                  contentFit="cover"
                  transition={200}
                />
              );
            })}
          </ScrollView>
        ) : (
          <View
            style={[
              styles.slideImage,
              styles.noImagePlaceholder,
              { width: actualCardWidth },
            ]}
          >
            <Ionicons name="image-outline" size={32} color="#CCC" />
            <Text style={styles.noImageText}>No image</Text>
          </View>
        )}

        {/* Pagination Dots */}
        {displayImages.length > 1 && (
          <View style={styles.paginationContainer}>
            <View style={styles.paginationDots}>
              {displayImages.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    currentImageIndex === index && styles.activeDot,
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {/* Verified Badge */}
        {listing.isVerified && (
          <View style={styles.verifiedBadgeContainer}>
            <View style={styles.verifiedContent}>
              <ShieldTickIcon width={14} height={14} />
              <Text style={styles.verifiedText}>VERIFIED</Text>
            </View>
          </View>
        )}
      </View>

      {/* Property Details */}
      <View style={styles.detailsContainer}>
        {/* Title and Rating Row */}
        <View style={styles.titleRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
              {safeTitle}
            </Text>
            <Text
              style={styles.location}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {safeLocation}
            </Text>
          </View>
          <View style={styles.ratingContainer}>
            <Text
              style={[styles.ratingText, hasNoReviews && styles.noReviewsText]}
            >
              {hasNoReviews ? "N/A" : safeRating}
            </Text>
            <Ionicons
              name={hasNoReviews ? "star-outline" : "star"}
              size={10}
              color={hasNoReviews ? "#999" : "#FFD700"}
            />
          </View>
        </View>

        {/* Property Details - Bedroom, Bathroom, Amenities */}
        <View style={styles.propertyDetailsRow}>
          {listing.bedrooms > 0 && (
            <View style={styles.detailItem}>
              <Ionicons name="bed-outline" size={8} color="#7C7C7C" />
              <Text style={styles.detailText}>{listing.bedrooms} Bed</Text>
            </View>
          )}
          {listing.bathrooms > 0 && (
            <View style={styles.detailItem}>
              <Ionicons name="water-outline" size={8} color="#7C7C7C" />
              <Text style={styles.detailText}>{listing.bathrooms} Bath</Text>
            </View>
          )}
          {listing.amenities && listing.amenities.length > 0 && (
            <View style={styles.detailItem}>
              <Ionicons name="home-outline" size={8} color="#7C7C7C" />
              <Text style={styles.detailText}>
                {listing.amenities.slice(0, 1).map((amenity, index) => (
                  <Text key={index}>{amenity}</Text>
                ))}
              </Text>
            </View>
          )}
        </View>

        {/* Price and Availability Row */}
        <View style={styles.priceRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.price} numberOfLines={1}>
              ₦{safeFormattedPrice}
            </Text>
            <Text style={styles.perNight}>/{safePriceUnit}</Text>
          </View>
          {/* Show availability only for approved listings, otherwise show status */}
          {isApproved ? (
            <View
              style={[
                styles.availabilityBadge,
                listing.isAvailable
                  ? styles.availableBadge
                  : styles.unavailableBadge,
              ]}
            >
              <Text
                style={[
                  styles.availabilityText,
                  listing.isAvailable
                    ? styles.availableText
                    : styles.unavailableText,
                ]}
              >
                {listing.isAvailable ? "Available" : "Unavailable"}
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.availabilityBadge,
                {
                  backgroundColor:
                    statusConfig[listingStatus]?.bgColor || "#FFF3E0",
                },
              ]}
            >
              <Text
                style={[
                  styles.availabilityText,
                  { color: statusConfig[listingStatus]?.color || "#FF9800" },
                ]}
              >
                {statusConfig[listingStatus]?.label || "Pending"}
              </Text>
            </View>
          )}
        </View>

        {/* Bedroom and Bathroom Info - Only on smaller card */}
        {(listing.bedrooms !== undefined ||
          listing.bathrooms !== undefined) && (
          <View style={styles.amenitiesRow}>
            {listing.bedrooms !== undefined && (
              <Text style={styles.amenityText}>• {listing.bedrooms} Bed</Text>
            )}
            {listing.bathrooms !== undefined && (
              <Text style={styles.amenityText}>• {listing.bathrooms} Bath</Text>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
};

const YourListingsCarousel = ({
  listings = [],
  onViewAllPress,
  onListingPress,
  onCreateListingPress, // Callback when user wants to create a listing
}) => {
  const cardWidth = CARD_WIDTH;

  // Filter out any null/undefined listings
  const validListings = Array.isArray(listings)
    ? listings.filter((listing) => listing && typeof listing === "object")
    : [];

  // Show empty state if no listings
  const hasListings = validListings.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Your Listings</Text>
        {hasListings && (
          <Pressable onPress={onViewAllPress}>
            <Text style={styles.viewAllText}>View All</Text>
          </Pressable>
        )}
      </View>

      {!hasListings ? (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateContent}>
            <Text style={styles.emptyStateTitle}>No Listings Yet</Text>
            <Text style={styles.emptyStateDescription}>
              Create your first listing to start earning as a host
            </Text>
            {onCreateListingPress && (
              <Pressable
                style={styles.createListingButton}
                onPress={onCreateListingPress}
              >
                <Text style={styles.createListingButtonText}>
                  + Create Listing
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          decelerationRate="fast"
          snapToInterval={cardWidth + 12}
          snapToAlignment="start"
        >
          {validListings.map((listing, index) => (
            <ListingCard
              key={listing.id || index}
              listing={listing}
              cardWidth={cardWidth}
              onPress={() => onListingPress?.(listing)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",

    color: "#292929",
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "500",

    color: "#192DFF",
  },
  emptyStateContainer: {
    paddingHorizontal: 20,
  },
  emptyStateContent: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderStyle: "dashed",
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#292929",
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: "#6C757D",
    textAlign: "center",
    marginBottom: 16,
  },
  createListingButton: {
    backgroundColor: "#192DFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createListingButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    overflow: "hidden",
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    // Android shadow
    elevation: 6,
  },
  cardPressed: {
    opacity: 0.95,
  },
  imageSliderContainer: {
    width: "100%",
    height: IMAGE_HEIGHT,
    position: "relative",
    overflow: "hidden",
  },
  slideImage: {
    height: IMAGE_HEIGHT,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  noImagePlaceholder: {
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  noImageText: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  paginationContainer: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  paginationDots: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  activeDot: {
    backgroundColor: "#FFFFFF",
  },
  verifiedBadgeContainer: {
    position: "absolute",
    top: 10,
    left: 10,
    height: 20,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    zIndex: 10,
  },
  verifiedContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    gap: 4,
    height: 20,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "700",

    color: "#fff",
  },
  detailsContainer: {
    padding: 10,
    gap: 6,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleContainer: {
    flex: 1,
    marginRight: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 2,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  location: {
    fontSize: 12,
    color: "#656565",
  },
  propertyDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
    marginBottom: 4,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  detailText: {
    fontSize: 9,
    color: "#7C7C7C",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 3,
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "600",

    color: "#000000",
  },
  noReviewsText: {
    color: "#999999",
    fontWeight: "500",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    flex: 1,
  },
  price: {
    fontSize: 14,
    fontWeight: "700",

    color: "#000000",
  },
  perNight: {
    fontSize: 10,

    color: "#656565",
  },
  availabilityBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  availableBadge: {
    backgroundColor: "#D1FAE5",
  },
  unavailableBadge: {
    backgroundColor: "#FEE2E2",
  },
  availabilityText: {
    fontSize: 10,
    fontWeight: "600",
  },
  availableText: {
    color: "#059669",
  },
  unavailableText: {
    color: "#DC2626",
  },
  amenitiesRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  amenityText: {
    fontSize: 11,
    color: "#656565",
    fontWeight: "500",
  },
  emptyState: {
    marginHorizontal: 20,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",

    color: "#292929",
  },
  emptySubtext: {
    fontSize: 14,

    color: "#656565",
    marginTop: 8,
    textAlign: "center",
  },
});

export default YourListingsCarousel;
