import { BlurView } from "expo-blur";
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
import messageService from "../../services/messageService";
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
 * Floating pill-shaped bottom navigation bar for host/landlord users
 * - 5 tabs: Dashboard, Bookings, Listings, Messages, Profile
 * - Floating inset pill with fully rounded edges
 * - Rounded capsule behind active icon & label using LUNEST theme colours (#192DFF)
 * - Subtle border, soft shadow, and background blur
 * - Responsive across all screen sizes and respects safe area
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
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Poll unread messages count silently for host
  useEffect(() => {
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const conversations = await messageService.getConversations();
        if (isMounted && Array.isArray(conversations)) {
          const total = conversations.reduce((acc, c) => acc + (c.unreadCount?.host || 0), 0);
          setUnreadMessagesCount(total);
        }
      } catch (err) {
        // silent
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pathname]);

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

  // Sleek, compact icon size so labels have maximum space and visual balance
  const iconSize = isSmallScreen ? 16 : isTablet ? 22 : isShortScreen ? 17 : 18;
  const fontSize = isSmallScreen ? 8.5 : isTablet ? 11 : isShortScreen ? 9 : 9.5;
  const gapSize = 2;

  // Safe bottom offset for floating pill
  const floatingBottom = Platform.select({
    ios: Math.max(insets.bottom, 12) + 4,
    android: Math.max(insets.bottom, 8) + 6,
    web: 16,
    default: 14,
  });

  return (
    <View
      style={[
        styles.floatingWrapper,
        {
          bottom: floatingBottom,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.pillContainer, isTablet && styles.pillContainerTablet]}>
        {/* Background Blur */}
        <BlurView
          intensity={Platform.OS === "ios" ? 85 : 95}
          tint="light"
          style={[StyleSheet.absoluteFill, { borderRadius: 36 }]}
        />
        {/* Soft translucent fallback overlay */}
        <View style={[StyleSheet.absoluteFill, styles.bgOverlay]} />

        {/* Navigation Tabs Row */}
        <View style={styles.tabsRow}>
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
                hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
              >
                {({ pressed }) => (
                  <View
                    style={[
                      styles.capsule,
                      isActive && styles.capsuleActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    {/* Tab Icon */}
                    {isProfileTab && resolvedAvatarUri ? (
                      <View
                        style={[
                          styles.profileImageContainer,
                          { width: iconSize + 2, height: iconSize + 2 },
                          isActive && styles.profileImageActive,
                        ]}
                      >
                        <Image
                          source={{ uri: resolvedAvatarUri }}
                          style={[
                            styles.profileImage,
                            { width: iconSize, height: iconSize },
                          ]}
                          contentFit="cover"
                          cachePolicy="disk"
                          transition={200}
                        />
                      </View>
                    ) : (
                      <View style={styles.iconWrapper}>
                        <IconComponent
                          width={iconSize}
                          height={iconSize}
                          color={iconColor}
                        />
                        {tab.key === "messages" && unreadMessagesCount > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>
                              {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Label beneath every icon - guaranteed 100% showing without abbreviation */}
                    <Text
                      style={[
                        styles.label,
                        {
                          fontSize,
                          color: textColor,
                          fontWeight: isActive ? "600" : "500",
                          marginTop: gapSize,
                        },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                      minimumFontScale={0.75}
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
    </View>
  );
};

const styles = StyleSheet.create({
  floatingWrapper: {
    position: Platform.OS === "web" ? "fixed" : "absolute",
    left: 14,
    right: 14,
    zIndex: 1000,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  pillContainer: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 36,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    paddingVertical: 4,
    paddingHorizontal: 4,
    backgroundColor:
      Platform.OS === "ios"
        ? "rgba(255, 255, 255, 0.82)"
        : "rgba(255, 255, 255, 0.92)",
    // Shadow directly on pillContainer so it tightly follows the rounded pill shape
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 8,
    ...(Platform.OS === "web" && {
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      WebkitMaskImage: "-webkit-radial-gradient(white, black)",
    }),
  },
  pillContainerTablet: {
    maxWidth: 540,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  bgOverlay: {
    borderRadius: 36,
    backgroundColor:
      Platform.OS === "ios"
        ? "rgba(255, 255, 255, 0.70)"
        : "rgba(255, 255, 255, 0.88)",
  },
  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 1,
  },
  capsule: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRadius: 18,
    width: "100%",
    minHeight: 42,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  capsuleActive: {
    backgroundColor: "rgba(25, 45, 255, 0.09)",
    borderColor: "rgba(25, 45, 255, 0.16)",
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    textAlign: "center",
    letterSpacing: -0.25,
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
    borderWidth: 1.5,
  },
  profileImage: {
    borderRadius: 50,
  },
  iconWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadge: {
    position: "absolute",
    top: -5,
    right: -10,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 11,
  },
});

export default HostBottomNav;
