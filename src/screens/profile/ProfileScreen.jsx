import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    BecomeHostCard,
    ModeSwitchCard,
    ProfileHeader,
    SettingsSection,
    SwitchToHostButton,
    WalletCard,
} from "../../components/profile";
import { HOST_APPLICATION_STATUS } from "../../components/profile/SwitchToHostButton";
import { USER_MODES, useUserMode } from "../../context";
import authService from "../../services/authService";
import paymentService from "../../services/paymentService";
import profileService from "../../services/profileService";
import { resolveImageUrl } from "../../utils/imageUtils";



/**
 * Mode Switching Loading Overlay
 * Shows during mode switch while data is being loaded
 */
const ModeSwitchingOverlay = ({ visible, targetMode }) => (
  <Modal transparent visible={visible} animationType="fade">
    <View style={styles.switchingOverlay}>
      <View style={styles.switchingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.switchingTitle}>
          Switching to {targetMode} Mode
        </Text>
        <Text style={styles.switchingSubtitle}>
          Loading your personalized data...
        </Text>
      </View>
    </View>
  </Modal>
);

/**
 * Profile Screen
 * Main profile page with user info, wallet, settings and more
 */
const ProfileScreen = ({ isHostMode: isHostModeProp = false }) => {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const {
    currentMode,
    isHost,
    isSwitching,
    switchToGuest,
    switchToHost,
    resetUserMode,
    refreshHostStatus,
  } = useUserMode();
  const [refreshing, setRefreshing] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true); // Wait for backend data before displaying
  const [hostApplicationStatus, setHostApplicationStatus] = useState(
    HOST_APPLICATION_STATUS.NONE,
  );
  const [isVerified, setIsVerified] = useState(false);
  const [switchingTarget, setSwitchingTarget] = useState("Guest"); // Track target mode for overlay
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phone: "",
    nin: "",
    avatarUri: null,
    emailVerified: false,
  });
  const [walletData, setWalletData] = useState({
    balance: 0,
    accountNumber: "",
  });

  // Determine if we're in host mode based on prop or context
  const isInHostMode = isHostModeProp || currentMode === USER_MODES.HOST;

  const loadUserData = useCallback(async () => {
    try {
      // Get auth user data (from login)
      const user = await authService.getUserData();
      console.log("=== PROFILE LOAD DEBUG ===");
      console.log("Auth user data:", JSON.stringify(user, null, 2));

      // Fetch fresh profile data from server (includes hostApplicationStatus)
      const serverProfileResult = await authService.fetchProfile();
      console.log(
        "Server profile data:",
        JSON.stringify(serverProfileResult, null, 2),
      );

      // Get saved profile data (local)
      const profileData = await profileService.getProfileData();
      console.log("Local profile data:", JSON.stringify(profileData, null, 2));

      const finalName =
        serverProfileResult?.data?.fullName ||
        user?.fullName ||
        profileData?.name ||
        "";
      console.log("Final name to display:", finalName);

      // Set host application status from server
      const serverStatus = serverProfileResult?.data?.hostApplicationStatus;
      console.log("[Profile] Raw hostApplicationStatus from server:", serverStatus);
      
      if (serverStatus) {
        setHostApplicationStatus(serverStatus);
        console.log("[Profile] Set status to:", serverStatus);
      } else {
        // Fallback to local storage if server doesn't have it
        if (profileData?.hostRequestSubmitted) {
          console.log("[Profile] Status missing from server but found in local profile (PENDING)");
          setHostApplicationStatus(HOST_APPLICATION_STATUS.PENDING);
        } else {
          console.log("[Profile] No status found on server or locally, defaulting to NONE");
          setHostApplicationStatus(HOST_APPLICATION_STATUS.NONE);
        }
      }

      // Set verification status from server
      const verifiedStatus = serverProfileResult?.data?.verified || false;
      setIsVerified(verifiedStatus);
      console.log("User verified status:", verifiedStatus);

      // Get NIN from server profile (registered during signup) or fallback to local
      // Server NIN takes priority as it's the verified NIN from registration
      const serverNin = serverProfileResult?.data?.nin;
      const serverPhone = serverProfileResult?.data?.phoneNumber;

      console.log("Server NIN:", serverNin);
      console.log("Server Phone:", serverPhone);

      // Pre-calculate avatar URL to avoid 'await' inside the synchronous setState callback
      const avatarUri = await (async () => {
        const serverAvatar = serverProfileResult?.data?.avatar;
        if (serverAvatar) {
          return await resolveImageUrl(serverAvatar, authService.baseURL);
        }
        // Filter out blob URIs from local storage
        const savedAvatar = profileData?.avatarUri;
        if (
          savedAvatar &&
          (savedAvatar.startsWith("blob:") || savedAvatar.startsWith("data:"))
        ) {
          return null;
        }
        return savedAvatar || null;
      })();

      setUserData((prev) => ({
        ...prev,
        // Auth data takes priority for name and email (from login)
        name: finalName,
        email:
          serverProfileResult?.data?.emailAddress ||
          user?.email ||
          profileData?.email ||
          prev.email,
        // Server NIN takes priority (from signup), then local storage, then previous value
        nin: serverNin || user?.nin || profileData?.nin || prev.nin,
        // Server phone takes priority, then local storage, then previous value
        phone:
          serverPhone || user?.phoneNumber || profileData?.phone || prev.phone,
        // Server emailVerified takes priority, then auth user data
        emailVerified:
          serverProfileResult?.data?.emailVerified ||
          user?.emailVerified ||
          false,
        // Prioritize server avatar, then local storage
        avatarUri,
      }));

      // Set wallet data with user ID as account number and actual balance
      // Get userID from server or local data (custom 10-digit ID from backend)
      const userID =
        serverProfileResult?.data?.userID ||
        user?.userID ||
        user?._id ||
        user?.id;

      // Generate account number from userID (same logic as PayWithWalletScreen)
      const getAccountNumber = (id) => {
        if (!id) return "";
        // If it's already a proper userID format (e.g., starts with numbers), use it
        if (/^\d+$/.test(id) || id.startsWith("LNT")) {
          return id;
        }
        // Fallback: generate from MongoDB _id
        const idStr = id.toString();
        let hash = 0;
        for (let i = 0; i < idStr.length; i++) {
          hash = ((hash << 5) - hash + idStr.charCodeAt(i)) & 0xffffffff;
        }
        const digits = Math.abs(hash)
          .toString()
          .padStart(7, "0")
          .substring(0, 7);
        return `LNT${digits}`;
      };

      // Fetch real-time wallet balance from dedicated endpoint
      // (profile endpoint may return stale balance)
      let walletBalance = 0;
      try {
        const walletInfo = await paymentService.getWalletInfo();
        walletBalance = walletInfo?.availableBalance || walletInfo?.balance || 0;
        console.log("[ProfileScreen] Real-time wallet balance:", walletBalance);
      } catch (walletErr) {
        console.warn("[ProfileScreen] Wallet API fallback to profile data:", walletErr.message);
        walletBalance =
          serverProfileResult?.data?.walletBalance ||
          serverProfileResult?.data?.wallet?.balance ||
          user?.walletBalance ||
          user?.wallet?.balance ||
          0;
      }

      setWalletData({
        balance: walletBalance,
        accountNumber: getAccountNumber(userID),
      });

      // Refresh global host status to ensure toggle appears if approved
      if (refreshHostStatus) {
        await refreshHostStatus();
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setInitialLoading(false);
    }
  }, [refreshHostStatus]);

  // Handle mode switch with loading
  const handleModeSwitch = async () => {
    if (isSwitching) return; // Prevent double taps
    
    if (isInHostMode) {
      setSwitchingTarget("Guest");
      const success = await switchToGuest();
      if (success) {
        router.replace("/(tabs)");
      }
    } else {
      // Require approved host application OR existing host status to switch to host mode
      if (isHost || hostApplicationStatus === HOST_APPLICATION_STATUS.APPROVED) {
        setSwitchingTarget("Host");
        const success = await switchToHost();
        if (success) {
          router.replace("/(host-tabs)");
        }
      } else {
        // User is not a host yet, show become host flow
        handleStartHosting();
      }
    }
  };

  useEffect(() => {
    console.log("=== PROFILE SCREEN DEBUG ===");
    console.log("Current Mode:", currentMode);
    console.log("Is Host User Check:", isHost);
    console.log("Is In Host Mode:", isInHostMode);
    console.log("Host Application Status:", hostApplicationStatus);
    console.log("HOST_APPLICATION_STATUS.NONE:", HOST_APPLICATION_STATUS.NONE);
    console.log("Condition check for BecomeHostCard:");
    console.log("!isInHostMode:", !isInHostMode);
    console.log("!isHost:", !isHost);
    console.log("Status === NONE:", hostApplicationStatus === HOST_APPLICATION_STATUS.NONE);
    console.log("============================");

    loadUserData();

    // Subscribe to profile changes
    const unsubscribe = profileService.addListener((profileData) => {
      if (profileData) {
        setUserData((prev) => ({
          ...prev,
          // Update phone, nin and avatar from profile changes
          phone: profileData.phone || prev.phone,
          nin: profileData.nin || prev.nin,
          avatarUri: profileData.avatarUri || prev.avatarUri,
        }));
      }
    });

    return () => unsubscribe();
  }, [loadUserData]);

  // Refresh profile each time screen gains focus
  useFocusEffect(
    useCallback(() => {
      console.log("[ProfileScreen] Focus effect triggered - refreshing data");
      loadUserData();
    }, [loadUserData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
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

        router.push("/kyc-verification");
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
      onPress: () => {

        console.log("Notification Settings");
      },
    },
    {
      id: "privacy",
      icon: "privacy",
      title: "Privacy & Sharing",
      onPress: () => {

        console.log("Privacy & Sharing");
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

        console.log("Help Centre");
      },
    },
    {
      id: "report",
      icon: "report",
      title: "Report a Problem",
      onPress: () => {

        console.log("Report a Problem");
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
  ];

  const otherItems = [
    {
      id: "legal",
      icon: "legal",
      title: "Legal",
      onPress: () => {

        console.log("Legal");
      },
    },
    {
      id: "logout",
      icon: "logout",
      title: "Logout",
      onPress: async () => {
        const performLogout = async () => {
          try {
            if (resetUserMode) {
              await resetUserMode();
            }
            await authService.logout();
            // Reset all profile-related state to initial values
            setHostApplicationStatus(HOST_APPLICATION_STATUS.NONE);
            setIsVerified(false);
            setUserData({
              name: "",
              email: "",
              phone: "",
              nin: "",
              avatarUri: null,
            });
            setWalletData({
              balance: 0,
              accountNumber: "",
            });
            router.replace("/login");
          } catch (error) {
            console.error("Logout error:", error);
            if (Platform.OS === "web") {
              window.alert("Failed to logout. Please try again.");
            } else {
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          }
        };

        if (Platform.OS === "web") {
          // Use window.confirm for web
          if (window.confirm("Are you sure you want to logout?")) {
            await performLogout();
          }
        } else {
          // Use Alert for mobile
          Alert.alert("Logout", "Are you sure you want to logout?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Logout",
              style: "destructive",
              onPress: performLogout,
            },
          ]);
        }
      },
    },
  ];

  const handleEditProfile = () => {
    router.push("/personal-info-edit");
  };

  const handleAddFunds = () => {
    router.push("/add-funds");
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
      Alert.alert(
        "Verification Required",
        "Please verify your account before applying to become a host. Complete your KYC verification first.",
        [{ text: "OK" }],
      );
      return;
    }
    router.push("/landlord-request");
  };

  // Show loading screen while initial data is being fetched
  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#010135" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Mode Switching Loading Overlay */}
      <ModeSwitchingOverlay
        visible={isSwitching}
        targetMode={switchingTarget}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {/* Fixed Top Section - Profile & Wallet */}
      <View style={styles.topSection}>
        <View style={styles.topContent}>
          <ProfileHeader
            name={userData.name}
            email={userData.email}
            phone={userData.phone}
            nin={userData.nin}
            isHostMode={isInHostMode}
            emailVerified={userData.emailVerified}
            verified={isVerified}
            avatarUri={
                userData.avatarUri && !(userData.avatarUri.startsWith("blob:") && Platform.OS !== "web")
                ? userData.avatarUri
                : null
            }
            onEditPress={handleEditProfile}
          />
          <View style={styles.spacer} />
          <WalletCard
            balance={walletData.balance}
            accountNumber={walletData.accountNumber}
            onAddFunds={handleAddFunds}
            onWithdraw={handleWithdraw}
            onViewTransactions={handleViewTransactions}
            onCopyAccount={handleCopyAccount}
          />
        </View>
      </View>

      {/* Scrollable Content - Settings */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Mode Switch Card - Show switch option if user is a Host (which implies they are either already in host mode or can switch to it) */}
        {isHost && (
          <View style={styles.sectionContainer}>
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
            <View style={styles.sectionContainer}>
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
            <View style={styles.sectionContainer}>
              <BecomeHostCard onStartHosting={handleStartHosting} />
            </View>
        )}

        {/* Settings Section */}
        <View style={styles.sectionContainer}>
          <SettingsSection title="Settings" items={settingsItems} />
        </View>

        {/* Referral & Rewards Section */}
        <View style={styles.sectionContainer}>
          <SettingsSection title="Referral & Rewards" items={referralItems} />
        </View>

        {/* Support Section */}
        <View style={styles.sectionContainer}>
          <SettingsSection title="Support" items={supportItems} />
        </View>

        {/* Others Section */}
        <View style={styles.sectionContainer}>
          <SettingsSection title="Others" items={otherItems} />
        </View>

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
  switchingContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginHorizontal: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  switchingTitle: {
    fontSize: 18,
    fontWeight: "600",

    color: "#000000",
    marginTop: 16,
    textAlign: "center",
  },
  switchingSubtitle: {
    fontSize: 14,

    color: "#666666",
    marginTop: 8,
    textAlign: "center",
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
  switchingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  switchingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  switchingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#010135",
  },
});

export default ProfileScreen;
