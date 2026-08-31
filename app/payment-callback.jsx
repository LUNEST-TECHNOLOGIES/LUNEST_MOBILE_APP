/**
 * Payment Callback Screen
 * Single source of truth for all payment verification (wallet funding + booking payment)
 * Handles: deep link redirect from Paystack, manual resume, and AppState recovery
 */
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import bookingService from "../src/services/bookingService";
import notificationService from "../src/services/notificationService";
import paymentService from "../src/services/paymentService";

export default function PaymentCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState("Verifying your payment...");
  const [paymentRef, setPaymentRef] = useState(null);
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [animation] = useState(new Animated.Value(0));
  const hasProcessed = useRef(false);
  const retryTimer = useRef(null);

  // Spinning animation while processing
  useEffect(() => {
    if (status === "processing") {
      Animated.loop(
        Animated.timing(animation, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      animation.stopAnimation();
    }
  }, [status]);

  // Show retry button after 8 seconds of processing
  useEffect(() => {
    if (status !== "processing") {
      setShowRetryButton(false);
      return;
    }
    const t = setTimeout(() => setShowRetryButton(true), 8000);
    return () => clearTimeout(t);
  }, [status, retryCount]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, []);

  const spin = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // ── NAVIGATION HELPERS ─────────────────────────────────────────────────────

  const DEFAULT_HOME = "/(tabs)";
  const DEFAULT_WALLET = "/profile";

  /** Navigate without adding to history stack (final destinations) */
  const goFinal = useCallback((pathname, navParams = {}) => {
    // Clean storage before leaving
    const cleanup = async () => {
      try {
        if (Platform.OS === "web") {
          localStorage.removeItem("lunest_payment_context");
        } else {
          await AsyncStorage.multiRemove(["lunest_payment_context", "@lunest_pending_payment_ref"]);
        }
      } catch (_) {}
    };
    cleanup();

    if (Platform.OS === "web" && pathname.startsWith("http")) {
      window.location.href = pathname;
      return;
    }

    const hasParams = Object.keys(navParams).length > 0;
    if (hasParams) {
      router.replace({ pathname, params: navParams });
    } else {
      router.replace(pathname);
    }
  }, [router]);

  // ── CONTEXT RECOVERY ───────────────────────────────────────────────────────

  const getStoredContext = async () => {
    try {
      const raw = Platform.OS === "web"
        ? localStorage.getItem("lunest_payment_context")
        : await AsyncStorage.getItem("lunest_payment_context");
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  };

  // ── CORE VERIFICATION LOGIC ────────────────────────────────────────────────

  const verifyPayment = useCallback(async (ref) => {
    if (!ref) {
      setStatus("error");
      setMessage("No payment reference found. Please check your transaction history.");
      return;
    }

    setStatus("processing");
    setMessage("Verifying your payment…");
    setPaymentRef(ref);

    try {
      const result = await paymentService.verifyPayment(ref);
      console.log("[PaymentCallback] Result:", result?.status, "ref:", ref);

      if (result.status === "COMPLETED" || result.status === "success") {
        // ── SUCCESS ──────────────────────────────────────────────────────────
        setStatus("success");
        setMessage("Payment Successful!");

        // Instant balance update from server response
        if (result.newBalance !== undefined) {
          queryClient.setQueryData(["walletInfo"], (old) => ({
            ...old,
            balance: result.newBalance,
            availableBalance: result.newBalance,
          }));
        }

        // Invalidate all related queries for fresh data
        queryClient.invalidateQueries({ queryKey: ["walletInfo"] });
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
        await queryClient.refetchQueries({ queryKey: ["walletInfo"] });

        const context = await getStoredContext();

        // ── BOOKING PAYMENT ──────────────────────────────────────────────────
        const bookingId =
          context?.bookingId ||
          params.bookingId ||
          result.bookingId;

        const isBooking =
          context?.type === "BOOKING" ||
          (params.type || "").toLowerCase().includes("booking") ||
          !!bookingId;

        if (isBooking && bookingId) {
          setMessage("Payment Confirmed! Finalizing your booking…");

          // Poll booking until it's confirmed (up to 5s)
          let bookingStatus = "PENDING_PAYMENT";
          for (let i = 0; i < 5; i++) {
            try {
              const bRes = await bookingService.fetchBookingById(bookingId);
              if (bRes.success) {
                bookingStatus = bRes.booking?.status || bookingStatus;
                if (["CONFIRMED", "ONGOING", "COMPLETED", "SUCCESS"].includes(bookingStatus)) break;
              }
            } catch (_) {}
            await new Promise(r => setTimeout(r, 1000));
          }

          setMessage("Booking Confirmed!");
          notificationService.showSuccess("Your booking has been confirmed!");

          setTimeout(() => {
            goFinal("/booking-confirmation", {
              bookingId,
              status: "Confirmed",
              propertyName: context?.propertyName || "",
              coverImage: context?.coverImage || "",
              bookingType: context?.bookingType || "",
              checkIn: context?.checkIn || "",
              checkOut: context?.checkOut || "",
            });
          }, 1500);
          return;
        }

        // ── WALLET FUNDING ────────────────────────────────────────────────────
        setMessage("Wallet funded successfully!");
        notificationService.showSuccess("Funds added to your wallet!");

        setTimeout(() => {
          if (context?.returnUrl) {
            goFinal(context.returnUrl, context.params || {});
          } else {
            goFinal(DEFAULT_WALLET);
          }
        }, 1500);

      } else if (result.status === "PENDING" || result.status === "PROCESSING") {
        // ── STILL PROCESSING ─────────────────────────────────────────────────
        if (retryCount < 6) {
          setMessage(result.status === "PROCESSING" ? "Payment received! Finalizing…" : "Almost there…");
          setRetryCount(c => c + 1);
          retryTimer.current = setTimeout(() => verifyPayment(ref), 2500);
        } else {
          setStatus("info");
          setMessage("Payment is being processed. It will reflect shortly in your wallet or bookings.");
          setTimeout(() => goFinal(DEFAULT_HOME), 5000);
        }

      } else {
        // ── FAILED ───────────────────────────────────────────────────────────
        setStatus("error");
        setMessage(result.message || "Payment verification failed. Please check your transaction history.");
      }

    } catch (error) {
      console.error("[PaymentCallback] Verification error:", error);
      if (retryCount < 3) {
        setRetryCount(c => c + 1);
        setMessage(`Retrying verification… (${retryCount + 1}/3)`);
        retryTimer.current = setTimeout(() => verifyPayment(ref), 2000);
      } else {
        setStatus("error");
        setMessage("Unable to verify payment. Please check your transaction history.");
      }
    }
  }, [retryCount, params, queryClient, router, goFinal]);

  // ── BOOT: RESOLVE REFERENCE AND START ─────────────────────────────────────

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const boot = async () => {
      let ref =
        params.reference ||
        params.trxref ||
        params.ref ||
        params.transaction_id;

      // Web: also check URL search params (for Paystack SPA redirect)
      if (!ref && Platform.OS === "web") {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          ref = urlParams.get("reference") || urlParams.get("trxref");
        } catch (_) {}
      }

      if (!ref) {
        setStatus("error");
        setMessage("No payment reference found. Please check your transaction history.");
        return;
      }

      // Map incoming status to a clean state
      const incomingStatus = (params.status || "").toLowerCase();
      const isCancelledEvent = ["cancelled", "canceled", "dismissed", "closed", "aborted"].includes(incomingStatus);
      const isFailedEvent = ["failed", "declined", "error"].includes(incomingStatus);

      if (isCancelledEvent || isFailedEvent) {
        // Still verify with backend in case webhook succeeded in the background
        console.log(`[PaymentCallback] Incoming status is "${incomingStatus}" — checking status`);
        setMessage(isCancelledEvent ? "Checking payment status..." : "Confirming payment status...");
        try {
          const result = await paymentService.verifyPayment(ref);
          console.log("[PaymentCallback] Verification result for event:", result?.status);
          
          if (result.status === "COMPLETED" || result.status === "success") {
            // Payment actually succeeded despite the incoming status (race condition)
            verifyPayment(ref);
            return;
          }
        } catch (verifyErr) {
          console.log("[PaymentCallback] Verification returned:", verifyErr?.message);
        }

        setPaymentRef(ref);
        if (isCancelledEvent) {
          setStatus("cancelled");
          setMessage("You cancelled the payment transaction. No charges were made to your account.");
        } else {
          setStatus("error");
          setMessage("Payment was declined or could not be completed. Please try again.");
        }
        return;
      }

      verifyPayment(ref);
    };

    boot();
  }, []);

  // ── RETRY HANDLER ─────────────────────────────────────────────────────────

  const handleRetry = async () => {
    const context = await getStoredContext();
    if (context?.returnUrl) {
      goFinal(context.returnUrl, context.params || {});
    } else if (params.type === "wallet_funding" || params.amount) {
      router.replace("/add-funds");
    } else {
      router.replace(DEFAULT_HOME);
    }
  };

  const handleGoHome = () => {
    goFinal(DEFAULT_HOME);
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────

  const renderIcon = () => {
    switch (status) {
      case "processing":
        return (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="sync" size={60} color="#010135" />
          </Animated.View>
        );
      case "success":
        return (
          <View style={[styles.iconCircle, styles.successBg]}>
            <Ionicons name="checkmark" size={48} color="#FFF" />
          </View>
        );
      case "cancelled":
        return (
          <View style={[styles.iconCircle, styles.cancelledBg]}>
            <Ionicons name="ban-outline" size={44} color="#D97706" />
          </View>
        );
      case "error":
        return (
          <View style={[styles.iconCircle, styles.errorBg]}>
            <Ionicons name="close" size={48} color="#FFF" />
          </View>
        );
      default:
        return (
          <View style={[styles.iconCircle, styles.infoBg]}>
            <Ionicons name="information" size={48} color="#FFF" />
          </View>
        );
    }
  };

  const title = {
    processing: "Processing Payment…",
    success: "Payment Successful!",
    cancelled: "Payment Cancelled",
    error: "Payment Failed",
    info: "Please Wait",
  }[status] || "Processing…";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrapper}>{renderIcon()}</View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        {paymentRef && (
          <View style={styles.refBox}>
            <Text style={styles.refLabel}>Reference</Text>
            <Text style={styles.refValue}>{paymentRef}</Text>
          </View>
        )}

        {status === "processing" && showRetryButton && (
          <TouchableOpacity style={styles.btn} onPress={handleGoHome}>
            <Text style={styles.btnText}>Return to App</Text>
          </TouchableOpacity>
        )}

        {(status === "error" || status === "cancelled") && (
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={handleGoHome}>
              <Text style={[styles.btnText, styles.btnTextSecondary]}>Go Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={handleRetry}>
              <Text style={styles.btnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  iconWrapper: { marginBottom: 28, height: 90, justifyContent: "center", alignItems: "center" },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center" },
  successBg: { backgroundColor: "#22C55E" },
  cancelledBg: { backgroundColor: "#FEF3C7", borderWidth: 1.5, borderColor: "#FCD34D" },
  errorBg: { backgroundColor: "#EF4444" },
  infoBg: { backgroundColor: "#3B82F6" },
  title: { fontSize: 24, fontWeight: "700", color: "#010135", marginBottom: 12, textAlign: "center" },
  message: { fontSize: 15, color: "#555", textAlign: "center", lineHeight: 22, marginBottom: 28, maxWidth: 320 },
  refBox: { backgroundColor: "#F4F4F5", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 18, marginBottom: 28, alignItems: "center" },
  refLabel: { fontSize: 11, color: "#888", marginBottom: 4 },
  refValue: { fontSize: 13, fontWeight: "600", color: "#333" },
  btnRow: { flexDirection: "row", gap: 12 },
  btn: { backgroundColor: "#010135", paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12 },
  btnSecondary: { backgroundColor: "#F4F4F5" },
  btnText: { color: "#FFF", fontSize: 15, fontWeight: "600" },
  btnTextSecondary: { color: "#333" },
});
