/**
 * Account Status Context
 * Manages user account activation status across the app
 * Shows restrictions when account is deactivated
 * Syncs with backend to reflect admin actions
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { AppState } from "react-native";
import authService from "../services/authService";
import configService from "../services/configService";

const AccountStatusContext = createContext(undefined);

export const AccountStatusProvider = ({ children }) => {
  const [isAccountActive, setIsAccountActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [deactivationReason, setDeactivationReason] = useState(null);
  const [adminDeactivationReason, setAdminDeactivationReason] = useState(null);
  const appState = useRef(AppState.currentState);

  // Check account status on mount and when app comes to foreground
  useEffect(() => {
    checkAccountStatus();

    // Listen for app state changes to refresh status when app comes to foreground
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        console.log(
          "[AccountStatus] App came to foreground, checking status...",
        );
        checkAccountStatus();
        // Also refresh profile data globally
        authService.fetchProfile().catch(err => console.log('Background profile refresh failed', err));
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  const checkAccountStatus = useCallback(async () => {
    try {
      const token = await authService.getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      const baseURL = await configService.getBaseURL();
      console.log("[AccountStatus] Checking account status...");
      const response = await fetch(`${baseURL}/v1/users/account-status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("[AccountStatus] Response:", data);

      if (response.ok) {
        const isActive = data.body?.active !== false;
        setIsAccountActive(isActive);

        if (!isActive) {
          const reason = data.body?.deactivationReason || "USER_REQUEST";
          setDeactivationReason(reason);
          setAdminDeactivationReason(
            data.body?.adminDeactivationReason || null,
          );
          console.log(
            "[AccountStatus] Account is DEACTIVATED. Reason:",
            reason,
          );
        } else {
          setDeactivationReason(null);
          setAdminDeactivationReason(null);
          console.log("[AccountStatus] Account is ACTIVE");
        }
      }
    } catch (error) {
      console.error("Error checking account status:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reactivateAccount = useCallback(async () => {
    try {
      const baseURL = await configService.getBaseURL();
      const token = await authService.getToken();

      console.log(
        "[ReactivateAccount] Calling API:",
        `${baseURL}/v1/users/reactivate-account`,
      );
      console.log("[ReactivateAccount] Token exists:", !!token);

      const response = await fetch(`${baseURL}/v1/users/reactivate-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}), // Empty body for POST request
      });

      console.log("[ReactivateAccount] Response status:", response.status);
      const data = await response.json();
      console.log("[ReactivateAccount] Response data:", data);

      if (response.ok) {
        setIsAccountActive(true);
        setDeactivationReason(null);
        setAdminDeactivationReason(null);
        return { success: true, message: "Account reactivated successfully!" };
      } else {
        return {
          success: false,
          message: data.message || "Failed to reactivate account",
        };
      }
    } catch (error) {
      console.error("Reactivate account error:", error);
      return {
        success: false,
        message: "Something went wrong. Please try again.",
      };
    }
  }, []);

  const deactivateAccount = useCallback(async () => {
    try {
      const baseURL = await configService.getBaseURL();
      const token = await authService.getToken();

      console.log(
        "[DeactivateAccount] Calling API:",
        `${baseURL}/v1/users/deactivate-account`,
      );
      console.log("[DeactivateAccount] Token exists:", !!token);

      const response = await fetch(`${baseURL}/v1/users/deactivate-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}), // Empty body for POST request
      });

      console.log("[DeactivateAccount] Response status:", response.status);
      const data = await response.json();
      console.log("[DeactivateAccount] Response data:", data);

      if (response.ok) {
        setIsAccountActive(false);
        setDeactivationReason("USER_REQUEST");
        return { success: true, message: "Account deactivated successfully!" };
      } else {
        return {
          success: false,
          message: data.message || "Failed to deactivate account",
        };
      }
    } catch (error) {
      console.error("Deactivate account error:", error);
      return {
        success: false,
        message: "Something went wrong. Please try again.",
      };
    }
  }, []);

  /**
   * Check if a specific action is allowed
   * Returns false with a reason if account is deactivated
   */
  const canPerformAction = useCallback(
    (action) => {
      if (isAccountActive) {
        return { allowed: true };
      }

      const restrictedActions = {
        booking: "You cannot make bookings while your account is deactivated.",
        listing:
          "You cannot create or manage listings while your account is deactivated.",
        message: "You cannot send messages while your account is deactivated.",
        payment: "You cannot make payments while your account is deactivated.",
        review: "You cannot leave reviews while your account is deactivated.",
      };

      return {
        allowed: false,
        reason:
          restrictedActions[action] ||
          "This action is not available while your account is deactivated.",
      };
    },
    [isAccountActive],
  );

  return (
    <AccountStatusContext.Provider
      value={{
        isAccountActive,
        isLoading,
        deactivationReason,
        adminDeactivationReason,
        checkAccountStatus,
        reactivateAccount,
        deactivateAccount,
        canPerformAction,
      }}
    >
      {children}
    </AccountStatusContext.Provider>
  );
};

export const useAccountStatus = () => {
  const context = useContext(AccountStatusContext);
  if (context === undefined) {
    throw new Error(
      "useAccountStatus must be used within an AccountStatusProvider",
    );
  }
  return context;
};
