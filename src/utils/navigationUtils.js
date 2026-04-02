// navigationUtils.js
import { CommonActions } from "@react-navigation/native";
import { Platform } from "react-native";

let navigationRef = null;

export function setNavigationRef(ref) {
  navigationRef = ref;
}

export function navigateToLogin() {
  if (navigationRef) {
    console.log("[navigationUtils] Navigating to Login via React Navigation");
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Login" }],
      }),
    );
  } else {
    // fallback: log error and check platform
    console.error(
      "[navigationUtils] Cannot navigate to Login: navigationRef is null",
    );

    // Only attempt web redirect if explicitly on web and NOT in a native environment
    if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
      try {
        console.log("[navigationUtils] Attempting web redirect to /login");
        window.location.assign("/login");
      } catch (e) {
        console.error("[navigationUtils] Web redirect failed:", e);
      }
    }
  }
}
