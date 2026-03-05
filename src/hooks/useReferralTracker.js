import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { useEffect } from "react";

const REFERRAL_STORAGE_KEY = "@pending_referral";

/**
 * useReferralTracker
 *
 * Captures referral codes from deep links (lunestmobile://join?ref_id=CODE)
 * and stores them in AsyncStorage so the Signup screen can auto-fill.
 *
 * Place this in your root _layout.jsx:
 *   useReferralTracker();
 */
export function useReferralTracker() {
  useEffect(() => {
    // 1. Check the URL that opened the app (cold start)
    const checkInitialUrl = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          await extractAndStoreRefCode(initialUrl);
        }
      } catch (e) {
        console.warn("[ReferralTracker] Error checking initial URL:", e);
      }
    };

    checkInitialUrl();

    // 2. Listen for deep links while app is open (warm start)
    const subscription = Linking.addEventListener("url", (event) => {
      if (event.url) {
        extractAndStoreRefCode(event.url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
}

/**
 * Extract ref_id from a URL and store in AsyncStorage.
 */
async function extractAndStoreRefCode(url) {
  try {
    const parsed = Linking.parse(url);
    const refCode =
      parsed.queryParams?.ref_id ||
      parsed.queryParams?.ref ||
      parsed.queryParams?.referral;

    if (refCode) {
      console.log("[ReferralTracker] Captured referral code:", refCode);
      await AsyncStorage.setItem(REFERRAL_STORAGE_KEY, String(refCode));
    }
  } catch (e) {
    console.warn("[ReferralTracker] Error parsing URL:", e);
  }
}

/**
 * Retrieve and clear the stored referral code.
 * Call this in SignupScreen on mount.
 */
export async function consumePendingReferral() {
  try {
    const code = await AsyncStorage.getItem(REFERRAL_STORAGE_KEY);
    if (code) {
      // Clear it so it's only used once
      await AsyncStorage.removeItem(REFERRAL_STORAGE_KEY);
      return code;
    }
  } catch (e) {
    console.warn("[ReferralTracker] Error consuming referral:", e);
  }
  return null;
}

/**
 * DEV HELPER: Manually inject a referral code for simulator testing.
 * Call from a dev button: captureCode("TEST5")
 */
export async function captureCode(code) {
  await AsyncStorage.setItem(REFERRAL_STORAGE_KEY, code);
  console.log("[ReferralTracker] DEV: Manually stored code:", code);
}
