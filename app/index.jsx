/**
 * Root Index
 * Entry point that redirects to the appropriate screen based on auth status
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import authService from "../src/services/authService";

const ONBOARDING_KEY = "@lunest_onboarding_complete";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    checkAndRedirect();
  }, []);

  const checkAndRedirect = async () => {
    try {
      // Check if user is logged in
      const isLoggedIn = await authService.isLoggedIn();

      if (isLoggedIn) {
        // User is authenticated - always start on guest tabs
        // User must explicitly use "Switch to Host" button on profile to access host mode
        // This prevents accidental swipe navigation and ensures proper mode context
        router.replace("/(tabs)");
      } else {
        // Check if onboarding is complete
        const onboardingComplete = await AsyncStorage.getItem(ONBOARDING_KEY);

        if (onboardingComplete === "true") {
          // Onboarding done but not logged in - go to login
          router.replace("/login");
        } else {
          // New user - go to onboarding
          router.replace("/onboarding");
        }
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      // Default to onboarding on error
      router.replace("/onboarding");
    }
  };

  // Show loading while determining route
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
      }}
    >
      <ActivityIndicator size="large" color="#192DFF" />
    </View>
  );
}
