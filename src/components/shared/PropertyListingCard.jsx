import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { memo, useCallback, useEffect, useRef, useState } from "react";
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
import PropertyRating from "../ui/PropertyRating";



const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_HEIGHT = 346;

/**
 * PropertyListingCard Component
 * Main detailed property listing card with image slider, verified badge, and full details
 *
 * @param {string} id - Property ID
 * @param {array} images - Array of image URLs or require()
 * @param {string} title - Property title
 * @param {string} location - Property location
 * @param {number} price - Price per period
 * @param {string} currency - Currency symbol
 * @param {string} pricingPeriod - Pricing period (night, week, month, year)
 * @param {number} securityDeposit - Security deposit amount
 * @param {number} cleaningFee - Cleaning fee amount
 * @param {number} rating - Property rating
 * @param {boolean} isVerified - Whether property is verified
 * @param {boolean} isAvailable - Whether property is available
 * @param {boolean} isFavorite - Whether property is favorited
 * @param {array} amenities - Array of amenity strings
 * @param {function} onPress - Callback when card is pressed
 * @param {function} onFavoritePress - Callback when favorite is pressed
 */
const PropertyListingCard = ({
  id,
  images = [],
  title = "",
  location = "",
  price = 0,
  currency = "₦",
  pricingPeriod = "night",
  securityDeposit = 0,
  cleaningFee = 0,
  rating = null,
  isVerified = true,
  isAvailable = true,
  isFavorite = false,
  status = "AVAILABLE", // Add status prop
  amenities = [],
  bedrooms = 0,
  bathrooms = 0,
  onPress,
  onFavoritePress,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [favorite, setFavorite] = useState(isFavorite);
  const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH - 40);
  const scrollViewRef = useRef(null);
  


  // Sync isFavorite prop changes to state
  useEffect(() => {
    setFavorite(isFavorite);
  }, [isFavorite]);

  // Handle container layout to get actual width
  const handleContainerLayout = useCallback((event) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
  }, []);

  // Format pricing period for display
  const formatPricingPeriod = (period) => {
    const periodMap = {
      night: "Night",
      week: "Week",
      month: "Month",
      year: "Year",
    };
    return periodMap[period?.toLowerCase()] || "Night";
  };

  // Default sample images if none provided
  const displayImages = images.length > 0 ? images : [];

  const handleScroll = (event) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / containerWidth);
    setCurrentImageIndex(index);
  };

  const handleFavoritePress = (e) => {
    e.stopPropagation();
    setFavorite(!favorite);
    if (onFavoritePress) {
      onFavoritePress(id, !favorite);
    }
  };

  const handleCardPress = () => {
    // Only call the onPress callback - let parent handle navigation
    if (onPress) {
      onPress(id);
    }
  };

  // Format price with K/M suffixes for large numbers
  const formatPrice = (num) => {
    if (num >= 1000000) {
      const millions = num / 1000000;
      return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
    }
    if (num >= 1000) {
      const thousands = num / 1000;
      return thousands % 1 === 0 ? `${thousands}K` : `${thousands.toFixed(1)}K`;
    }
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const getIconForItem = (item, isAmenity = false) => {
    const lower = item.toLowerCase();
    if (lower.includes("bedroom")) return "bed-outline";
    if (lower.includes("bathroom")) return "water-outline";
    if (isAmenity) {
       const { getAmenityIcon } = require("../../utils/amenityIcons");
       const icon = getAmenityIcon(item);
       return icon.endsWith("-outline") ? icon : `${icon}-outline`;
    }
    return "apps-outline";
  };

  const renderAmenityItems = () => {
    const displayItems = [];

    if (bedrooms > 0) {
      displayItems.push({
        label: `${bedrooms} Bedroom${bedrooms > 1 ? "s" : ""}`,
        icon: "bed-outline"
      });
    }

    if (bathrooms > 0) {
      displayItems.push({
        label: `${bathrooms} Bath${bathrooms > 1 ? "s" : ""}`,
        icon: "water-outline"
      });
    }

    const excludeKeywords = ["bedroom", "bathroom", "bed", "bath"];
    const filteredAmenities = amenities.filter((amenity) => {
      const label = typeof amenity === 'object' ? (amenity.label || amenity.name || "") : String(amenity);
      const lowerAmenity = label.toLowerCase();
      return !excludeKeywords.some((keyword) => lowerAmenity.includes(keyword));
    });

    const remainingSlots = 3 - displayItems.length;
    if (remainingSlots > 0) {
       filteredAmenities.slice(0, remainingSlots).forEach(amenity => {
         const label = typeof amenity === 'object' ? (amenity.label || amenity.name || "") : String(amenity);
         const { getAmenityIcon } = require("../../utils/amenityIcons");
         let icon = getAmenityIcon(label);
         if (!icon.endsWith("-outline") && icon !== "apps-outline") {
           icon = `${icon}-outline`;
         }
         displayItems.push({ label, icon });
       });
    }

    return displayItems.map((item, index) => (
      <View key={index} style={styles.amenityItem}>
        <Ionicons name={item.icon} size={12} color="#656565" />
        <Text style={styles.amenityLabel}>{item.label}</Text>
      </View>
    ));
  };

  return (
    <Pressable
      onPress={handleCardPress}
      style={styles.pressable}
    >
      <View style={styles.container}>
      {/* Image Slider */}
      <View
        style={styles.imageSliderContainer}
        onLayout={handleContainerLayout}
      >
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={containerWidth}
          snapToAlignment="center"
          disableIntervalMomentum={true}
          useNativeDriver={false}
        >
          {displayImages.map((image, index) => {
            const isVideo = typeof image === "object" && image.type === "video";
            const baseUrl = configService.getBaseURLSync();
            const resolvedPath =
              typeof image === "string"
                ? image
                : image.uri ||
                  image.url ||
                  (typeof image === "number" ? image : null);

            const imageSource =
              typeof resolvedPath === "number"
                ? resolvedPath
                : resolvedPath
                  ? { uri: resolveImageUrlSync(resolvedPath, baseUrl) }
                  : null;

            if (!imageSource) return null;

            return (
              <View
                key={index}
                style={[
                  styles.slideImage,
                  { width: containerWidth, height: IMAGE_HEIGHT },
                ]}
              >
                <Image
                  source={imageSource}
                  style={[
                    StyleSheet.absoluteFillObject,
                    styles.slideImageStyle,
                  ]}
                  contentFit="cover"
                  transition={300}
                  priority={index === 0 ? "high" : "normal"}
                  cachePolicy="memory-disk"
                  recyclingKey={typeof imageSource === 'number' ? String(imageSource) : imageSource?.uri}
                  placeholder="|rF?hV%2WCj[ayj[a|j[ayjtOG9F%2JCj[ayj[ayjtjtF%2JCj[ayj[ayjtjtF%2JCj[ayj[ayjtjtF%2JCj[ayj[ayjt"
                  placeholderContentFit="cover"
                />
                {isVideo && (
                  <View style={styles.videoIndicatorOverlay}>
                    <Ionicons
                      name="play-circle"
                      size={48}
                      color="rgba(255,255,255,0.8)"
                    />
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Pagination Dots */}
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

        {/* Verified Badge - styled like carousel cards */}
        {isVerified && (
          <View style={styles.verifiedBadgeContainer}>
            <View style={styles.verifiedContent}>
              <ShieldTickIcon width={14} height={14} />
              <Text style={styles.verifiedText}>VERIFIED</Text>
            </View>
          </View>
        )}

        {/* Favorite Button - icon only */}
        <Pressable style={styles.favoriteButton} onPress={handleFavoritePress}>
          <Ionicons
            name={favorite ? "heart" : "heart-outline"}
            size={20}
            color={favorite ? "#FF5A5F" : "#FFFFFF"}
          />
        </Pressable>
      </View>

      {/* Property Details */}
      <View style={styles.detailsContainer}>
        {/* Title and Rating Row */}
        <View style={styles.titleRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={14} color="#656565" />
              <Text style={styles.location} numberOfLines={1}>
                {location}
              </Text>
            </View>
          </View>
          <PropertyRating
            rating={rating}
            variant="detailed"
            showBackground={true}
            size={10}
          />
        </View>

        {/* Price and Availability Row */}
        <View style={styles.priceRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              {currency}
              {formatPrice(price)}
            </Text>
            <Text style={styles.perNight}>
              per {formatPricingPeriod(pricingPeriod)}
            </Text>
          </View>
          <View
            style={[
              styles.availabilityBadge,
              status === "BOOKED"
                ? styles.bookedBadge
                : isAvailable
                  ? styles.availableBadge
                  : styles.unavailableBadge,
            ]}
          >
            <Text
              style={[
                styles.availabilityText,
                status === "BOOKED"
                  ? styles.bookedText
                  : isAvailable
                    ? styles.availableText
                    : styles.unavailableText,
              ]}
            >
              {status === "BOOKED"
                ? "Booked"
                : isAvailable
                  ? "Available"
                  : "Unavailable"}
            </Text>
          </View>
        </View>

        {/* Amenities Row */}
        <View style={styles.amenitiesContainer}>
          {renderAmenityItems()}
        </View>
      </View>
      </View>
  </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 24,
    // Enhanced iOS shadow for better card differentiation
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    // Android shadow
    elevation: 6,
    // Add subtle border for extra definition
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
  },
  pressable: {
    width: "100%",
  },
  imageSliderContainer: {
    width: "100%",
    height: IMAGE_HEIGHT,
    position: "relative",
    overflow: "hidden",
  },
  slideImage: {
    height: IMAGE_HEIGHT,
  },
  slideImageStyle: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  videoIndicatorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  paginationContainer: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  paginationDots: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
    gap: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  activeDot: {
    backgroundColor: "#FFFFFF",
  },
  verifiedBadgeContainer: {
    position: "absolute",
    top: 12,
    left: 12,
    height: 22,
    borderRadius: 11,
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    zIndex: 10,
  },
  verifiedContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    gap: 5,
    height: 22,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "700",

    color: "#fff",
  },
  favoriteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  detailsContainer: {
    padding: 20,
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
  },
  titleContainer: {
    flex: 1,
    gap: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000000",
    // Allow long titles to wrap to a new line and prevent layout push
    flexShrink: 1,
    flexWrap: "wrap",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  location: {
    fontSize: 14,
    color: "#656565",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
  },
  perNight: {
    fontSize: 12,
    color: "#292929",
  },
  availabilityBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  availableBadge: {
    backgroundColor: "#D1FAE5",
  },
  unavailableBadge: {
    backgroundColor: "#FEE2E2",
  },
  bookedBadge: {
    backgroundColor: "#FCE7F3",
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
  bookedText: {
    color: "#DB2777", // Pink text for Booked
  },
  amenitiesContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  amenityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  amenityLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#656565",
  },
});

// Optimized with React.memo to prevent redundant re-renders during list scrolling
export default memo(PropertyListingCard, (prevProps, nextProps) => {
  // Only re-render if critical props change
  return (
    prevProps.id === nextProps.id &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.isAvailable === nextProps.isAvailable &&
    prevProps.status === nextProps.status &&
    prevProps.price === nextProps.price &&
    prevProps.title === nextProps.title &&
    prevProps.location === nextProps.location &&
    prevProps.rating === nextProps.rating &&
    // Check if images array reference changed (usually happens on refresh)
    prevProps.images === nextProps.images
  );
});
