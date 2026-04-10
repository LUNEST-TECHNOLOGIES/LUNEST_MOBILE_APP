/**
 * PayWithWalletScreen - Pay for booking using wallet balance
 */

import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ArrowLeftIcon from "../../assets/icons/bookings/arrow-left.svg";
import authService from "../../services/authService";
import bookingService from "../../services/bookingService";
import notificationService from "../../services/notificationService";
import { formatCurrency } from "../../utils/currency";

const PayWithWalletScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [walletAccountNumber, setWalletAccountNumber] = useState("");

  // Parse amount from params
  const amount = parseFloat(params.amount) || 0; // Guest total (for display)
  const hostTotal = parseFloat(params.hostTotal) || amount; // Host total (for backend)
  const propertyName = params.propertyName || "Property";
  const listingId = params.listingId;
  const bookingType = params.bookingType;
  const checkIn = params.checkIn;
  const checkOut = params.checkOut;
  const adults = params.adults;
  const children = params.children;
  const fromReservation = params.fromReservation === "true";
  const bookingId = params.bookingId;

  useEffect(() => {
    fetchWalletBalance();
  }, []);

  // Auto-refresh wallet balance when screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      fetchWalletBalance();
      
      // If we just came back from added funds, show success feedback
      if (params.fromBooking === "true") {
        notificationService.success("Balance updated! You can now complete your booking.");
        // Clear param to prevent multi-toasts on subsequent focus
        router.setParams({ fromBooking: null });
      }
    }, [params.fromBooking])
  );

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWalletBalance();
    setRefreshing(false);
  }, []);

  // Get wallet account number - use actual userID from backend
  const getWalletAccountNumber = (userData) => {
    // Use the actual userID field from user model (custom 10-digit ID)
    if (userData?.userID) {
      return userData.userID;
    }
    // Fallback: generate from MongoDB _id if userID not available
    const odId = userData?._id || userData?.id;
    if (!odId) return "";

    // Convert user ID to string and hash it to get consistent digits
    const idStr = odId.toString();
    let hash = 0;
    for (let i = 0; i < idStr.length; i++) {
      hash = ((hash << 5) - hash + idStr.charCodeAt(i)) & 0xffffffff;
    }

    // Convert to positive number and pad to 7 digits, then add LNT prefix
    const digits = Math.abs(hash).toString().padStart(7, "0").substring(0, 7);
    return `LNT${digits}`;
  };

  const fetchWalletBalance = async () => {
    try {
      setIsLoading(true);
      
      // Fetch fresh profile data from server (includes walletBalance and userID)
      const profileResult = await authService.fetchProfile();
      const userData = profileResult?.success ? profileResult.data : null;
      
      if (!userData) {
        throw new Error("Failed to fetch profile data");
      }

      setUser(userData);

      // Get wallet account number from user data (use actual userID)
      const accountNumber = getWalletAccountNumber(userData);
      setWalletAccountNumber(accountNumber);

      // Wallet balance from user profile (synced with backend wallet)
      const balance = userData.walletBalance || 0;
      setWalletBalance(balance);
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
      setWalletBalance(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleAddFunds = () => {
    // Navigate to add funds screen with booking context
    router.push({
      pathname: "/add-funds",
      params: {
        ...params,
        returnUrl: "/pay-with-wallet",
        fromBooking: "true"
      }
    });
  };

  const handleChangePaymentMethod = () => {
    // Go back to payment method selection modal
    router.replace({
      pathname: "/booking-summary",
      params: {
        ...params,
        showPaymentModal: "true",
      },
    });
  };

  const renderProcessingOverlay = () => {
    if (!isProcessing) return null;

    return (
      <View style={styles.processingOverlay}>
        <View style={styles.processingCard}>
          <ActivityIndicator size="large" color="#010135" />
          <Text style={styles.processingTitle}>Processing Booking</Text>
          <Text style={styles.processingSubtitle}>Please wait while we confirm your stay at {propertyName}...</Text>
        </View>
      </View>
    );
  };

  const handleProceedToPayment = useCallback(async () => {
    if (walletBalance < amount) {
      Alert.alert(
        "Insufficient Balance",
        "Your wallet balance is not enough for this transaction. Please add funds to continue.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Add Funds", onPress: handleAddFunds },
        ],
      );
      return;
    }

    setIsProcessing(true);

    try {
      // Get current user (use fresh profile data to ensure wallet info is up to date)
      const profileResult = await authService.fetchProfile();
      const currentUser = profileResult?.success ? profileResult.data : null;

      let result;
      let refCode;

      if (fromReservation && bookingId) {
        // Update existing reserved booking to CONFIRMED
        console.log(
          "[PayWithWalletScreen] Updating reserved booking:",
          bookingId,
        );
        result = await bookingService.updateBookingStatus(
          bookingId,
          "CONFIRMED",
        );

        if (result.success) {
          refCode = result.booking?.referenceCode || generateRefCode();

          // Navigate to booking confirmation
          router.replace({
            pathname: "/booking-confirmation",
            params: {
              status: "Confirmed",
              propertyName: propertyName,
              bookingType: bookingType,
              checkIn: checkIn,
              checkOut: checkOut,
              paymentMethod: "Wallet",
              total: formatCurrency(amount),
              refCode: refCode,
              bookingId: bookingId,
            },
          });

          // Refresh global wallet balance queries across the app
          await queryClient.invalidateQueries({ queryKey: ["walletInfo"] });
          await queryClient.invalidateQueries({ queryKey: ["userProfile"] });

          // Refresh user profile to get updated wallet balance
          await authService.fetchProfile();
          
          // Refresh local wallet balance
          await fetchWalletBalance();
        } else {
          Alert.alert(
            "Payment Failed",
            result.message ||
              "Failed to process payment for your reservation. Please try again.",
          );
        }
      } else {
        // Create new booking with wallet payment
        const bookingData = {
          listing: listingId,
          type: bookingType?.toUpperCase() || "DAILY",
          guests: {
            adults: parseInt(adults) || 1,
            children: parseInt(children) || 0,
            pets: 0,
          },
          checkIn: checkIn,
          checkOut: checkOut,
          paymentMethod: "WALLET",
          totalAmount: {
            price: hostTotal,
            currency: "NGN",
          },
          bookedBy: currentUser?._id || currentUser?.id,
          status: "CONFIRMED",
        };

        result = await bookingService.createBooking(bookingData);

        if (result.success) {
          // Generate reference code
          refCode = result.booking?.referenceCode || generateRefCode();

          // Navigate to booking confirmation
          router.replace({
            pathname: "/booking-confirmation",
            params: {
              status: "Confirmed",
              propertyName: propertyName,
              bookingType: bookingType,
              checkIn: checkIn,
              checkOut: checkOut,
              paymentMethod: "Wallet",
              total: formatCurrency(amount),
              refCode: refCode,
              bookingId: result.booking?._id || result.booking?.id,
            },
          });

          // Refresh global wallet balance queries across the app
          await queryClient.invalidateQueries({ queryKey: ["walletInfo"] });
          await queryClient.invalidateQueries({ queryKey: ["userProfile"] });

          // Refresh user profile to get updated wallet balance
          await authService.fetchProfile();
          
          // Refresh local wallet balance
          await fetchWalletBalance();
        } else {
          Alert.alert(
            "Payment Failed",
            result.message ||
              "Failed to process wallet payment. Please try again.",
          );
        }
      }
    } catch (error) {
      console.error("Error processing wallet payment:", error);
      Alert.alert(
        "Error",
        "An error occurred while processing your payment. Please try again.",
      );
    } finally {
      setIsProcessing(false);
    }
  }, [
    walletBalance,
    amount,
    listingId,
    bookingType,
    checkIn,
    checkOut,
    adults,
    children,
    propertyName,
    fromReservation,
    bookingId,
    hostTotal,
    queryClient,
    fetchWalletBalance,
  ]);

  const generateRefCode = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `LUN${timestamp}${random}`.toUpperCase();
  };

  const formatAmount = (amt) => {
    return formatCurrency(amt);
  };

  const hasInsufficientBalance = walletBalance < amount;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleGoBack}>
          <ArrowLeftIcon width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Pay with Wallet</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Wallet Balance Card */}
        <View style={styles.walletCard}>
          <View style={styles.walletCardContent}>
            <View style={styles.walletInfo}>
              <Text style={styles.walletBalanceLabel}>Wallet Balance</Text>
              {isLoading ? (
                <ActivityIndicator size="small" color="#0E2F5D" />
              ) : (
                <Text
                  style={[
                    styles.walletBalanceValue,
                    hasInsufficientBalance && styles.walletBalanceInsufficient,
                  ]}
                >
                  {formatAmount(walletBalance)}
                </Text>
              )}
            </View>
            <Pressable style={styles.addFundsButton} onPress={handleAddFunds}>
              <Ionicons name="download-outline" size={18} color="#FFF" />
              <Text style={styles.addFundsText}>Add Funds</Text>
            </Pressable>
          </View>

          {/* Wallet Account Number */}
          <View style={styles.accountNumberSection}>
            <Text style={styles.accountNumberLabel}>Account Number</Text>
            <Text style={styles.accountNumberValue}>
              {walletAccountNumber || "LNT•••••••"}
            </Text>
          </View>

          {hasInsufficientBalance && (
            <View style={styles.insufficientNotice}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.insufficientText}>Insufficient balance</Text>
            </View>
          )}
        </View>

        {/* Selected Payment Method */}
        <View style={styles.paymentMethodSection}>
          <View style={styles.paymentMethodCard}>
            <View style={styles.paymentMethodContent}>
              <View style={styles.paymentMethodIcon}>
                <Ionicons name="wallet" size={24} color="#192DFF" />
              </View>
              <Text style={styles.paymentMethodName}>Wallet</Text>
            </View>
            <Ionicons name="checkmark-circle" size={22} color="#192DFF" />
          </View>
          <Pressable onPress={handleChangePaymentMethod}>
            <Text style={styles.changeMethodLink}>Change payment method</Text>
          </Pressable>
        </View>

        {/* Total Amount Section */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total Amount to be charged</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalText}>Total:</Text>
            <Text style={styles.totalAmount}>{formatAmount(amount)}</Text>
          </View>
        </View>

        {/* Notice */}
        <View style={styles.noticeContainer}>
          <Ionicons name="information-circle" size={18} color="#EF4444" />
          <Text style={styles.noticeText}>
            This includes all charges and fees
          </Text>
        </View>
      </ScrollView>

      {/* Footer with Proceed Button */}
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.proceedButton,
            (hasInsufficientBalance || isProcessing) &&
              styles.proceedButtonDisabled,
          ]}
          onPress={handleProceedToPayment}
          disabled={hasInsufficientBalance || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.proceedButtonText}>Proceed to Payment</Text>
          )}
        </Pressable>
      </View>
      {renderProcessingOverlay()}
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
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 24,
  },
  walletCard: {
    backgroundColor: "#E5EFFF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  walletCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  walletInfo: {
    gap: 8,
  },
  walletBalanceLabel: {
    fontSize: 14,
    color: "#000",
    fontWeight: "400",
  },
  walletBalanceValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#292929",
  },
  walletBalanceInsufficient: {
    color: "#EF4444",
  },
  addFundsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0E2F5D",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addFundsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
  accountNumberSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  accountNumberLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    marginBottom: 4,
  },
  accountNumberValue: {
    fontSize: 16,
    color: "#0E2F5D",
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  insufficientNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  insufficientText: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "500",
  },
  paymentMethodSection: {
    gap: 16,
  },
  paymentMethodCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#192DFF",
    backgroundColor: "#F0F3FF",
  },
  paymentMethodContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  changeMethodLink: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
    textDecorationLine: "underline",
  },
  totalSection: {
    gap: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  noticeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noticeText: {
    fontSize: 12,
    color: "#EF4444",
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  proceedButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: "#010135",
    justifyContent: "center",
    alignItems: "center",
  },
  proceedButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  processingCard: {
    backgroundColor: "#FFFFFF",
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    width: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginTop: 20,
  },
  processingSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 20,
  },
});

export default PayWithWalletScreen;
