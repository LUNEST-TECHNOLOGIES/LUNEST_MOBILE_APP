import { usePathname, useRouter } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import authService from "../services/authService";
import { getUserData } from "../services/userDataService";
import storageService from "../services/storageService";
import { GUEST_TOUR_STEPS, HOST_TOUR_STEPS } from "../components/tour/tourSteps";

const ProductTourContext = createContext(null);

const TOUR_STORAGE_PREFIX = "@lunest_tour_status_";
const KYC_POPUP_STORAGE_PREFIX = "@lunest_kyc_login_popup_shown_";

// Routes where tooltips and tour bubbles are STRICTLY FORBIDDEN (Core Rule)
const FORBIDDEN_ROUTES = [
  "/login",
  "/signup",
  "/onboarding",
  "/verify-code",
  "/forgot-password",
  "/reset-password",
  "/kyc-verification",
  "/profile/kyc-verification",
];

export const ProductTourProvider = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();

  const [tourState, setTourState] = useState("not_started"); // not_started | in_progress | completed | skipped
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [tourRole, setTourRole] = useState("guest"); // guest | host
  const [isKycVerified, setIsKycVerified] = useState(false);
  const [showPostTourKycModal, setShowPostTourKycModal] = useState(false);
  const [hasShownKycPopup, setHasShownKycPopup] = useState(false);
  const [anchors, setAnchors] = useState({});

  const currentUserRef = useRef(null);

  const isCheckingRef = useRef(false);


  // Check if current route is forbidden for the tour
  const isForbiddenRoute = useMemo(() => {
    if (!pathname) return false;
    return FORBIDDEN_ROUTES.some((route) => pathname.startsWith(route));
  }, [pathname]);

  // Compute active steps based on role and KYC status
  const activeSteps = useMemo(() => {
    const rawSteps = tourRole === "host" ? HOST_TOUR_STEPS : GUEST_TOUR_STEPS;
    // Filter out KYC step if user is already verified
    return rawSteps.filter((step) => {
      if (step.isKycOnly && isKycVerified) {
        return false;
      }
      return true;
    });
  }, [tourRole, isKycVerified]);

  const currentStep = useMemo(() => {
    if (tourState !== "in_progress") return null;
    return activeSteps[currentStepIndex] || null;
  }, [tourState, activeSteps, currentStepIndex]);

  // Load user data and tour status on mount and path changes
  const checkTourEligibility = useCallback(async () => {
    if (isForbiddenRoute || isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const loggedIn = await authService.isLoggedIn();
      if (!loggedIn) {
        setTourState("not_started");
        isCheckingRef.current = false;
        return;
      }

      const userData = await getUserData();
      currentUserRef.current = userData;

      const userId = userData?.id || userData?._id || userData?.email || "anonymous_user";
      const verified =
        userData?.verified === true ||
        userData?.kycStatus === "VERIFIED" ||
        userData?.kycStatus === "APPROVED";
      setIsKycVerified(verified);

      // Determine role from pathname or user mode
      const isHostPath = pathname?.includes("host");
      const role = isHostPath ? "host" : "guest";
      setTourRole(role);

      const kycPopupKey = `${KYC_POPUP_STORAGE_PREFIX}${userId}`;
      const hasShown = await storageService.getItem(kycPopupKey);
      setHasShownKycPopup(hasShown === "true");

      // Check stored tour status
      const storageKey = `${TOUR_STORAGE_PREFIX}${userId}_${role}`;
      const savedStatus = await storageService.getItem(storageKey);

      if (savedStatus === "completed" || savedStatus === "skipped") {
        setTourState(savedStatus);
        // One-time prompt for unverified users on login if not yet shown
        const isOnMainTabs =
          pathname === "/" ||
          pathname === "/(tabs)" ||
          pathname === "/(host-tabs)" ||
          pathname?.startsWith("/(tabs)");
        if (isOnMainTabs && !verified && hasShown !== "true" && !isForbiddenRoute) {
          setTimeout(() => {
            setShowPostTourKycModal(true);
          }, 1000);
        }
      } else {
        // Only trigger automatically when user is on main dashboard tabs
        const isOnMainTabs =
          pathname === "/" ||
          pathname === "/(tabs)" ||
          pathname === "/(host-tabs)" ||
          pathname?.startsWith("/(tabs)");
        if (isOnMainTabs && (savedStatus === "not_started" || !savedStatus)) {
          // Delay start slightly to let the home screen finish initial rendering & layout measurements
          setTimeout(() => {
            setTourState("in_progress");
            setCurrentStepIndex(0);
          }, 700);
        }
      }
    } catch (err) {
      console.warn("[ProductTour] Error checking eligibility:", err);
    } finally {
      isCheckingRef.current = false;
    }
  }, [pathname, isForbiddenRoute]);


  useEffect(() => {
    checkTourEligibility();
  }, [checkTourEligibility]);

  // Register anchor bounds from TourAnchor components
  const registerAnchor = useCallback((id, layout) => {
    setAnchors((prev) => {
      const existing = prev[id];
      if (
        existing &&
        existing.x === layout.x &&
        existing.y === layout.y &&
        existing.width === layout.width &&
        existing.height === layout.height
      ) {
        return prev;
      }
      return { ...prev, [id]: layout };
    });
  }, []);

  const unregisterAnchor = useCallback((id) => {
    setAnchors((prev) => {
      if (!prev[id]) return prev;
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }, []);

  // Save tour status helper
  const saveTourStatus = useCallback(async (status) => {
    setTourState(status);
    const userId =
      currentUserRef.current?.id ||
      currentUserRef.current?._id ||
      currentUserRef.current?.email ||
      "anonymous_user";
    const storageKey = `${TOUR_STORAGE_PREFIX}${userId}_${tourRole}`;
    await storageService.setItem(storageKey, status);
  }, [tourRole]);

  // Dismiss one-time KYC popup and persist so it does not reappear
  const dismissKycModal = useCallback(async () => {
    setShowPostTourKycModal(false);
    const userId =
      currentUserRef.current?.id ||
      currentUserRef.current?._id ||
      currentUserRef.current?.email ||
      "anonymous_user";
    const storageKey = `${KYC_POPUP_STORAGE_PREFIX}${userId}`;
    await storageService.setItem(storageKey, "true");
    setHasShownKycPopup(true);
  }, []);

  const handleTourEnd = useCallback(
    async (status) => {
      await saveTourStatus(status);
      const userId =
        currentUserRef.current?.id ||
        currentUserRef.current?._id ||
        currentUserRef.current?.email ||
        "anonymous_user";
      const storageKey = `${KYC_POPUP_STORAGE_PREFIX}${userId}`;
      const hasShown = await storageService.getItem(storageKey);

      // Prompt user one-time to verify KYC for full app experience if they have not done so yet
      if (!isKycVerified && !isForbiddenRoute && hasShown !== "true") {
        setTimeout(() => {
          setShowPostTourKycModal(true);
        }, 350);
      }
    },
    [saveTourStatus, isKycVerified, isForbiddenRoute]
  );

  // Tour navigation actions
  const nextStep = useCallback(() => {
    if (currentStepIndex < activeSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Completed last step
      handleTourEnd("completed");
    }
  }, [currentStepIndex, activeSteps.length, handleTourEnd]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const skipTour = useCallback(() => {
    handleTourEnd("skipped");
  }, [handleTourEnd]);

  const finishTour = useCallback(() => {
    handleTourEnd("completed");
  }, [handleTourEnd]);

  const closeTour = useCallback(() => {
    handleTourEnd("skipped");
  }, [handleTourEnd]);

  // Force re-trigger tour on demand (e.g. from Profile screen "Take App Tour")
  const startTour = useCallback((options = {}) => {
    const { force = true, role } = options;
    if (role) setTourRole(role);
    setCurrentStepIndex(0);
    setTourState("in_progress");
  }, []);

  const value = {
    tourState,
    currentStepIndex,
    currentStep,
    totalSteps: activeSteps.length,
    activeSteps,
    tourRole,
    anchors,
    isKycVerified,
    showPostTourKycModal,
    setShowPostTourKycModal,
    dismissKycModal,
    registerAnchor,
    unregisterAnchor,
    nextStep,
    prevStep,
    skipTour,
    finishTour,
    closeTour,
    startTour,
    isForbiddenRoute,
  };


  return (
    <ProductTourContext.Provider value={value}>
      {children}
    </ProductTourContext.Provider>
  );
};

export const useProductTour = () => {
  const context = useContext(ProductTourContext);
  if (!context) {
    throw new Error("useProductTour must be used within a ProductTourProvider");
  }
  return context;
};

export default ProductTourContext;
