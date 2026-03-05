import { Tabs, usePathname, useRouter } from "expo-router";
import React from "react";
import { Platform, StatusBar, View } from "react-native";
import {
    DeactivatedAccountBanner,
    GuestBottomNav,
} from "../../src/components/shared";
import { USER_MODES, useUserMode } from "../../src/context";

/**
 * Guest Tabs Layout
 * Tab navigation for guest mode - Home, Bookings, Saved, Messages, Profile
 *
 * NOTE: Swipe gestures are disabled to prevent accidental navigation.
 * Users must use the Switch to Host button on Profile to change modes.
 */
export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = React.useState("home");
  const { currentMode, isLoading, isSwitching, syncMode } = useUserMode();

  React.useEffect(() => {
    if (pathname === "/" || pathname === "/index") {
      setActiveTab("home");
    } else if (pathname === "/bookings") {
      setActiveTab("bookings");
    } else if (pathname === "/saved") {
      setActiveTab("saved");
    } else if (pathname === "/messages") {
      setActiveTab("messages");
    } else if (pathname === "/profile") {
      setActiveTab("profile");
    }
  }, [pathname]);

  React.useEffect(() => {
    if (isLoading || isSwitching) return;
    if (currentMode !== USER_MODES.GUEST) {
      syncMode(USER_MODES.GUEST);
    }
  }, [currentMode, isLoading, isSwitching, syncMode]);

  const handleTabPress = (tabKey) => {
    setActiveTab(tabKey);
    const targetRoute =
      tabKey === "home"
        ? "/"
        : tabKey === "bookings"
          ? "/bookings"
          : tabKey === "saved"
            ? "/saved"
            : tabKey === "messages"
              ? "/messages"
              : tabKey === "profile"
                ? "/profile"
                : null;

    if (targetRoute && pathname !== targetRoute) {
      router.push(targetRoute);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Deactivated Account Banner - shows when account is deactivated */}
      <DeactivatedAccountBanner />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
          sceneStyle: { backgroundColor: "#FFFFFF" },
          contentStyle: { backgroundColor: "#FFFFFF" },
          // Disable swipe gestures on iOS to prevent accidental navigation
          ...(Platform.OS === "ios" && { swipeEnabled: false }),
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="bookings" options={{ title: "Bookings" }} />
        {/* Explore tab is hidden from navigation (href: null) - placeholder for future use */}
        <Tabs.Screen name="explore" options={{ href: null }} />
        <Tabs.Screen name="saved" options={{ title: "Saved" }} />
        <Tabs.Screen name="messages" options={{ title: "Messages" }} />
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      </Tabs>
      <GuestBottomNav activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}
