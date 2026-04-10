/**
 * Payment Callback Screen
 * Handles deep link redirect from Paystack after payment
 * Enhanced UI with better error handling and retry mechanism
 */
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Modal
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import bookingService from "../src/services/bookingService";
import paymentService from "../src/services/paymentService";
import notificationService from "../src/services/notificationService";
import { TOAST_TYPE } from "../src/components/common/ToastNotification";
import { useRef } from "react";

export default function PaymentCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState("Verifying your payment...");
  const [reference, setReference] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isFinalizingBooking, setIsFinalizingBooking] = useState(false);
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const hasProcessedRef = useRef(false);

  // Animation for processing indicator
  useEffect(() => {
    if (status === "processing") {
      Animated.loop(
        Animated.timing(animation, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      animation.stopAnimation();
    }
  }, [status, animation]);

  // Timer to show retry button if processing takes too long
  useEffect(() => {
    let timer;
    if (status === "processing") {
      timer = setTimeout(() => {
        setShowRetryButton(true);
      }, 7000); // Show after 7 seconds
    } else {
      setShowRetryButton(false);
    }
    return () => clearTimeout(timer);
  }, [status]);

  const spin = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const DEFAULT_PROFILE_ROUTE = Platform.OS === 'web' ? "/profile" : "/(tabs)/profile";

  const navigateAfterDelay = useCallback((path, delay, additionalParams = null) => {
    setTimeout(() => {
      if (additionalParams) {
        router.replace({
          pathname: path,
          params: additionalParams
        });
      } else {
        router.replace(path);
      }
    }, delay);
  }, [router]);

  const handleFailureRedirection = useCallback(async () => {
    try {
      let storedContext = null;
      if (Platform.OS === "web") {
        storedContext = localStorage.getItem("lunest_payment_context");
      } else {
        storedContext = await AsyncStorage.getItem("lunest_payment_context");
      }

      if (storedContext) {
        const context = JSON.parse(storedContext);
        if (context.type === "BOOKING" && context.listingId) {
          setMessage(prev => prev + " Redirecting you back to the booking page...");
          setTimeout(() => {
            router.replace({
              pathname: "/property-details",
              params: { listingId: context.listingId }
            });
          }, 3000);
          return;
        }
      }
    } catch (e) {
      console.warn("[PaymentCallback] Failure redirect error:", e);
    }
    
    navigateAfterDelay(DEFAULT_PROFILE_ROUTE, 4000);
  }, [DEFAULT_PROFILE_ROUTE, navigateAfterDelay, router]);

  const verifyPayment = useCallback(async (ref) => {
    try {
      setStatus("processing");
      setMessage("Verifying payment with our servers...");
      
      if (retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      console.log("[PaymentCallback] Verifying payment:", ref);
      const result = await paymentService.verifyPayment(ref);
      console.log("[PaymentCallback] Verification successful result:", result);

      if (result.status === "COMPLETED" || result.status === "success") {
        queryClient.refetchQueries({ queryKey: ["walletInfo"] });
        queryClient.refetchQueries({ queryKey: ["userProfile"] });
        queryClient.refetchQueries({ queryKey: ["transactions"] });

        // Change main status to success immediately upon payment verification
        setStatus("success");

        // 1. Check for 'type' in params
        if (params.type === "WALLET_FUNDING" || params.type === "wallet_funding") {
          setMessage("Transaction Verified! Funds added to your wallet.");
          const amountDisplay = params.amount ? `₦${params.amount}` : "Funds";
          notificationService.show(`${amountDisplay} added to your wallet successfully`, TOAST_TYPE.SUCCESS);
          
          navigateAfterDelay(DEFAULT_PROFILE_ROUTE, 3000);
          return;
        }

        // 2. Check for stored context
        try {
          const storedContext = Platform.OS === "web" 
            ? localStorage.getItem("lunest_payment_context")
            : await AsyncStorage.getItem("lunest_payment_context");

          if (storedContext) {
            const context = JSON.parse(storedContext);
            
            const cleanupContext = async () => {
              if (Platform.OS === "web") {
                localStorage.removeItem("lunest_payment_context");
              } else {
                await AsyncStorage.removeItem("lunest_payment_context");
              }
            };

            if (context.type === "BOOKING" && context.bookingId) {
              setIsFinalizingBooking(true);
              // Maintain success status but update message for booking finalization
              setMessage("Payment Confirmed! Finalizing your booking...");
              
              const verifyBooking = await bookingService.fetchBookingById(context.bookingId);
              
              if (verifyBooking.success && (['CONFIRMED', 'SUCCESS', 'ONGOING'].includes(verifyBooking.booking?.status))) {
                setMessage("Payment Confirmed! Booking finalized.");
                notificationService.showSuccess("Booking finalized successfully!");
                
                router.replace({
                  pathname: "/booking-confirmation",
                  params: {
                    bookingId: context.bookingId,
                    status: "Confirmed",
                    propertyName: context.propertyName 
                  }
                });
                await cleanupContext();
                return;
              } else {
                setMessage("Payment Confirmed! Updating reservation details...");
                
                setTimeout(() => {
                  router.replace({
                    pathname: "/booking-confirmation",
                    params: {
                      bookingId: context.bookingId,
                      status: "Confirmed",
                      propertyName: context.propertyName,
                      isPending: "true" 
                    }
                  });
                }, 2500);
                await cleanupContext();
                return;
              }
            } else if (context.type === "WALLET_FUNDING") {
              const isBookingReturn = context.returnUrl?.includes("pay-with-wallet");
              setMessage(isBookingReturn ? "Wallet funded! Returning to your booking..." : "Wallet funded! Returning to your profile...");
              
              if (context.returnUrl) {
                navigateAfterDelay(context.returnUrl, 2500, context.params);
              } else {
                navigateAfterDelay(DEFAULT_PROFILE_ROUTE, 2500);
              }
              await cleanupContext();
              return;
            }
          }
        } catch (ctxError) {
          console.error("[PaymentCallback] Context recovery error:", ctxError);
        }

        setMessage("Payment verified successfully! Redirecting...");
        navigateAfterDelay(DEFAULT_PROFILE_ROUTE, 2500);
      } else if (result.status === "PENDING") {
        setStatus("info");
        setMessage("Payment is still being processed. Please check back later.");
        navigateAfterDelay(DEFAULT_PROFILE_ROUTE, 4000);
      } else {
        setStatus("error");
        setMessage(result.message || "Payment verification failed.");
        handleFailureRedirection();
      }
    } catch (error) {
      console.error("[PaymentCallback] Verification error:", error);
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1);
        setMessage(`Verification failed. Retrying... (${retryCount + 1}/3)`);
        setTimeout(() => verifyPayment(ref), 2000);
      } else {
        setStatus("error");
        setMessage("Unable to verify payment. Please check your transaction history.");
      }
    }
  }, [retryCount, params, queryClient, router, DEFAULT_PROFILE_ROUTE, navigateAfterDelay, handleFailureRedirection]);

  useEffect(() => {
    const processCallback = async () => {
      if (hasProcessedRef.current) return;
      hasProcessedRef.current = true;
      
      console.log("[PaymentCallback] Params:", params);
      const callbackStatus = (params.status || params.event || "").toLowerCase();
      let ref = params.reference || params.trxref || params.ref || params.transaction_id;
      
      if (!ref && Platform.OS === 'web') {
        const urlParams = new URLSearchParams(window.location.search);
        ref = urlParams.get('reference') || urlParams.get('trxref');
      }
      
      setReference(ref);

      // 1. Booking Redirect (Native/Legacy)
      const type = (params.type || "").toLowerCase();
      const bookingId = params.bookingId;
      if (type === 'booking' && bookingId && callbackStatus === 'success') {
        setStatus("success");
        setMessage("Redirecting to confirmation...");
        router.replace({
          pathname: "/booking-confirmation",
          params: { bookingId, status: "Confirmed" }
        });
        return;
      }

      // 2. Status Flow
      if (callbackStatus) {
        if (['success', 'completed', 'processed'].includes(callbackStatus)) {
          if (ref) verifyPayment(ref);
        } else if (['failed', 'cancelled', 'error'].includes(callbackStatus)) {
          setStatus("error");
          setMessage(params.message || "Payment was not successful.");
        } else {
          if (ref) verifyPayment(ref);
        }
        return;
      }

      // 3. Ref Only
      if (ref) {
        verifyPayment(ref);
        return;
      }
    };

    processCallback();
  }, [params, verifyPayment, router]);

  const handleRetry = () => {
    if (reference) {
      setRetryCount(0);
      verifyPayment(reference);
    }
  };

  const renderIcon = () => {
    const iconSize = 60;
    switch (status) {
      case "processing":
        return (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="sync" size={iconSize} color="#246BFD" />
          </Animated.View>
        );
      case "success":
        return (
          <View style={[styles.iconContainer, styles.successIcon]}>
            <Ionicons name="checkmark" size={50} color="#FFFFFF" />
          </View>
        );
      case "error":
        return (
          <View style={[styles.iconContainer, styles.errorIcon]}>
            <Ionicons name="close" size={50} color="#FFFFFF" />
          </View>
        );
      default:
        return (
          <View style={[styles.iconContainer, styles.infoIcon]}>
            <Ionicons name="information" size={50} color="#FFFFFF" />
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrapper}>{renderIcon()}</View>
        <Text style={styles.title}>
          {status === "processing" ? "Processing..." : status === "success" ? "Success!" : "Payment Issue"}
        </Text>
        <Text style={styles.message}>{message}</Text>
        
        {reference && (
          <View style={styles.referenceContainer}>
            <Text style={styles.referenceLabel}>Reference:</Text>
            <Text style={styles.referenceValue}>{reference}</Text>
          </View>
        )}

        {status === "processing" && showRetryButton && (
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => router.replace(DEFAULT_PROFILE_ROUTE)}
          >
            <Text style={styles.buttonText}>Return to App</Text>
          </TouchableOpacity>
        )}

        {status === "error" && (
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modal removed to prevent UI flicker/glitch during state transition */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  iconWrapper: { marginBottom: 32, height: 100, justifyContent: "center", alignItems: "center" },
  iconContainer: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center" },
  successIcon: { backgroundColor: "#4CAF50" },
  errorIcon: { backgroundColor: "#F44336" },
  infoIcon: { backgroundColor: "#2196F3" },
  title: { fontSize: 24, fontWeight: "bold", color: "#333333", marginBottom: 16 },
  message: { fontSize: 16, color: "#666666", textAlign: "center", marginBottom: 24 },
  referenceContainer: { backgroundColor: "#F5F5F5", padding: 12, borderRadius: 8, marginBottom: 24 },
  referenceLabel: { fontSize: 12, color: "#999999", textAlign: "center" },
  referenceValue: { fontSize: 14, fontWeight: "600" },
  retryButton: { backgroundColor: "#246BFD", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  confirmModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  confirmModalContent: { backgroundColor: "#FFFFFF", padding: 32, borderRadius: 20, alignItems: "center" },
  confirmModalTitle: { fontSize: 20, fontWeight: "bold", marginTop: 20 }
});
