/**
 * Root Index
 * Entry point that redirects to the appropriate screen based on auth status
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useRootNavigationState } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import authService from "../src/services/authService";
import storageService from "../src/services/storageService";

const ONBOARDING_KEY = "@lunest_onboarding_complete";

export default function Index() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (!rootNavigationState?.key) return;
    checkAndRedirect();
  }, [rootNavigationState?.key]);

  const checkAndRedirect = async () => {
    try {
      // Check if user is logged in
      const isLoggedIn = await authService.isLoggedIn();

      if (isLoggedIn) {
        // Determine target route based on saved user mode
        const userData = await authService.getUserData();
        const userId = userData?.id || userData?.email;
        let targetRoute = "/(tabs)"; // Default to guest mode

        if (userId) {
          try {
            let savedMode = await storageService.getUserItem(userId, "userMode");
            
            // Web Hint: If we are on web, check URL for mode hints before deciding
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              const path = window.location.pathname;
              const isHostPath = path.includes('/host') || path.includes('/create-listing') || path.includes('/manage-listings') || path.includes('/earnings');
              const isGuestPath = path.includes('/guest') || path.includes('/properties') || path.includes('/explore') || path.includes('/saved') || path.includes('/bookings') || path.includes('/profile') || path.includes('/messages') || path.includes('/transaction-detail');
              
              if (isHostPath) {
                savedMode = "HOST";
              } else if (isGuestPath) {
                savedMode = "GUEST";
              }
            }

            if (savedMode === "HOST") {
              // Only redirect to host tabs if the user actually has host privileges
              const isHost = 
                userData?.userType === "HOST" || 
                userData?.userType === "ADMIN" || 
                userData?.userType === "SUPERADMIN" ||
                userData?.hostApplicationStatus === "APPROVED";
                
              if (isHost) {
                targetRoute = "/(host-tabs)";
              }
            }
          } catch (storageErr) {
            console.warn("[Index] Error reading saved mode:", storageErr);
          }
        }

        console.log(`[Index] Redirecting logged in user to: ${targetRoute}`);
        router.replace(targetRoute);
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
      <ActivityIndicator size="large" color="#010135" />
    </View>
  );
}
