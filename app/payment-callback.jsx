/**
 * Payment Callback Screen
 * Handles deep link redirect from Paystack after payment
 */
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import paymentService from "../src/services/paymentService";

export default function PaymentCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState("processing");
  const [message, setMessage] = useState("Verifying payment...");

  useEffect(() => {
    console.log("[PaymentCallback] Params:", params);

    // Check if status is already provided from callback page
    const callbackStatus = params.status;
    const reference = params.reference || params.trxref || params.ref;

    if (callbackStatus) {
      // Status provided from callback page - use it directly
      console.log("[PaymentCallback] Using status from callback:", callbackStatus);
      
      if (callbackStatus === "completed") {
        setStatus("success");
        setMessage("Payment successful! Your transaction has been completed.");
      } else if (callbackStatus === "pending") {
        setStatus("info");
        setMessage("Payment is being processed. Please check your transaction history.");
      } else if (callbackStatus === "failed") {
        setStatus("error");
        setMessage("Payment was not completed. Please try again or contact support.");
      } else {
        // Unknown status - verify manually
        if (reference) {
          verifyPayment(reference);
        } else {
          setStatus("info");
          setMessage("Payment completed. Checking your transaction history...");
          setTimeout(() => {
            router.replace("/(tabs)/wallet");
          }, 2000);
        }
      }
    } else if (reference) {
      // No status provided - verify payment
      verifyPayment(reference);
    } else {
      // No reference found - this might happen if deep linking failed
      console.log("[PaymentCallback] No reference found in params");
      setStatus("info");
      setMessage("Payment completed. Checking your transaction history...");

      // Navigate back to wallet after a delay
      setTimeout(() => {
        router.replace("/(tabs)/wallet");
      }, 2000);
    }
  }, [params]);

  const verifyPayment = async (reference) => {
    try {
      console.log("[PaymentCallback] Verifying payment:", reference);

      const result = await paymentService.verifyPayment(reference);

      console.log("[PaymentCallback] Verification result:", result);

      if (result.status === "COMPLETED" || result.status === "success") {
        setStatus("success");
        setMessage("Payment successful! Your transaction has been completed.");
      } else if (result.status === "PENDING") {
        setStatus("info");
        setMessage(
          "Payment is being processed. Please check your transaction history.",
        );
      } else {
        setStatus("error");
        setMessage(
          "Payment was not completed. Please try again or contact support.",
        );
      }
    } catch (error) {
      console.error("[PaymentCallback] Verification error:", error);
      setStatus("error");
      setMessage(
        "Unable to verify payment. Please check your transaction history.",
      );
    }

    // Always navigate back to wallet after showing result
    setTimeout(() => {
      router.replace("/(tabs)/wallet");
    }, 3000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {status === "processing" ? (
          <ActivityIndicator size="large" color="#246BFD" />
        ) : status === "success" ? (
          <View style={styles.iconContainer}>
            <Text style={styles.successIcon}>✓</Text>
          </View>
        ) : status === "error" ? (
          <View style={[styles.iconContainer, styles.errorIcon]}>
            <Text style={styles.errorIconText}>✕</Text>
          </View>
        ) : (
          <View style={[styles.iconContainer, styles.infoIcon]}>
            <Text style={styles.infoIconText}>!</Text>
          </View>
        )}

        <Text
          style={[
            styles.message,
            status === "success" && styles.successText,
            status === "error" && styles.errorText,
          ]}
        >
          {message}
        </Text>
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
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 40,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  errorIcon: {
    backgroundColor: "#F44336",
  },
  errorIconText: {
    fontSize: 40,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  infoIcon: {
    backgroundColor: "#2196F3",
  },
  infoIconText: {
    fontSize: 40,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  message: {
    fontSize: 18,
    color: "#333333",
    textAlign: "center",
    lineHeight: 26,
  },
  successText: {
    color: "#4CAF50",
  },
  errorText: {
    color: "#F44336",
  },
});
