/**
 * Payment Callback Screen
 * Handles deep link redirect from Paystack after payment
 * Enhanced UI with better error handling and retry mechanism
 */
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import paymentService from "../src/services/paymentService";

export default function PaymentCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
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

    const callbackStatus = params.status;
    const ref = params.reference || params.trxref || params.ref;
    setReference(ref);

    if (callbackStatus) {
      console.log("[PaymentCallback] Using status from callback:", callbackStatus);
      
      switch (callbackStatus) {
        case "success":
        case "completed":
          setStatus("success");
          setMessage("Payment successful! Your transaction has been completed.");
          navigateAfterDelay("/(tabs)/wallet", 3000);
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
      
      console.log("[PaymentCallback] Verifying payment:", ref);
      const result = await paymentService.verifyPayment(ref);
      console.log("[PaymentCallback] Verification result:", result);

      if (result.status === "COMPLETED" || result.status === "success") {
        setStatus("success");
        setMessage("Payment verified successfully! Your wallet has been funded.");
        navigateAfterDelay("/(tabs)/wallet", 3000);
      } else if (result.status === "PENDING") {
        setStatus("info");
        setMessage("Payment is still being processed. Please check back in a few minutes.");
        navigateAfterDelay("/(tabs)/wallet", 4000);
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
    router.replace("/(tabs)/wallet");
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
