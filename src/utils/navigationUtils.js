// navigationUtils.js
import { CommonActions } from "@react-navigation/native";

let navigationRef = null;

export function setNavigationRef(ref) {
  navigationRef = ref;
}

export function navigateToLogin() {
  if (navigationRef) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Login" }],
      }),
    );
  } else {
    // fallback: reload page (web)
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }
}
