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
import profileService from "../../services/profileService";

// Import custom SVG icons
import BookingsIcon from "../../assets/icons/navbar/BookingsIcon.svg";
import HomeIcon from "../../assets/icons/navbar/HomeIcon.svg";
import MessagesIcon from "../../assets/icons/navbar/MessagesIcon.svg";
import ProfileIcon from "../../assets/icons/navbar/ProfileIcon.svg";
import SavedIcon from "../../assets/icons/navbar/SavedIcon.svg";

/**
 * GuestBottomNav Component
 * Bottom navigation bar for guest users (Lunest design)
 * - 5 tabs: Home, Bookings, Saved, Messages, Profile
 * - White background, blue (#192DFF) active state
 * - Responsive across all screen sizes
 * - Uses custom SVG icons from Figma
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

const GuestBottomNav = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  // Profile avatar state
  const [profileAvatarUri, setProfileAvatarUri] = useState(null);

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
      pathname === "/" ||
      pathname === "/index" ||
      pathname === "/(tabs)" ||
      pathname === "/(tabs)/index"
    )
      return "home";
    if (pathname.includes("bookings")) return "bookings";
    if (pathname.includes("saved")) return "saved";
    if (pathname.includes("messages")) return "messages";
    if (pathname.includes("profile")) return "profile";
    return "home";
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
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const IconComponent = tab.Icon;
          // Icons use proper active/inactive colors like host nav bar
          const iconColor = isActive ? "#192DFF" : "#292929";
          const textColor = isActive ? "#192DFF" : "#6D6D6D";
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
                  {isProfileTab && profileAvatarUri ? (
                    <View
                      style={[
                        styles.profileImageContainer,
                        { width: iconSize, height: iconSize },
                        isActive && styles.profileImageActive,
                      ]}
                    >
                      <Image
                        source={{ uri: profileAvatarUri }}
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
                        color: textColor,
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
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
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
    borderWidth: 1.5,
    borderColor: "#192DFF",
    alignItems: "center",
    justifyContent: "center",
  },
  profileImageActive: {
    borderColor: "#192DFF",
    borderWidth: 2.5,
  },
  profileImage: {
    borderRadius: 50,
  },
});

export default GuestBottomNav;
