import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Dimensions,
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CAROUSEL_CARD_WIDTH = 170; // Reduced width for a more compact carousel feel

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
      // Log first listing structure for debugging
      console.log("[TopPicksSection] First external listing:", JSON.stringify(externalListings[0], null, 2));
      const getBase = async () => {
        try {
          setLoading(true); // Ensure loading is set at start
          const baseURL = await configService.getBaseURL();
          console.log("[TopPicksSection] baseURL:", baseURL);
          // Transform external listings to ensure image format is correct
          const transformedExternal = externalListings.map((listing, index) => {
            // Handle image that could be string, object, or already resolved
            // External listings may have imageUrl instead of image
            // Check if image is a valid string or object with content
            let imagePath = null;
            const data = listing.listingData || listing;
            
            if (typeof listing.image === 'string' && listing.image.trim()) {
              imagePath = listing.image;
            } else if (typeof listing.imageUrl === 'string' && listing.imageUrl.trim()) {
              imagePath = listing.imageUrl;
            } else if (data.propertyImages?.[0]) {
              imagePath = data.propertyImages[0];
            } else if (data.images?.[0]) {
              imagePath = data.images[0];
            }
            
            // If image is an object, extract the URL
            if (typeof imagePath === 'object' && imagePath !== null) {
              imagePath = imagePath.uri || imagePath.url || imagePath.path || null;
            }
            
            const rating = listing.rating ?? data.averageRating ?? data.rating ?? data.avgRating ?? null;
            const bedrooms = listing.bedrooms ?? data.bedrooms ?? data.bedroomCount ?? 0;
            const bathrooms = listing.bathrooms ?? data.bathrooms ?? data.bathroomCount ?? 0;
            const amenities = listing.amenities || data.amenities || [];

            const resolvedImage = imagePath && typeof imagePath === 'string'
              ? { uri: ImageUtils.resolveImageUrlSync(imagePath, baseURL) }
              : null;
            
            if (index === 0) {
              console.log("[TopPicksSection] Image resolution:", {
                imagePath,
                resolvedImage,
                baseURL,
              });
            }

            // Map properties with fallbacks for different naming conventions
            return {
              id: listing.id || listing._id || data._id || data.id,
              image: resolvedImage,
              title: listing.title || data.propertyName || data.propertyTitle || "Untitled",
              location: listing.location || data.city || "Nigeria",
              price: listing.price || data.propertyPrice?.price || data.price || 0,
              currency: listing.currency || data.propertyPrice?.currency || data.currency || "NGN",
              rating: rating,
              bedrooms: bedrooms,
              bathrooms: bathrooms,
              amenities: Array.isArray(amenities) ? amenities : [],
              isFavorite: listing.isFavorite || false,
              status: listing.status || data.status || "AVAILABLE",
              listingData: data,
            };
          });
          setListings(transformedExternal);
          console.log(
            "✅ [TopPicksSection] Transformed",
            transformedExternal.length,
            "listings with resolved image URLs",
          );
          console.log("[TopPicksSection] First transformed listing image:", transformedExternal[0]?.image);
        } catch (error) {
          console.error("❌ [TopPicksSection] Error transforming listings:", error);
          setListings([]);
        } finally {
          setLoading(false);
        }
      };
      getBase();
    } else {
      // No external listings, fetch directly
      console.log("[TopPicksSection] No external listings, fetching directly...");
      loadTopPickListings();
    }
  }, [externalListings]);

  const loadTopPickListings = async () => {
    try {
      setLoading(true);

      // Fetch published listings (AVAILABLE and BOOKED) with limit for top picks
      const baseURL = await configService.getBaseURL();
      const result = await listingService.fetchAllListings({
        limit: 6, // Get top 6 for horizontal scroll
      });

      if (result.success && result.listings && result.listings.length > 0) {
        // Transform backend listings to component format
        const transformedListings = result.listings.map((listing) => {
          // Handle different image formats from backend
          let rawImage = listing.propertyImages?.[0] || listing.images?.[0];
          
          // If image is an object, extract the URL
          if (typeof rawImage === 'object' && rawImage !== null) {
            rawImage = rawImage.url || rawImage.uri || rawImage.path || rawImage.filename || null;
          }
          
          const imageUrl = rawImage
            ? ImageUtils.resolveImageUrlSync(rawImage, baseURL)
            : null;
          const rating = listing.averageRating ?? listing.rating ?? listing.avgRating ?? listing.totalRating ?? null;
          
          return {
          id: listing._id || listing.id,
          image: imageUrl ? { uri: imageUrl } : null,
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
          rating: rating,
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
        }});

        setListings(transformedListings);
      } else {
        setListings([]);
      }
    } catch (error) {
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
  };

  const handleFavoritePress = (id, isFavorite) => {
    if (onFavoritePress) {
      onFavoritePress(id, isFavorite);
    }
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
        snapToInterval={CAROUSEL_CARD_WIDTH + 12} // Card width + gap
        snapToAlignment="start"
      >
        {listings.map((listing) => {
          // Check bookmark status from bookmarkMap prop
          const bookmarkStatus = bookmarkMap[listing.id];
          const isFavorite =
            bookmarkStatus?.isBookmarked || listing.isFavorite || false;

          // Debug log
          console.log("[TopPicksSection] Rendering PropertyCard:", {
            id: listing.id,
            hasImage: !!listing.image,
            imageUri: listing.image?.uri?.substring(0, 30),
            bedrooms: listing.bedrooms,
            bathrooms: listing.bathrooms,
            amenities: listing.amenities,
          });

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
              width={CAROUSEL_CARD_WIDTH} // PASS equal width here
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
