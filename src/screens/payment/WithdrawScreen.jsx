/**
 * WithdrawScreen - Withdraw funds from wallet to bank account
 */
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import Toast from "../../components/common/Toast";
import paymentService from "../../services/paymentService";
import authService from "../../services/authService";
import configService from "../../services/configService";
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

const WithdrawScreen = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [selectedBank, setSelectedBank] = useState(null);
  const [banks, setBanks] = useState([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyingAccount, setVerifyingAccount] = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });
  const [showProcessingModal, setShowProcessingModal] = useState(false);

  // Withdrawal PIN state
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [userHasPin, setUserHasPin] = useState(null); // null = not checked yet

  // Use a ref to track the last verified combination to prevent redundant calls (429 errors)
  const lastVerifiedKey = useRef("");

  const isInsufficient = Number(amount) > walletBalance;

  // Refresh wallet balance when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchWalletBalance();
      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  useEffect(() => {
    fetchBanks();
    fetchWalletBalance();
    checkPinStatus();
  }, []);

  // Auto-verify account when account number is complete and bank is selected
  useEffect(() => {
    if (accountNumber.length === 10 && selectedBank) {
      const currentKey = `${selectedBank.code}-${accountNumber}`;
      if (lastVerifiedKey.current !== currentKey) {
        verifyAccount();
      }
    } else {
      setAccountName("");
    }
  }, [accountNumber, selectedBank]);

  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const checkPinStatus = async () => {
    try {
      const token = await authService.getToken();
      const baseURL = await configService.getBaseURL();
      const res = await fetch(`${baseURL}/v1/users/withdrawal-pin-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUserHasPin(data?.hasWithdrawalPin || false);
    } catch (_err) {
      setUserHasPin(false);
    }
  };

  const fetchBanks = async () => {
    try {
      const banksData = await paymentService.getBanks();
      setBanks(banksData);
    } catch (error) {
      console.error("[Withdraw] Error fetching banks:", error);
      showToast("Failed to load banks", "error");
    } finally {
      setLoadingBanks(false);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      console.log("[Withdraw] Fetching wallet balance from backend...");
      
      const walletInfo = await paymentService.getWalletInfo();
      console.log("[Withdraw] Full wallet info:", JSON.stringify(walletInfo, null, 2));

      if (walletInfo) {
        const balance = walletInfo.availableBalance || 0;
        console.log("[Withdraw] Setting wallet balance to:", balance);
        setWalletBalance(balance);
      } else {
        console.warn("[Withdraw] No wallet info returned");
        setWalletBalance(0);
      }
    } catch (error) {
      console.error("[Withdraw] Error fetching wallet balance:", error);
      setWalletBalance(0);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchBanks(), fetchWalletBalance()]);
    setRefreshing(false);
  };

  const verifyAccount = async () => {
    if (!selectedBank || accountNumber.length !== 10) return;

    const currentKey = `${selectedBank.code}-${accountNumber}`;
    lastVerifiedKey.current = currentKey;

    setVerifyingAccount(true);
    setAccountName("");

    try {
      console.log(`[Withdraw] Verifying account: ${accountNumber} with bank ${selectedBank.code}`);
      const result = await paymentService.verifyBankAccount(
        accountNumber,
        selectedBank.code
      );
      console.log("[Withdraw] Verification result:", result);
      setAccountName(result.account_name);
    } catch (error) {
      console.error("[Withdraw] Error verifying account:", error);
      // Reset ref so user can try again
      lastVerifiedKey.current = ""; 

      const errorMessage = error.response?.message || error.message || "Could not verify account. Please check the details.";
      showToast(errorMessage, "error");
      
      // If Paystack limits are the issue, log it clearly for the user
      if (errorMessage.includes("limit") || errorMessage.includes("mode")) {
        console.warn("[Withdraw] Paystack Test Mode warning detected");
      }
    } finally {
      setVerifyingAccount(false);
    }
  };

  const formatWithSeparators = (value) => {
    if (!value) return "";
    // Clean string of any non-digits
    const numericValue = value.replace(/[^0-9]/g, "");
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

  // Withdrawal success state
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);
  const [withdrawalDetails, setWithdrawalDetails] = useState(null);

  const handleWithdraw = async () => {
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount < 100) {
      showToast("Minimum withdrawal is ₦100", "error");
      return;
    }
    if (numericAmount > walletBalance) {
      showToast("Insufficient balance", "error");
      return;
    }
    if (!selectedBank) {
      showToast("Please select a bank", "error");
      return;
    }
    if (!accountNumber || accountNumber.length !== 10) {
      showToast("Please enter a valid 10-digit account number", "error");
      return;
    }
    if (!accountName) {
      showToast("Please wait for account verification", "error");
      return;
    }

    // If user has no PIN set, prompt them to set one first
    if (userHasPin === false) {
      Alert.alert(
        "Withdrawal PIN Required",
        "For your security, please set a 4-digit withdrawal PIN before making withdrawals.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Set PIN", onPress: () => router.push("/withdrawal-pin") },
        ]
      );
      return;
    }

    // Show PIN confirmation modal
    setEnteredPin("");
    setPinError("");
    setShowPinModal(true);
  };

  const handlePinDigit = (key) => {
    setPinError("");
    if (enteredPin.length < 4) {
      const updated = enteredPin + key;
      setEnteredPin(updated);
      if (updated.length === 4) {
        // Auto-submit
        setTimeout(() => submitWithPin(updated), 150);
      }
    }
  };

  const handlePinDelete = () => {
    setPinError("");
    setEnteredPin((p) => p.slice(0, -1));
  };

  const submitWithPin = async (pin) => {
    setVerifyingPin(true);
    try {
      const token = await authService.getToken();
      const baseURL = await configService.getBaseURL();
      const res = await fetch(`${baseURL}/v1/users/verify-withdrawal-pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowPinModal(false);
        setEnteredPin("");
        // Proceed with actual withdrawal
        await processWithdrawal();
      } else {
        setPinError(data.message || "Incorrect PIN. Please try again.");
        setEnteredPin("");
      }
    } catch (_err) {
      setPinError("Network error. Please try again.");
      setEnteredPin("");
    } finally {
      setVerifyingPin(false);
    }
  };

  const processWithdrawal = async () => {
    const numericAmount = Number(amount);
    setLoading(true);
    setShowProcessingModal(true);

    try {
      const result = await paymentService.initializeWithdrawal(
        numericAmount,
        selectedBank.code,
        accountNumber,
        accountName,
        "mobile" // origin
      );

      console.log("[Withdraw] Backend result:", JSON.stringify(result));

      if (result.status === "PENDING" || result.status === "SUCCESS" || result.status === "OTP_REQUIRED") {
        // Refresh global wallet balance
        await queryClient.invalidateQueries({ queryKey: ["walletInfo"] });
        await queryClient.invalidateQueries({ queryKey: ["userProfile"] });

        // Success transition delay for a "satisfying" feel
        setTimeout(() => {
          setShowProcessingModal(false);
          setWithdrawalDetails({
            amount: numericAmount,
            bankName: selectedBank.name,
            accountNumber,
            accountName,
            reference: result.reference || result.transfer_code || null,
          });
          setWithdrawalSuccess(true);
          
          // Auto-redirect to wallet after 12 seconds
          setTimeout(() => {
            // Updated redirection to a valid tab route to avoid 404
            router.replace(Platform.OS === 'web' ? "/profile" : "/(tabs)/profile");
          }, 12000);
        }, 2000); // Slightly longer processing for "perceived quality"
      } else {
        // Unknown/unexpected status — close the modal and inform the user
        console.warn("[Withdraw] Unexpected status from backend:", result.status);
        setShowProcessingModal(false);
        showToast(result.message || "Withdrawal returned an unexpected status. Please check your transactions.", "error");
      }
    } catch (error) {
      console.error("[Withdraw] Error:", error);
      setShowProcessingModal(false);
      showToast(error?.message || "Failed to process withdrawal", "error");
    } finally {
      setLoading(false);
      // Safety net: ensure the processing modal is always dismissed
      // The setTimeout ensures this runs after any pending state updates from the try block
      setTimeout(() => {
        setShowProcessingModal((current) => {
          if (current) {
            console.warn("[Withdraw] Safety net: force-closing stuck processing modal");
          }
          return false;
        });
      }, 15000); // 15s max — well beyond the 2s success delay
    }
  };

  // Render withdrawal success screen
  if (withdrawalSuccess && withdrawalDetails) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.successScreen}>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.successCloseButton}
            onPress={() => router.replace(Platform.OS === 'web' ? "/profile" : "/(tabs)/profile")}
          >
            <Ionicons name="close" size={28} color="#6B7280" />
          </TouchableOpacity>

          {/* Success Icon */}
          <View style={styles.successIconContainer}>
            <View style={styles.successIconOuter}>
              <View style={styles.successIconInner}>
                <Ionicons name="sparkles" size={40} color="#FFFFFF" />
              </View>
            </View>
          </View>

          {/* Success Title */}
          <Text style={styles.successTitle}>Transfer Initiated! 💸</Text>
          <Text style={styles.successSubtitle}>
            Your money is on its way to your bank account.
          </Text>

          {/* Amount */}
          <View style={styles.successAmountCard}>
            <Text style={styles.successAmountLabel}>Amount</Text>
            <Text style={styles.successAmountValue}>
              {formatCurrency(withdrawalDetails.amount)}
            </Text>
          </View>

          {/* Details Card */}
          <View style={styles.successDetailsCard}>
            <View style={styles.successDetailRow}>
              <Text style={styles.successDetailLabel}>Bank</Text>
              <Text style={styles.successDetailValue}>{withdrawalDetails.bankName}</Text>
            </View>
            <View style={styles.successDetailDivider} />
            <View style={styles.successDetailRow}>
              <Text style={styles.successDetailLabel}>Account</Text>
              <Text style={styles.successDetailValue}>
                ●●●●●●{withdrawalDetails.accountNumber.slice(-4)}
              </Text>
            </View>
            <View style={styles.successDetailDivider} />
            <View style={styles.successDetailRow}>
              <Text style={styles.successDetailLabel}>Account Name</Text>
              <Text style={styles.successDetailValue} numberOfLines={1}>{withdrawalDetails.accountName}</Text>
            </View>
            <View style={styles.successDetailDivider} />
            <View style={styles.successDetailRow}>
              <Text style={styles.successDetailLabel}>Status</Text>
              <View style={styles.successStatusBadge}>
                <Text style={styles.successStatusText}>Processing</Text>
              </View>
            </View>
            {withdrawalDetails.reference && (
              <>
                <View style={styles.successDetailDivider} />
                <View style={styles.successDetailRow}>
                  <Text style={styles.successDetailLabel}>Reference</Text>
                  <Text style={[styles.successDetailValue, { fontSize: 12 }]} numberOfLines={1}>
                    {withdrawalDetails.reference}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Processing Time Note */}
          <View style={styles.successProcessingNote}>
            <Ionicons name="time-outline" size={16} color="#F59E0B" />
            <Text style={styles.successProcessingText}>
              Typically processed within 24 hours. You'll receive a notification when complete.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.successButtonsContainer}>
            <TouchableOpacity
              style={styles.successPrimaryButton}
              onPress={() => {
                router.replace("/transaction-history");
              }}
            >
              <Ionicons name="receipt-outline" size={18} color="#FFFFFF" />
              <Text style={styles.successPrimaryButtonText}>View Transactions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.successSecondaryButton}
              onPress={() => router.replace(Platform.OS === 'web' ? "/profile" : "/(tabs)/profile")}
            >
              <Text style={styles.successSecondaryButtonText}>Back to Wallet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const filteredBanks = banks.filter((bank) =>
    bank.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderBankItem = ({ item }) => (
    <TouchableOpacity
      style={styles.bankItem}
      onPress={() => {
        setSelectedBank(item);
        setShowBankModal(false);
        setSearchQuery("");
      }}
    >
      <Text style={styles.bankItemText}>{item.name}</Text>
      {selectedBank?.code === item.code && (
        <Ionicons name="checkmark" size={20} color="#010135" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
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
        <Text style={styles.headerTitle}>Withdraw</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Available Balance */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <TouchableOpacity
                onPress={fetchWalletBalance}
                style={styles.refreshButton}
                disabled={refreshing}
              >
                <Ionicons
                  name="refresh"
                  size={16}
                  color={refreshing ? "#999" : "#010135"}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.balanceAmount}>
              {formatCurrency(walletBalance)}
            </Text>
            <Text style={styles.balanceNote}>
              Pull down to refresh or tap refresh icon
            </Text>
          </View>

          {/* Amount Input */}
          <View style={styles.inputSection}>
            <Text
              style={[
                styles.inputLabel,
                isInsufficient && { color: "#DC2626" },
              ]}
            >
              Amount to Withdraw
            </Text>
            <View
              style={[
                styles.amountInputContainer,
                isInsufficient && { borderColor: "#DC2626", backgroundColor: "#FFF5F5" },
              ]}
            >
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
            <View style={styles.inputFooter}>
              <Text style={styles.inputHint}>Minimum: ₦100</Text>
              {isInsufficient && (
                <Text style={styles.errorText}>Insufficient balance</Text>
              )}
            </View>
          </View>

          {/* Bank Selection */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Select Bank</Text>
            <TouchableOpacity
              style={styles.bankSelector}
              onPress={() => setShowBankModal(true)}
              disabled={loadingBanks}
            >
              {loadingBanks ? (
                <ActivityIndicator size="small" color="#666" />
              ) : (
                <>
                  <Text
                    style={[
                      styles.bankSelectorText,
                      !selectedBank && styles.bankSelectorPlaceholder,
                    ]}
                  >
                    {selectedBank?.name || "Select a bank"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Account Number */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Account Number</Text>
            <TextInput
              style={styles.textInput}
              value={accountNumber}
              onChangeText={(text) => setAccountNumber(text.replace(/[^0-9]/g, ""))}
              placeholder="Enter 10-digit account number"
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          {/* Account Name (auto-filled) */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Account Name</Text>
            <View style={styles.accountNameContainer}>
              {verifyingAccount ? (
                <View style={styles.verifyingContainer}>
                  <ActivityIndicator size="small" color="#010135" />
                  <Text style={styles.verifyingText}>Verifying account...</Text>
                </View>
              ) : accountName ? (
                <View style={styles.verifiedContainer}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.accountNameText}>{accountName}</Text>
                </View>
              ) : (
                <Text style={styles.accountNamePlaceholder}>
                  Will be auto-filled after verification
                </Text>
              )}
            </View>
          </View>

          {/* Security Note */}
          <View style={styles.securityNote}>
            <Text style={styles.securityNoteText}>
              ⏱️ Withdrawals are typically processed within 24 hours. You'll
              receive a notification when complete.
            </Text>
          </View>
        </ScrollView>

        {/* Withdraw Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.withdrawButton,
              (!amount || !accountName || Number(amount) < 100 || isInsufficient) &&
                styles.withdrawButtonDisabled,
            ]}
            onPress={handleWithdraw}
            disabled={loading || !amount || !accountName || Number(amount) < 100 || isInsufficient}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.withdrawButtonText}>
                {isInsufficient
                  ? "Insufficient Balance"
                  : amount && Number(amount) >= 100 && accountName
                  ? `Withdraw ${formatCurrency(Number(amount))}`
                  : "Enter Details"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Withdrawal PIN Confirmation Modal */}
      <Modal
        visible={showPinModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => { setShowPinModal(false); setEnteredPin(""); setPinError(""); }}
      >
        <View style={styles.pinModalOverlay}>
          <View style={styles.pinModalContent}>
            {/* Header */}
            <View style={styles.pinModalHeader}>
              <Pressable
                onPress={() => { setShowPinModal(false); setEnteredPin(""); setPinError(""); }}
                style={styles.pinModalClose}
              >
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>

            {/* Lock Icon */}
            <View style={styles.pinModalIconCircle}>
              <Ionicons name="lock-closed" size={30} color="#010135" />
            </View>
            <Text style={styles.pinModalTitle}>Enter Withdrawal PIN</Text>
            <Text style={styles.pinModalSubtitle}>
              Confirm your 4-digit PIN to continue
            </Text>

            {/* Dots */}
            <View style={styles.pinModalDots}>
              {Array.from({ length: 4 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.pinDot,
                    i < enteredPin.length ? styles.pinDotFilled : styles.pinDotEmpty,
                  ]}
                />
              ))}
            </View>

            {/* Error */}
            {!!pinError && (
              <View style={styles.pinErrorRow}>
                <Ionicons name="alert-circle-outline" size={14} color="#B70808" />
                <Text style={styles.pinErrorText}>{pinError}</Text>
              </View>
            )}

            {/* Numpad */}
            {verifyingPin ? (
              <ActivityIndicator size="large" color="#010135" style={{ marginTop: 32 }} />
            ) : (
              <View style={styles.pinNumpad}>
                {["1","2","3","4","5","6","7","8","9","","0","del"].map((key, index) => {
                  if (key === "") return <View key={index} style={styles.pinNumpadEmpty} />;
                  if (key === "del") {
                    return (
                      <Pressable key={index} style={styles.pinNumpadKey} onPress={handlePinDelete}>
                        <Ionicons name="backspace-outline" size={22} color="#010135" />
                      </Pressable>
                    );
                  }
                  return (
                    <Pressable key={index} style={styles.pinNumpadKey} onPress={() => handlePinDigit(key)}>
                      <Text style={styles.pinNumpadKeyText}>{key}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Forgot PIN link */}
            <Pressable onPress={() => { setShowPinModal(false); router.push("/withdrawal-pin"); }}>
              <Text style={styles.forgotPinText}>Forgot PIN? Reset it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Processing Modal */}
      <Modal
        visible={showProcessingModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.processingModalOverlay}>
          <View style={styles.processingModalContent}>
            <ActivityIndicator size="large" color="#010135" />
            <Text style={styles.processingModalTitle}>Processing Withdrawal</Text>
            <Text style={styles.processingModalText}>
              Please wait while we secure your transaction...
            </Text>
          </View>
        </View>
      </Modal>

      {/* Bank Selection Modal */}
      <Modal
        visible={showBankModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBankModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Bank</Text>
            <TouchableOpacity
              onPress={() => {
                setShowBankModal(false);
                setSearchQuery("");
              }}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search banks..."
              placeholderTextColor="#999"
            />
          </View>

          <FlatList
            data={filteredBanks}
            renderItem={renderBankItem}
            keyExtractor={(item, index) => `${item.code}-${index}`}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.bankList}
          />
        </SafeAreaView>
      </Modal>
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
    paddingTop: 20,
    paddingBottom: 100,
  },
  balanceCard: {
    backgroundColor: "#E5EFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: "center",
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: "#666",
  },
  refreshButton: {
    padding: 4,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0E2F5D",
    marginBottom: 4,
  },
  balanceNote: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
  },
  inputHint: {
    fontSize: 12,
    color: "#666",
  },
  inputFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
  },
  bankSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  bankSelectorText: {
    fontSize: 16,
    color: "#333",
  },
  bankSelectorPlaceholder: {
    color: "#999",
  },
  textInput: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    fontSize: 16,
    color: "#333",
  },
  accountNameContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    minHeight: 52,
    justifyContent: "center",
  },
  verifyingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  verifyingText: {
    fontSize: 14,
    color: "#010135",
  },
  verifiedContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  accountNameText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  accountNamePlaceholder: {
    fontSize: 14,
    color: "#999",
  },
  securityNote: {
    backgroundColor: "#FFF8E7",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
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
  withdrawButton: {
    backgroundColor: "#010135",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  withdrawButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  withdrawButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  bankList: {
    paddingHorizontal: 20,
  },
  bankItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  bankItemText: {
    fontSize: 16,
    color: "#333",
  },
  // Processing Modal styles
  processingModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)", // Darker for more focus
    justifyContent: "center",
    alignItems: "center",
  },
  processingModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 40, // More breathing room
    alignItems: "center",
    width: "85%", // Slightly wider
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  processingModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginTop: 20,
    marginBottom: 8,
  },
  processingModalText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  // Success Screen styles
  successScreen: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successIconOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  successIconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  successAmountCard: {
    backgroundColor: "#F0F4FF",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },
  successAmountLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
    fontWeight: "500",
  },
  successAmountValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#010135",
  },
  successDetailsCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    marginBottom: 16,
  },
  successDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  successDetailLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  successDetailValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
    maxWidth: "60%",
    textAlign: "right",
  },
  successDetailDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  successStatusBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  successStatusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D97706",
  },
  successProcessingNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    width: "100%",
    marginBottom: 28,
  },
  successProcessingText: {
    fontSize: 12,
    color: "#92400E",
    lineHeight: 18,
    flex: 1,
  },
  successButtonsContainer: {
    width: "100%",
    gap: 12,
  },
  successPrimaryButton: {
    backgroundColor: "#010135",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  successPrimaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  successSecondaryButton: {
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  successSecondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  successCloseButton: {
    position: "absolute",
    top: 10,
    right: 16,
    padding: 8,
    zIndex: 20,
  },
  // ── PIN Modal Styles ──
  pinModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  pinModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: "center",
  },
  pinModalHeader: {
    width: "100%",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  pinModalClose: { padding: 4 },
  pinModalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F0F3FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  pinModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 6,
  },
  pinModalSubtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
  },
  pinModalDots: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 16,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  pinDotFilled: { backgroundColor: "#010135" },
  pinDotEmpty: { backgroundColor: "#E0E0E0" },
  pinErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    width: "100%",
  },
  pinErrorText: { fontSize: 12, color: "#B70808", flex: 1 },
  pinNumpad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
    maxWidth: 280,
    marginTop: 8,
  },
  pinNumpadKey: {
    width: "33.33%",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  pinNumpadEmpty: { width: "33.33%", paddingVertical: 14 },
  pinNumpadKeyText: { fontSize: 22, fontWeight: "500", color: "#010135" },
  forgotPinText: {
    fontSize: 13,
    color: "#010135",
    fontWeight: "600",
    marginTop: 16,
    textDecorationLine: "underline",
  },
});

export default WithdrawScreen;
