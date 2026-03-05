import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "../../components/common/Toast";
import HomeHeader from "../../components/home/HomeHeader";
import NotificationAlert from "../../components/home/NotificationAlert";
import ProfileSetupBanner from "../../components/home/ProfileSetupBanner";
import SearchFilter from "../../components/home/SearchFilter";
import SectionHeader from "../../components/home/SectionHeader";
import TopPicksSection from "../../components/home/TopPicksSection";
import FilterModal from "../../components/modals/FilterModal";
import { CategorySlider } from "../../components/shared";
import PropertyListingCard from "../../components/shared/PropertyListingCard";
import useCachedFetch from "../../hooks/useCachedFetch";
import authService from "../../services/authService";
import bookmarkService from "../../services/bookmarkService";
import configService from "../../services/configService";
import listingService from "../../services/listingService";
import locationService from "../../services/locationService";
import profileService from "../../services/profileService";
import storageService from "../../services/storageService";

/**
 * HomeScreen - Main dashboard with Fixed Header, Search, Category & Scrollable Content
 */

const HomeScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all"); // Default to 'all' to show all listings
  const [showNotificationAlert, setShowNotificationAlert] = useState(false);
  const [showProfileSetupBanner, setShowProfileSetupBanner] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const [userId, setUserId] = useState(null);
  const [userLocation, setUserLocation] = useState("Getting location...");
  const [userCoordinates, setUserCoordinates] = useState(null);
  const [locationFetched, setLocationFetched] = useState(false);
  const [lastListingCount, setLastListingCount] = useState(0);
  const [topPicksListings, setTopPicksListings] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [bookmarkMap, setBookmarkMap] = useState({});
  const isFirstFocus = useRef(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // ── Cached explore listings (stale-while-revalidate) ──
  const {
    data: exploreListings,
    loading: loadingExplore,
    refreshing,
    onRefresh: onCachedRefresh,
  } = useCachedFetch(
    "home:exploreListings",
    fetchExploreListingsRaw, // raw fetcher defined below
    { revalidateOnFocus: true, staleTTL: 60_000 },
  );

  // Ensure exploreListings is always an array
  const safeExploreListings = exploreListings || [];

  // Filter listings by active category
  const filteredListings = useMemo(() => {
    if (!activeCategory || activeCategory === "all") {
      return safeExploreListings;
    }
    return safeExploreListings.filter((listing) => {
      const listingType =
        listing.propertyType?.toLowerCase().replace(/\s+/g, "-") || "";
      const categoryKey = activeCategory.toLowerCase();
      if (categoryKey === "others") {
        return (
          !listingType || listingType === "other" || listingType === "others"
        );
      }
      return listingType === categoryKey;
    });
  }, [safeExploreListings, activeCategory]);

  // Check notification alert on mount (device-wide, not user-specific)
  useEffect(() => {
    checkFirstTimeUser();
    // Only fetch location once on initial mount
    if (!locationFetched) {
      fetchUserLocation();
    }
    fetchNotificationCount();
  }, []);

  // Lightweight focus effect — only refreshes bookmarks + location staleness
  // Does NOT re-fetch listings (the hook handles that)
  useFocusEffect(
    useCallback(() => {
      console.log("[HomeScreen] Screen focused (lightweight)");
      setSearchQuery("");

      // Refresh location and top picks if stale (>10 min)
      const shouldRefreshLocation =
        !locationFetched ||
        Date.now() - (window.lastLocationFetch || 0) > 10 * 60 * 1000;

      if (shouldRefreshLocation) {
        fetchUserLocation(true);
        window.lastLocationFetch = Date.now();
      }

      // Only refresh bookmarks after first focus (data already loaded)
      if (!isFirstFocus.current) {
        const allListings = [...(safeExploreListings), ...topPicksListings];
        if (allListings.length > 0) {
          loadBookmarkStatuses(allListings);
        }
      }
      isFirstFocus.current = false;

      // Refresh notification count silently
      fetchNotificationCount();
    }, [safeExploreListings, topPicksListings]),
  );

  // Fetch notification count
  const fetchNotificationCount = async () => {
    try {
      // Import notification service dynamically to avoid circular deps
      const notificationService = (
        await import("../../services/notificationService")
      ).default;
      const count = await notificationService.getUnreadCount("GUEST");
      setNotificationCount(count);
    } catch (error) {
      console.log("[HomeScreen] Error fetching notification count:", error);
    }
  };

  // Fetch user's current location - only fetches if not already cached or forced
  const fetchUserLocation = async (forceRefresh = false) => {
    // Skip if already fetched and not forcing refresh
    if (locationFetched && !forceRefresh) {
      console.log("📍 [HomeScreen] Using cached location:", userLocation);
      return;
    }

    try {
      console.log("📍 [HomeScreen] Fetching user location...");
      const locationData =
        await locationService.getCurrentLocationWithAddress();

      if (locationData && locationData.address) {
        const displayLocation = locationService.formatLocationDisplay(
          locationData.address,
        );

        // Check if location actually changed significantly
        const newCity =
          locationData.address.city || locationData.address.region;
        const newState = locationData.address.state;
        const locationChanged = displayLocation !== userLocation;

        setUserLocation(displayLocation || "Nigeria");
        setLocationFetched(true);

        // Store coordinates for top picks filtering
        if (locationData.coords) {
          setUserCoordinates({
            latitude: locationData.coords.latitude,
            longitude: locationData.coords.longitude,
          });
          // Only refetch top picks if location actually changed
          if (locationChanged || !locationFetched) {
            // Use state first for broader filtering, then fallback to city
            const locationQuery = newState || newCity;
            console.log(
              "[HomeScreen] Using location for top picks:",
              locationQuery,
            );
            fetchTopPicksListings(locationQuery);
          }
        }
        console.log("✅ [HomeScreen] Location set:", displayLocation);
      } else {
        setUserLocation("Nigeria");
        setLocationFetched(true);
        if (!locationFetched) {
          fetchTopPicksListings(null);
        }
      }
    } catch (error) {
      console.log("❌ [HomeScreen] Error fetching location:", error);
      setUserLocation("Nigeria");
      setLocationFetched(true);
      if (!locationFetched) {
        fetchTopPicksListings(null);
      }
    }
  };

  // Fetch top picks near user location
  const fetchTopPicksListings = async (cityOrRegion) => {
    try {
      console.log("[HomeScreen] Fetching top picks near:", cityOrRegion);
      const baseURL = await configService.getBaseURL();

      // Build filter for location-based listings with improved location matching
      let filters = {
        status: { $in: ["AVAILABLE", "BOOKED"] },
      };

      // Add location filter only if cityOrRegion is provided
      if (cityOrRegion) {
        filters.$or = [
          { city: { $regex: cityOrRegion, $options: "i" } },
          { state: { $regex: cityOrRegion, $options: "i" } },
          {
            "propertyLocation.city": { $regex: cityOrRegion, $options: "i" },
          },
          {
            "propertyLocation.state": { $regex: cityOrRegion, $options: "i" },
          },
          { "address.city": { $regex: cityOrRegion, $options: "i" } },
          { "address.state": { $regex: cityOrRegion, $options: "i" } },
        ];
      }

      console.log("[HomeScreen] Top picks filter:", JSON.stringify(filters));
      const result = await listingService.fetchListingsByStatus(filters);

      if (
        result &&
        result.success &&
        result.listings &&
        result.listings.length > 0
      ) {
        // Limit to 5 listings for top picks
        const topPicks = result.listings.slice(0, 5).map((listing) => {
          // Get the first image URL from propertyImages
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

          return {
            id: listing._id || listing.id,
            title: listing.propertyName || "Property",
            location: (() => {
              // Build a comprehensive location string
              const locationParts = [
                listing.city,
                listing.state,
                listing.propertyLocation?.city,
                listing.propertyLocation?.state,
                listing.address?.city,
                listing.address?.state,
              ].filter(Boolean);

              // Remove duplicates and join
              const uniqueParts = [...new Set(locationParts)];
              return uniqueParts.slice(0, 2).join(", ") || "Nigeria";
            })(),
            price: listing.price || listing.propertyPrice?.price || 0,
            image: imageUrl, // Single image URL for PropertyCard
            rating: listing.rating || 4.5,
            bedrooms: listing.bedrooms,
            bathrooms: listing.bathrooms,
            status: listing.status, // Pass the status for "Booked" badge
            bookedUntil: listing.bookedUntil || null, // When the current booking ends
          };
        });
        setTopPicksListings(topPicks);
        console.log("[HomeScreen] Top picks loaded:", topPicks.length);
      } else if (cityOrRegion) {
        // If no location-specific listings found, try again without location filter
        console.log(
          "[HomeScreen] No location-specific listings found, fetching general top picks",
        );
        await fetchTopPicksListings(null);
      } else {
        setTopPicksListings([]);
        console.log("[HomeScreen] No listings available at all");
      }
    } catch (error) {
      console.error("[HomeScreen] Error fetching top picks:", error);
      setTopPicksListings([]);
    }
  };

  // Initialize user data and profile setup
  useEffect(() => {
    initializeUserData();

    // Subscribe to profile changes to update banner when user updates profile
    const unsubscribe = profileService.addListener(async (profileData) => {
      if (userId && profileData) {
        await checkProfileSetup(profileData, userId);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const checkFirstTimeUser = async () => {
    try {
      // Use device-wide key for notification alert (not user-specific)
      // This ensures the alert shows even before user is logged in
      const hasSeenNotificationAlert = await storageService.getItem(
        "hasSeenNotificationAlert",
      );
      console.log("Has seen notification alert:", hasSeenNotificationAlert);
      if (!hasSeenNotificationAlert) {
        // Show notification alert after 1 second delay
        setTimeout(() => {
          console.log("Showing notification alert");
          setShowNotificationAlert(true);
        }, 1000);
      }
    } catch (error) {
      console.log("Error checking first time user:", error);
      // Show alert anyway if there's an error checking
      setTimeout(() => setShowNotificationAlert(true), 1000);
    }
  };

  const initializeUserData = async () => {
    try {
      // Get current user data for user-specific storage
      const authData = await authService.getUserData();
      const currentUserId = authData?.id || authData?.email;
      setUserId(currentUserId);

      if (currentUserId) {
        // Get profile data which contains phone and NIN
        const profileData = await profileService.getProfileData();
        await checkProfileSetup(profileData, currentUserId);
      }
    } catch (error) {
      console.log("Error initializing user data:", error);
    }
  };

  const checkProfileSetup = async (profileData, uid) => {
    try {
      // Profile setup is complete only when:
      // 1. Phone number is provided
      // 2. NIN is provided
      // Both are stored in profileData from profileService
      const isPhoneVerified =
        !!profileData?.phone && profileData.phone.trim().length > 0;
      const isNinVerified =
        !!profileData?.nin && profileData.nin.trim().length > 0;

      const isProfileComplete = isPhoneVerified && isNinVerified;

      if (!isProfileComplete) {
        setShowProfileSetupBanner(true);
      } else {
        setShowProfileSetupBanner(false);
        // Save the completed state for this specific user
        await storageService.setUserItem(uid, "hasCompletedProfileSetup", true);
      }
    } catch (error) {
      console.log("Error checking profile setup:", error);
      // Show banner by default if there's an error checking
      setShowProfileSetupBanner(true);
    }
  };

  const handleProfileSetupPress = () => {
    // Navigate to profile edit screen
    router.push("/personal-info-edit");
  };

  const handleProfileSetupComplete = async () => {
    try {
      if (userId) {
        await storageService.setUserItem(
          userId,
          "hasCompletedProfileSetup",
          true,
        );
      }
      setShowProfileSetupBanner(false);
      console.log("Profile setup completed");
    } catch (error) {
      console.log("Error saving profile setup state:", error);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      // Use device-wide key for notification alert
      await storageService.setItem("hasSeenNotificationAlert", true);
      setShowNotificationAlert(false);
      console.log("Notifications enabled");
    } catch (error) {
      console.log("Error saving notification preference:", error);
    }
  };

  const handleSkipNotifications = async () => {
    try {
      // Use device-wide key for notification alert
      await storageService.setItem("hasSeenNotificationAlert", true);
      setShowNotificationAlert(false);
      console.log("Notifications skipped");
    } catch (error) {
      console.log("Error saving notification preference:", error);
    }
  };

  // Responsive bottom padding for nav bar
  const bottomNavHeight = screenHeight < 700 ? 70 : 85;
  const bottomPadding = bottomNavHeight + Math.max(insets.bottom, 10);

  // Pull to refresh — delegates explore listings to the cached hook
  const onRefresh = useCallback(async () => {
    fetchUserLocation(true);
    fetchNotificationCount();
    await onCachedRefresh(); // this forces a fresh fetch + sets refreshing
  }, [onCachedRefresh]);

  /**
   * Raw fetcher for explore listings — used by useCachedFetch.
   * Returns the transformed array (the hook manages the state).
   */
  async function fetchExploreListingsRaw() {
    console.log("[HomeScreen] Fetching explore listings...");
    const baseURL = await configService.getBaseURL();

    const convertImageUrl = (image) => {
      if (!image) return null;
      
      let urlString = "";
      if (typeof image === "object" && image.url) {
        urlString = image.url;
      } else if (typeof image === "string") {
        urlString = image;
      } else {
        return null;
      }

      // If URL contains /uploads/ (standard backend attachment path)
      // Strip the host prefix to ensure dynamic IP resolution across devices
      if (urlString.startsWith("http") && urlString.includes("/uploads/")) {
        const uploadIndex = urlString.indexOf("/uploads/");
        urlString = urlString.substring(uploadIndex); // Becomes "/uploads/..."
      }

      if (urlString.startsWith("http") || urlString.startsWith("file://")) {
        return urlString;
      }

      const safeBaseURL = baseURL ? baseURL.replace(/\/$/, "") : "";
      const safePath = urlString.startsWith("/") ? urlString : `/${urlString}`;
      return `${safeBaseURL}${safePath}`;
    };

    const result = await listingService.fetchAllListings({});

    if (result.success && result.listings && result.listings.length > 0) {
      const transformedListings = result.listings.map((listing) => {
        let processedImages = [];
        if (listing.propertyImages && listing.propertyImages.length > 0) {
          processedImages = listing.propertyImages
            .map(convertImageUrl)
            .filter(Boolean)
            .map((uri) => ({ uri, type: "image" }));
        }

        let processedVideos = [];
        if (listing.propertyVideos && listing.propertyVideos.length > 0) {
          processedVideos = listing.propertyVideos
            .map((v) => {
              const url = typeof v === "string" ? v : v?.url;
              return convertImageUrl(url);
            })
            .filter(Boolean)
            .map((uri) => ({ uri, type: "video" }));
        }

        // Combine media: images first, then videos
        const combinedMedia = [...processedImages, ...processedVideos];

        const buildLocationString = () => {
          if (listing.propertyLocation) {
            if (listing.propertyLocation.fullAddress) return listing.propertyLocation.fullAddress;
            const parts = [listing.propertyLocation.city, listing.propertyLocation.state].filter(Boolean);
            if (parts.length > 0) return parts.join(", ");
          }
          if (listing.address && typeof listing.address === "object") {
            const parts = [listing.address.city, listing.address.state].filter(Boolean);
            if (parts.length > 0) return parts.join(", ");
          }
          const directParts = [listing.city, listing.state].filter(Boolean);
          if (directParts.length > 0) return directParts.join(", ");
          return listing.address || "Unknown Location";
        };

        return {
          id: listing._id || listing.id,
          images:
            combinedMedia.length > 0
              ? combinedMedia
              : [require("../../assets/images/prop_image.png")],
          title: listing.propertyName || listing.propertyTitle || "Untitled",
          location: buildLocationString(),
          price: listing.propertyPrice?.price || listing.price || 0,
          currency: (() => {
            const curr = listing.propertyPrice?.currency || listing.currency || "NGN";
            if (curr === "NGN" || curr === "naira") return "₦";
            if (curr === "USD" || curr === "usd") return "$";
            if (curr === "GBP" || curr === "gbp") return "£";
            if (curr === "EUR" || curr === "eur") return "€";
            return curr;
          })(),
          pricingPeriod: listing.pricingPeriod || listing.propertyPrice?.pricingPeriod || "night",
          securityDeposit: listing.securityDeposit || listing.propertyPrice?.securityDeposit || 0,
          cleaningFee: listing.cleaningFee || listing.propertyPrice?.cleaningFee || 0,
          rating: listing.rating || 4.5,
          isVerified: listing.host?.active === true,
          isAvailable: listing.status === "AVAILABLE",
          isFavorite: false,
          status: listing.status, // Pass the status for availability badge
          amenities: listing.amenities || [],
          host: listing.host || {},
          propertyType: listing.propertyType,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          guests: listing.guests,
          description: listing.description,
          listingData: listing,
        };
      });

      console.log("[HomeScreen] Loaded", transformedListings.length, "explore listings");
      // Load bookmarks in background — don't block the return
      loadBookmarkStatuses(transformedListings);
      return transformedListings;
    }

    console.log("[HomeScreen] No listings available");
    return [];
  }

  const handleNotificationPress = () => {
    console.log("Notifications pressed");
    router.push({
      pathname: "/notifications",
      params: { userType: "GUEST" },
    });
  };

  // Load bookmark statuses for all listings
  const loadBookmarkStatuses = async (listings) => {
    try {
      console.log(
        "[HomeScreen] Loading bookmark statuses for",
        listings.length,
        "listings",
      );
      const newBookmarkMap = {};

      // Check each listing to see if it's bookmarked
      for (const listing of listings) {
        const bookmarkStatus = await bookmarkService.isListingBookmarked(
          listing.id,
        );
        newBookmarkMap[listing.id] = bookmarkStatus;
        console.log(
          "[HomeScreen] Listing",
          listing.id,
          "bookmarked:",
          bookmarkStatus.isBookmarked,
        );
      }

      setBookmarkMap(newBookmarkMap);
    } catch (error) {
      console.error("[HomeScreen] Error loading bookmark statuses:", error);
    }
  };

  const handleLocationPress = async () => {
    console.log("Location pressed - refreshing location...");
    setUserLocation("Getting location...");
    await fetchUserLocation();
  };

  const handleFilterPress = () => {
    console.log("Filter pressed - opening filter modal");
    setShowFilterModal(true);
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      console.log("[HomeScreen] Search submitted:", searchQuery);
      router.push({
        pathname: "/search-results",
        params: {
          query: searchQuery.trim(),
          filters: JSON.stringify(activeFilters),
        },
      });
    }
  };

  const handleApplyFilters = (filters) => {
    console.log("[HomeScreen] Applying filters:", filters);
    setActiveFilters(filters);
    setShowFilterModal(false);

    // Navigate to search results with filters
    router.push({
      pathname: "/search-results",
      params: {
        query: searchQuery.trim(),
        filters: JSON.stringify(filters),
      },
    });
  };

  const clearAllFilters = () => {
    setActiveFilters({});
  };

  const handleCategoryPress = (categoryKey) => {
    setActiveCategory(categoryKey);
    console.log("Category selected:", categoryKey);
  };

  // Remove old EXPLORE_PROPERTIES constant
  // Now using exploreListings from state fetched from API

  // Scrollable content below fixed header
  const renderScrollableContent = () => (
    <>
      {/* Profile Setup Banner */}
      <ProfileSetupBanner
        visible={showProfileSetupBanner}
        onPress={handleProfileSetupPress}
      />

      {/* Top Picks Near You Section */}
      <TopPicksSection
        externalListings={topPicksListings}
        bookmarkMap={bookmarkMap}
        onPropertyPress={(property) => {
          console.log("View property:", property.id);
          // Navigate to property details from Top Picks
          router.push({
            pathname: "/property-details",
            params: {
              listingId: property.id,
            },
          });
        }}
        onFavoritePress={async (id, isFavorite) => {
          console.log(
            "[HomeScreen] Top Picks favorite pressed:",
            id,
            "new state:",
            isFavorite,
          );
          try {
            // Get current bookmark status for this listing
            const currentStatus = bookmarkMap[id] || {
              isBookmarked: false,
              bookmarkId: null,
            };

            console.log(
              "[HomeScreen] Current bookmark status:",
              currentStatus.isBookmarked,
            );

            // Toggle bookmark via service - pass CURRENT state, not the new state
            const result = await bookmarkService.toggleBookmark(
              id,
              currentStatus.isBookmarked,
              currentStatus.bookmarkId,
            );

            if (result.success) {
              // Update bookmark map
              const updatedStatus =
                await bookmarkService.isListingBookmarked(id);
              setBookmarkMap((prev) => ({
                ...prev,
                [id]: updatedStatus,
              }));
              console.log(
                "[HomeScreen] Top Picks bookmark toggled successfully",
                result.action,
              );
              // Show success toast
              if (result.action === "added") {
                setToastMessage("Property saved to favorites");
                setToastType("success");
              } else {
                setToastMessage("Property removed from favorites");
                setToastType("info");
              }
              setShowToast(true);
            } else {
              console.error("[HomeScreen] Failed to toggle top picks bookmark");
              setToastMessage(result.message || "Failed to update bookmark");
              setToastType("error");
              setShowToast(true);
            }
          } catch (error) {
            console.error(
              "[HomeScreen] Error toggling top picks favorite:",
              error,
            );
            setToastMessage("Failed to update bookmark");
            setToastType("error");
            setShowToast(true);
          }
        }}
        onSeeAllPress={() => console.log("See all top picks")}
      />

      {/* Explore Now Section Header */}
      <SectionHeader title="Explore now" icon="compass" showSeeAll={false} />
    </>
  );

  // Empty state component for explore listings
  const renderExploreEmptyState = () => (
    <View style={styles.exploreEmptyState}>
      <Text style={styles.exploreEmptyTitle}>No Listings Available</Text>
      <Text style={styles.exploreEmptySubtext}>
        No properties match your search criteria.
      </Text>
      <Text style={styles.exploreEmptyHint}>
        Try adjusting your filters or check back later
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Notification Permission Alert - Modal overlay */}
      <NotificationAlert
        visible={showNotificationAlert}
        onEnable={handleEnableNotifications}
        onSkip={handleSkipNotifications}
        onClose={handleSkipNotifications}
      />

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        initialFilters={activeFilters}
      />

      {/* FIXED HEADER - Does not scroll */}
      <View style={styles.fixedHeader}>
        {/* Header with Location & Notification */}
        <HomeHeader
          location={userLocation}
          notificationCount={notificationCount}
          onNotificationPress={handleNotificationPress}
          onLocationPress={handleLocationPress}
        />

        {/* Search & Filter */}
        <SearchFilter
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFilterPress={handleFilterPress}
          onSubmit={handleSearchSubmit}
          activeFilterCount={
            Object.keys(activeFilters).filter(
              (key) =>
                activeFilters[key] &&
                (Array.isArray(activeFilters[key])
                  ? activeFilters[key].length > 0
                  : true),
            ).length
          }
        />

        {/* Category Slider */}
        <CategorySlider
          activeCategory={activeCategory}
          onCategoryPress={handleCategoryPress}
        />
      </View>

      {/* SCROLLABLE CONTENT */}
      <FlatList
        data={filteredListings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const bookmarkStatus = bookmarkMap[item.id] || {
            isBookmarked: false,
            bookmarkId: null,
          };

          return (
            <PropertyListingCard
              {...item}
              isFavorite={bookmarkStatus.isBookmarked}
              onPress={() => {
                console.log(
                  "[HomeScreen] Card pressed, navigating to property:",
                  item.id,
                );
                try {
                  router.push({
                    pathname: "/property-details",
                    params: {
                      listingId: item.id,
                    },
                  });
                } catch (err) {
                  console.error("[HomeScreen] Navigation error:", err);
                }
              }}
              onFavoritePress={async (id, isFavorite) => {
                console.log(
                  "[HomeScreen] Favorite pressed:",
                  id,
                  "new state:",
                  isFavorite,
                );
                try {
                  // Get current bookmark status for this listing
                  const currentBookmarkStatus = bookmarkMap[id] || {
                    isBookmarked: false,
                    bookmarkId: null,
                  };

                  console.log(
                    "[HomeScreen] Current bookmark status:",
                    currentBookmarkStatus.isBookmarked,
                  );

                  // Toggle bookmark via service - pass CURRENT state, not the new state
                  const result = await bookmarkService.toggleBookmark(
                    id,
                    currentBookmarkStatus.isBookmarked,
                    currentBookmarkStatus.bookmarkId,
                  );

                  if (result.success) {
                    // Update bookmark map
                    const updatedStatus =
                      await bookmarkService.isListingBookmarked(id);
                    setBookmarkMap((prev) => ({
                      ...prev,
                      [id]: updatedStatus,
                    }));
                    console.log(
                      "[HomeScreen] Bookmark toggled successfully",
                      result.action,
                    );
                    // Show success toast
                    if (result.action === "added") {
                      setToastMessage("Property saved to favorites");
                      setToastType("success");
                    } else {
                      setToastMessage("Property removed from favorites");
                      setToastType("info");
                    }
                    setShowToast(true);
                  } else {
                    console.error("[HomeScreen] Failed to toggle bookmark");
                    setToastMessage(
                      result.message || "Failed to update bookmark",
                    );
                    setToastType("error");
                    setShowToast(true);
                  }
                } catch (error) {
                  console.error("[HomeScreen] Error toggling favorite:", error);
                  setToastMessage("Failed to update bookmark");
                  setToastType("error");
                  setShowToast(true);
                }
              }}
            />
          );
        }}
        ListHeaderComponent={renderScrollableContent}
        ListEmptyComponent={
          loadingExplore ? null : filteredListings.length === 0 &&
            exploreListings.length > 0 ? (
            // No listings for this category
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>
                No{" "}
                {activeCategory === "all"
                  ? ""
                  : activeCategory.replace(/-/g, " ")}{" "}
                properties found
              </Text>
              <Text style={styles.emptyStateText}>
                Try selecting a different category or check back later.
              </Text>
            </View>
          ) : (
            renderExploreEmptyState
          )
        }
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#010135"]}
            tintColor="#010135"
          />
        }
      />

      {/* Toast notification */}
      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastType}
        onHide={() => setShowToast(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  fixedHeader: {
    backgroundColor: "#FFFFFF",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  exploreEmptyState: {
    paddingVertical: 80,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  exploreEmptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  exploreEmptyTitle: {
    fontSize: 18,
    fontWeight: "700",

    color: "#292929",
    marginBottom: 8,
    textAlign: "center",
  },
  exploreEmptySubtext: {
    fontSize: 14,
    fontWeight: "500",

    color: "#6D6D6D",
    textAlign: "center",
    marginBottom: 6,
  },
  exploreEmptyHint: {
    fontSize: 12,
    fontWeight: "400",

    color: "#ABABAB",
    textAlign: "center",
  },
});

export default HomeScreen;
