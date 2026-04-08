import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import bookmarkService from "../../services/bookmarkService";
import configService from "../../services/configService";
import * as ImageUtils from "../../utils/imageUtils";


import EmptyState from "../../components/common/EmptyState";

const SavedScreen = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("saved");
  const [baseURL, setBaseURL] = useState("");
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    configService.getBaseURL().then(setBaseURL);
  }, []);

  // ── Data Fetching (React Query) ──
  const {
    data: bookmarks = [],
    isLoading: loading,
    isRefetching: refreshing,
    refetch,
  } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: async () => {
      const result = await bookmarkService.fetchBookmarks();
      return result.success ? result.bookmarks : [];
    },
    staleTime: 5 * 60_000,
  });

  // ── Mutation for Removing Bookmark ──
  const removeBookmarkMutation = useMutation({
    mutationFn: async ({ bookmarkId }) => {
      return await bookmarkService.deleteBookmark(bookmarkId);
    },
    onMutate: async ({ bookmarkId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["bookmarks"] });
      // Snapshot the previous value
      const previousBookmarks = queryClient.getQueryData(["bookmarks"]);
      // Optimistically update to the new value
      queryClient.setQueryData(["bookmarks"], (old) =>
        old ? old.filter((b) => b._id !== bookmarkId) : []
      );
      return { previousBookmarks };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["bookmarks"], context.previousBookmarks);
      Alert.alert("Error", "Failed to remove property from saved");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
    onSuccess: (data, variables) => {
      Alert.alert("Removed", `${variables.listingTitle} has been removed from saved`);
    },
  });

  const handleRefresh = () => {
    refetch();
  };

  const handleRemoveBookmark = (bookmarkId, listingTitle) => {
    removeBookmarkMutation.mutate({ bookmarkId, listingTitle });
  };

  const handleViewDetails = (listingId) => {
    console.log("[SavedScreen] Navigating to property:", listingId);
    router.push({
      pathname: "/property-details",
      params: { listingId },
    });
  };

  const convertImageUrl = (image) => {
    return ImageUtils.resolveImageUrlSync(image, baseURL);
  };

  const getListingImage = (listing) => {
    if (!listing) return null;

    if (listing.propertyImages && listing.propertyImages.length > 0) {
      return convertImageUrl(listing.propertyImages[0]);
    }
    if (listing.images && listing.images.length > 0) {
      return convertImageUrl(listing.images[0]);
    }
    if (listing.coverImage) {
      return convertImageUrl(listing.coverImage);
    }
    return null;
  };

  const formatPrice = (price) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const renderEmptyState = () => {
    const isRecent = activeTab === "recent";
    return (
      <EmptyState
        title={isRecent ? "No Recently Viewed" : "No Saved Properties"}
        message={
          isRecent
            ? "Properties you view while exploring will appear here for easy access."
            : "Properties you save while exploring will appear here for easy access."
        }
        buttonTitle="Explore Properties"
        onPress={() => router.replace("/(tabs)")}
      />
    );
  };

  const renderBookmarkItem = ({ item, index }) => {
    const listing = item.listing;
    if (!listing) {
      console.warn("[SavedScreen] Bookmark item has no listing:", item);
      return null;
    }

    const imageError = imageErrors[item._id] || false;
    const imageUrl = !imageError ? getListingImage(listing) : null;
    const title =
      listing.propertyTitle ||
      listing.propertyName ||
      listing.title ||
      "Untitled Property";
    const address =
      listing.propertyLocation?.fullAddress ||
      listing.address ||
      listing.location ||
      "Location not specified";

    const handleImageError = () => {
      setImageErrors((prev) => ({ ...prev, [item._id]: true }));
    };

    return (
      <View 
        style={styles.savedCard}
      >
        <Pressable onPress={() => handleViewDetails(listing._id)}>
          <View style={styles.imageContainer}>
            {imageUrl && !imageError ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.listingImage}
                onError={handleImageError}
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="image-outline" size={40} color="#9CA3AF" />
              </View>
            )}
            {/* Booked Status Badge */}
            {listing.status === "BOOKED" && (
              <View style={styles.bookedBadgeOverlay}>
                <Text style={styles.bookedBadgeText}>Booked</Text>
              </View>
            )}
            <Pressable
              style={styles.bookmarkIcon}
              onPress={() => handleRemoveBookmark(item._id, title)}
            >
              <Ionicons name="heart" size={24} color="#FF0000" />
            </Pressable>
          </View>
        </Pressable>

        <View style={styles.cardContent}>
          <View style={styles.titleRowSmall}>
            <Text style={styles.listingTitle} numberOfLines={1}>
              {title}
            </Text>
            {listing.status === "BOOKED" && (
              <View style={styles.bookedStatusIndicator} />
            )}
          </View>
          <View style={styles.featuresRow}>
            <View style={styles.featureItem}>
              <Ionicons name="bed" size={12} color="#6B7280" />
              <Text style={styles.listingFeatures}>
                {listing.bedrooms || 0} Bedroom
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="water" size={12} color="#6B7280" />
              <Text style={styles.listingFeatures}>
                {listing.bathrooms || 0} Bathroom
              </Text>
            </View>
          </View>
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.price}>
                {formatPrice(listing.price || listing.rent)}
              </Text>
              <Text style={styles.perYear}>
                {listing.rentFrequency || "per Year"}
              </Text>
            </View>
          </View>
          <Pressable
            style={styles.viewDetailsButton}
            onPress={() => handleViewDetails(listing._id)}
          >
            <Text style={styles.viewDetailsText}>View details</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Saved</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#192DFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, activeTab === "recent" && styles.tabInactive]}
          onPress={() => setActiveTab("recent")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "recent"
                ? styles.tabTextInactive
                : styles.tabTextActive,
            ]}
          >
            Recently Viewed
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "saved" && styles.tabActive]}
          onPress={() => {
            setActiveTab("saved");
          }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "saved"
                ? styles.tabTextActive
                : styles.tabTextInactive,
            ]}
          >
            Saved Listings
          </Text>
          {activeTab === "saved" && <View style={styles.tabIndicator} />}
        </Pressable>
      </View>

      <FlatList
        data={activeTab === "saved" ? bookmarks : []}
        renderItem={renderBookmarkItem}
        keyExtractor={(item) => item._id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#192DFF"]}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tab: {
    alignItems: "center",
    paddingBottom: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#192DFF",
  },
  tabInactive: {},
  tabText: {
    fontSize: 14,
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#192DFF",
  },
  tabTextInactive: {
    color: "#6D6D6D",
  },
  tabIndicator: {
    position: "absolute",
    bottom: -1,
    height: 2,
    width: "100%",
    backgroundColor: "#192DFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 20,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 20,
  },
  savedCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 150,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: "hidden",
  },
  listingImage: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  bookmarkIcon: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    padding: 6,
  },
  cardContent: {
    padding: 12,
    gap: 6,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  listingLocation: {
    fontSize: 12,
    color: "#6B7280",
  },
  listingFeatures: {
    fontSize: 11,
    color: "#6B7280",
  },
  priceRow: {
    marginTop: 4,
  },
  price: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  perYear: {
    fontSize: 11,
    color: "#6B7280",
  },
  viewDetailsButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#111827",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  viewDetailsText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#111827",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
  },
  exploreButton: {
    backgroundColor: "#192DFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  exploreButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
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
  featuresRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 2,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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

export default SavedScreen;
