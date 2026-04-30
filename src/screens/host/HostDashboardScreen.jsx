/**
 * Host Dashboard Screen
 * Main screen for hosts showing overview of their listings and bookings
 * Matches Figma DASHBOARDALL design
 *
 * DATA ISOLATION: This screen fetches only the authenticated host's data
 * using host-specific endpoints that filter by user ID on the backend.
 */

import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUserMode } from "../../context";

// Dashboard Components
import {
    CreateListingFAB,
    DashboardGreeting,
    DashboardHeader,
    DashboardStatsCards,
    PerformanceChart,
    QuickActionCard,
    RecentActivitiesSection,
    YourListingsCarousel,
} from "../../components/dashboard";

// Import services
import authService from "../../services/authService";
import dashboardService from "../../services/dashboardService";
import locationService from "../../services/locationService";
import { HostDashboardSkeleton } from "../../components/skeletons";

const HostDashboardScreen = () => {
  const router = useRouter();
  const { switchToGuest } = useUserMode();

  // Loading and refresh state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Dashboard data state - initialized with defaults
  const [dashboardData, setDashboardData] = useState({
    location: "Getting location...",
    notificationCount: 0,
    userName: "Host",
    plan: "Basic Plan",
    totalEarnings: 0,
    walletBalance: 0,
    pendingBalance: 0,
    pendingBalanceLabel: "Total On Hold:",
    onHoldEarnings: 0,
    onHoldCaution: 0,
    onHoldPlatformFee: 0,
    onHoldVat: 0,
    totalBookings: 0,
    totalListings: 0,
    upcomingBookings: 0,
    newMessages: 0,
    bookingsData: [],
    earningsData: [],
    yearlyBookings: [],
    yearlyEarnings: [],
    listings: [],
    recentActivities: [],
  });

  /**
   * Fetch user's current location
   */
  const fetchUserLocation = async () => {
    try {
      console.log("📍 [HostDashboard] Fetching user location...");
      const locationData =
        await locationService.getCurrentLocationWithAddress();

      if (locationData && locationData.address) {
        const displayLocation = locationService.formatLocationDisplay(
          locationData.address,
        );
        setDashboardData((prev) => ({
          ...prev,
          location: displayLocation || "Nigeria",
        }));
        console.log("✅ [HostDashboard] Location set:", displayLocation);
      } else {
        setDashboardData((prev) => ({
          ...prev,
          location: "Nigeria",
        }));
      }
    } catch (error) {
      console.log("❌ [HostDashboard] Error fetching location:", error);
      setDashboardData((prev) => ({
        ...prev,
        location: "Nigeria",
      }));
    }
  };

  /**
   * Fetch host-specific dashboard data from API
   * All data returned is unique to the authenticated host
   */
  const fetchDashboardData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError(null);

      console.log(
        "📊 [HostDashboard] Fetching host-specific dashboard data...",
      );
      const result = await dashboardService.fetchHostDashboard();

      if (result.success && result.data) {
        setDashboardData((prev) => ({
          ...prev,
          ...result.data,
          notificationCount:
            result.data.upcomingBookings + result.data.newMessages,
        }));
        setLastUpdated(new Date());
        console.log("✅ [HostDashboard] Dashboard data loaded successfully");
      } else {
        console.warn(
          "⚠️ [HostDashboard] Failed to fetch dashboard:",
          result.message,
        );
        setError(result.message || "Failed to load dashboard");
      }
    } catch (err) {
      console.error("❌ [HostDashboard] Error fetching dashboard:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("🔐 [HostDashboard] Checking authentication...");
        const isLoggedIn = await authService.isLoggedIn();
        console.log("🔐 [HostDashboard] Is logged in:", isLoggedIn);

        if (!isLoggedIn) {
          console.warn(
            "⚠️ [HostDashboard] User not authenticated, redirecting to login",
          );
          router.replace("/login");
          return;
        }

        setIsAuthenticated(true);
        setLoading(false);
      } catch (error) {
        console.error("❌ [HostDashboard] Auth check error:", error);
        router.replace("/login");
      }
    };

    checkAuth();
  }, []);

  // Periodic refresh for wallet balance and earnings
  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshInterval = setInterval(() => {
      console.log("💰 [HostDashboard] Smart Refresh: Updating balances...");
      fetchDashboardData(false); // Refresh without showing loader
    }, 45000); // Optimized to 45 seconds to balance live data vs battery life

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated]);

  // Fetch data on mount and when screen comes into focus (only if authenticated)
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        fetchDashboardData();
        fetchUserLocation();
      }
    }, [isAuthenticated]),
  );

  // Pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData(false);
  };

  const handleNotificationPress = () => {
    router.push({
      pathname: "/notifications",
      params: { userType: "HOST" },
    });
  };

  const handleUpcomingBookingsPress = () => {
    router.push("/(host-tabs)/bookings");
  };

  const handleMessagesPress = () => {
    router.push("/(host-tabs)/messages");
  };

  const handleListingPress = (listing) => {
    try {
      const images =
        listing.images && listing.images.length > 0
          ? listing.images
          : listing.image
            ? [listing.image]
            : [];

      // Get title from various possible field names
      const propertyTitle =
        listing.propertyName ||
        listing.title ||
        listing.propertyTitle ||
        "Untitled Property";
      // Get location - already formatted in dashboardService
      const propertyLocation = listing.location || "No location";
      // Get description
      const propertyDescription = listing.description || "";

      router.push({
        pathname: "/listing-preview",
        params: {
          listingId: listing.id || "unknown",
          propertyName: propertyTitle,
          title: propertyTitle,
          propertyType: listing.propertyType || "Property",
          price: (listing.price || 0).toString(),
          location: propertyLocation,
          images: JSON.stringify(images),
          priceLabel: "₦",
          period: listing.priceUnit || listing.pricingPeriod || "Night",
          isHost: "true",
          status: listing.status || "AVAILABLE",
          description: propertyDescription,
          bedrooms: (listing.bedrooms || 0).toString(),
          bathrooms: (listing.bathrooms || 0).toString(),
          guests: (listing.guests || 1).toString(),
          amenities: JSON.stringify(listing.amenities || []),
          regulations: JSON.stringify(listing.regulations || []),
          landmarks: JSON.stringify(listing.landmarks || []),
          rating: (listing.rating || 0).toString(),
          isVerified: (listing.isVerified || false).toString(),
          available: (listing.isAvailable !== false).toString(),
          // Additional fields for complete detail view
          houseRules: listing.houseRules || "",
          additionalRules: listing.additionalRules || "",
          features: JSON.stringify(listing.features || []),
          checkInTime: listing.checkInTime || "",
          checkOutTime: listing.checkOutTime || "",
          securityDeposit: (listing.securityDeposit || 0).toString(),
          cleaningFee: (listing.cleaningFee || 0).toString(),
          instantBooking: (listing.instantBooking || false).toString(),
          address: listing.address || "",
          city: listing.city || "",
          state: listing.state || "",
        },
      });
    } catch (error) {
      console.error("Error navigating to preview:", error);
    }
  };

  const handleViewAllListings = () => {
    router.push("/(host-tabs)/listings");
  };


  const handleActivityPress = (activity) => {
    console.log("Activity pressed:", activity.id);
    // Navigate based on activity type
  };

  const handleCreateListing = () => {
    router.push("/create-listing");
  };

  const handleLocationPress = async () => {
    console.log("Location pressed - refreshing location...");
    setDashboardData((prev) => ({ ...prev, location: "Getting location..." }));
    await fetchUserLocation();
  };

  // Show loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <HostDashboardSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4F46E5"]}
          />
        }
      >
        {/* Header with location and notifications */}
        <DashboardHeader
          location={dashboardData.location}
          notificationCount={dashboardData.notificationCount}
          onNotificationPress={handleNotificationPress}
          onLocationPress={handleLocationPress}
        />

        {/* Greeting with plan badge */}
        <DashboardGreeting
          userName={dashboardData.userName}
          planType={dashboardData.plan}
          lastUpdated={lastUpdated}
        />

        {/* Stats Cards */}
        <DashboardStatsCards
          totalEarnings={dashboardData.totalEarnings}
          walletBalance={dashboardData.walletBalance}
          pendingBalance={dashboardData.pendingBalance}
          pendingBalanceLabel={dashboardData.pendingBalanceLabel}
          onHoldEarnings={dashboardData.onHoldEarnings}
          onHoldCaution={dashboardData.onHoldCaution}
          onHoldPlatformFee={dashboardData.onHoldPlatformFee}
          onHoldVat={dashboardData.onHoldVat}
          totalBookings={dashboardData.totalBookings}
          totalListings={dashboardData.totalListings}
          hostRating={dashboardData.hostRating}
          hostRatingCount={dashboardData.hostRatingCount}
        />

        {/* Quick Action Cards */}
        <View style={styles.quickActionsRow}>
          <QuickActionCard
            label="Upcoming Bookings"
            count={dashboardData.upcomingBookings || 0}
            variant="blue"
            onPress={handleUpcomingBookingsPress}
          />
          <QuickActionCard
            label="New Messages"
            count={dashboardData.newMessages || 0}
            variant="orange"
            onPress={handleMessagesPress}
          />
        </View>

        {/* Performance Charts */}
        <PerformanceChart
          bookingsData={dashboardData.bookingsData}
          earningsData={dashboardData.earningsData}
          yearlyBookings={dashboardData.yearlyBookings}
          yearlyEarnings={dashboardData.yearlyEarnings}
        />

        {/* Your Listings Carousel */}
        <YourListingsCarousel
          listings={dashboardData.listings}
          onListingPress={handleListingPress}
          onViewAllPress={handleViewAllListings}
          onCreateListingPress={handleCreateListing}
        />

        {/* Recent Activities */}
        <RecentActivitiesSection
          activities={dashboardData.recentActivities}
          onActivityPress={handleActivityPress}
        />

        {/* Bottom spacer for FAB */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating Action Button */}
      <CreateListingFAB onPress={handleCreateListing} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 24,
    gap: 24,
  },
  quickActionsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
  },
  bottomSpacer: {
    height: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,

    color: "#6D6D6D",
    marginTop: 12,
  },
});

export default HostDashboardScreen;
