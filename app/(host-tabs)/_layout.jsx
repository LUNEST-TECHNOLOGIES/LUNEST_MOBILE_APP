import { Tabs, useRouter } from "expo-router";
import React from "react";
import { Platform, StatusBar, View } from "react-native";
import {
    DeactivatedAccountBanner,
    HostBottomNav,
} from "../../src/components/shared";
import { USER_MODES, useUserMode } from "../../src/context";

/**
 * Host Tabs Layout
 * Tab navigation for host mode - Dashboard, Listings, Calendar, Earnings, Profile
 *
 * NOTE: Swipe gestures are disabled to prevent accidental navigation.
 * Users must use the Switch to Host/Guest button on Profile to change modes.
 */
export default function HostTabLayout() {
  const router = useRouter();
  const { currentMode, isHost, isLoading, isSwitching, syncMode } =
    useUserMode();

  React.useEffect(() => {
    if (isLoading || isSwitching) return;
    if (!isHost) {
      syncMode(USER_MODES.GUEST);
      router.replace("/(tabs)");
      return;
    }
    if (currentMode !== USER_MODES.HOST) {
      syncMode(USER_MODES.HOST);
    }
  }, [currentMode, isHost, isLoading, isSwitching, router, syncMode]);

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
        <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
        <Tabs.Screen name="bookings" options={{ title: "Bookings" }} />
        <Tabs.Screen name="listings" options={{ title: "Listings" }} />
        <Tabs.Screen name="calendar" options={{ title: "Calendar" }} />
        <Tabs.Screen name="messages" options={{ title: "Messages" }} />
        <Tabs.Screen name="earnings" options={{ title: "Earnings" }} />
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      </Tabs>
      <HostBottomNav />
    </View>
  );
}
