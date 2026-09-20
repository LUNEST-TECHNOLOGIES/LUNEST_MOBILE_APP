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
import { TourAnchor } from "../tour";


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

const HostBottomNav = ({ activeTab: propActiveTab, onTabPress: propOnTabPress }) => {
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
      if (profileData?.avatarUri !== undefined) {
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
    if (pathname && pathname.includes("profile")) {
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
    if (propActiveTab) return propActiveTab;
    const current = pathname || "";
    if (
      current === "/(host-tabs)" ||
      current === "/(host-tabs)/index" ||
      current.endsWith("/index")
    ) {
      return "dashboard";
    }
    if (current.includes("bookings")) return "bookings";
    if (current.includes("listings")) return "listings";
    if (current.includes("calendar")) return "calendar";
    if (current.includes("earnings")) return "earnings";
    if (current.includes("messages")) return "messages";
    if (current.includes("profile")) return "profile";
    return "dashboard";
  };

  const activeTab = getActiveTab();

  // Handle tab press navigation
  const handleTabPress = (tab) => {
    if (propOnTabPress) {
      propOnTabPress(tab.key);
      return;
    }
    if (activeTab !== tab.key) {
      router.replace(tab.route);
    }
  };

  // Responsive sizes based on screen dimensions
  const isTablet = screenWidth >= 768;
  const isSmallScreen = screenWidth < 380;
  const isShortScreen = screenHeight < 700;

  const iconSize = isSmallScreen ? 22 : isTablet ? 30 : isShortScreen ? 24 : 26;
  const fontSize = isSmallScreen ? 10 : isTablet ? 13 : isShortScreen ? 10 : 11;
  const paddingTop = isShortScreen ? 6 : isTablet ? 10 : 8;
  const paddingHorizontal = isTablet ? 24 : isSmallScreen ? 4 : 8;
  const gapSize = isSmallScreen ? 2 : isTablet ? 4 : 3;

  // Safe bottom padding - ensure it works on all devices
  const bottomPadding = Platform.select({
    ios: Math.max(insets.bottom, isTablet ? 16 : 8),
    android: Math.max(insets.bottom, 10),
    web: Math.max(insets.bottom, 10),
    default: Math.max(insets.bottom, 8),
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
      <View style={[styles.tabsRow, isTablet && styles.tabsRowTablet]}>
        {HOST_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const IconComponent = tab.Icon;
          const iconColor = isActive ? "#192DFF" : "#6D6D6D";
          const textColor = isActive ? "#192DFF" : "#6D6D6D";
          const isProfileTab = tab.key === "profile";

          const anchorId =
            tab.key === "dashboard"
              ? "tour-host-nav-dashboard"
              : tab.key === "bookings"
              ? "tour-host-nav-bookings"
              : tab.key === "listings"
              ? "tour-host-nav-listings"
              : tab.key === "profile"
              ? "tour-host-nav-profile"
              : null;

          const tabElement = (
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
                    pressed && styles.pressed,
                  ]}
                >
                  {/* Small indicator line above the icon */}
                  <View
                    style={[
                      styles.indicatorLine,
                      isSmallScreen && styles.indicatorLineSmall,
                      isTablet && styles.indicatorLineTablet,
                      { backgroundColor: isActive ? "#192DFF" : "transparent" },
                    ]}
                  />

                  {/* Tab Icon */}
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

                  {/* Label beneath every icon */}
                  <Text
                    style={[
                      styles.label,
                      {
                        fontSize,
                        color: textColor,
                        fontWeight: isActive ? "700" : "500",
                        marginTop: gapSize,
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

          if (anchorId) {
            return (
              <TourAnchor key={tab.key} id={anchorId} style={{ flex: 1 }}>
                {tabElement}
              </TourAnchor>
            );
          }

          return tabElement;
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: Platform.OS === "web" ? "fixed" : "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
  },
  tabsRowTablet: {
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
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
    width: "100%",
  },
  indicatorLine: {
    width: 24,
    height: 3,
    borderRadius: 2,
    marginBottom: 5,
  },
  indicatorLineSmall: {
    width: 18,
    height: 2.5,
    marginBottom: 4,
  },
  indicatorLineTablet: {
    width: 30,
    height: 3.5,
    marginBottom: 6,
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
    borderWidth: 1.5,
    borderColor: "#192DFF",
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
