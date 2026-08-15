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
    Image,
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
import { ChevronLeft } from "lucide-react-native";
import Toast from "../../components/common/Toast";
import apiClient from "../../services/apiClient";
import authService from "../../services/authService";
import paymentService from "../../services/paymentService";
import { formatCurrency } from "../../utils/currency";

/**
 * Paystack Official Logo
 */
const PaystackIcon = ({ size = 28 }) => (
  <Image
    source={require("../../assets/images/paystack-logo.png")}
    style={{ width: size, height: size }}
    resizeMode="contain"
  />
);

/**
 * Kora Official Logo
 */
const KoraIcon = ({ size = 28 }) => (
  <Image
    source={require("../../assets/images/kora-logo.png")}
    style={{ width: size, height: size }}
    resizeMode="contain"
  />
);

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

// Necessary for auth session redirects on Web and some mobile platforms
WebBrowser.maybeCompleteAuthSession();

const AddFundsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [amount, setAmount] = useState("");
  const [paymentProvider, setPaymentProvider] = useState("kora");
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
            router.replace("/profile");
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

  const handlePayWithProvider = async () => {
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
      const userData = await authService.getUserData();
      const email = userData?.email || userData?.emailAddress;

      if (!email) {
        showToast("Please update your profile with an email address", "error");
        setLoading({ active: false, message: "" });
        return;
      }

      // Build callback URL:
      // Web  → our own origin route (handled by payment-callback.jsx in the SPA)
      // Native → the HTTPS backend callback (SFSafariViewController/Chrome Tab intercepts it)
      //          The backend callback page then JS-redirects back via the deep link scheme.
      const API_BASE = require("../../services/apiClient").default.baseURL || process.env.EXPO_PUBLIC_API_URL || "";

      let callbackUrl;
      if (Platform.OS === "web") {
        callbackUrl = `${window.location.origin}/payment-callback?type=wallet_funding&amount=${numericAmount}`;
      } else {
        // Point Paystack at our BACKEND callback URL.
        // The backend renders a loader page that auto-verifies and deep-links back.
        // SFSafariViewController/Chrome CustomTab will intercept the redirect to
        // lunestmobile:// and resolve openAuthSessionAsync with type==="success".
        callbackUrl = `${API_BASE}/v1/payment/callback?type=wallet_funding&amount=${numericAmount}&origin=mobile`;
      }

      setLoading({
        active: true,
        message: `Connecting to ${paymentProvider === "kora" ? "Kora" : "Paystack"}...`,
      });

      const paymentData = await paymentService.initializePayment({
        amount: numericAmount,
        email,
        provider: paymentProvider,
        metadata: {
          type: "WALLET_FUNDING",
          userId: userData?._id || userData?.id,
          description: `Add ${formatCurrency(numericAmount)} to wallet`,
          callback_url: callbackUrl,
          origin: Platform.OS === "web" ? "web" : "mobile",
        },
      });

      if (!paymentData?.authorization_url) {
        showToast("Failed to initialize payment", "error");
        setLoading({ active: false, message: "" });
        return;
      }

      const authUrl = (paymentData.authorization_url || "").trim();
      if (!authUrl.startsWith("http")) {
        throw new Error("Invalid payment URL received from server");
      }

      const paymentReference = paymentData.reference;

      // Persist context so payment-callback.jsx knows where to redirect after success
      const context = {
        type: "WALLET_FUNDING",
        amount: numericAmount,
        returnUrl: params.returnUrl || null,
        params: {
          ...params,
          status: null,
          reference: null,
          trxref: null,
          amount: numericAmount.toString(),
        },
      };

      if (Platform.OS === "web") {
        localStorage.setItem("lunest_payment_context", JSON.stringify(context));
        window.location.href = authUrl;
        return;
      }

      // Save context + pending ref for AppState resume recovery
      await AsyncStorage.multiSet([
        ["lunest_payment_context", JSON.stringify(context)],
        ["@lunest_pending_payment_ref", paymentReference],
      ]);

      setLoading({ active: true, message: "Opening payment page..." });

      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.href = authUrl;
        return;
      }

      // Single unified path for iOS and Android:
      // openAuthSessionAsync opens an in-app browser (SFSafariViewController / Chrome Custom Tab)
      // It resolves when the browser closes or intercepts a redirect matching callbackUrl scheme.
      let result = { type: "dismissed" };
      try {
        result = await WebBrowser.openAuthSessionAsync(authUrl, Linking.createURL("payment-callback"));
      } catch (browserErr) {
        console.warn("[AddFunds] openAuthSessionAsync error:", browserErr);
      }

      // Clear the pending ref — we're about to navigate to the callback screen directly
      await AsyncStorage.removeItem("@lunest_pending_payment_ref");

      // Always navigate to payment-callback which is the single source of truth for verification.
      // This covers: success deep link, dismissed browser, and any error.
      router.push({
        pathname: "/payment-callback",
        params: {
          reference: paymentReference,
          status: result.type === "success" ? "success" : "pending",
          type: "wallet_funding",
          amount: numericAmount.toString(),
        },
      });

    } catch (error) {
      console.error("[AddFunds] Error:", error);
      showToast(error.message || "Failed to process payment", "error");
    } finally {
      setLoading({ active: false, message: "" });
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
          <ChevronLeft size={24} color="#000" strokeWidth={2} />
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

            {/* Kora Option */}
            <TouchableOpacity
              style={[styles.paymentOption, paymentProvider === "kora" && styles.paymentOptionSelected]}
              onPress={() => setPaymentProvider("kora")}
              activeOpacity={0.8}
            >
              <View style={styles.paymentOptionLeft}>
                <View style={styles.paymentIconContainer}>
                  <KoraIcon size={28} />
                </View>
                <View style={styles.paymentOptionText}>
                  <Text style={styles.paymentOptionTitle}>Kora</Text>
                  <Text style={styles.paymentOptionSubtitle}>
                    Cards, Bank Transfer, USSD (Fast & Secure)
                  </Text>
                </View>
              </View>
              {paymentProvider === "kora" && <View style={styles.radioSelected} />}
            </TouchableOpacity>

            {/* Paystack Option (Temporarily Disabled with Unavailable Badge) */}
            <TouchableOpacity
              style={[
                styles.paymentOption,
                { marginTop: 12 },
                styles.paymentOptionDisabled,
              ]}
              onPress={() => {
                showToast("Paystack is temporarily unavailable. Please use Kora.", "info");
              }}
              activeOpacity={0.8}
            >
              <View style={styles.paymentOptionLeft}>
                <View style={[styles.paymentIconContainer, { opacity: 0.6 }]}>
                  <PaystackIcon size={28} />
                </View>
                <View style={styles.paymentOptionText}>
                  <View style={styles.paymentOptionHeaderRow}>
                    <Text style={[styles.paymentOptionTitle, { color: "#6B7280" }]}>Paystack</Text>
                    <View style={styles.unavailableBadge}>
                      <Text style={styles.unavailableBadgeText}>Unavailable</Text>
                    </View>
                  </View>
                  <Text style={[styles.paymentOptionSubtitle, { color: "#9CA3AF" }]}>
                    Cards, Bank Transfer, USSD
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Security Note */}
          <View style={styles.securityNote}>
            <Text style={styles.securityNoteText}>
              🔒 Your payment is securely processed by Kora. We do not store your card details.
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
            onPress={handlePayWithProvider}
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
  paymentOptionDisabled: {
    opacity: 0.65,
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
  },
  paymentOptionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  unavailableBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  unavailableBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#DC2626",
    letterSpacing: 0.3,
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
