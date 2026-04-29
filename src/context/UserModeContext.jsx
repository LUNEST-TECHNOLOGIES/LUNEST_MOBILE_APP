/**
 * User Mode Context
 * Manages switching between Guest and Host modes
 *
 * Guest Mode: Browse and book properties
 * Host Mode: Manage listings, view bookings, earnings
 *
 * NOTE: User mode is stored per-user to maintain unique preferences
 * Each mode switch triggers data prefetching to ensure unique user data is loaded
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import authService from "../services/authService";
import storageService from "../services/storageService";

const USER_MODE_KEY = "userMode";
const LAST_SIDE_KEY = "@lunest_last_visited_side";

// Mode constants
export const USER_MODES = {
  GUEST: "GUEST",
  HOST: "HOST",
};

const UserModeContext = createContext(undefined);

export const UserModeProvider = ({ children }) => {
  const [mode, setMode] = useState(USER_MODES.GUEST);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false); // Loading state during mode switch
  const [targetMode, setTargetMode] = useState(null); // Mode we are switching to
  const [isHost, setIsHost] = useState(false); // Whether user has host privileges
  const [userId, setUserId] = useState(null); // Current user ID for storage

  // Keep a ref of current mode to break recursion in callbacks
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Load saved mode on mount
  useEffect(() => {
    // Initial silent load from storage/URL
    loadUserMode();
  }, []);

  const isInitialLoad = useRef(false);
  const loadUserMode = async () => {
    if (isInitialLoad.current) return;
    try {
      isInitialLoad.current = true;
      // Check if user has host privileges from locally stored data
      const userData = await authService.getUserData();
      const currentUserId = userData?.id || userData?.email;
      setUserId(currentUserId);

      // Determine host status from local data first (fast)
      let userIsHost =
        userData?.userType === "HOST" ||
        userData?.userType === "ADMIN" ||
        userData?.userType === "SUPERADMIN";

      // SET INITIAL STATUS FROM CACHE (Fast UI update)
      setIsHost(userIsHost);

      // Also fetch fresh profile from server to get accurate hostApplicationStatus
      // This prevents stale AsyncStorage data from showing host switch to guest users
      try {
        const loggedIn = await authService.isLoggedIn();
        if (loggedIn) {
          const serverProfile = await authService.fetchProfile();
          if (serverProfile?.data) {
            const serverType = serverProfile.data.userType;
            const serverHostStatus = serverProfile.data.hostApplicationStatus;
            userIsHost =
              serverType === "HOST" ||
              serverType === "ADMIN" ||
              serverType === "SUPERADMIN" ||
              serverHostStatus === "APPROVED";
            
            // UPDATE STATUS IF SERVER DIFFERS
            setIsHost(userIsHost);
          }
        }
      } catch (profileErr) {
        // If server fetch fails, also check local hostApplicationStatus
        if (userData?.hostApplicationStatus === "APPROVED") {
          userIsHost = true;
          setIsHost(true);
        }
        console.warn("[UserMode] Could not fetch server profile, using local data:", profileErr);
      }

      // Fallback: Check last visited side (last_side_key) - globally persistent even if userId is missing
      const lastSide = await AsyncStorage.getItem(LAST_SIDE_KEY);
      
      // Web Hint: If we are on web, check the URL for mode hints
      let urlModeHint = null;
      if (Platform.OS === 'web') {
        const path = window.location.pathname;
        if (path.includes('/host') || path.includes('/create-listing')) {
          urlModeHint = USER_MODES.HOST;
        } else if (path.includes('/guest')) {
          urlModeHint = USER_MODES.GUEST;
        }
        console.log(`🌐 [UserMode] Web URL Mode Hint: ${urlModeHint} (Path: ${path})`);
      }

      if (currentUserId) {
        // Load user-specific mode preference
        const savedMode = await storageService.getUserItem(
          currentUserId,
          USER_MODE_KEY,
        );
        
        // Priority: 1. URL Hint (Web) | 2. Saved Preference | 3. Last Side Fallback
        const preferredMode = urlModeHint || savedMode || (lastSide === 'host' ? USER_MODES.HOST : USER_MODES.GUEST);

        if (preferredMode && Object.values(USER_MODES).includes(preferredMode)) {
          // Only allow host mode if user has host privileges
          if (preferredMode === USER_MODES.HOST && !userIsHost) {
            setMode(USER_MODES.GUEST);
          } else {
            setMode(preferredMode);
            console.log(`🔄 [UserMode] Restored mode for ${currentUserId}: ${preferredMode}`);
          }
        } else if (userIsHost) {
          console.log("🔄 [UserMode] New host session, defaulting to GUEST mode for browsing");
          setMode(USER_MODES.GUEST);
        }
      } else {
        // Logged out or still initializing - use URL or Last Side
        const guestOrPublicMode = urlModeHint || (lastSide === 'host' ? USER_MODES.HOST : USER_MODES.GUEST);
        if (guestOrPublicMode && Object.values(USER_MODES).includes(guestOrPublicMode)) {
            // Even if logged out, we might want to stay on the 'host' visual side if that's where the refresh happened
            setMode(guestOrPublicMode);
            console.log(`🔄 [UserMode] Public/Initializing mode restored: ${guestOrPublicMode}`);
        }
      }
    } catch (error) {
      console.error("Error loading user mode:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Prefetch data for guest mode (user-specific bookings, favorites, etc.)
   * All listings are visible to all users in guest mode
   */
  const prefetchGuestData = useCallback(async () => {
    console.log("🔄 [UserMode] Prefetching guest-specific data...");
    try {
      // Import services dynamically to avoid circular dependencies
      const bookingService = require("../services/bookingService").default;

      // Prefetch user's own guest bookings
      await bookingService.fetchGuestBookings();

      console.log("✅ [UserMode] Guest data prefetched successfully");
      return true;
    } catch (error) {
      console.error("❌ [UserMode] Error prefetching guest data:", error);
      return false;
    }
  }, []);

  /**
   * Prefetch data for host mode (host-specific listings, bookings, earnings)
   * Only shows data belonging to the authenticated host
   */
  const prefetchHostData = useCallback(async () => {
    console.log("🔄 [UserMode] Prefetching host-specific data...");
    try {
      // Import services dynamically to avoid circular dependencies
      const listingService = require("../services/listingService").default;
      const bookingService = require("../services/bookingService").default;
      const dashboardService = require("../services/dashboardService").default;

      // Prefetch host's unique data in parallel with error handling for each
      const results = await Promise.allSettled([
        listingService.fetchUserListings(), // Host's listings only
        bookingService.fetchHostBookings(), // Host's bookings only
        dashboardService.fetchHostDashboard(), // Host's stats only
      ]);

      // Log any failures but don't block the switch
      results.forEach((result, index) => {
        const serviceNames = ["listings", "bookings", "dashboard"];
        if (result.status === "rejected") {
          console.warn(
            `⚠️ [UserMode] Failed to prefetch ${serviceNames[index]}:`,
            result.reason,
          );
        }
      });

      console.log("✅ [UserMode] Host data prefetch completed");
      return true;
    } catch (error) {
      console.error("❌ [UserMode] Error prefetching host data:", error);
      return false;
    }
  }, []);

  const switchToGuest = useCallback(async () => {
    if (isSwitching) return false;
    if (modeRef.current === USER_MODES.GUEST) return true;
    try {
      setIsSwitching(true);
      setTargetMode(USER_MODES.GUEST);
      console.log("🔄 [UserMode] Switching to GUEST mode...");

      // OPTIMISTIC UPDATE: Set mode and save preference immediately
      setMode(USER_MODES.GUEST);
      modeRef.current = USER_MODES.GUEST; // Sync ref immediately
      
      if (userId) {
        storageService.setUserItem(
          userId,
          USER_MODE_KEY,
          USER_MODES.GUEST,
        ).catch(err => console.warn("Error saving guest mode preference:", err));
      }
      AsyncStorage.setItem(LAST_SIDE_KEY, "guest").catch(err => console.warn("Error saving last side:", err));

      // SAFETY TIMEOUT: Force reset isSwitching after 10s if something hangs
      const safetyTimeout = setTimeout(() => {
        if (isSwitching) {
            console.warn("⚠️ [UserMode] Guest switch safety timeout reached. Forcing reset.");
            setIsSwitching(false);
        }
      }, 10000);

      // Prefetch guest-specific data in the background
      // We don't strictly await it so navigation can happen instantly
      prefetchGuestData().finally(() => {
        clearTimeout(safetyTimeout);
        setIsSwitching(false);
        setTargetMode(null);
      });

      console.log("✅ [UserMode] Optimistic switch to GUEST mode initiated");
      return true;
    } catch (error) {
      console.error("Error switching to guest mode:", error);
      setIsSwitching(false);
      return false;
    }
  }, [isSwitching, prefetchGuestData, userId]);

  const switchToHost = useCallback(async () => {
    if (!isHost) {
      console.warn("User does not have host privileges");
      return false;
    }
    if (isSwitching) return false;
    if (modeRef.current === USER_MODES.HOST) return true;
    try {
      setIsSwitching(true);
      setTargetMode(USER_MODES.HOST);
      console.log("🔄 [UserMode] Switching to HOST mode...");

      // OPTIMISTIC UPDATE: Set mode and save preference immediately
      setMode(USER_MODES.HOST);
      modeRef.current = USER_MODES.HOST; // Sync ref immediately
      
      if (userId) {
        storageService.setUserItem(
          userId,
          USER_MODE_KEY,
          USER_MODES.HOST,
        ).catch(err => console.warn("Error saving host mode preference:", err));
      }
      AsyncStorage.setItem(LAST_SIDE_KEY, "host").catch(err => console.warn("Error saving last side:", err));

      // SAFETY TIMEOUT: Force reset isSwitching after 10s if something hangs
      const safetyTimeout = setTimeout(() => {
        if (isSwitching) {
            console.warn("⚠️ [UserMode] Host switch safety timeout reached. Forcing reset.");
            setIsSwitching(false);
        }
      }, 10000);

      // Prefetch host-specific data in the background
      prefetchHostData().finally(() => {
        clearTimeout(safetyTimeout);
        setIsSwitching(false);
        setTargetMode(null);
      });

      console.log("✅ [UserMode] Optimistic switch to HOST mode initiated");
      return true;
    } catch (error) {
      console.error("Error switching to host mode:", error);
      setIsSwitching(false);
      return false;
    }
  }, [isHost, isSwitching, prefetchHostData, userId]);

  const toggleMode = useCallback(async () => {
    if (isSwitching) return false;
    if (modeRef.current === USER_MODES.GUEST) {
      return await switchToHost();
    } else {
      await switchToGuest();
      return true;
    }
  }, [isSwitching, switchToHost, switchToGuest]);

  // Silent mode sync (no prefetch, no switching overlay)
  const syncMode = useCallback(async (targetMode) => {
    if (!targetMode || targetMode === modeRef.current) return true;
    setMode(targetMode);
    if (userId) {
      await storageService.setUserItem(userId, USER_MODE_KEY, targetMode);
    }
    await AsyncStorage.setItem(
      LAST_SIDE_KEY,
      targetMode === USER_MODES.HOST ? "host" : "guest",
    );
    return true;
  }, [userId]);

  // Refresh host status (call after becoming a host or on login)
  const refreshHostStatus = useCallback(async () => {
    const userData = await authService.getUserData();
    const currentUserId = userData?.id || userData?.email;
    setUserId(currentUserId);

    let userIsHost =
      userData?.userType === "HOST" ||
      userData?.userType === "ADMIN" ||
      userData?.userType === "SUPERADMIN";

    // Also check hostApplicationStatus from server for accuracy
    try {
      const serverProfile = await authService.fetchProfile();
      if (serverProfile?.data) {
        const serverType = serverProfile.data.userType;
        const serverHostStatus = serverProfile.data.hostApplicationStatus;
        userIsHost =
          serverType === "HOST" ||
          serverType === "ADMIN" ||
          serverType === "SUPERADMIN" ||
          serverHostStatus === "APPROVED";
      }
    } catch (profileErr) {
      if (userData?.hostApplicationStatus === "APPROVED") {
        userIsHost = true;
      }
      console.warn("[UserMode] Could not fetch server profile during refresh:", profileErr);
    }

    setIsHost(userIsHost);
    return userIsHost;
  }, []);

  // Clear state on logout
  const resetUserMode = useCallback(async () => {
    console.log("🔄 [UserMode] Resetting user mode on logout...");
    setMode(USER_MODES.GUEST);
    setIsHost(false);
    setUserId(null);
    modeRef.current = USER_MODES.GUEST;
    await AsyncStorage.removeItem(LAST_SIDE_KEY);
    return true;
  }, []);
  
  const cancelSwitch = useCallback(() => {
    setIsSwitching(false);
    setTargetMode(null);
  }, []);

  const value = {
    currentMode: mode,
    mode,
    isGuest: mode === USER_MODES.GUEST,
    isHostMode: mode === USER_MODES.HOST,
    isHost, // Whether user CAN be a host
    isLoading,
    isSwitching, // Loading state during mode switch
    targetMode,
    switchToGuest,
    switchToHost,
    toggleMode,
    syncMode,
    refreshHostStatus,
    resetUserMode,
    prefetchGuestData,
    prefetchHostData,
    cancelSwitch,
  };

  return (
    <UserModeContext.Provider value={value}>
      {children}
    </UserModeContext.Provider>
  );
};

export const useUserMode = () => {
  const context = useContext(UserModeContext);
  
  if (context === undefined) {
    // If the error persists after refreshes, this usually points to module duplication in Metro
    console.warn("⚠️ [UserMode] useUserMode called outside of a Provider or Context instance mismatch!");
    
    // Return a stable fallback value to prevent "undefined of" crashes
    return {
      currentMode: USER_MODES.GUEST,
      mode: USER_MODES.GUEST,
      isGuest: true,
      isHostMode: false,
      isHost: false,
      isLoading: true,
      isSwitching: false,
      switchToGuest: async () => false,
      switchToHost: async () => false,
      toggleMode: async () => false,
      syncMode: async () => false,
      refreshHostStatus: async () => false,
      resetUserMode: async () => false,
    };
  }
  return context;
};

export default UserModeContext;
