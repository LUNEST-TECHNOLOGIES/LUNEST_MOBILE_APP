import { useFocusEffect } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BecomeHostCard,
  ModeSwitchCard,
  ProfileHeader,
  SettingsSection,
  SwitchToHostButton,
  WalletCard,
} from "../../components/profile";
import { ProfileSkeleton } from "../../components/skeletons";
import { HOST_APPLICATION_STATUS } from "../../components/profile/SwitchToHostButton";
import { USER_MODES, useUserMode } from "../../context";
import { useProductTour } from "../../context/ProductTourContext";
import axiosInstance from "../../lib/axiosInstance";

import authService from "../../services/authService";
import logService from "../../services/logService";
import LogoutModal from "../../components/common/LogoutModal";
import VerificationRequiredModal from "../../components/common/VerificationRequiredModal";
import listingService from "../../services/listingService";
import bookingService from "../../services/bookingService";



/**
 * Profile Screen
 * Main profile page with user info, wallet, settings and more
 */
const ProfileScreen = ({ isHostMode: isHostModeProp = false }) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const router = useRouter();
  const {
    currentMode,
    isHost,
    isSwitching,
    switchToGuest,
    switchToHost,
    resetUserMode,
    refreshHostStatus,
    cancelSwitch,
  } = useUserMode();
  const { startTour } = useProductTour();
  const [isRefreshingState, setIsRefreshingState] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isVerificationModalVisible, setIsVerificationModalVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // DETERMINE MODE - prioritizes the prop from the route (Guest tab vs Host tab)
  // This ensures the visual state always matches the navigation context
  const isInHostMode = isHostModeProp !== undefined ? isHostModeProp : currentMode === USER_MODES.HOST;
  const queryClient = useQueryClient();

  // 1. DATA FETCHING (TanStack Query)
  const { 
    data: profileData, 
    isLoading: loadingProfile, 
    refetch: refetchProfile,
    isRefetching: refreshingProfile
  } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const response = await axiosInstance.get("/v1/users/profile");
      return response.data.body || response.data;
    },
  });

  useFocusEffect(
    useCallback(() => {
      refetchProfile();
    }, [refetchProfile])
  );

  const { 
    data: walletInfo, 
    isLoading: loadingWallet, 
    refetch: refetchWallet,
    isRefetching: refreshingWallet 
  } = useQuery({
    queryKey: ["walletInfo"],
    queryFn: async () => {
      const response = await axiosInstance.get("/v1/wallet/balance");
      return response.data.body;
    },
    staleTime: 0, // Always consider wallet data stale to ensure fresh fetches
    refetchOnWindowFocus: true, // Specifically useful for web after returning from Paystack
    enabled: !!profileData,
  });

  const { data: listingsCount = 0 } = useQuery({
    queryKey: ["myListingsCount"],
    queryFn: async () => {
      const res = await listingService.fetchUserListings();
      console.log("[ProfileScreen] Listings count:", res.listings?.length || 0);
      return res.success ? (res.listings?.length || 0) : 0;
    },
    enabled: !!profileData,
  });

  const { data: bookingsCount = 0 } = useQuery({
    queryKey: ["myBookingsCount", isInHostMode ? "HOST" : "GUEST"],
    queryFn: async () => {
      const res = isInHostMode 
        ? await bookingService.fetchHostBookings() 
        : await bookingService.fetchGuestBookings();
      console.log("[ProfileScreen] Bookings count:", res.bookings?.length || 0);
      return res.success ? (res.bookings?.length || 0) : 0;
    },
    enabled: !!profileData,
  });

  // Log profile stats for verification
  useEffect(() => {
    if (profileData) {
      console.log("[ProfileScreen] Profile Stats:", {
        hostRating: profileData?.hostRating,
        hostRatingCount: profileData?.hostRatingCount,
        listingsCount,
        bookingsCount,
        isHostMode: isInHostMode,
      });
    }
  }, [profileData, listingsCount, bookingsCount, isInHostMode]);

  // Host Application Status Tracking (Local State for smooth sync)
  const [hostApplicationStatus, setHostApplicationStatus] = useState(
    HOST_APPLICATION_STATUS.NONE,
  );
  const [isVerified, setIsVerified] = useState(false);

  // Sync server data to local display status
  useEffect(() => {
    if (profileData) {
      setHostApplicationStatus(profileData.hostApplicationStatus || HOST_APPLICATION_STATUS.NONE);
      setIsVerified(profileData.verified || false);
    }
  }, [profileData]);

  const isRefreshing = refreshingProfile || refreshingWallet;
  const isLoadingData = loadingProfile || loadingWallet;

  // Debug Trigger State
  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const lastFetchTimeRef = useRef(0); // Cooldown for automated refreshes
  const isFetchingRef = useRef(false); // Guard for concurrent calls
  const FETCH_COOLDOWN = 30000; // 30 seconds

  // Log session info when debug is accessed
  useEffect(() => {
    if (tapCount >= 5) {
      logService.logInfo('[ProfileScreen] Debug menu access initiated', {
        tapCount,
        userMode: currentMode,
        isHost,
        hostApplicationStatus,
        isVerified,
      });
    }
  }, [tapCount, currentMode, isHost, hostApplicationStatus, isVerified]);

  const handleDebugTrigger = () => {
    const now = Date.now();
    if (now - lastTapTime < 2000) {
      const newCount = tapCount + 1;
      setTapCount(newCount);
      if (newCount >= 10) {
        setTapCount(0);
        // Log comprehensive session info before opening debug screen
        logService.logInfo('[ProfileScreen] Opening debug logs screen');
        logService.getSessionSummary().then(summary => {
          logService.logInfo('[ProfileScreen] Session Summary', summary);
        });
        router.push("/debug-logs");
      }
    } else {
      setTapCount(1);
    }
    setLastTapTime(now);
  };

  // Refresh logic
  const handleManualRefresh = useCallback(async () => {
    await Promise.all([
      refetchProfile(), 
      refetchWallet(),
      queryClient.invalidateQueries({ queryKey: ["myListingsCount"] }),
      queryClient.invalidateQueries({ queryKey: ["myBookingsCount"] })
    ]);
  }, [refetchProfile, refetchWallet, queryClient]);

  // Handle focus effects
  useFocusEffect(
    useCallback(() => {
      handleManualRefresh();
    }, [handleManualRefresh])
  );

  // Handle mode switch with loading
  const handleModeSwitch = async () => {
    if (isSwitching) return; // Prevent double taps
    
    try {
      if (isInHostMode) {
        const success = await switchToGuest();
        if (success) {
          router.replace("/(tabs)");
        } else {
          // No need for redundant Alert here as APIClient shows a Toast for the core error
          console.error("[ProfileScreen] Mode switch to Guest failed");
        }
      } else {
        // Require approved host application OR existing host status to switch to host mode
        if (isHost || hostApplicationStatus === HOST_APPLICATION_STATUS.APPROVED) {
          const success = await switchToHost();
          if (success) {
            // Add a small delay for Android stabilization
            setTimeout(() => {
              router.replace("/(host-tabs)");
            }, 100);
          } else {
            console.error("[ProfileScreen] Mode switch to Host failed");
          }
        } else {
          // User is not a host yet, show become host flow
          handleStartHosting();
        }
      }
    } catch (error) {
      console.error("[ProfileScreen] Mode switch error:", error);
      Alert.alert("Error", "An unexpected error occurred while switching modes.");
    }
  };

  // Double Protect: Manual Cancel Handler
  const handleCancelSwitch = () => {
    console.log("🛑 [ProfileScreen] Manual switch cancel triggered");
    if (cancelSwitch) {
        cancelSwitch();
    }
    
    // Forcing a re-render/logic skip by refreshing the whole screen state
    handleManualRefresh();
    Alert.alert("Switch Cancelled", "The mode switch was cancelled. You can try again.");
  };

  useEffect(() => {
    console.log("=== PROFILE SCREEN DEBUG ===");
    console.log("Current Mode:", currentMode);
    console.log("Is Host User Check:", isHost);
    console.log("Is In Host Mode:", isInHostMode);
    console.log("Host Application Status:", hostApplicationStatus);
    console.log("Condition check for BecomeHostCard:");
    console.log("!isInHostMode:", !isInHostMode);
    console.log("!isHost:", !isHost);
    console.log("Status === NONE:", hostApplicationStatus === HOST_APPLICATION_STATUS.NONE);
    console.log("============================");
  }, [currentMode, isHost, isInHostMode, hostApplicationStatus]);

  // Settings items configuration

  const onRefresh = async () => {
    setIsRefreshingState(true);
    await handleManualRefresh();
    setIsRefreshingState(false);
  };

  // Settings items configuration
  const settingsItems = [
    {
      id: "identity",
      icon: "identity",
      title: "Identity Verification",
      badge: isVerified 
        ? { text: "Verified", type: "success" } 
        : { text: "Pending verification", type: "warning" },
      onPress: () => {
        router.push({ pathname: "/kyc-verification", params: { verified: isVerified ? "true" : "false" } });
      },
    },
    {
      id: "payment",
      icon: "payment",
      title: "Payment Settings",
      onPress: () => {

        router.push("/payment-settings");
      },
    },
    {
      id: "security",
      icon: "security",
      title: "Login & Security",
      onPress: () => {

        router.push("/login-security");
      },
    },
    {
      id: "notification",
      icon: "notification",
      title: "Notification Settings",
      badge: { text: "Coming Soon", type: "info" },
      onPress: () => {
        console.log("Notification Settings");
      },
    },
    {
      id: "privacy",
      icon: "privacy",
      title: "Privacy & Sharing",
      onPress: () => {
        WebBrowser.openBrowserAsync("https://www.lunest.app/privacy-policy");
      },
    },
  ];

  const referralItems = [
    {
      id: "referral",
      icon: "referral",
      title: "Refer a Guest/Host",
      onPress: () => {
        router.push("/referrals");
      },
    },
    {
      id: "loyalty",
      icon: "loyalty",
      title: "Loyalty Program",
      onPress: () => {
        router.push("/point-history");
      },
    },
  ];

  const supportItems = [
    {
      id: "help",
      icon: "help",
      title: "Visit the Help Centre",
      onPress: () => {
        router.push("/support-chat");
      },
    },
    {
      id: "report",
      icon: "report",
      title: "Report a Problem",
      onPress: () => {
        router.push("/support-chat");
      },
    },
    {
      id: "chat",
      icon: "chat",
      title: "Chat Support",
      onPress: () => {
        router.push("/support-chat");
      },
    },
    {
      id: "tour",
      icon: "help",
      title: "Take App Tour",
      onPress: () => {
        startTour({ force: true, role: isInHostMode ? "host" : "guest" });
        router.replace(isInHostMode ? "/(host-tabs)" : "/(tabs)");
      },
    },
  ];


  const otherItems = [
    {
      id: "legal",
      icon: "legal",
      title: "Legal",
      onPress: () => {
        WebBrowser.openBrowserAsync("https://www.lunest.app/terms-of-use");
      },
    },
    {
      id: "logout",
      icon: "logout",
      title: "Logout",
      onPress: () => {
        setIsLogoutModalVisible(true);
      },
    },
  ];

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      // 1. Reset user mode settings defensively
      if (resetUserMode) {
        try {
          await resetUserMode();
        } catch (modeError) {
          console.warn("[Logout] resetUserMode failed:", modeError);
        }
      }

      // 2. Perform general authentication logout
      try {
        await authService.logout();
      } catch (authError) {
        console.warn("[Logout] authService.logout failed:", authError);
      }

      // 3. Clear TanStack Query Cache to prevent caching user state
      try {
        queryClient.clear();
      } catch (queryError) {
        console.warn("[Logout] queryClient.clear failed:", queryError);
      }

      setIsLogoutModalVisible(false);
      
      // 4. Reset component state values
      setHostApplicationStatus(HOST_APPLICATION_STATUS.NONE);
      setIsVerified(false);

      // 5. Route to login screen
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.location) {
          console.log("[Logout] Web redirecting to /login via window.location");
          window.location.href = "/login";
        } else {
          router.replace("/login");
        }
      } else {
        router.replace("/login");
      }
    } catch (error) {
      console.error("[Logout] Fatal logout process error:", error);
      // Fail-safe redirect even in case of fatal error
      if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
        window.location.href = "/login";
      } else {
        router.replace("/login");
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleEditProfile = () => {
    router.push("/personal-info-edit");
  };

  const handleAddFunds = () => {
    router.push({
      pathname: "/add-funds",
      params: { returnUrl: "/profile" }
    });
  };

  const handleWithdraw = () => {
    router.push("/withdraw");
  };

  const handleViewTransactions = () => {
    router.push("/transaction-history");
  };

  const handleCopyAccount = () => {
    // Clipboard.setString(walletData.accountNumber);
    Alert.alert("Copied", "Account number copied to clipboard");
  };

  const handleStartHosting = () => {
    // Check if user is verified before allowing host application
    if (!isVerified) {
      setIsVerificationModalVisible(true);
      return;
    }
    router.push("/landlord-request");
  };

  // (Optional: handle unexpected data error)
  if (!mounted || (isLoadingData && !isRefreshingState)) {
    return <ProfileSkeleton />;
  }

  if (!isLoadingData && !profileData && !walletInfo) {
     handleManualRefresh();
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <LogoutModal
        visible={isLogoutModalVisible}
        onCancel={() => setIsLogoutModalVisible(false)}
        onConfirm={confirmLogout}
        isLoading={isLoggingOut}
      />

      <VerificationRequiredModal
        visible={isVerificationModalVisible}
        onClose={() => setIsVerificationModalVisible(false)}
        onVerify={() => {
          setIsVerificationModalVisible(false);
          router.push({ pathname: "/kyc-verification", params: { verified: isVerified ? "true" : "false" } });
        }}
      />

      {/* Header */}
      <View style={[styles.header, isTablet && styles.containerTablet]}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {/* Fixed Top Section - Profile & Wallet */}
      <View style={styles.topSection}>
        <View style={[styles.topContent, isTablet && styles.containerTablet]}>
          <ProfileHeader
            isLoading={loadingProfile}
            name={profileData?.fullName || profileData?.name || ""}
            email={profileData?.emailAddress || profileData?.email || ""}
            phone={profileData?.phoneNumber || profileData?.phone || ""}
            nin={profileData?.nin || ""}
            isHostMode={isInHostMode}
            emailVerified={profileData?.emailVerified}
            verified={isVerified}
            avatarUri={profileData?.avatar}
            onEditPress={handleEditProfile}
            onLogoutPress={() => setIsLogoutModalVisible(true)}
          />
          <View style={styles.spacer} />
          <WalletCard
            isLoading={loadingWallet}
            balance={walletInfo?.availableBalance || 0}
            accountNumber={profileData?.userID || ""}
            onAddFunds={handleAddFunds}
            onWithdraw={handleWithdraw}
            onViewTransactions={handleViewTransactions}
            onCopyAccount={handleCopyAccount}
          />
          <View style={styles.spacer} />
        </View>
      </View>

      {/* Scrollable Content - Settings */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, isTablet && { alignItems: "center" }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshingState} onRefresh={onRefresh} />
        }
      >
        {/* Mode Switch Card - Show switch option if user is a Host (which implies they are either already in host mode or can switch to it) */}
        {isHost && (
          <View style={[styles.sectionContainer, isTablet && styles.containerTablet]}>
            <ModeSwitchCard
              isHostMode={isInHostMode}
              onSwitch={handleModeSwitch}
              disabled={isSwitching}
            />
          </View>
        )}

        {/* Switch to Host Button - Show based on host application status */}
        {/* Show the legacy SwitchToHostButton only for non-approved requests (pending/rejected).
            When approved, or when already a Host, we prefer the top ModeSwitchCard. */}
        {!isHost &&
          hostApplicationStatus !== HOST_APPLICATION_STATUS.NONE &&
          hostApplicationStatus !== HOST_APPLICATION_STATUS.APPROVED && (
            <View style={[styles.sectionContainer, isTablet && styles.containerTablet]}>
              <SwitchToHostButton
                status={hostApplicationStatus}
                onPress={() => {
                  if (isSwitching) return;
                  // For approved status the top card handles switching; this button
                  // remains for pending/rejected states and reapply flows.
                  if (
                    hostApplicationStatus === HOST_APPLICATION_STATUS.APPROVED
                  ) {
                    switchToHost();
                    router.replace("/(host-tabs)");
                  }
                }}
                onReapply={handleStartHosting}
                disabled={isSwitching}
              />
            </View>
          )}

        {/* Become a Host Card - Only show if user is NOT a Host and hasn't applied */}
        {(!isHost && hostApplicationStatus === HOST_APPLICATION_STATUS.NONE) && (
            <View style={[styles.sectionContainer, isTablet && styles.containerTablet]}>
              <BecomeHostCard onStartHosting={handleStartHosting} />
            </View>
        )}

        {/* Settings Section */}
        <View style={[styles.sectionContainer, isTablet && styles.containerTablet]}>
          <SettingsSection title="Settings" items={settingsItems} />
        </View>

        {/* Referral & Rewards Section */}
        <View style={[styles.sectionContainer, isTablet && styles.containerTablet]}>
          <SettingsSection title="Referral & Rewards" items={referralItems} />
        </View>

        {/* Support Section */}
        <View style={[styles.sectionContainer, isTablet && styles.containerTablet]}>
          <SettingsSection title="Support" items={supportItems} />
        </View>

        {/* Others Section */}
        <View style={[styles.sectionContainer, isTablet && styles.containerTablet]}>
          <SettingsSection title="Others" items={otherItems} />
        </View>

        {/* Version & Debug Trigger */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleDebugTrigger}
          style={styles.versionContainer}
        >
          <Text style={styles.versionText}>Version 1.3.0</Text>
        </TouchableOpacity>

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  containerTablet: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "500",

    color: "#000000",
    textAlign: "center",
  },
  topSection: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 20,
  },
  topContent: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  spacer: {
    height: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 10,
  },
  sectionContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  bottomPadding: {
    height: 100,
  },
  // Mode Switching Overlay Styles
  switchingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    paddingVertical: 15,
    width: "100%",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statDivider: {
    width: 1,
    height: "140%", // Taller than standard to look premium
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    position: 'absolute',
    left: '33.33%',
    marginTop: -5,
  },
  // Second divider
  statDivider2: {
    width: 1,
    height: "140%",
    backgroundColor: "#E5E7EB",
    position: 'absolute',
    left: '66.66%',
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },
  // Loading state styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666666",
    marginTop: 12,
  },
  // Switching overlay styles
  versionContainer: {
    alignItems: "center",
    paddingVertical: 20,
    opacity: 0.5,
  },
  versionText: {
    fontSize: 12,
    color: "#999999",
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cancelButtonText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default ProfileScreen;
