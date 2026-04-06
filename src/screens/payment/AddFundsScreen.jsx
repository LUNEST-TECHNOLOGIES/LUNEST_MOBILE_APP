/**
 * AddFundsScreen - Add money to wallet via Paystack
 */
import * as Linking from "expo-linking";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import Toast from "../../components/common/Toast";
import apiClient from "../../services/apiClient";
import authService from "../../services/authService";
import paymentService from "../../services/paymentService";
import { formatCurrency } from "../../utils/currency";

/**
 * Back Arrow Icon
 */
const BackIcon = ({ size = 24, color = "black" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15.0003 20.67C14.8103 20.67 14.6203 20.6 14.4703 20.45L7.95027 13.93C6.89027 12.87 6.89027 11.13 7.95027 10.07L14.4703 3.55002C14.7603 3.26002 15.2403 3.26002 15.5303 3.55002C15.8203 3.84002 15.8203 4.32002 15.5303 4.61002L9.01027 11.13C8.53027 11.61 8.53027 12.39 9.01027 12.87L15.5303 19.39C15.8203 19.68 15.8203 20.16 15.5303 20.45C15.3803 20.59 15.1903 20.67 15.0003 20.67Z"
      fill={color}
    />
  </Svg>
);

/**
 * Paystack Icon
 */
const PaystackIcon = ({ size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 5H21V7H3V5ZM3 9H21V11H3V9ZM3 13H21V15H3V13ZM3 17H15V19H3V17Z"
      fill="#00C3F7"
    />
  </Svg>
);

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

const AddFundsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success",
  });

  // Block UI and redirect if not authenticated
  useEffect(() => {
    (async () => {
      const token = await apiClient.getAuthToken();
      if (!token) {
        // Show message and redirect
        showToast("Please login to add funds.", "error");
        setTimeout(() => {
          router.replace("/login");
        }, 1200);
      }
    })();
  }, []);

  // Handle Paystack callback on web
  useEffect(() => {
    if (params?.status && params?.reference) {
      console.log("[AddFunds] Callback detected:", params.status, params.reference);
      handleVerifyPayment(params.reference);
      
      // Clear params from URL
      router.setParams({ status: null, reference: null });
    }
  }, [params?.status, params?.reference]);

  const handleVerifyPayment = async (reference) => {
    setLoading(true);
    showToast("Verifying payment...", "info");

    try {
      const verifyResult = await paymentService.verifyPayment(reference);
      console.log("[AddFunds] Verify result:", verifyResult);

      if (verifyResult.status === "COMPLETED" || verifyResult.status === "success") {
        showToast(`${formatCurrency(Number(amount) || 0)} added to your wallet!`, "success");
        await queryClient.invalidateQueries({ queryKey: ["walletInfo"] });
        await queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        
        setTimeout(() => {
          router.back();
        }, 2000);
      } else {
        showToast("Payment not successful. Status: " + verifyResult.status, "error");
      }
    } catch (error) {
      console.error("[AddFunds] Verify error:", error);
      showToast("Verification failed. Please check your history.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const formatAmount = (value) => {
    // Remove non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, "");
    return numericValue;
  };

  const displayAmount = (value) => {
    if (!value) return "";
    return formatAmount(value);
  };

  const handleAmountChange = (value) => {
    const formatted = formatAmount(value);
    setAmount(formatted);
  };

  const handlePresetAmount = (preset) => {
    setAmount(preset.toString());
  };

  const handlePayWithPaystack = async () => {
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount < 100) {
      showToast("Minimum amount is ₦100", "error");
      return;
    }

    if (numericAmount > 10000000) {
      showToast("Maximum amount is ₦10,000,000", "error");
      return;
    }

    setLoading(true);

    try {
      // Get user email from authService
      const userData = await authService.getUserData();
      const email = userData?.email || userData?.emailAddress;

      console.log("[AddFunds] User data:", userData);
      console.log("[AddFunds] Email:", email);

      if (!email) {
        showToast("Please update your profile with an email address", "error");
        setLoading(false);
        return;
      }

      // Create deep link callback URL for Paystack to redirect back to the app
      let callbackUrl;
      if (Platform.OS === "web") {
        // On web, use the current origin and path
        callbackUrl = window.location.origin + window.location.pathname;
        console.log("[AddFunds] Web Callback URL:", callbackUrl);
      } else {
        // Use a more reliable callback URL for deep linking
        callbackUrl = Linking.createURL("payment-callback", {
          queryParams: {
            type: "wallet_funding",
            amount: numericAmount.toString(),
            email: email,
          },
        });
        console.log("[AddFunds] Mobile Callback URL:", callbackUrl);
      }

      console.log("[AddFunds] Initializing payment:", {
        amount: numericAmount,
        email,
        callbackUrl,
      });

      // Initialize payment with Paystack
      const paymentData = await paymentService.initializePayment(
        numericAmount,
        email,
        {
          type: "WALLET_FUNDING",
          description: `Add ${formatCurrency(numericAmount)} to wallet`,
          callback_url: callbackUrl,
        },
      );

      if (paymentData.authorization_url) {
        console.log(
          "[AddFunds] Opening Paystack:",
          paymentData.authorization_url,
        );

        // Store payment reference for fallback verification
        const paymentReference = paymentData.reference;

        if (Platform.OS === "web") {
          // On web, redirect CURRENT window instead of opening a new tab
          // This ensures the callback returns to the same app instance
          window.location.href = paymentData.authorization_url;
          return;
        }

        // On native, use openAuthSessionAsync with fallback handling
        let result = await WebBrowser.openAuthSessionAsync(
          paymentData.authorization_url,
          callbackUrl, // This is the return URL if deep linking works
        );

        console.log("[AddFunds] Browser result:", result);

        // Check if the result indicates successful deep link (type: 'success')
        if (result.type === "success") {
          console.log("[AddFunds] Deep link successful, payment callback handled");
          // The payment-callback screen or our useEffect will handle verification
          return;
        }

        // Fallback: Always verify payment after browser closes
        console.log("[AddFunds] Browser closed, verifying payment status...");
        handleVerifyPayment(paymentReference);
      } else {
        showToast("Failed to initialize payment", "error");
      }
    } catch (error) {
      console.error("[AddFunds] Error:", error);
      showToast(error.message || "Failed to process payment", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <BackIcon size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>Add Funds</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Amount Input Section */}
          <View style={styles.amountSection}>
            <Text style={styles.sectionTitle}>Enter Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>₦</Text>
              <TextInput
                style={styles.amountInput}
                value={displayAmount(amount)}
                onChangeText={handleAmountChange}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={12}
              />
            </View>
            <Text style={styles.amountHint}>
              Minimum: ₦100 | Maximum: ₦10,000,000
            </Text>
          </View>

          {/* Preset Amounts */}
          <View style={styles.presetSection}>
            <Text style={styles.sectionTitle}>Quick Select</Text>
            <View style={styles.presetGrid}>
              {PRESET_AMOUNTS.map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.presetButton,
                    amount === preset.toString() && styles.presetButtonActive,
                  ]}
                  onPress={() => handlePresetAmount(preset)}
                >
                  <Text
                    style={[
                      styles.presetButtonText,
                      amount === preset.toString() &&
                        styles.presetButtonTextActive,
                    ]}
                  >
                    {formatCurrency(preset)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Payment Method Section */}
          <View style={styles.paymentSection}>
            <Text style={styles.sectionTitle}>Payment Method</Text>

            {/* Paystack Option */}
            <TouchableOpacity
              style={[styles.paymentOption, styles.paymentOptionSelected]}
              activeOpacity={0.8}
            >
              <View style={styles.paymentOptionLeft}>
                <View style={styles.paymentIconContainer}>
                  <PaystackIcon size={28} />
                </View>
                <View style={styles.paymentOptionText}>
                  <Text style={styles.paymentOptionTitle}>Paystack</Text>
                  <Text style={styles.paymentOptionSubtitle}>
                    Cards, Bank Transfer, USSD
                  </Text>
                </View>
              </View>
              <View style={styles.radioSelected} />
            </TouchableOpacity>
          </View>

          {/* Security Note */}
          <View style={styles.securityNote}>
            <Text style={styles.securityNoteText}>
              🔒 Your payment is secured by Paystack. We do not store your card
              details.
            </Text>
          </View>
        </ScrollView>

        {/* Pay Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.payButton,
              (!amount || Number(amount) < 100) && styles.payButtonDisabled,
            ]}
            onPress={handlePayWithPaystack}
            disabled={loading || !amount || Number(amount) < 100}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.payButtonText}>
                {amount && Number(amount) >= 100
                  ? `Pay ${formatCurrency(Number(amount))}`
                  : "Enter Amount"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  amountSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
  },
  amountHint: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  presetSection: {
    marginBottom: 32,
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  presetButton: {
    width: "31%",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#F0F3FF",
    alignItems: "center",
  },
  presetButtonActive: {
    backgroundColor: "#192DFF",
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#192DFF",
  },
  presetButtonTextActive: {
    color: "#FFFFFF",
  },
  paymentSection: {
    marginBottom: 24,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  paymentOptionSelected: {
    borderColor: "#192DFF",
    backgroundColor: "#F0F3FF",
  },
  paymentOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  paymentOptionText: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  paymentOptionSubtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  radioSelected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 6,
    borderColor: "#192DFF",
    backgroundColor: "#FFFFFF",
  },
  securityNote: {
    backgroundColor: "#F0F9F0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  securityNoteText: {
    fontSize: 12,
    color: "#333",
    textAlign: "center",
    lineHeight: 18,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  payButton: {
    backgroundColor: "#192DFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  payButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default AddFundsScreen;
