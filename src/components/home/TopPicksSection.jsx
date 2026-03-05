import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import configService from "../../services/configService";
import listingService from "../../services/listingService";
import * as ImageUtils from "../../utils/imageUtils";
import PropertyCard from "../PropertyCard";
import SectionHeader from "./SectionHeader";

// Local property image
const propImage = require("../../assets/images/prop_image.png");

/**
 * TopPicksSection Component
 * Displays "Top Picks Near You" section with real AVAILABLE listings
 *
 * @param {Array} externalListings - Optional pre-fetched listings (e.g., location-based)
 * @param {Object} bookmarkMap - Map of listing IDs to bookmark status
 * @param {function} onPropertyPress - Callback when a property card is pressed
 * @param {function} onFavoritePress - Callback when favorite button is pressed
 * @param {function} onSeeAllPress - Callback when "See all" is pressed
 */
const TopPicksSection = ({
  externalListings,
  bookmarkMap = {},
  onPropertyPress,
  onFavoritePress,
  onSeeAllPress,
}) => {
  const router = useRouter();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If external listings are provided, use them
    if (externalListings && externalListings.length > 0) {
      // Transform external listings to ensure image format is correct
      const transformedExternal = externalListings.map((listing) => ({
        ...listing,
        // Ensure image is in correct format for PropertyCard
        image: listing.image
          ? typeof listing.image === "string"
            ? listing.image
            : listing.image
          : propImage,
      }));
      setListings(transformedExternal);
      setLoading(false);
    } else {
      loadTopPickListings();
    }
  }, [externalListings]);

  const loadTopPickListings = async () => {
    try {
      setLoading(true);
      console.log("[TopPicksSection] Fetching top pick listings...");

      // Fetch published listings (AVAILABLE and BOOKED) with limit for top picks
      const baseURL = await configService.getBaseURL();
      const result = await listingService.fetchAllListings({
        limit: 6, // Get top 6 for horizontal scroll
      });

      if (result.success && result.listings && result.listings.length > 0) {
        // Transform backend listings to component format
        const transformedListings = result.listings.map((listing) => ({
          id: listing._id || listing.id,
          image: listing.propertyImages?.[0]
            ? { uri: ImageUtils.resolveImageUrlSync(listing.propertyImages[0], baseURL) }
            : propImage,
          title: listing.propertyName || listing.propertyTitle || "Untitled",
          location:
            listing.propertyLocation?.fullAddress ||
            listing.propertyLocation?.city ||
            listing.address ||
            "Unknown Location",
          price: listing.propertyPrice?.price || listing.price || 0,
          currency:
            listing.propertyPrice?.currency || listing.currency || "NGN",
          rating: listing.rating || 4.5,
          isFavorite: false, // Can be enhanced with bookmark check
          host: listing.host || {},
          propertyType: listing.propertyType,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          guests: listing.guests,
          status: listing.status || "AVAILABLE", // Include status for availability display
          isAvailable: listing.status === "AVAILABLE", // Show as bookable
          listingData: listing, // Store full listing data
        }));

        setListings(transformedListings);
        console.log(
          "[TopPicksSection] Loaded",
          transformedListings.length,
          "listings",
        );
      } else {
        console.log("[TopPicksSection] No listings available");
        setListings([]);
      }
    } catch (error) {
      console.error("[TopPicksSection] Error loading listings:", error);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyPress = (property) => {
    // Call the parent callback for navigation instead of navigating directly
    // This prevents double navigation that could cause back button issues
    if (onPropertyPress) {
      onPropertyPress(property);
    } else {
      // Fallback navigation if no callback provided
      router.push({
        pathname: "/property-details",
        params: {
          listingId: property.id,
        },
      });
    }
    console.log("Property pressed:", property.title);
  };

  const handleFavoritePress = (id, isFavorite) => {
    if (onFavoritePress) {
      onFavoritePress(id, isFavorite);
    }
    console.log("Favorite toggled:", id, isFavorite);
  };

  // Show loading indicator if loading
  if (loading) {
    return (
      <View style={styles.container}>
        <SectionHeader
          title="Top Picks Near You"
          icon="flame"
          showSeeAll={false}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#192DFF" />
        </View>
      </View>
    );
  }

  // Show empty state if no listings
  if (listings.length === 0) {
    return (
      <View style={styles.container}>
        <SectionHeader
          title="Top Picks Near You"
          icon="flame"
          showSeeAll={false}
        />
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateTitle}>No Top Picks Available</Text>
          <Text style={styles.emptyStateSubtext}>
            Check back soon for curated listings in your area
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <SectionHeader
        title="Top Picks Near You"
        icon="flame"
        showSeeAll={true}
        onSeeAllPress={onSeeAllPress}
      />

      {/* Horizontal Scroll of Property Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToAlignment="start"
      >
        {listings.map((listing) => {
          // Check bookmark status from bookmarkMap prop
          const bookmarkStatus = bookmarkMap[listing.id];
          const isFavorite =
            bookmarkStatus?.isBookmarked || listing.isFavorite || false;

          return (
            <PropertyCard
              key={listing.id}
              id={listing.id}
              image={listing.image}
              title={listing.title}
              location={listing.location}
              price={listing.price}
              rating={listing.rating}
              isFavorite={isFavorite}
              onPress={() => handlePropertyPress(listing)}
              onFavoritePress={handleFavoritePress}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  scrollContent: {
    paddingVertical: 8,
    paddingRight: 16,
    paddingLeft: 8,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12, // Ensures spacing between cards (supported in RN 0.71+)
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateContainer: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "700",

    color: "#292929",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 13,
    fontWeight: "500",

    color: "#6D6D6D",
    textAlign: "center",
  },
});

export default TopPicksSection;
