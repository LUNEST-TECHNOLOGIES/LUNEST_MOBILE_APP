/**
 * Search Results Screen
 * Displays search and filter results in a 2-column grid layout
 */

import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    ImageBackground,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ArrowLeftIcon from "../src/assets/icons/bookings/arrow-left.svg";
import SearchIcon from "../src/assets/icons/home/SearchIcon.svg";
import FilterIcon from "../src/assets/icons/navbar/vuesax/outline/setting-4.svg";
import ShieldTickIcon from "../src/assets/icons/shield-tick.svg";
import FilterModal from "../src/components/modals/FilterModal";
import GridListingSkeleton from "../src/components/skeletons/GridListingSkeleton";
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
  const queryClient = useQueryClient();

  // Parse initial filters from params
  const initialQuery = params?.query || "";
  const initialFilters = params?.filters ? JSON.parse(params.filters) : {};

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState(initialFilters);

  // ── Infinite Listings (React Query) ──
  const {
    data: searchPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loading,
    isRefetching: refreshing,
    refetch: onRefresh,
  } = useInfiniteQuery({
    queryKey: ["searchResults", searchQuery, activeFilters],
    queryFn: async ({ pageParam = 1 }) => {
      console.log(`[SearchResults] Fetching page ${pageParam} with query: "${searchQuery}"`, activeFilters);
      
      const baseURL = await configService.getBaseURL();

      // Build filter object for API (Adapting original logic)
      const apiFilters = {
        status: { $in: ["AVAILABLE", "BOOKED"] },
      };

      if (searchQuery && searchQuery.trim()) {
        const trimmedQuery = searchQuery.trim();
        const searchPatterns = [trimmedQuery];
        if (trimmedQuery.includes(" ")) {
          searchPatterns.push(...trimmedQuery.split(/\s+/).filter((w) => w.length >= 2));
        }
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

      if (activeFilters.location) apiFilters.city = { $regex: activeFilters.location, $options: "i" };
      if (activeFilters.minPrice) apiFilters.price = { ...apiFilters.price, $gte: activeFilters.minPrice };
      if (activeFilters.maxPrice) apiFilters.price = { ...apiFilters.price, $lte: activeFilters.maxPrice };
      if (activeFilters.categories?.length > 0) apiFilters.propertyType = { $in: activeFilters.categories };
      if (activeFilters.bedrooms > 0) apiFilters.bedrooms = { $gte: activeFilters.bedrooms };
      if (activeFilters.bathrooms > 0) apiFilters.bathrooms = { $gte: activeFilters.bathrooms };
      if (activeFilters.guests > 0) apiFilters.guests = { $gte: activeFilters.guests };

      const result = await listingService.fetchListingsByStatus(apiFilters);
      
      if (result?.success && result.listings) {
        let filteredListings = result.listings;

        // Client-side filtering as per original code
        if (activeFilters.amenities?.length > 0) {
          filteredListings = filteredListings.filter((l) =>
            activeFilters.amenities.every((a) => l.amenities?.includes(a))
          );
        }
        if (activeFilters.verifiedOnly) {
          filteredListings = filteredListings.filter((l) => l.host?.active || l.host?.hostApplicationStatus === "APPROVED");
        }
        if (activeFilters.furnished) {
          filteredListings = filteredListings.filter((l) => 
            l.furnishingStatus?.toLowerCase().includes("furnished") || 
            l.description?.toLowerCase().includes("furnished")
          );
        }

        // Standardized listing transformation
        return filteredListings.map((listing) => {
          const firstImg = (listing.propertyImages || listing.images || [])[0];
          let imageUrl = firstImg ? (typeof firstImg === "object" ? firstImg.url || firstImg.uri : firstImg) : null;
          if (imageUrl && !imageUrl.startsWith("http")) imageUrl = `${baseURL}${imageUrl}`;

          return {
            id: listing._id || listing.id,
            _id: listing._id || listing.id,
            title: listing.propertyName || listing.propertyTitle || "Property",
            location: listing.city && listing.state ? `${listing.city}, ${listing.state}` : (listing.location || listing.propertyLocation?.name || "Nigeria"),
            currencySymbol: (() => {
              const curr = listing.propertyPrice?.currency || listing.currency || "NGN";
              if (curr === "NGN" || curr === "naira") return "₦";
              if (curr === "USD" || curr === "usd") return "$";
              return "₦";
            })(),
            pricingPeriod: listing.pricingPeriod || listing.propertyPrice?.pricingPeriod || "night",
            price: listing.price || listing.propertyPrice?.price || 0,
            image: imageUrl,
            rating: listing.averageRating || listing.rating || 4.5,
            reviewCount: listing.listingReviews?.length || listing.reviews?.length || 0,
            bedrooms: listing.bedrooms || 0,
            bathrooms: listing.bathrooms || 0,
            guests: listing.guests || 0,
            isVerified: listing.host?.active === true || listing.host?.hostApplicationStatus === "APPROVED",
            status: listing.status,
            propertyType: listing.propertyType,
            amenities: listing.amenities || [],
            host: listing.host || {},
            propertyLocation: listing.propertyLocation || {},
            listingData: listing, // Keep full raw object
          };
        });
      }
      return [];
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 10 ? allPages.length + 1 : undefined;
    },
    staleTime: 2 * 60_000,
  });

  const listings = useMemo(() => {
    return searchPages?.pages.flatMap((page) => page) || [];
  }, [searchPages]);

  const resultCount = listings.length;

  // ── Bookmarks Management ──
  const { data: bookmarkMap = {} } = useInfiniteQuery({
    queryKey: ["bookmarksMap"],
    queryFn: async () => {
      const res = await bookmarkService.fetchBookmarks();
      const map = {};
      if (res.success) {
        res.bookmarks.forEach(b => {
          const id = b.listing?._id || b.listing?.id || b.listing;
          map[id] = { isBookmarked: true, bookmarkId: b._id };
        });
      }
      return map;
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ listingId, isBookmarked, bookmarkId }) => {
      return await bookmarkService.toggleBookmark(listingId, !isBookmarked, bookmarkId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarksMap"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });

  const handleFavoritePress = (listing) => {
    const status = bookmarkMap[listing.id] || { isBookmarked: false, bookmarkId: null };
    toggleFavoriteMutation.mutate({ 
      listingId: listing.id, 
      isBookmarked: status.isBookmarked, 
      bookmarkId: status.bookmarkId 
    });
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

  const handlePropertyPress = (listing) => {
    router.push({
      pathname: "/property-details",
      params: { listingId: listing.id },
    });
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
      {loading && listings.length === 0 ? (
        <FlashList
          data={[1, 2, 3, 4, 5, 6]}
          keyExtractor={(item) => item.toString()}
          renderItem={() => <GridListingSkeleton />}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          estimatedItemSize={250}
        />
      ) : (
        <FlashList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={renderPropertyCard}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          estimatedItemSize={250}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => 
            isFetchingNextPage ? (
              <ActivityIndicator size="small" color="#010135" style={{ marginVertical: 20 }} />
            ) : null
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#010135"]}
              tintColor="#010135"
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
    backgroundColor: "#010135",
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
    color: "#010135",
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
    backgroundColor: "#010135",
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
