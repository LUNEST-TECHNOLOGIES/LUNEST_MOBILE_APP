/**
 * Search Results Screen
 * Displays search and filter results in a 2-column grid layout
 */

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    ImageBackground,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ArrowLeftIcon from "../src/assets/icons/bookings/arrow-left.svg";
import SearchIcon from "../src/assets/icons/home/SearchIcon.svg";
import FilterIcon from "../src/assets/icons/navbar/vuesax/outline/setting-4.svg";
import ShieldTickIcon from "../src/assets/icons/shield-tick.svg";
import FilterModal from "../src/components/modals/FilterModal";
import bookmarkService from "../src/services/bookmarkService";
import configService from "../src/services/configService";
import listingService from "../src/services/listingService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with gaps
const CARD_IMAGE_HEIGHT = 151;

// Default property image
const DEFAULT_PROPERTY_IMAGE = require("../src/assets/images/prop_image.png");

const SearchResultsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse initial filters from params
  const initialQuery = params?.query || "";
  const initialFilters = params?.filters ? JSON.parse(params.filters) : {};

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState(initialFilters);
  const [bookmarkMap, setBookmarkMap] = useState({});
  const [resultCount, setResultCount] = useState(0);

  useEffect(() => {
    fetchSearchResults();
  }, [searchQuery, activeFilters]);

  const fetchSearchResults = async () => {
    try {
      setLoading(true);
      console.log(
        "[SearchResults] Fetching with query:",
        searchQuery,
        "filters:",
        activeFilters,
      );

      const baseURL = await configService.getBaseURL();

      // Build filter object for API
      const apiFilters = {
        status: { $in: ["AVAILABLE", "BOOKED"] },
      };

      // Search query - search in property name, city, address, description
      // Handle keywords with spaces by also searching individual words
      if (searchQuery && searchQuery.trim()) {
        const trimmedQuery = searchQuery.trim();
        // Create search patterns - both full query and individual words
        const searchPatterns = [trimmedQuery];

        // If query has spaces, also search for individual words (min 2 chars)
        if (trimmedQuery.includes(" ")) {
          const words = trimmedQuery.split(/\s+/).filter((w) => w.length >= 2);
          searchPatterns.push(...words);
        }

        // Build OR conditions for each search pattern
        const searchConditions = [];
        searchPatterns.forEach((pattern) => {
          searchConditions.push(
            { propertyName: { $regex: pattern, $options: "i" } },
            { city: { $regex: pattern, $options: "i" } },
            { state: { $regex: pattern, $options: "i" } },
            { description: { $regex: pattern, $options: "i" } },
            { "address.street": { $regex: pattern, $options: "i" } },
            { "address.city": { $regex: pattern, $options: "i" } },
            { "address.state": { $regex: pattern, $options: "i" } },
          );
        });

        apiFilters.$or = searchConditions;
      }

      // Location filter
      if (activeFilters.location) {
        apiFilters.city = { $regex: activeFilters.location, $options: "i" };
      }

      // Price range
      if (activeFilters.minPrice) {
        apiFilters.price = {
          ...apiFilters.price,
          $gte: activeFilters.minPrice,
        };
      }
      if (activeFilters.maxPrice) {
        apiFilters.price = {
          ...apiFilters.price,
          $lte: activeFilters.maxPrice,
        };
      }

      // Property categories
      if (activeFilters.categories && activeFilters.categories.length > 0) {
        apiFilters.propertyType = { $in: activeFilters.categories };
      }

      // Bedrooms, bathrooms, guests
      if (activeFilters.bedrooms && activeFilters.bedrooms > 0) {
        apiFilters.bedrooms = { $gte: activeFilters.bedrooms };
      }
      if (activeFilters.bathrooms && activeFilters.bathrooms > 0) {
        apiFilters.bathrooms = { $gte: activeFilters.bathrooms };
      }
      if (activeFilters.guests && activeFilters.guests > 0) {
        apiFilters.guests = { $gte: activeFilters.guests };
      }

      // Furnished filter
      if (activeFilters.furnished) {
        apiFilters.furnishingStatus = { $regex: 'furnished', $options: 'i' };
      }

      const result = await listingService.fetchListingsByStatus(apiFilters);

      if (result && result.success && result.listings) {
        let filteredListings = result.listings;

        // Client-side filtering for amenities
        if (activeFilters.amenities && activeFilters.amenities.length > 0) {
          filteredListings = filteredListings.filter((listing) =>
            activeFilters.amenities.every(
              (amenity) =>
                listing.amenities && listing.amenities.includes(amenity),
            ),
          );
        }

        // Verified only filter
        if (activeFilters.verifiedOnly) {
          filteredListings = filteredListings.filter(
            (listing) => listing.host && listing.host.active === true,
          );
        }

        // Furnished filter (client-side)
        if (activeFilters.furnished) {
          filteredListings = filteredListings.filter(
            (listing) => 
              listing.furnishingStatus && 
              listing.furnishingStatus.toLowerCase().includes('furnished'),
          );
        }

        // Transform listings
        const transformedListings = filteredListings.map((listing) => {
          // Get first image URL
          let imageUrl = null;
          if (listing.propertyImages && listing.propertyImages.length > 0) {
            const firstImg = listing.propertyImages[0];
            if (typeof firstImg === "object" && firstImg.url) {
              imageUrl = firstImg.url.startsWith("http")
                ? firstImg.url
                : `${baseURL}${firstImg.url}`;
            } else if (typeof firstImg === "string") {
              imageUrl = firstImg.startsWith("http")
                ? firstImg
                : `${baseURL}${firstImg}`;
            }
          }

          // Build location string with city and state
          const buildLocation = () => {
            const parts = [];
            // Try address object first
            if (listing.address && typeof listing.address === "object") {
              if (listing.address.city) parts.push(listing.address.city);
              if (listing.address.state) parts.push(listing.address.state);
            } else {
              // Fallback to direct fields
              if (listing.city) parts.push(listing.city);
              if (listing.state) parts.push(listing.state);
            }
            return parts.length > 0 ? parts.join(", ") : "Nigeria";
          };

          return {
            id: listing._id || listing.id,
            title: listing.propertyName || "Property",
            location: buildLocation(),
            price: listing.price || listing.propertyPrice?.price || 0,
            pricingPeriod: listing.pricingPeriod || "night",
            image: imageUrl,
            bedrooms: listing.bedrooms || 0,
            bathrooms: listing.bathrooms || 0,
            isVerified: listing.host?.active === true,
            rating: listing.rating || 4.5,
            status: listing.status, // Pass status for availability display
          };
        });

        setListings(transformedListings);
        setResultCount(transformedListings.length);
        console.log(
          "[SearchResults] Found",
          transformedListings.length,
          "results",
        );

        // Load bookmark statuses
        await loadBookmarkStatuses(transformedListings);
      } else {
        setListings([]);
        setResultCount(0);
      }
    } catch (error) {
      console.error("[SearchResults] Error fetching results:", error);
      setListings([]);
      setResultCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadBookmarkStatuses = async (listingsData) => {
    try {
      const newBookmarkMap = {};
      for (const listing of listingsData) {
        const status = await bookmarkService.isListingBookmarked(listing.id);
        newBookmarkMap[listing.id] = status;
      }
      setBookmarkMap(newBookmarkMap);
    } catch (error) {
      console.error("[SearchResults] Error loading bookmarks:", error);
    }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  const handleApplyFilters = (filters) => {
    setActiveFilters(filters);
    setShowFilterModal(false);
  };

  const handleClearFilters = () => {
    setActiveFilters({});
    setSearchQuery("");
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSearchResults();
  }, [searchQuery, activeFilters]);

  const handlePropertyPress = (listing) => {
    router.push({
      pathname: "/property-details",
      params: { listingId: listing.id },
    });
  };

  const handleFavoritePress = async (listing) => {
    try {
      const bookmarkStatus = bookmarkMap[listing.id] || {
        isBookmarked: false,
        bookmarkId: null,
      };
      const result = await bookmarkService.toggleBookmark(
        listing.id,
        !bookmarkStatus.isBookmarked,
        bookmarkStatus.bookmarkId,
      );

      if (result.success) {
        const updatedStatus = await bookmarkService.isListingBookmarked(
          listing.id,
        );
        setBookmarkMap((prev) => ({
          ...prev,
          [listing.id]: updatedStatus,
        }));
      }
    } catch (error) {
      console.error("[SearchResults] Error toggling favorite:", error);
    }
  };

  // Format price with K/M suffixes
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

  // Format pricing period
  const formatPricingPeriod = (period) => {
    const periodMap = {
      night: "Night",
      week: "Week",
      month: "Month",
      year: "Year",
    };
    return periodMap[period?.toLowerCase()] || "Night";
  };

  // Count active filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (activeFilters.location) count++;
    if (activeFilters.minPrice || activeFilters.maxPrice) count++;
    if (activeFilters.categories && activeFilters.categories.length > 0)
      count++;
    if (activeFilters.amenities && activeFilters.amenities.length > 0) count++;
    if (activeFilters.bedrooms > 0) count++;
    if (activeFilters.bathrooms > 0) count++;
    if (activeFilters.guests > 0) count++;
    if (activeFilters.verifiedOnly) count++;
    return count;
  };

  const renderPropertyCard = ({ item }) => {
    const bookmarkStatus = bookmarkMap[item.id] || { isBookmarked: false };

    return (
      <Pressable
        style={styles.propertyCard}
        onPress={() => handlePropertyPress(item)}
      >
        {/* Image Container */}
        <View style={styles.imageContainer}>
          <ImageBackground
            source={item.image ? { uri: item.image } : DEFAULT_PROPERTY_IMAGE}
            style={styles.propertyImage}
            imageStyle={styles.propertyImageStyle}
            resizeMode="cover"
          >
            {/* Verified Badge */}
            {item.isVerified && (
              <View style={styles.verifiedBadge}>
                <ShieldTickIcon width={10} height={10} />
                <Text style={styles.verifiedText}>VERIFIED</Text>
              </View>
            )}

            {/* Booked Status Badge */}
            {item.status === "BOOKED" && (
              <View style={styles.bookedBadgeOverlay}>
                <Text style={styles.bookedBadgeText}>Booked</Text>
              </View>
            )}

            {/* Favorite Button */}
            <Pressable
              style={styles.favoriteButton}
              onPress={() => handleFavoritePress(item)}
            >
              <Ionicons
                name={bookmarkStatus.isBookmarked ? "heart" : "heart-outline"}
                size={16}
                color={bookmarkStatus.isBookmarked ? "#FF5A5F" : "#FFFFFF"}
              />
            </Pressable>
          </ImageBackground>
        </View>

        {/* Property Details */}
        <View style={styles.propertyDetails}>
          <View style={styles.titleRowSmall}>
            <Text style={styles.propertyTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {item.status === "BOOKED" && (
              <View style={styles.bookedStatusIndicator} />
            )}
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color="#656565" />
            <Text style={styles.propertyLocation} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
          <Text style={styles.amenitiesText}>
            • {item.bedrooms} Bedroom{item.bedrooms !== 1 ? "s" : ""} •{" "}
            {item.bathrooms} Bathroom{item.bathrooms !== 1 ? "s" : ""}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>₦{formatPrice(item.price)}</Text>
            <Text style={styles.periodText}>
              per {formatPricingPeriod(item.pricingPeriod)}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={64} color="#E5E7EB" />
      <Text style={styles.emptyTitle}>No Results Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? `No properties match "${searchQuery}"`
          : "Try adjusting your filters"}
      </Text>
      {(searchQuery || getActiveFilterCount() > 0) && (
        <Pressable style={styles.clearButton} onPress={handleClearFilters}>
          <Text style={styles.clearButtonText}>Clear All Filters</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleGoBack}>
          <ArrowLeftIcon width={24} height={24} />
        </Pressable>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <SearchIcon width={18} height={18} color="#9E9E9E" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search properties..."
            placeholderTextColor="#9E9E9E"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#9E9E9E" />
            </Pressable>
          )}
        </View>

        {/* Filter Button */}
        <Pressable
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <FilterIcon width={20} height={20} color="#7C7C7C" />
          {getActiveFilterCount() > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {getActiveFilterCount()}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {resultCount} {resultCount === 1 ? "Result" : "Results"}
        </Text>
        {getActiveFilterCount() > 0 && (
          <Pressable onPress={handleClearFilters}>
            <Text style={styles.clearFiltersText}>Clear Filters</Text>
          </Pressable>
        )}
      </View>

      {/* Results Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#192DFF" />
          <Text style={styles.loadingText}>Searching properties...</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={renderPropertyCard}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#192DFF"]}
              tintColor="#192DFF"
            />
          }
        />
      )}

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        initialFilters={activeFilters}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#000000",
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#192DFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#192DFF",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 100,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 20,
  },
  propertyCard: {
    width: CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    shadowColor: "#BEBBB7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 8,
  },
  imageContainer: {
    width: "100%",
    height: CARD_IMAGE_HEIGHT,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: "hidden",
  },
  propertyImage: {
    width: "100%",
    height: "100%",
  },
  propertyImageStyle: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  verifiedBadge: {
    position: "absolute",
    top: 8,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  favoriteButton: {
    position: "absolute",
    top: 8,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  propertyDetails: {
    padding: 12,
    gap: 6,
  },
  propertyTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000000",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  propertyLocation: {
    fontSize: 12,
    color: "#656565",
    flex: 1,
  },
  amenitiesText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#656565",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginTop: 4,
  },
  priceText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
  },
  periodText: {
    fontSize: 11,
    color: "#656565",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  clearButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#192DFF",
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  bookedBadgeOverlay: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 5,
  },
  bookedBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  titleRowSmall: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  bookedStatusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#DB2777",
  },
});

export default SearchResultsScreen;
