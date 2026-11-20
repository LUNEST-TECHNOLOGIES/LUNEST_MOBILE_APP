import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import authService from "../services/authService";
import storageService from "../services/storageService";

const USER_MODE_KEY = "userMode";
const LAST_SIDE_KEY = "@lunest_last_visited_side";
export const USER_MODES = { GUEST: "GUEST", HOST: "HOST" };
const UserModeContext = createContext(undefined);
const canHost = user => !!user && user.hostApplicationStatus !== "REVOKED" && (
  ["HOST", "ADMIN", "SUPERADMIN"].includes(user.userType) || user.hostApplicationStatus === "APPROVED"
);
const identity = user => user?.id || user?._id || user?.emailAddress || user?.email || null;
const bounded = (promise, ms, fallback = null) => new Promise(resolve => {
  const timer = setTimeout(() => resolve(fallback), ms);
  Promise.resolve(promise).then(resolve, () => resolve(fallback)).finally(() => clearTimeout(timer));
});

export const UserModeProvider = ({ children }) => {
  const [mode, setMode] = useState(USER_MODES.GUEST);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [targetMode, setTargetMode] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const modeRef = useRef(USER_MODES.GUEST);
  const hostRef = useRef(false);
  const userRef = useRef(null);
  const transitionRef = useRef(null);
  const timerRef = useRef(null);
  const generation = useRef(0);

  const finishSwitch = useCallback(() => {
    clearTimeout(timerRef.current);
    transitionRef.current = null;
    setIsSwitching(false);
    setTargetMode(null);
  }, []);

  const persist = useCallback(next => {
    if (!userRef.current) return;
    storageService.setUserItem(userRef.current, USER_MODE_KEY, next).catch(() => {});
    // Kept for legacy entry points; never used as another account's preference.
    AsyncStorage.setItem(LAST_SIDE_KEY, next === USER_MODES.HOST ? "host" : "guest").catch(() => {});
  }, []);

  const refreshHostStatus = useCallback(async (restore = false) => {
    const version = ++generation.current;
    const local = await authService.getUserData();
    const id = identity(local);
    const loggedIn = await authService.hasLocalSession();
    if (version !== generation.current) return false;
    if (!loggedIn || !id) {
      userRef.current = null;
      hostRef.current = false;
      setIsHost(false);
      modeRef.current = USER_MODES.GUEST;
      setMode(USER_MODES.GUEST);
      setIsLoading(false);
      return false;
    }
    const changedAccount = userRef.current !== id;
    userRef.current = id;
    // Restore cached mode immediately. Revalidate privileges without blocking the screen.
    const response = null;
    if (!restore) {
      const fresh = await bounded(authService.fetchProfile(), 5000);
      if (fresh?.data) Object.assign(local, fresh.data);
    } else {
      bounded(authService.fetchProfile(), 6000).then(fresh => {
        if (version !== generation.current || !fresh?.data) return;
        const allowed = canHost(fresh.data);
        hostRef.current = allowed;
        setIsHost(allowed);
        if (!allowed && modeRef.current === USER_MODES.HOST) {
          modeRef.current = USER_MODES.GUEST;
          setMode(USER_MODES.GUEST);
        }
      });
    }
    if (version !== generation.current) return false;
    const allowed = canHost(response?.data || local);
    hostRef.current = allowed;
    setIsHost(allowed);
    if (restore || changedAccount || !allowed) {
      const saved = await bounded(storageService.getUserItem(id, USER_MODE_KEY), 500);
      if (version !== generation.current) return false;
      let hint = null;
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const path = window.location.pathname;
        if (/host|create-listing|manage-listings|earnings/.test(path)) hint = USER_MODES.HOST;
        else if (/guest|properties|explore|saved/.test(path)) hint = USER_MODES.GUEST;
      }
      const preferred = hint || saved;
      const next = allowed && preferred === USER_MODES.HOST ? USER_MODES.HOST : USER_MODES.GUEST;
      modeRef.current = next;
      setMode(next);
    }
    setIsLoading(false);
    return allowed;
  }, []);

  useEffect(() => {
    refreshHostStatus(true).catch(error => {
      console.warn("[UserMode] Unable to restore mode", error);
      setIsLoading(false);
    });
    return () => {
      generation.current++;
      clearTimeout(timerRef.current);
    };
  }, [refreshHostStatus]);

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

  const startSwitch = useCallback(next => {
    if (transitionRef.current) return false;
    if (next === USER_MODES.HOST && !hostRef.current) return false;
    if (modeRef.current === next) return true;
    // This ref locks synchronously, before React renders, including rapid double taps.
    transitionRef.current = next;
    modeRef.current = next;
    setIsSwitching(true);
    setTargetMode(next);
    setMode(next);
    persist(next);
    // Navigation acknowledgement normally releases the overlay immediately.
    // A stalled API or a failed route must never trap the user behind a spinner.
    timerRef.current = setTimeout(finishSwitch, 1500);
    const prefetch = next === USER_MODES.HOST ? prefetchHostData : prefetchGuestData;
    Promise.resolve().then(prefetch).catch(() => {});
    return true;
  }, [finishSwitch, persist, prefetchHostData, prefetchGuestData]);

  const switchToGuest = useCallback(async () => startSwitch(USER_MODES.GUEST), [startSwitch]);
  const switchToHost = useCallback(async () => startSwitch(USER_MODES.HOST), [startSwitch]);
  const toggleMode = useCallback(async () => startSwitch(
    modeRef.current === USER_MODES.HOST ? USER_MODES.GUEST : USER_MODES.HOST
  ), [startSwitch]);

  // Called only by the focused destination layout. An outgoing layout cannot undo a switch.
  const syncMode = useCallback(async next => {
    if (!Object.values(USER_MODES).includes(next)) return false;
    if (next === USER_MODES.HOST && !hostRef.current) return false;
    if (transitionRef.current && transitionRef.current !== next) return false;
    modeRef.current = next;
    setMode(next);
    persist(next);
    if (transitionRef.current === next) finishSwitch();
    return true;
  }, [finishSwitch, persist]);

  const resetUserMode = useCallback(async () => {
    generation.current++;
    finishSwitch();
    hostRef.current = false;
    userRef.current = null;
    modeRef.current = USER_MODES.GUEST;
    setMode(USER_MODES.GUEST);
    setIsHost(false);
    setIsLoading(false);
    await AsyncStorage.removeItem(LAST_SIDE_KEY);
    return true;
  }, [finishSwitch]);

  const value = {
    currentMode: mode, mode,
    isGuest: mode === USER_MODES.GUEST,
    isHostMode: mode === USER_MODES.HOST,
    isHost, isLoading, isSwitching, targetMode,
    switchToGuest, switchToHost, toggleMode, syncMode,
    refreshHostStatus, resetUserMode, prefetchGuestData, prefetchHostData,
    cancelSwitch: finishSwitch,
  };
  return <UserModeContext.Provider value={value}>{children}</UserModeContext.Provider>;
};

export const useUserMode = () => {
  const context = useContext(UserModeContext);
  if (context === undefined) throw new Error("useUserMode requires UserModeProvider");
  return context;
};
export default UserModeContext;
