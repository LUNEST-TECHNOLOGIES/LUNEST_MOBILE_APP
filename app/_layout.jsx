import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AccountStatusProvider, UserModeProvider } from "../src/context";
import { useReferralTracker } from "../src/hooks/useReferralTracker";
import apiClient from "../src/services/apiClient";
import authService from "../src/services/authService";

// Verify env is loaded
console.log("[App] Environment Check:");
console.log("[App] EXPO_PUBLIC_API_URL =", process.env.EXPO_PUBLIC_API_URL);
console.log(
  "[App] EXPO_PUBLIC_API_TIMEOUT =",
  process.env.EXPO_PUBLIC_API_TIMEOUT,
);

const ONBOARDING_KEY = "@lunest_onboarding_complete";

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const wasAuthenticated = useRef(false); // Track if user was previously logged in
  const router = useRouter();
  const segments = useSegments();

  // Capture referral deep links on app launch
  useReferralTracker();

  // Check onboarding and auth status on app launch
  useEffect(() => {
    checkAppStatus();
  }, []);

  // Handle navigation based on onboarding and auth status
  useEffect(() => {
    if (isLoading) return;

    const inIndex = segments.length === 0 || segments[0] === "index";
    const inOnboarding = segments[0] === "onboarding";
    const inAuth =
      segments[0] === "login" ||
      segments[0] === "signup" ||
      segments[0] === "forgot-password" ||
      segments[0] === "verify-code" ||
      segments[0] === "reset-password";
    const inTabs = segments[0] === "(tabs)";
    const inHostTabs = segments[0] === "(host-tabs)";

    // Let the index page handle initial routing
    if (inIndex) return;

    // Re-check auth status when navigating to tabs
    const checkAndNavigate = async () => {
      const loggedIn = await authService.isLoggedIn();

      if (loggedIn) {
        // User is logged in - go to home if on auth/onboarding screens
        wasAuthenticated.current = true;
        if (inAuth || inOnboarding) {
          router.replace("/(tabs)");
        }
      } else {
        // User is NOT logged in
        if (inTabs || inHostTabs) {
          // Was previously authenticated - session expired
          if (wasAuthenticated.current) {
            wasAuthenticated.current = false;
            Alert.alert(
              "Session Expired",
              "Your session has expired. Please log in again.",
              [{ text: "OK" }],
            );
          }
          // Redirect to login (not onboarding) for returning users
          router.replace("/login");
        } else if (!inOnboarding && !inAuth) {
          // Not on onboarding or auth screens, go to onboarding for new users
          router.replace("/onboarding");
        }
      }
    };

    checkAndNavigate();
  }, [isLoading, segments]);

  const checkAppStatus = async () => {
    try {
      // Initialize API client with correct backend URL based on platform
      await apiClient.initialize();

      // Initialize auth service with dynamic backend URL
      await authService.initialize();

      // Check onboarding status
      const onboardingValue = await AsyncStorage.getItem(ONBOARDING_KEY);
      setHasCompletedOnboarding(onboardingValue === "true");

      // Check authentication status
      const loggedIn = await authService.isLoggedIn();
      setIsAuthenticated(loggedIn);
    } catch (error) {
      console.error("Error checking app status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserModeProvider>
        <AccountStatusProvider>
          <SafeAreaProvider>
            {isLoading ? (
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
            ) : (
              <Stack
                screenOptions={{
                  headerShown: false,
                }}
              >
                <Stack.Screen
                  name="index"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="onboarding"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="signup"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="login"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
                <Stack.Screen
                  name="(host-tabs)"
                  options={{ gestureEnabled: false }}
                />
                <Stack.Screen
                  name="+not-found"
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="landlord-request"
                  options={{
                    presentation: "card",
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="host-request-pending"
                  options={{
                    presentation: "card",
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="property-details"
                  options={{
                    presentation: "card",
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="select-booking-details"
                  options={{
                    presentation: "card",
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="booking-summary"
                  options={{
                    presentation: "card",
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="booking-confirmation"
                  options={{
                    presentation: "transparentModal",
                    headerShown: false,
                    animationEnabled: true,
                  }}
                />
                <Stack.Screen
                  name="pay-with-wallet"
                  options={{
                    presentation: "card",
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="transaction-detail"
                  options={{
                    presentation: "card",
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="full-details"
                  options={{
                    presentation: "card",
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="host-information"
                  options={{
                    presentation: "card",
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="personal-info-edit"
                  options={{
                    presentation: "card",
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="referrals"
                  options={{
                    presentation: "card",
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="modal"
                  options={{
                    presentation: "modal",
                    headerShown: false,
                  }}
                />
              </Stack>
            )}
          </SafeAreaProvider>
        </AccountStatusProvider>
      </UserModeProvider>
    </GestureHandlerRootView>
  );
}
