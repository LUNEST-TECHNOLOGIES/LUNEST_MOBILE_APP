import { useEffect, useRef } from "react";
import inactivityTimeoutService from "../services/inactivityTimeoutService";

/**
 * useActivityTracker Hook
 * Tracks user interactions (touches, presses) and reports them to the inactivity service
 * Should be used at the root level of authenticated screens
 */
export const useActivityTracker = () => {
  const isTracking = useRef(false);

  useEffect(() => {
    isTracking.current = true;

    return () => {
      isTracking.current = false;
    };
  }, []);

  const recordActivity = () => {
    if (isTracking.current && inactivityTimeoutService.isActive()) {
      inactivityTimeoutService.recordUserActivity();
    }
  };

  return { recordActivity };
};

export default useActivityTracker;
