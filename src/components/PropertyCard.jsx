import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    Dimensions,
    ImageBackground,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// Calculate card width to fit 2 cards with 16px padding on sides and 12px gap between
// Screen - (leftPadding + rightPadding + gap) / 2 = (screenWidth - 16 - 16 - 12) / 2
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - 44) / 2); // Equal width for all cards
const CARD_HEIGHT = 180;

// Default fallback image
const DEFAULT_PROPERTY_IMAGE = require("../assets/images/prop_image.png");

/**
 * PropertyCard Component
 * Displays a property listing card with image, favorite button, and details
 *
 * @param {string} id - Property ID
 * @param {string} image - Property image URL or require()
 * @param {string} title - Property title/name
 * @param {string} location - Property location
 * @param {number} price - Price per night
 * @param {string} currency - Currency symbol (default: ₦)
 * @param {number} rating - Property rating
 * @param {boolean} isFavorite - Whether property is favorited
 * @param {function} onPress - Callback when card is pressed
 * @param {function} onFavoritePress - Callback when favorite is pressed
 */
const PropertyCard = ({
  id,
  image,
  title = "Cozy Apartment",
  location = "Abuja, Nigeria",
  price = 45000,
  currency = "₦",
  rating = 4.8,
  isFavorite = false,
  status = "AVAILABLE", // Add status prop
  bookedUntil = null, // When the current booking ends
  onPress,
  onFavoritePress,
}) => {
  const [favorite, setFavorite] = useState(isFavorite);

  // Sync internal state with prop when it changes (e.g., from bookmarkMap updates)
  useEffect(() => {
    setFavorite(isFavorite);
  }, [isFavorite]);

  // Get image source - handles string URLs, require(), and null
  const getImageSource = () => {
    if (!image) return DEFAULT_PROPERTY_IMAGE;
    if (typeof image === "string") return { uri: image };
    return image; // Already a require() or { uri: ... } object
  };

  const handleFavoritePress = () => {
    setFavorite(!favorite);
    if (onFavoritePress) {
      onFavoritePress(id, !favorite);
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

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress}
    >
      {/* Property Image */}
      <ImageBackground
        source={getImageSource()}
        style={styles.imageBackground}
        imageStyle={styles.image}
        resizeMode="cover"
      >
        {/* Booked Status Badge overlaying the image */}
        {status === "BOOKED" && (
          <View style={styles.bookedBadgeContainer}>
            <Text style={styles.bookedBadgeText}>
              {bookedUntil
                ? `Booked till ${new Date(bookedUntil).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                : "Booked"}
            </Text>
          </View>
        )}

        {/* Favorite Button with Semi-transparent Background */}
        <View style={styles.favoriteContainer}>
          <Pressable
            style={styles.favoriteButton}
            onPress={handleFavoritePress}
          >
            <Ionicons
              name={favorite ? "heart" : "heart-outline"}
              size={18}
              color={favorite ? "#FF5A5F" : "#FFFFFF"}
            />
          </Pressable>
        </View>
      </ImageBackground>

      {/* Property Details */}
      <View style={styles.detailsContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color="#7C7C7C" />
          <Text style={styles.location} numberOfLines={1}>
            {location}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.price}>
            {currency}
            {formatPrice(price)}
            <Text style={styles.perNight}>/night</Text>
          </Text>

          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={12} color="#FFB800" />
            <Text style={styles.rating}>{rating}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 0, // Remove margin, use gap in parent
    marginLeft: 0,
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    // Android shadow
    elevation: 3,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  imageBackground: {
    width: "100%",
    height: CARD_HEIGHT * 0.6,
    overflow: "hidden",
  },
  image: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  bookedBadgeContainer: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 8,
    zIndex: 10,
  },
  bookedBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  favoriteContainer: {
    position: "absolute",
    top: 10,
    right: 10,
    borderRadius: 15,
    overflow: "hidden",
  },
  favoriteButton: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 15,
  },
  detailsContainer: {
    padding: 12,
    gap: 4,
    // Add a minimum height so cards with 1-line titles match cards with 2-line titles
    minHeight: Math.max(90, CARD_HEIGHT * 0.4), 
    justifyContent: "space-between",
    flex: 1, // Let it fill remaining space
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#292929",
    // Fix line height to calculate exact spacing for 2 lines
    lineHeight: 18,
    minHeight: 36, // 18 * 2 exactly supports 2 lines layout
    flexShrink: 1, // Allow text to shrink/wrap
    flexWrap: "wrap",
    width: "100%",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  location: {
    fontSize: 11,
    color: "#7C7C7C",
    flex: 1,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
    color: "#010135",
  },
  perNight: {
    fontSize: 10,
    fontWeight: "400",
    color: "#7C7C7C",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  rating: {
    fontSize: 12,
    fontWeight: "500",
    color: "#292929",
  },
});

export default PropertyCard;
