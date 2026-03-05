import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

const CountdownTimer = ({ initialTime = 3600, onExpire, bookingId }) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [hasExpired, setHasExpired] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const intervalRef = useRef(null);

  // Storage key for this booking's countdown
  const storageKey = bookingId ? `countdown_${bookingId}` : null;

  // Load persisted countdown state on mount
  useEffect(() => {
    const loadCountdownState = async () => {
      if (!storageKey) {
        // No bookingId, use initialTime directly
        setTimeLeft(initialTime);
        setIsLoaded(true);
        return;
      }

      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const { endTime, expired } = JSON.parse(stored);

          if (expired) {
            // Already expired
            setTimeLeft(0);
            setHasExpired(true);
            setIsLoaded(true);
            return;
          }

          // Calculate remaining time based on stored end time
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((endTime - now) / 1000));

          if (remaining <= 0) {
            // Timer has expired while away
            setTimeLeft(0);
            setHasExpired(true);
            await AsyncStorage.setItem(
              storageKey,
              JSON.stringify({ endTime, expired: true }),
            );
          } else {
            setTimeLeft(remaining);
          }
        } else {
          // First time - set end time based on initialTime
          const endTime = Date.now() + initialTime * 1000;
          await AsyncStorage.setItem(
            storageKey,
            JSON.stringify({ endTime, expired: false }),
          );
          setTimeLeft(initialTime);
        }
      } catch (error) {
        console.error("Error loading countdown state:", error);
        setTimeLeft(initialTime);
      }
      setIsLoaded(true);
    };

    loadCountdownState();

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [storageKey, initialTime]);

  // Handle countdown logic
  useEffect(() => {
    if (!isLoaded || timeLeft === null) return;

    if (timeLeft <= 0 && !hasExpired) {
      setHasExpired(true);

      // Mark as expired in storage immediately
      if (storageKey) {
        AsyncStorage.getItem(storageKey)
          .then((stored) => {
            if (stored) {
              const data = JSON.parse(stored);
              AsyncStorage.setItem(
                storageKey,
                JSON.stringify({
                  ...data,
                  expired: true,
                  expiredAt: Date.now(),
                }),
              );
            }
          })
          .catch((error) => {
            console.error("[CountdownTimer] Error updating storage:", error);
          });
      }

      // Execute expiry callback with error handling
      if (onExpire) {
        try {
          console.log(
            `[CountdownTimer] Booking ${bookingId} expired, triggering auto-cancellation...`,
          );
          onExpire();
        } catch (error) {
          console.error("[CountdownTimer] Error in onExpire callback:", error);
        }
      }

      return;
    }

    if (hasExpired) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timeLeft, hasExpired, onExpire, isLoaded, storageKey]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Change color when time is running low (less than 5 minutes)
  const isUrgent = timeLeft !== null && timeLeft < 300;
  const isExpired = timeLeft !== null && timeLeft <= 0;

  // Show loading state while fetching persisted time
  if (!isLoaded || timeLeft === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.timeLeft}>Time Left to Pay:</Text>
        <View style={styles.timerBox}>
          <Text style={styles.timerText}>--:--</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.timeLeft}>
        {isExpired ? "Time Expired" : "Time Left to Pay:"}
      </Text>
      <View
        style={[
          styles.timerBox,
          isUrgent && styles.timerBoxUrgent,
          isExpired && styles.timerBoxExpired,
        ]}
      >
        <Text
          style={[
            styles.timerText,
            isUrgent && styles.timerTextUrgent,
            isExpired && styles.timerTextExpired,
          ]}
        >
          {isExpired ? "Expired" : formatTime(timeLeft)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexDirection: "row",
    paddingHorizontal: 4,
  },
  timeLeft: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "left",
    color: "#000",
  },
  timerBox: {
    minWidth: 80,
    borderRadius: 20,
    backgroundColor: "rgba(253, 174, 49, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
  },
  timerBoxUrgent: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  timerBoxExpired: {
    backgroundColor: "rgba(156, 163, 175, 0.3)",
  },
  timerText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    color: "#ef6c00",
  },
  timerTextUrgent: {
    color: "#DC2626",
  },
  timerTextExpired: {
    color: "#6B7280",
  },
});

export default CountdownTimer;
