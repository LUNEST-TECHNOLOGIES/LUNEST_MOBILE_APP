import { Image } from "expo-image";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Platform,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import configService from "../../services/configService";
import profileService from "../../services/profileService";
import { resolveImageUrlSync } from "../../utils/imageUtils";

// Import custom SVG icons
import TaskSquareIcon from "../../assets/icons/bottom_nav/vuesax/outline/task-square.svg";
import BookingsIcon from "../../assets/icons/navbar/BookingsIcon.svg";
import DashboardIcon from "../../assets/icons/navbar/DashboardIcon.svg";
import MessagesIcon from "../../assets/icons/navbar/MessagesIcon.svg";
import ProfileIcon from "../../assets/icons/navbar/ProfileIcon.svg";

/**
 * HostBottomNav Component
 * Bottom navigation bar for host/landlord users
 * - 5 tabs: Dashboard, Bookings, Listings, Messages, Profile
 * - White background, blue (#192DFF) active state
 * - Responsive across all screen sizes
 * - Uses custom SVG icons from Figma
 */

const HOST_TABS = [
  {
    key: "dashboard",
    label: "Dashboard",
    Icon: DashboardIcon,
    route: "/(host-tabs)",
  },
  {
    key: "bookings",
    label: "Bookings",
    Icon: BookingsIcon,
    route: "/(host-tabs)/bookings",
  },
  {
    key: "listings",
    label: "Listings",
    Icon: TaskSquareIcon,
    route: "/(host-tabs)/listings",
  },
  {
    key: "messages",
    label: "Messages",
    Icon: MessagesIcon,
    route: "/(host-tabs)/messages",
  },
  {
    key: "profile",
    label: "Profile",
    Icon: ProfileIcon,
    route: "/(host-tabs)/profile",
  },
];

const HostBottomNav = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  // Profile avatar state
  const [profileAvatarUri, setProfileAvatarUri] = useState(null);
  const [resolvedAvatarUri, setResolvedAvatarUri] = useState(null);

  // Load profile avatar on mount and listen for changes
  useEffect(() => {
    loadProfileAvatar();

    // Subscribe to profile changes
    const unsubscribe = profileService.addListener((profileData) => {
      if (profileData?.avatarUri) {
        setProfileAvatarUri(profileData.avatarUri);
      }
    });

    return () => unsubscribe();
  }, []);

  // Resolve avatar URI with base URL
  useEffect(() => {
    const resolveAvatar = async () => {
      if (!profileAvatarUri) {
        setResolvedAvatarUri(null);
        return;
      }
      
      // If already a full URL or blob, use as-is
      if (profileAvatarUri.startsWith("http") || profileAvatarUri.startsWith("blob:")) {
        setResolvedAvatarUri(profileAvatarUri);
        return;
      }
      
      // Resolve relative path with base URL
      try {
        const baseUrl = await configService.getBaseURL();
        const resolved = resolveImageUrlSync(profileAvatarUri, baseUrl);
        console.log("[HostBottomNav] Resolved avatar:", { original: profileAvatarUri, resolved });
        setResolvedAvatarUri(resolved);
      } catch (error) {
        console.error("[HostBottomNav] Error resolving avatar:", error);
        setResolvedAvatarUri(profileAvatarUri);
      }
    };
    
    resolveAvatar();
  }, [profileAvatarUri]);

  // Reload avatar when navigating back to profile tab
  useEffect(() => {
    if (pathname.includes("profile")) {
      loadProfileAvatar();
    }
  }, [pathname]);

  const loadProfileAvatar = async () => {
    try {
      const avatarUri = await profileService.getAvatarUri();
      setProfileAvatarUri(avatarUri);
    } catch (error) {
      console.error("Error loading profile avatar:", error);
    }
  };

  // Determine active tab based on current route
  const getActiveTab = () => {
    if (
      pathname === "/(host-tabs)" ||
      pathname === "/(host-tabs)/index" ||
      pathname.endsWith("/index")
    )
      return "dashboard";
    if (pathname.includes("bookings")) return "bookings";
    if (pathname.includes("listings")) return "listings";
    if (pathname.includes("messages")) return "messages";
    if (pathname.includes("profile")) return "profile";
    return "dashboard";
  };

  const activeTab = getActiveTab();

  // Handle tab press navigation
  const handleTabPress = (tab) => {
    if (activeTab !== tab.key) {
      router.replace(tab.route);
    }
  };

  // Responsive sizes based on screen dimensions
  const isSmallScreen = screenWidth < 380;
  const isShortScreen = screenHeight < 700;

  const iconSize = isSmallScreen ? 22 : isShortScreen ? 24 : 28;
  const fontSize = isSmallScreen ? 9 : isShortScreen ? 10 : 12;
  const paddingTop = isShortScreen ? 8 : 12;
  const paddingHorizontal = isSmallScreen ? 5 : 10;
  const gapSize = isSmallScreen ? 2 : 4;

  // Safe bottom padding - ensure it works on all devices
  const bottomPadding = Platform.select({
    ios: Math.max(insets.bottom, 8),
    android: Math.max(insets.bottom, 12),
    default: 10,
  });

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: bottomPadding,
          paddingTop,
          paddingHorizontal,
        },
      ]}
    >
      <View style={styles.tabsRow}>
        {HOST_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const IconComponent = tab.Icon;
          const iconColor = isActive ? "#192DFF" : "#292929";
          const isProfileTab = tab.key === "profile";

          return (
            <Pressable
              key={tab.key}
              style={styles.tab}
              onPress={() => handleTabPress(tab)}
              hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
            >
              {({ pressed }) => (
                <View
                  style={[
                    styles.tabContent,
                    { gap: gapSize },
                    pressed && styles.pressed,
                  ]}
                >
                  {isProfileTab && resolvedAvatarUri ? (
                    <View
                      style={[
                        styles.profileImageContainer,
                        { width: iconSize, height: iconSize },
                        isActive && styles.profileImageActive,
                      ]}
                    >
                      <Image
                        source={{ uri: resolvedAvatarUri }}
                        style={[
                          styles.profileImage,
                          { width: iconSize - 2, height: iconSize - 2 },
                        ]}
                        contentFit="cover"
                        cachePolicy="disk"
                        transition={200}
                      />
                    </View>
                  ) : (
                    <IconComponent
                      width={iconSize}
                      height={iconSize}
                      color={iconColor}
                    />
                  )}
                  <Text
                    style={[
                      styles.label,
                      {
                        fontSize,
                        color: iconColor,
                        fontWeight: isActive ? "600" : "500",
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 50,
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    textAlign: "center",
  },
  profileImageContainer: {
    borderRadius: 50,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  profileImageActive: {
    borderColor: "#192DFF",
    borderWidth: 2,
  },
  profileImage: {
    borderRadius: 50,
  },
});

export default HostBottomNav;
