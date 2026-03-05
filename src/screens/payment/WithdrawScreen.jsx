/**
 * WithdrawScreen - Withdraw funds from wallet to bank account
 */
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
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
  }, []);

  // Auto-verify account when account number is complete and bank is selected
  useEffect(() => {
    if (accountNumber.length === 10 && selectedBank) {
      verifyAccount();
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

    setVerifyingAccount(true);
    setAccountName("");

    try {
      const result = await paymentService.verifyBankAccount(
        accountNumber,
        selectedBank.code
      );
      setAccountName(result.account_name);
    } catch (error) {
      console.error("[Withdraw] Error verifying account:", error);
      showToast("Could not verify account. Please check the details.", "error");
    } finally {
      setVerifyingAccount(false);
    }
  };

  const formatAmount = (value) => {
    return value.replace(/[^0-9]/g, "");
  };

  const displayAmount = (value) => {
    if (!value) return "";
    return formatAmount(value);
  };

  const handleAmountChange = (value) => {
    const formatted = formatAmount(value);
    setAmount(formatted);
  };

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

    setLoading(true);

    try {
      const result = await paymentService.initializeWithdrawal(
        numericAmount,
        selectedBank.code,
        accountNumber,
        accountName
      );

      if (result.status === "PENDING") {
        showToast("Withdrawal initiated successfully!", "success");
        // Refresh balance before navigating back
        await fetchWalletBalance();
        setTimeout(() => {
          router.back();
        }, 2000);
      }
    } catch (error) {
      console.error("[Withdraw] Error:", error);
      showToast(error.message || "Failed to process withdrawal", "error");
    } finally {
      setLoading(false);
    }
  };

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
        <Ionicons name="checkmark" size={20} color="#192DFF" />
      )}
    </TouchableOpacity>
  );

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
            <Text style={styles.inputLabel}>Amount to Withdraw</Text>
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
            <Text style={styles.inputHint}>Minimum: ₦100</Text>
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
                  <ActivityIndicator size="small" color="#192DFF" />
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
              (!amount || !accountName || Number(amount) < 100) &&
                styles.withdrawButtonDisabled,
            ]}
            onPress={handleWithdraw}
            disabled={loading || !amount || !accountName || Number(amount) < 100}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.withdrawButtonText}>
                {amount && Number(amount) >= 100 && accountName
                  ? `Withdraw ${formatCurrency(Number(amount))}`
                  : "Enter Details"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

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
    marginTop: 6,
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
    color: "#192DFF",
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
    backgroundColor: "#192DFF",
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
});

export default WithdrawScreen;
