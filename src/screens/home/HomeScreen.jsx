import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlashList } from "@shopify/flash-list";
import {
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  Platform,
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
import { useProgressiveLoading } from "../../hooks/useDelayedLoading";
import authService from "../../services/authService";
import bookmarkService from "../../services/bookmarkService";
import configService from "../../services/configService";
import listingService from "../../services/listingService";
import locationService from "../../services/locationService";
import profileService from "../../services/profileService";
import storageService from "../../services/storageService";
import * as ImageUtils from "../../utils/imageUtils";
import { buildAPIFilters, formatParsedFilters, parseSearchQuery } from "../../utils/smartSearchParser";


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
    { revalidateOnFocus: false, staleTTL: 5 * 60_000 }, // 5 minutes, no focus revalidation
  );

  // Ensure exploreListings is always an array
  const safeExploreListings = exploreListings || [];

  // Progressive loading: delay skeleton on first load ONLY, never during refresh
  const { showSkeleton, isRefreshing } = useProgressiveLoading(
    safeExploreListings,
    loadingExplore,
    { skeletonDelay: 300 }
  );
  
  // Never show skeleton if we already have data (prevents flicker during refresh)
  const shouldShowSkeleton = showSkeleton && safeExploreListings.length === 0;



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

  // Load bookmark statuses when listings change
  useEffect(() => {
    if (safeExploreListings.length > 0 || topPicksListings.length > 0) {
      const allListings = [...(safeExploreListings), ...topPicksListings];
      if (allListings.length > 0) {
        loadBookmarkStatuses(allListings);
      }
    }
  }, [safeExploreListings, topPicksListings]);

  // Simplified focus effect - minimal refreshes to prevent glitching
  useFocusEffect(
    useCallback(() => {
      console.log("[HomeScreen] Screen focused");
      setSearchQuery("");

      // Only refresh notification count silently
      fetchNotificationCount();
    }, []),
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
  // Cross-platform compatible with iOS, Android, and Web
  const fetchUserLocation = async (forceRefresh = false) => {
    // Skip if already fetched and not forcing refresh
    if (locationFetched && !forceRefresh) {
      console.log("📍 [HomeScreen] Using cached location:", userLocation);
      return;
    }

    try {
      console.log("📍 [HomeScreen] Fetching user location (cross-platform)...");
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
        console.log("📍 [HomeScreen] Location display:", displayLocation);

        // Store coordinates for top picks filtering (distance calculation)
        if (locationData.coords && locationData.coords.latitude && locationData.coords.longitude) {
          setUserCoordinates({
            latitude: locationData.coords.latitude,
            longitude: locationData.coords.longitude,
          });
          console.log(
            "📍 [HomeScreen] Coordinates set:",
            `${locationData.coords.latitude.toFixed(4)}, ${locationData.coords.longitude.toFixed(4)}`,
          );
        } else {
          console.warn("⚠️ [HomeScreen] No device coordinates available, using city fallback...");
          // Fallback: Geocode the locationQuery to get representative coordinates
          const locationQuery = newState || newCity;
          
          // Only attempt if we don't have coordinates already OR if location actually changed
          if (locationQuery && (!userCoordinates || locationChanged)) {
            try {
              const fallbackCoords = await locationService.getCoordinatesFromAddress(locationQuery);
              if (fallbackCoords) {
                setUserCoordinates(fallbackCoords);
                console.log("✅ [HomeScreen] City fallback coordinates obtained:", locationQuery);
              }
            } catch (e) {
              console.error("❌ [HomeScreen] City fallback geocoding failed:", e);
            }
          } else if (userCoordinates) {
             console.log("📍 [HomeScreen] Using existing coordinates for fallback");
          }
        }

        // Only refetch top picks if location actually changed or first time
        if (locationChanged || !locationFetched) {
          // Use state first for broader filtering, then fallback to city
          const locationQuery = newState || newCity;
          console.log(
            "🔍 [HomeScreen] Filtering top picks by location:",
            locationQuery,
          );
          fetchTopPicksListings(locationQuery);
        } else {
          console.log("[HomeScreen] Location unchanged, skipping top picks refresh");
        }
      } else {
        console.warn(
          "⚠️ [HomeScreen] No address data found, using fallback location",
        );
        setUserLocation("Nigeria");
        setLocationFetched(true);
        if (!locationFetched) {
          fetchTopPicksListings(null);
        }
      }
    } catch (error) {
      console.error(
        "❌ [HomeScreen] Error fetching location (may be permission denied or service unavailable):",
        error.message,
      );
      // Fallback to default location
      setUserLocation("Nigeria");
      setLocationFetched(true);
      console.log(
        "ℹ️ [HomeScreen] Using fallback location. Top picks will show all AVAILABLE/BOOKED listings.",
      );
      // Fetch top picks without location filter
      if (!locationFetched) {
        fetchTopPicksListings(null);
      }
    }
  };

  // Helper: Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // Distance in km, rounded to 1 decimal
  };

  // Fetch top picks near user location
  // Includes distance calculation if coordinates available
  // Falls back to all AVAILABLE/BOOKED listings if location filter returns no results
  const fetchTopPicksListings = async (cityOrRegion) => {
    try {
      console.log(
        "🔍 [HomeScreen] Fetching top picks near:",
        cityOrRegion || "No location (all listings)",
      );
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
        console.log(
          "📍 [HomeScreen] Location filter applied:",
          cityOrRegion,
        );
      } else {
        console.log(
          "📍 [HomeScreen] No location filter - showing all AVAILABLE/BOOKED listings",
        );
      }

      const result = await listingService.fetchListingsByStatus(filters);

      if (
        result &&
        result.success &&
        result.listings &&
        result.listings.length > 0
      ) {
        console.log(
          "✅ [HomeScreen] Found",
          result.listings.length,
          "listings matching filter",
        );

        // Calculate distances for proximity-based sorting if user coordinates available
        let listingsWithDistance = result.listings.map((listing) => {
          let distance = null;
          if (
            userCoordinates &&
            userCoordinates.latitude &&
            userCoordinates.longitude
          ) {
            const listingLat =
              listing.propertyLocation?.latitude || listing.latitude;
            const listingLon =
              listing.propertyLocation?.longitude || listing.longitude;
            if (listingLat != null && listingLon != null) {
              distance = calculateDistance(
                userCoordinates.latitude,
                userCoordinates.longitude,
                listingLat,
                listingLon,
              );
            }
          }
          return { ...listing, distance };
        });

        // Sort by distance if available, otherwise keep original order
        if (userCoordinates && userCoordinates.latitude) {
          listingsWithDistance = listingsWithDistance.sort(
            (a, b) =>
              (a.distance ?? Infinity) - (b.distance ?? Infinity),
          );
          console.log(
            "📏 [HomeScreen] Sorted by distance. Nearest:",
            listingsWithDistance[0]?.distance,
            "km",
          );
        } else {
          console.log(
            "⚠️ [HomeScreen] User coordinates unavailable - showing unordered listings",
          );
        }

        // Limit to 5 listings for top picks
        const topPicks = listingsWithDistance.slice(0, 5).map((listing) => {
          // Get the first image URL from propertyImages
          let imageUrl = null;
          if (listing.propertyImages && listing.propertyImages.length > 0) {
            imageUrl = ImageUtils.resolveImageUrlSync(
              listing.propertyImages[0],
              baseURL,
            );
          }

          return {
            id: listing._id || listing.id,
            title: listing.propertyName || "Property",
            location: (() => {
              // Get city and state from various possible locations
              const city = listing.city || listing.propertyLocation?.city;
              const state = listing.state || listing.propertyLocation?.state;
              
              // Build location string prioritizing city and state
              if (city && state) {
                return `${city}, ${state}`;
              } else if (city) {
                return city;
              } else if (state) {
                return state;
              } else {
                // Fallback to other location fields
                const locationParts = [
                  listing.address?.city,
                  listing.address?.state,
                  listing.propertyLocation?.fullAddress,
                  listing.address,
                ].filter(Boolean);

                const uniqueParts = [...new Set(locationParts)];
                return uniqueParts.slice(0, 2).join(", ") || "Nigeria";
              }
            })(),
            price: listing.price || listing.propertyPrice?.price || 0,
            image: imageUrl, // Single image URL for PropertyCard
            rating: listing.averageRating || listing.rating || null,
            bedrooms: listing.bedrooms,
            bathrooms: listing.bathrooms,
            amenities: listing.amenities || [],
            status: listing.status, // Pass the status for "Booked" badge
            bookedUntil: listing.bookedUntil || null, // When the current booking ends
            distance: listing.distance, // Include distance for debugging
          };
        });
        setTopPicksListings(topPicks);
        console.log(
          "🎯 [HomeScreen] Top picks ready:",
          topPicks.length,
          "properties",
        );
      } else if (cityOrRegion) {
        // If no location-specific listings found, try again without location filter
        console.warn(
          "⚠️ [HomeScreen] No listings found for location:",
          cityOrRegion,
          "- Trying with all listings...",
        );
        await fetchTopPicksListings(null);
      } else {
        setTopPicksListings([]);
        console.log(
          "ℹ️ [HomeScreen] No listings available (status: AVAILABLE or BOOKED)",
        );
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
  // Debounce navigation to prevent double-taps
  const navigationTimeoutRef = useRef(null);
  
  const navigateToPropertyDetails = useCallback((listingId) => {
    if (navigationTimeoutRef.current) {
      console.log("[HomeScreen] Navigation debounced, ignoring tap");
      return;
    }
    
    navigationTimeoutRef.current = setTimeout(() => {
      navigationTimeoutRef.current = null;
    }, 300);
    
    console.log("[HomeScreen] Navigating to property details:", listingId);
    router.push({
      pathname: "/property-details",
      params: { listingId },
    });
  }, [router]);

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
      return ImageUtils.resolveImageUrlSync(image, baseURL);
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
          const city = listing.city || listing.propertyLocation?.city;
          const state = listing.state || listing.propertyLocation?.state;
          
          if (city && state) {
            return `${city}, ${state}`;
          } else if (city) {
            return city;
          } else if (state) {
            return state;
          } else {
            // Try to extract from address field
            const address = listing.address || listing.propertyLocation?.fullAddress;
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
          rating: listing.averageRating || listing.rating || null,
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

  // Load bookmark statuses for all listings (Optimized Batch Version)
  const loadBookmarkStatuses = async (listings) => {
    try {
      if (!listings || listings.length === 0) return;

      console.log(
        "[HomeScreen] Loading bookmark statuses (Batch) for",
        listings.length,
        "listings",
      );
      
      const listingIds = listings.map(l => l.id || l._id).filter(Boolean);
      if (listingIds.length === 0) return;

      const result = await bookmarkService.checkBatchBookmarks(listingIds);
      
      if (result.success) {
        setBookmarkMap((prevMap) => ({
          ...prevMap,
          ...result.statuses
        }));
      }
    } catch (error) {
      console.error("[HomeScreen] Error loading batch bookmark statuses:", error);
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
      
      // Parse search query for smart filters
      const parsed = parseSearchQuery(searchQuery.trim());
      console.log("[HomeScreen] Parsed search:", parsed);
      
      // Build combined filters from parsed query + active filters
      const smartFilters = buildAPIFilters(parsed);
      const combinedFilters = {
        ...activeFilters,
        ...smartFilters,
        // Override with explicit filters if they exist
        bedrooms: smartFilters.bedrooms || activeFilters.bedrooms,
        bathrooms: smartFilters.bathrooms || activeFilters.bathrooms,
        location: smartFilters.location || activeFilters.location,
        minPrice: smartFilters.minPrice || activeFilters.minPrice,
        maxPrice: smartFilters.maxPrice || activeFilters.maxPrice,
        categories: smartFilters.categories?.length > 0 
          ? smartFilters.categories 
          : activeFilters.categories || [],
        amenities: smartFilters.amenities?.length > 0
          ? [...new Set([...(activeFilters.amenities || []), ...smartFilters.amenities])]
          : activeFilters.amenities || [],
        furnished: smartFilters.furnished || activeFilters.furnished || false,
        verifiedOnly: smartFilters.verifiedOnly || activeFilters.verifiedOnly || false,
      };
      
      console.log("[HomeScreen] Combined filters:", combinedFilters);
      
      router.push({
        pathname: "/search-results",
        params: {
          query: parsed.cleanQuery || searchQuery.trim(),
          filters: JSON.stringify(combinedFilters),
          smartFilters: JSON.stringify(smartFilters),
          parsedFilterSummary: formatParsedFilters(smartFilters),
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
    triggerHaptic('selection');
    setActiveCategory(categoryKey);
    console.log("Category selected:", categoryKey);
  };

  // Remove old EXPLORE_PROPERTIES constant
  // Now using exploreListings from state fetched from API

  const bookmarkMapRef = useRef(bookmarkMap);
  useEffect(() => {
    bookmarkMapRef.current = bookmarkMap;
  }, [bookmarkMap]);

  const handleItemPress = useCallback((id) => {
    console.log("[HomeScreen] Card pressed, navigating to property:", id);
    try {
      navigateToPropertyDetails(id);
    } catch (err) {
      console.error("[HomeScreen] Navigation error:", err);
    }
  }, [navigateToPropertyDetails]);

  const handleFavoritePress = useCallback(async (id, isFavorite) => {
    console.log("[HomeScreen] Favorite pressed:", id, "new state:", isFavorite);
    try {
      const currentMap = bookmarkMapRef.current;
      const currentBookmarkStatus = currentMap[id] || { isBookmarked: false, bookmarkId: null };

      const result = await bookmarkService.toggleBookmark(
        id,
        currentBookmarkStatus.isBookmarked,
        currentBookmarkStatus.bookmarkId
      );

      if (result.success) {
        const updatedStatus = await bookmarkService.isListingBookmarked(id);
        setBookmarkMap((prev) => ({
          ...prev,
          [id]: updatedStatus,
        }));
        setToastMessage(result.action === "added" ? "Property saved to favorites" : "Property removed from favorites");
        setToastType(result.action === "added" ? "success" : "info");
        setShowToast(true);
      } else {
        setToastMessage(result.message || "Failed to update bookmark");
        setToastType("error");
        setShowToast(true);
      }
    } catch (error) {
      console.error("[HomeScreen] Error toggling favorite:", error);
      setToastMessage("Failed to update bookmark");
      setToastType("error");
      setShowToast(true);
    }
  }, []);

  const renderItem = useCallback(({ item, index }) => {
    const currentBookmarkStatus = bookmarkMap[item.id] || { isBookmarked: false, bookmarkId: null };
    return (
      <View>
        <PropertyListingCard
          {...item}
          isFavorite={currentBookmarkStatus.isBookmarked}
          onPress={handleItemPress}
          onFavoritePress={handleFavoritePress}
        />
      </View>
    );
  }, [bookmarkMap, handleItemPress, handleFavoritePress]);

  // Scrollable content below fixed header
  const renderScrollableContent = () => (
    <>
      {/* Profile Setup Banner */}
      <ProfileSetupBanner
        visible={showProfileSetupBanner}
        onPress={handleProfileSetupPress}
      />

      {/* Top Picks Near You Section - ONLY show when category is 'all' */}
      {(activeCategory === "all" || !activeCategory) && (
        <TopPicksSection
          externalListings={topPicksListings}
          bookmarkMap={bookmarkMap}
          onPropertyPress={(property) => {
            console.log("View property:", property.id);
            console.log("[HomeScreen] Property data structure:", {
              id: property.id,
              _id: property._id,
              latitude: property.latitude,
              longitude: property.longitude,
              propertyLocation: property.propertyLocation,
            });
            // Navigate to property details from Top Picks
            navigateToPropertyDetails(property.id);
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
      )}

      {/* Explore Now Section Header */}
      <SectionHeader title="Explore now" icon="compass" showSeeAll={false} />
    </>
  );

  // Empty state component for explore listings
  const renderExploreEmptyState = () => (
    <EmptyState 
      title="No Properties Found"
      message="We couldn't find any listings matching your current filters. Try adjusting them to see more options."
      buttonTitle="Clear All Filters"
      onPress={clearAllFilters}
    />
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
      <View
        style={[
          styles.headerContainer,
        ]}
      >
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
          activeFilters={activeFilters}
          onClearFilter={(filterKey) => {
            if (filterKey === 'all') {
              setActiveFilters({});
            } else {
              setActiveFilters(prev => {
                const newFilters = { ...prev };
                delete newFilters[filterKey];
                return newFilters;
              });
            }
          }}
        />

        {/* Category Slider */}
        <CategorySlider
          activeCategory={activeCategory}
          onCategoryPress={handleCategoryPress}
          availableListings={safeExploreListings}
        />
      </View>

      {/* SCROLLABLE CONTENT */}
      <View style={{ flex: 1 }}>
        <FlashList
        data={filteredListings}
        keyExtractor={(item) => item.id}
        extraData={bookmarkMap} // Re-render when bookmarks change
        estimatedItemSize={320}
        renderItem={renderItem}
        ListHeaderComponent={renderScrollableContent}
        ListEmptyComponent={
          shouldShowSkeleton ? (
            // Show improved skeleton loading on first load only (delayed 300ms)
            <>
              <PropertyListingCardSkeleton />
              <PropertyListingCardSkeleton />
              <PropertyListingCardSkeleton />
            </>
          ) : filteredListings.length === 0 && safeExploreListings.length > 0 ? (
            // No listings for this category
            <EmptyState 
              title="Category Empty"
              message={`We don't have any ${activeCategory.replace(/-/g, " ")} properties right now. Check back soon!`}
              buttonTitle="View All Categories"
              onPress={() => setActiveCategory('all')}
            />
          ) : (
            <EmptyState 
              title="No Listings Near You"
              message="Your current location didn't return any nearby properties. Search for a different area to find a place."
              buttonTitle="Change Location"
              onPress={handleLocationPress}
            />
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
      </View>

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
