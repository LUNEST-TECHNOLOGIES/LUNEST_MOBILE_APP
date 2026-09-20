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
import { resolveImageUrlSync } from "../../utils/imageUtils";

// Import custom SVG icons
import BookingsIcon from "../../assets/icons/navbar/BookingsIcon.svg";
import HomeIcon from "../../assets/icons/navbar/HomeIcon.svg";
import MessagesIcon from "../../assets/icons/navbar/MessagesIcon.svg";
import ProfileIcon from "../../assets/icons/navbar/ProfileIcon.svg";
import SavedIcon from "../../assets/icons/navbar/SavedIcon.svg";
import { TourAnchor } from "../tour";


/**
 * GuestBottomNav Component
 * Floating pill-shaped bottom navigation bar for LUNEST
 * - 5 tabs: Home, Bookings, Saved, Messages, Profile
 * - Floating inset pill with fully rounded edges
 * - Rounded capsule behind active icon & label using LUNEST theme colours (#192DFF)
 * - Subtle border, soft shadow, and background blur
 * - Responsive across all screen sizes and respects safe area
 */

const TABS = [
  { key: "home", label: "Home", Icon: HomeIcon, route: "/(tabs)" },
  {
    key: "bookings",
    label: "Bookings",
    Icon: BookingsIcon,
    route: "/(tabs)/bookings",
  },
  { key: "saved", label: "Saved", Icon: SavedIcon, route: "/(tabs)/saved" },
  {
    key: "messages",
    label: "Messages",
    Icon: MessagesIcon,
    route: "/(tabs)/messages",
  },
  {
    key: "profile",
    label: "Profile",
    Icon: ProfileIcon,
    route: "/(tabs)/profile",
  },
];

const GuestBottomNav = ({ activeTab: propActiveTab, onTabPress: propOnTabPress }) => {
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
        console.log("[GuestBottomNav] Resolved avatar:", { original: profileAvatarUri, resolved });
        setResolvedAvatarUri(resolved);
      } catch (error) {
        console.error("[GuestBottomNav] Error resolving avatar:", error);
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

  // Determine active tab based on prop or current route
  const getActiveTab = () => {
    if (propActiveTab) return propActiveTab;
    const current = pathname || "";
    if (
      current === "/" ||
      current === "/index" ||
      current === "/(tabs)" ||
      current === "/(tabs)/index"
    ) {
      return "home";
    }
    if (current.includes("bookings")) return "bookings";
    if (current.includes("saved")) return "saved";
    if (current.includes("messages")) return "messages";
    if (current.includes("profile")) return "profile";
    return "home";
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

  const iconSize = isSmallScreen ? 20 : isTablet ? 26 : isShortScreen ? 22 : 24;
  const fontSize = isSmallScreen ? 9.5 : isTablet ? 12 : isShortScreen ? 10 : 10.5;
  const gapSize = isSmallScreen ? 1 : 2;

  // Safe bottom offset for floating pill
  const floatingBottom = Platform.select({
    ios: Math.max(insets.bottom, 14) + 6,
    android: Math.max(insets.bottom, 10) + 8,
    web: 20,
    default: 16,
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
          intensity={Platform.OS === "ios" ? 85 : 100}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        {/* Soft translucent fallback overlay */}
        <View style={[StyleSheet.absoluteFill, styles.bgOverlay]} />

        {/* Navigation Tabs Row */}
        <View style={styles.tabsRow}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const IconComponent = tab.Icon;
            // Lunest primary colour (#192DFF) for active, muted colour (#6D6D6D) for inactive
            const iconColor = isActive ? "#192DFF" : "#6D6D6D";
            const textColor = isActive ? "#192DFF" : "#6D6D6D";
            const isProfileTab = tab.key === "profile";

            const anchorId =
              tab.key === "bookings"
                ? "tour-guest-nav-bookings"
                : tab.key === "saved"
                ? "tour-guest-nav-saved"
                : tab.key === "profile"
                ? "tour-guest-nav-profile"
                : null;

            const tabElement = (
              <Pressable
                key={tab.key}
                style={styles.tab}
                onPress={() => handleTabPress(tab)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
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
    </View>
  );
};

const styles = StyleSheet.create({
  floatingWrapper: {
    position: Platform.OS === "web" ? "fixed" : "absolute",
    left: 16,
    right: 16,
    zIndex: 1000,
    alignItems: "center",
    justifyContent: "center",
    // Soft shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  pillContainer: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 36,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  pillContainerTablet: {
    maxWidth: 540,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  bgOverlay: {
    backgroundColor:
      Platform.OS === "ios"
        ? "rgba(255, 255, 255, 0.85)"
        : "rgba(255, 255, 255, 0.96)",
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
    paddingHorizontal: 2,
  },
  capsule: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 20,
    width: "100%",
    minHeight: 46,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  capsuleActive: {
    backgroundColor: "rgba(25, 45, 255, 0.10)",
    borderColor: "rgba(25, 45, 255, 0.18)",
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
    borderWidth: 1.5,
  },
  profileImage: {
    borderRadius: 50,
  },
});

export default GuestBottomNav;
