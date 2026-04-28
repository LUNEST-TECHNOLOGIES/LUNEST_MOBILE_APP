/**
 * AddFundsScreen - Add money to wallet via Paystack
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
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

// Necessary for auth session redirects on Web and some mobile platforms
WebBrowser.maybeCompleteAuthSession();

const AddFundsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState({ active: false, message: "" });
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
    (async () => {
      try {
        const ref = params?.reference || params?.trxref;
        if (ref && ref !== "null" && ref !== "undefined") {
          console.log("[AddFunds] Callback detected with reference:", ref);
          
          // CRITICAL: Clear amount immediately to prevent re-triggering logic on param change
          setAmount(""); 
          
          await handleVerifyPayment(ref);
          
          // Clear ALL potential params from URL to prevent loop on refresh
          router.setParams({ status: null, reference: null, trxref: null, type: null });
        }
      } catch (err) {
        console.error("[AddFunds] Mount verification failed:", err);
        setLoading({ active: false, message: "" });
      }
    })();
  }, [params?.status, params?.reference, params?.trxref]);

  const handleVerifyPayment = async (reference) => {
    setLoading({ active: true, message: "Verifying your transaction..." });

    try {
      const verifyResult = await paymentService.verifyPayment(reference);
      console.log("[AddFunds] Verify result:", verifyResult);

      if (verifyResult.status === "COMPLETED" || verifyResult.status === "success") {
        setLoading({ active: true, message: "Payment Successful!" });
        showToast(`₦${(Number(amount) || 0).toLocaleString()} added to your wallet successfully!`, "success");
        
        // INSTANT UI UPDATE: Use the new balance returned from the server to update cache immediately
        if (verifyResult.newBalance !== undefined) {
          console.log("[AddFunds] Instant balance update from server:", verifyResult.newBalance);
          queryClient.setQueryData(["walletInfo"], (old) => ({
            ...old,
            balance: verifyResult.newBalance,
            availableBalance: verifyResult.newBalance
          }));
        }

        // Background refresh to ensure everything is in sync (email, logs, etc.)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Final source-of-truth refresh
        queryClient.invalidateQueries({ queryKey: ["walletInfo"] });
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        
        // Force immediate refetch
        await queryClient.refetchQueries({ queryKey: ["walletInfo"] });
        await queryClient.refetchQueries({ queryKey: ["userProfile"] });
        
        // Smart redirection for Web & Native
        const storedContext = Platform.OS === "web"
          ? localStorage.getItem("lunest_payment_context")
          : await AsyncStorage.getItem("lunest_payment_context");

        let context = null;
        if (storedContext) {
          try {
            context = JSON.parse(storedContext);
          } catch (e) {
            console.error("[AddFunds] Failed to parse stored context:", e);
          }
        }

        setTimeout(() => {
          if (context?.returnUrl || params.returnUrl) {
            const finalUrl = context?.returnUrl || params.returnUrl;
            console.log("[AddFunds] Redirecting to returnUrl:", finalUrl);
            
            // Construct clean params for return
            const returnParams = {
              ...(params || {}),
              ...(context?.params || {}),
              fromBooking: "true",
              refreshed: "true",
              status: "success",
              reference: reference,
              amount: null, // Clear amount to prevent re-processing
              type: null    // Clear type to prevent re-processing
            };

            router.replace({
              pathname: finalUrl,
              params: returnParams
            });
            
            if (Platform.OS === "web") {
              localStorage.removeItem("lunest_payment_context");
            } else {
              AsyncStorage.removeItem("lunest_payment_context");
            }
          } else if (router.canGoBack()) {
            router.back();
          } else {
            // Default fallback if no history
            router.replace(Platform.OS === 'web' ? "/wallet" : "/(tabs)/wallet");
          }
        }, 2000);
      } else if (verifyResult.status === "PROCESSING" || verifyResult.status === "PENDING") {
          // If the backend says it is still processing, retry after a few seconds
          console.log("[AddFunds] Payment still processing, retrying in 3s...");
          setLoading({ active: true, message: "Finalizing your transaction..." });
          setTimeout(() => handleVerifyPayment(reference), 3000);
      } else {
          showToast(verifyResult.message || "Verification failed. Please check your history.", "error");
          setLoading({ active: false, message: "" });
      }
    } catch (error) {
      console.error("[AddFunds] Verify error:", error);
      const errorMessage = error.message || "Verification failed. Please check your history.";
      showToast(errorMessage, "error");
    } finally {
      setLoading({ active: false, message: "" });
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const formatWithSeparators = (value) => {
    if (!value) return "";
    // Clean string of any non-digits
    const numericValue = String(value).replace(/[^0-9]/g, "");
    if (!numericValue) return "";
    // Format with commas
    return Number(numericValue).toLocaleString("en-US");
  };

  const displayAmount = (value) => {
    return formatWithSeparators(value);
  };

  const handleAmountChange = (value) => {
    // Store only the numeric string for logic
    const numericString = value.replace(/[^0-9]/g, "");
    setAmount(numericString);
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

    setLoading({ active: true, message: "Preparing secure payment..." });

    try {
      // Get user email from authService
      const userData = await authService.getUserData();
      const email = userData?.email || userData?.emailAddress;

      console.log("[AddFunds] User data:", userData);
      console.log("[AddFunds] Email:", email);

      if (!email) {
        showToast("Please update your profile with an email address", "error");
        setLoading({ active: false, message: "" });
        return;
      }

      // Create deep link callback URL for Paystack to redirect back to the app
      let callbackUrl;
      if (Platform.OS === "web") {
        // On web, use the dedicated payment-callback route with amount in query params
        callbackUrl = `${window.location.origin}/payment-callback?type=wallet_funding&amount=${numericAmount.toString()}`;
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
      setLoading({ active: true, message: "Connecting to Paystack..." });
      const paymentData = await paymentService.initializePayment(
        numericAmount,
        email,
        {
          type: "WALLET_FUNDING",
          userId: userData?._id || userData?.id,
          description: `Add ${formatCurrency(numericAmount)} to wallet`,
          callback_url: callbackUrl,
          origin: "mobile", // Explicitly track origin for backend redirection
        },
      );

      if (paymentData.authorization_url) {
        // CLEAN & VALIDATE URL
        const authUrl = (paymentData.authorization_url || "").trim();
        if (!authUrl.startsWith("http")) {
          throw new Error("Invalid payment URL received from server");
        }

        console.log("[AddFunds] Opening Paystack:", authUrl);

        // Store payment reference for fallback verification
        const paymentReference = paymentData.reference;

        // PERSIST CONTEXT
        const context = {
          type: "WALLET_FUNDING",
          returnUrl: params.returnUrl || "/pay-with-wallet",
          params: { 
            ...params, 
            status: null, 
            reference: null, 
            trxref: null,
            fromBooking: "true",
            amount: numericAmount.toString()
          },
        };

        if (Platform.OS === "web") {
          localStorage.setItem("lunest_payment_context", JSON.stringify(context));
          window.location.href = authUrl;
          return;
        } else {
          await AsyncStorage.setItem(
            "lunest_payment_context",
            JSON.stringify(context),
          );
        }

        // On native, use direct Linking for Android as it is more robust for external intents
        // openAuthSessionAsync can sometimes trigger "Permission Denial" on custom Android builds
        if (Platform.OS === "android") {
            try {
                console.log("[AddFunds] Android detected, using direct Linking for reliability");
                const supported = await Linking.canOpenURL(authUrl);
                if (supported) {
                    await Linking.openURL(authUrl);
                    // Increase delay for Android background verification
                    setTimeout(() => handleVerifyPayment(paymentReference), 3500);
                    return;
                }
            } catch (linkError) {
                console.error("[AddFunds] Direct linking failed, falling back to WebBrowser:", linkError);
            }
        }

        // Standard Expo approach for iOS or Fallback
        let result;
        try {
          console.log("[AddFunds] Attempting openAuthSessionAsync...");
          result = await WebBrowser.openAuthSessionAsync(authUrl, callbackUrl);
        } catch (browserError) {
          console.warn(
            "[AddFunds] openAuthSessionAsync failed, trying Linking.openURL:",
            browserError,
          );
          try {
            await Linking.openURL(authUrl);
            return;
          } catch (secondError) {
            console.error("[AddFunds] All redirect methods failed:", secondError);
            showToast("Could not open payment browser. Please try again.", "error");
            return;
          }
        }

        console.log("[AddFunds] Browser result:", result);

        if (result.type === "success") {
          console.log("[AddFunds] Deep link successful");
          return;
        }

        // Fallback: Always verify payment after browser closes
        handleVerifyPayment(paymentReference);
      } else {
        showToast("Failed to initialize payment", "error");
      }
    } catch (error) {
      console.error("[AddFunds] Error:", error);
      showToast(error.message || "Failed to process payment", "error");
      setLoading({ active: false, message: "" });
    } finally {
      // Note: We don't always clear loading here if we redirected, but it's safe to ensure it's off
      setLoading(prev => ({ ...prev, active: false }));
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
        <View style={[
          styles.buttonContainer, 
          { paddingBottom: Math.max(insets.bottom, 16) }
        ]}>
          <TouchableOpacity
            style={[
              styles.payButton,
              (!amount || Number(amount) < 100) && styles.payButtonDisabled,
            ]}
            onPress={handlePayWithPaystack}
            disabled={loading.active || !amount || Number(amount) < 100}
          >
            {loading.active ? (
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

      {/* Loading Overlay */}
      {loading.active && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#010135" />
            <Text style={styles.loadingText}>{loading.message || "Please wait..."}</Text>
          </View>
        </View>
      )}
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
    backgroundColor: "#010135",
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#010135",
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
    borderColor: "#010135",
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
    borderColor: "#010135",
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
    paddingBottom: Platform.OS === 'android' ? 24 : 16, // Fallback for old android
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  payButton: {
    backgroundColor: "#010135",
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  loadingCard: {
    backgroundColor: "#FFFFFF",
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    width: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    textAlign: "center",
  },
});

export default AddFundsScreen;
