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
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import bookingService from "../src/services/bookingService";
import paymentService from "../src/services/paymentService";
import notificationService from "../src/services/notificationService";
import { TOAST_TYPE } from "../src/components/common/ToastNotification";

export default function PaymentCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState("Verifying your payment...");
  const [reference, setReference] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [animation] = useState(new Animated.Value(0));

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
  }, [status]);

  const spin = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  useEffect(() => {
    console.log("[PaymentCallback] Params:", params);

    // Normalize parameters correctly
    const callbackStatus = (params.status || params.event || "").toLowerCase();
    
    // Web fallback for reference extraction if params are empty (can happen on initial mount)
    let ref = params.reference || params.trxref || params.ref || params.transaction_id;
    
    if (!ref && Platform.OS === 'web') {
      const urlParams = new URLSearchParams(window.location.search);
      ref = urlParams.get('reference') || urlParams.get('trxref');
      console.log("[PaymentCallback] Web Fallback Ref:", ref);
    }
    
    setReference(ref);

    console.log("[PaymentCallback] Normalized:", { callbackStatus, ref });

    if (callbackStatus) {
      console.log("[PaymentCallback] Using status from callback:", callbackStatus);
      
      switch (callbackStatus) {
        case "success":
        case "completed":
        case "processed":
          setStatus("success");
          setMessage("Payment successful! Your transaction has been completed.");
          // ... rest of success handling
          // Trigger global toast for extra confirmation
          notificationService.showSuccess("Payment completed successfully!");
          
          // Ensure wallet balance and profile are updated across the app
          queryClient.refetchQueries({ queryKey: ["walletInfo"], type: "all" });
          queryClient.refetchQueries({ queryKey: ["userProfile"], type: "all" });
          
          navigateAfterDelay(Platform.OS === 'web' ? "/wallet" : "/(tabs)/wallet", 3000);
          break;
        case "pending":
          setStatus("info");
          setMessage("Payment is being processed. We'll update your wallet shortly.");
          navigateAfterDelay("/(tabs)/wallet", 4000);
          break;
        case "failed":
        case "error":
          setStatus("error");
          setMessage(params.message || "Payment could not be completed. Please try again.");
          break;
        default:
          if (ref) {
            verifyPayment(ref);
          } else {
            setStatus("error");
            setMessage("Unable to verify payment. No transaction reference found.");
          }
      }
    } else if (ref) {
      verifyPayment(ref);
    } else {
      console.log("[PaymentCallback] No reference found in params");
      setStatus("error");
      setMessage("Payment information not found. Please check your transaction history.");
    }
  }, [params]);

  const navigateAfterDelay = (path, delay) => {
    setTimeout(() => {
      router.replace(path);
    }, delay);
  };

  const verifyPayment = useCallback(async (ref) => {
    try {
      setStatus("processing");
      setMessage("Verifying payment with our servers...");
      
      // Small Delay for backend to catch up with gateway callback (important for some gateways)
      if (retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      console.log("[PaymentCallback] Verifying payment:", ref);
      const result = await paymentService.verifyPayment(ref);
      console.log("[PaymentCallback] Verification result:", result);

      if (result.status === "COMPLETED" || result.status === "success") {
        // --- CONTEXT RECOVERY LOGIC ---
        
        // 1. Check for 'type' in params (Directly passed via Linking.createURL on Native)
        if (params.type === "WALLET_FUNDING") {
          setStatus("success");
          setMessage("Wallet funding successful! Your balance will be updated momentarily.");
          const amountDisplay = params.amount ? `₦${params.amount}` : "Funds";
          notificationService.show(`${amountDisplay} added to your wallet successfully`, TOAST_TYPE.SUCCESS);
          navigateAfterDelay("/(tabs)/profile", 2000);
          return;
        }

        // 2. Check for stored context (Booking/Funding)
        try {
          let storedContext = null;
          
          if (Platform.OS === "web") {
            storedContext = localStorage.getItem("lunest_payment_context");
            if (storedContext) localStorage.removeItem("lunest_payment_context");
          } else {
            storedContext = await AsyncStorage.getItem("lunest_payment_context");
            if (storedContext) await AsyncStorage.removeItem("lunest_payment_context");
          }

          if (storedContext) {
            const context = JSON.parse(storedContext);
            
            if (context.type === "BOOKING" && context.bookingData) {
              setStatus("processing");
              setMessage("Finalizing your booking...");
              
              const bookingResult = await bookingService.createBooking(context.bookingData);
              
              if (bookingResult.success) {
                setStatus("success");
                setMessage("Booking confirmed! Redirecting you now...");
                notificationService.showSuccess("Booking finalized successfully!");
                
                router.replace({
                  pathname: "/booking-confirmation",
                  params: {
                    status: "Confirmed",
                    propertyName: context.propertyName,
                    location: context.location,
                    coverImage: context.coverImage,
                    bookingType: context.bookingType,
                    checkIn: context.checkIn,
                    checkOut: context.checkOut,
                    paymentMethod: "Card",
                    total: `₦${(context.bookingData.priceBreakdown?.guestTotal || 0).toLocaleString()}`,
                    refCode: bookingResult.booking?.referenceCode || ref,
                    bookingId: bookingResult.booking?._id,
                  }
                });
                return;
              } else {
                throw new Error(bookingResult.message || "Failed to finalize booking");
              }
            } else if (context.type === "WALLET_FUNDING") {
              setStatus("success");
              setMessage("Wallet funded successfully! Redirecting...");
              notificationService.showSuccess("Wallet funding successful!");
              
              // Ensure wallet balance and profile are updated across the app
              queryClient.refetchQueries({ queryKey: ["walletInfo"], type: "all" });
              queryClient.refetchQueries({ queryKey: ["userProfile"], type: "all" });
              
              navigateAfterDelay("/(tabs)/profile", 2000);
              return;
            }
          }
        } catch (ctxError) {
          console.error("[PaymentCallback] Context recovery error:", ctxError);
        }

        setStatus("success");
        setMessage("Payment verified successfully!");
        notificationService.showSuccess("Payment verified!");
        
        // Ensure wallet balance and profile are updated across the app
        queryClient.refetchQueries({ queryKey: ["walletInfo"], type: "all" });
        queryClient.refetchQueries({ queryKey: ["userProfile"], type: "all" });
        
        navigateAfterDelay(Platform.OS === 'web' ? "/profile" : "/(tabs)/profile", 3000);
      } else if (result.status === "PENDING") {
        setStatus("info");
        setMessage("Payment is still being processed. Please check back in a few minutes.");
        navigateAfterDelay(Platform.OS === 'web' ? "/profile" : "/(tabs)/profile", 4000);
      } else if (result.status === "ABANDONED") {
        setStatus("error");
        setMessage("Payment was abandoned. If you intended to pay, please try again.");
        navigateAfterDelay(Platform.OS === 'web' ? "/profile" : "/(tabs)/profile", 4000);
      } else if (result.status === "FAILED") {
        setStatus("error");
        setMessage("Payment was not successful. Please try again or contact support.");
        navigateAfterDelay(Platform.OS === 'web' ? "/profile" : "/(tabs)/profile", 4000);
      } else {
        setStatus("error");
        setMessage(result.message || "Payment verification failed. Please contact support if funds were deducted.");
      }
    } catch (error) {
      console.error("[PaymentCallback] Verification error:", error);
      
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1);
        setMessage(`Verification failed. Retrying... (${retryCount + 1}/3)`);
        setTimeout(() => verifyPayment(ref), 2000);
      } else {
        setStatus("error");
        setMessage("Unable to verify payment after multiple attempts. Please check your transaction history or contact support.");
      }
    }
  }, [retryCount, router]);

  const handleRetry = () => {
    if (reference) {
      setRetryCount(0);
      verifyPayment(reference);
    }
  };

  const handleGoToWallet = () => {
    router.replace(Platform.OS === 'web' ? "/wallet" : "/(tabs)/wallet");
  };

  const renderIcon = () => {
    switch (status) {
      case "processing":
        return (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="sync" size={60} color="#246BFD" />
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
        <View style={styles.iconWrapper}>
          {renderIcon()}
        </View>

        <Text style={styles.title}>
          {status === "processing" && "Processing Payment"}
          {status === "success" && "Payment Successful!"}
          {status === "error" && "Payment Issue"}
          {status === "info" && "Processing..."}
        </Text>

        <Text style={styles.message}>{message}</Text>

        {reference && (
          <View style={styles.referenceContainer}>
            <Text style={styles.referenceLabel}>Reference:</Text>
            <Text style={styles.referenceValue}>{reference}</Text>
          </View>
        )}

        {status === "error" && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {(status === "error" || status === "info") && (
          <TouchableOpacity style={styles.walletButton} onPress={handleGoToWallet}>
            <Text style={styles.walletButtonText}>Go to Wallet</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  iconWrapper: {
    marginBottom: 32,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  successIcon: {
    backgroundColor: "#4CAF50",
  },
  errorIcon: {
    backgroundColor: "#F44336",
  },
  infoIcon: {
    backgroundColor: "#2196F3",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 16,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  referenceContainer: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: "center",
  },
  referenceLabel: {
    fontSize: 12,
    color: "#999999",
    marginBottom: 4,
  },
  referenceValue: {
    fontSize: 14,
    color: "#333333",
    fontWeight: "600",
    fontFamily: "monospace",
  },
  buttonContainer: {
    marginTop: 16,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#246BFD",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  walletButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#246BFD",
  },
  walletButtonText: {
    color: "#246BFD",
    fontSize: 16,
    fontWeight: "600",
  },
});
