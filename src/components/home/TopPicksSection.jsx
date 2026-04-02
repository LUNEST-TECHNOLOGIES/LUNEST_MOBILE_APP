import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import configService from "../../services/configService";
import listingService from "../../services/listingService";
import * as ImageUtils from "../../utils/imageUtils";
import PropertyCard from "../PropertyCard";
import { HorizontalPropertySkeleton } from "../skeletons";
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
    // If external listings are provided, use them (from HomeScreen location-based filtering)
    if (externalListings && externalListings.length > 0) {
      console.log(
        "✅ [TopPicksSection] Received",
        externalListings.length,
        "external listings (location-based from HomeScreen)",
      );
      const getBase = async () => {
        try {
          const baseURL = await configService.getBaseURL();
          // Transform external listings to ensure image format is correct
          const transformedExternal = externalListings.map((listing) => ({
            ...listing,
            // Ensure image is in correct format for PropertyCard
            image: listing.image
              ? { uri: ImageUtils.resolveImageUrlSync(listing.image, baseURL) }
              : listing.propertyImages?.[0]
                ? { uri: ImageUtils.resolveImageUrlSync(listing.propertyImages[0], baseURL) }
                : null,
          }));
          setListings(transformedExternal);
          console.log(
            "✅ [TopPicksSection] Transformed",
            transformedExternal.length,
            "listings with resolved image URLs",
          );
          setLoading(false);
        } catch (error) {
          console.error("❌ [TopPicksSection] Error transforming listings:", error);
          setLoading(false);
        }
      };
      getBase();
    } else {
      console.log(
        "ℹ️ [TopPicksSection] No external listings provided - falling back to fetch all",
      );
      loadTopPickListings();
    }
  }, [externalListings]);

  const loadTopPickListings = async () => {
    try {
      setLoading(true);
      console.log("🔍 [TopPicksSection] Fetching top pick listings (no location filter)...");

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
            : null,
          title: listing.propertyName || listing.propertyTitle || "Untitled",
          location: (() => {
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
              return address || "Nigeria";
            }
          })(),
          price: listing.propertyPrice?.price || listing.price || 0,
          currency:
            listing.propertyPrice?.currency || listing.currency || "NGN",
          rating: listing.averageRating || listing.rating || null,
          isFavorite: false, // Can be enhanced with bookmark check
          host: listing.host || {},
          propertyType: listing.propertyType,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          amenities: listing.amenities || [],
          guests: listing.guests,
          status: listing.status || "AVAILABLE", // Include status for availability display
          isAvailable: listing.status === "AVAILABLE", // Show as bookable
          listingData: listing, // Store full listing data
        }));

        setListings(transformedListings);
        console.log(
          "✅ [TopPicksSection] Loaded",
          transformedListings.length,
          "listings (no location filter)",
        );
      } else {
        console.log("ℹ️ [TopPicksSection] No listings available");
        setListings([]);
      }
    } catch (error) {
      console.error(
        "❌ [TopPicksSection] Error loading listings:",
        error.message || error,
      );
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

  // Show skeleton loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <SectionHeader
          title="Top Picks Near You"
          icon="flame"
          showSeeAll={false}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.skeletonScrollContent}
        >
          <HorizontalPropertySkeleton />
          <HorizontalPropertySkeleton />
          <HorizontalPropertySkeleton />
        </ScrollView>
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
              bedrooms={listing.bedrooms}
              bathrooms={listing.bathrooms}
              amenities={listing.amenities}
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
  skeletonScrollContent: {
    paddingVertical: 8,
    paddingRight: 16,
    paddingLeft: 8,
    flexDirection: "row",
    gap: 12,
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
