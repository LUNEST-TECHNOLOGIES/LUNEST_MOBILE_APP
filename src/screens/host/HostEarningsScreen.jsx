/**
 * Host Earnings Screen
 * View earnings, payouts, and financial reports
 * Integrated with wallet + transaction APIs for real data
 */

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import authService from "../../services/authService";
import configService from "../../services/configService";
import { HostEarningsSkeleton } from "../../components/skeletons";

const TrendUpIcon = ({ size = 20, color = "#4CAF50" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 6L13.5 15.5L8.5 10.5L1 18"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M17 6H23V12"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const BackIcon = ({ size = 24, color = "black" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15.0003 20.67C14.8103 20.67 14.6203 20.6 14.4703 20.45L7.95027 13.93C6.89027 12.87 6.89027 11.13 7.95027 10.07L14.4703 3.55002C14.7603 3.26002 15.2403 3.26002 15.5303 3.55002C15.8203 3.84002 15.8203 4.32002 15.5303 4.61002L9.01027 11.13C8.53027 11.61 8.53027 12.39 9.01027 12.87L15.5303 19.39C15.8203 19.68 15.8203 20.16 15.5303 20.45C15.3803 20.59 15.1903 20.67 15.0003 20.67Z"
      fill={color}
    />
  </Svg>
);

// Transaction category display configs
const CATEGORY_CONFIG = {
  HOST_EARNING: {
    icon: "home-outline",
    label: "Host Earning (Net)",
    color: "#2E7D32",
  },
  RENT: { icon: "home-outline", label: "Rent Income", color: "#2E7D32" },
  VAT: { icon: "receipt-outline", label: "VAT on app fee", color: "#B70808" },
  SERVICE_CHARGE: {
    icon: "construct-outline",
    label: "Service Charge",
    color: "#2E7D32",
  },
  SECURITY_DEPOSIT: {
    icon: "lock-closed-outline",
    label: "Caution Fee",
    color: "#192DFF",
  },
  PLATFORM_FEE: { icon: "card-outline", label: "App fee (deduction)", color: "#B70808" },
  CANCELLATION_PENALTY: {
    icon: "alert-circle-outline",
    label: "Cancellation Penalty",
    color: "#B70808",
  },
  CANCELLATION_REFUND: {
    icon: "refresh-circle-outline",
    label: "Cancellation Refund",
    color: "#0308AC",
  },
  WITHDRAWAL: {
    icon: "arrow-up-circle-outline",
    label: "Withdrawal",
    color: "#B70808",
  },
  BOOKING: {
    icon: "calendar-outline",
    label: "Booking Payment",
    color: "#192DFF",
  },
  TOP_UP: {
    icon: "add-circle-outline",
    label: "Wallet Funding",
    color: "#0308AC",
  },
  REFUND: { icon: "refresh-circle-outline", label: "Refund", color: "#0308AC" },
  COUPON_PAYMENT: {
    icon: "pricetag-outline",
    label: "Coupon Payment",
    color: "#2E7D32",
  },
};

const STATUS_BADGE = {
  COMPLETED: {
    bg: "rgba(49, 235, 61, 0.2)",
    text: "#2E7D32",
    label: "Completed",
  },
  ON_HOLD: { bg: "rgba(25, 45, 255, 0.15)", text: "#192DFF", label: "On Hold" },
  PENDING: { bg: "rgba(253, 174, 49, 0.2)", text: "#EF6C00", label: "Pending" },
  FAILED: { bg: "rgba(241, 99, 99, 0.2)", text: "#FD3131", label: "Failed" },
};

const HostEarningsScreen = () => {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const containerWidth = Math.min(width - 40, 500);

  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // API data state
  const [walletData, setWalletData] = useState({
    availableBalance: 0,
    pendingBalance: 0,
    inflow: 0,
    outflow: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    totalEarnings: 0,
    pendingEarnings: 0,
    paidOut: 0,
  });

  /**
   * Fetch wallet balance & transactions from API
   */
  const fetchEarningsData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError(null);

      const token = await authService.getToken();
      const baseURL = await configService.getBaseURL();

      if (!token) {
        setError("Please log in to view earnings");
        setLoading(false);
        return;
      }

      // Fetch wallet and transactions in parallel
      const [walletRes, txnRes] = await Promise.all([
        fetch(`${baseURL}/v1/wallet`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        }),
        fetch(`${baseURL}/v1/my-transactions?limit=50`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      // Process wallet data
      if (walletRes.ok) {
        const walletJson = await walletRes.json();
        const wallet = walletJson.body || walletJson.data || {};
        console.log("[HostEarnings] Wallet data:", wallet);
        setWalletData({
          availableBalance: parseFloat(wallet.availableBalance) || 0,
          pendingBalance: parseFloat(wallet.pendingBalance) || 0,
          inflow: parseFloat(wallet.inflow) || 0,
          outflow: parseFloat(wallet.outflow) || 0,
        });
      }

      // Process transaction data
      if (txnRes.ok) {
        const txnJson = await txnRes.json();
        const txnList =
          txnJson.body?.transactions || txnJson.body || txnJson.data || [];
        console.log("[HostEarnings] Transactions:", txnList);

        if (Array.isArray(txnList)) {
          // Map to display format
          const mapped = txnList
            .filter((t) => t && typeof t === "object")
            .map((txn) => ({
              ...txn,
              displayType: txn.category || txn.type,
              timestamp: txn.createdAt || txn.timestamp,
              amount: parseFloat(txn.amount) || 0,
              status: txn.status || "COMPLETED",
            }));

          setTransactions(mapped);

          // Calculate earnings summary
          let totalEarnings = 0;
          let pendingEarnings = 0;
          let paidOut = 0;

          mapped.forEach((txn) => {
            // Sum all earning-related categories, accounting for credits and debits
            const isFinancialValue = [
              "HOST_EARNING",
              "RENT",
              "SERVICE_CHARGE",
              "SECURITY_DEPOSIT",
              "CANCELLATION_PENALTY"
            ].includes(txn.displayType) || txn.type === "CREDIT" || txn.type === "DEBIT";

            if (isFinancialValue) {
              // Exclude non-earning categories like withdrawals, funding, and platform costs
              if (["WITHDRAWAL", "TOP_UP", "REFUND", "VAT", "PLATFORM_FEE"].includes(txn.displayType)) return;

              const val = txn.type === "DEBIT" ? -txn.amount : txn.amount;

              if (txn.status === "ON_HOLD" || txn.status === "PENDING") {
                // SECURITY_DEPOSIT (Caution Fee) is held in escrow and is NOT an earning yet
                if (txn.displayType === "SECURITY_DEPOSIT") return;
                
                pendingEarnings += val;
                totalEarnings += val;
              } else if (txn.status === "COMPLETED") {
                paidOut += val;
                totalEarnings += val;
              }
            }
          });

          setSummary({ totalEarnings, pendingEarnings, paidOut });
        }
      }
    } catch (err) {
      console.error("[HostEarnings] Error:", err);
      setError("Failed to load earnings data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEarningsData();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchEarningsData(false);
  };

  const formatAmount = (amount) => `₦${(amount || 0).toLocaleString("en-NG")}`;

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();
    const time = date.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${day} ${month} ${year}, ${time.toLowerCase()}`;
  };

  const renderTransactionItem = ({ item }) => {
    const config =
      CATEGORY_CONFIG[item.displayType] || CATEGORY_CONFIG.HOST_EARNING;
    const statusConfig = STATUS_BADGE[item.status] || STATUS_BADGE.COMPLETED;
    const isCredit =
      item.type === "CREDIT" ||
      [
        "HOST_EARNING",
        "RENT",
        "SERVICE_CHARGE",
        "SECURITY_DEPOSIT",
        "REFUND",
        "CANCELLATION_REFUND",
      ].includes(item.displayType);

    return (
      <TouchableOpacity
        style={styles.txnItem}
        onPress={() =>
          router.push({
            pathname: "/transaction-detail",
            params: {
              transactionId: item._id || item.reference,
              transactionType: config.label,
              amount: formatAmount(item.amount),
              status: statusConfig.label,
              dateTime: formatDate(item.timestamp),
              description: item.description,
              method: item.channel || "SYSTEM",
            },
          })
        }
      >
        <View style={styles.txnLeft}>
          <View
            style={[styles.txnIcon, { backgroundColor: config.color + "15" }]}
          >
            <Ionicons name={config.icon} size={20} color={config.color} />
          </View>
          <View style={styles.txnInfo}>
            <Text style={styles.txnLabel} numberOfLines={1}>
              {item.displayType === 'RENT' && item.description ? item.description : config.label}
            </Text>
            <Text style={styles.txnDate}>{formatDate(item.timestamp)}</Text>
          </View>
        </View>
        <View style={styles.txnRight}>
          <View
            style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}
          >
            <Text style={[styles.statusText, { color: statusConfig.text }]}>
              {statusConfig.label}
            </Text>
          </View>
          <Text
            style={[
              styles.txnAmount,
              { color: isCredit ? "#2E7D32" : "#B70808" },
            ]}
          >
            {isCredit ? "+" : "-"} {formatAmount(item.amount)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <HostEarningsSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { alignItems: "center" }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4F46E5"]}
          />
        }
      >
        {/* Total Earnings Card */}
        <View style={[styles.totalCard, { width: containerWidth }]}>
          <Text style={styles.totalLabel}>Total Earnings</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalAmount}>
              {formatAmount(summary.totalEarnings)}
            </Text>
            <View style={styles.trendBadge}>
              <TrendUpIcon size={16} color="#4CAF50" />
            </View>
          </View>

          {/* Period Selector */}
          <View style={styles.periodSelector}>
            {["week", "month", "year", "all"].map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text
                  style={[
                    styles.periodText,
                    selectedPeriod === period && styles.periodTextActive,
                  ]}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Breakdown Cards */}
        <View style={[styles.breakdownContainer, { width: containerWidth }]}>
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownLabel}>Pending</Text>
            <Text style={styles.breakdownAmount}>
              {formatAmount(
                summary.pendingEarnings || walletData.pendingBalance,
              )}
            </Text>
          </View>
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownLabel}>Paid Out</Text>
            <Text style={styles.breakdownAmount}>
              {formatAmount(summary.paidOut)}
            </Text>
          </View>
        </View>

        {/* Wallet Balance */}
        <View style={[styles.walletCard, { width: containerWidth }]}>
          <View style={styles.walletRow}>
            <View style={styles.walletItem}>
              <Text style={styles.walletLabel}>Available Balance</Text>
              <Text style={styles.walletValue}>
                {formatAmount(walletData.availableBalance)}
              </Text>
            </View>
            <View style={styles.walletDivider} />
            <View style={styles.walletItem}>
              <Text style={styles.walletLabel}>Pending Balance</Text>
              <Text style={styles.walletValue}>
                {formatAmount(walletData.pendingBalance)}
              </Text>
            </View>
          </View>
        </View>

        {/* Fund Release Info */}
        <View style={[styles.infoCard, { width: containerWidth }]}>
          <Ionicons name="information-circle-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            Funds are released to available balance 24 hours after booking confirmation
          </Text>
        </View>

        {/* Transactions List */}
        <View style={[styles.transactionsContainer, { width: containerWidth }]}>
          <View style={styles.txnHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity
              onPress={() => router.push("/transaction-history")}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={32} color="#B70808" />
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => fetchEarningsData()}
              >
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#CCCCCC" />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>
                Your earnings from bookings will appear here
              </Text>
            </View>
          ) : (
            <View style={styles.txnList}>
              {transactions.slice(0, 10).map((txn, index) => (
                <View key={txn._id || index}>
                  {renderTransactionItem({ item: txn })}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Payout Button */}
        <TouchableOpacity
          style={[
            styles.payoutButton,
            { width: containerWidth },
            walletData.availableBalance <= 0 && styles.payoutButtonDisabled,
          ]}
          disabled={walletData.availableBalance <= 0}
          onPress={() => router.push("/withdrawal")}
        >
          <Text style={styles.payoutButtonText}>Request Payout</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000000",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6D6D6D",
    marginTop: 12,
  },
  totalCard: {
    backgroundColor: "#192DFF",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 12,
  },
  periodSelector: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: "#FFFFFF",
  },
  periodText: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.7)",
  },
  periodTextActive: {
    color: "#192DFF",
  },
  breakdownContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  breakdownCard: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 16,
  },
  breakdownLabel: {
    fontSize: 12,
    color: "#656565",
  },
  breakdownAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#292929",
    marginTop: 4,
  },
  walletCard: {
    backgroundColor: "#F8F9FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5EFFF",
  },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  walletItem: {
    flex: 1,
    alignItems: "center",
  },
  walletDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#D0D0D0",
    marginHorizontal: 12,
  },
  walletLabel: {
    fontSize: 11,
    color: "#656565",
    marginBottom: 4,
  },
  walletValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#192DFF",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: "#666",
    flex: 1,
    lineHeight: 16,
  },
  transactionsContainer: {
    marginBottom: 24,
  },
  txnHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#192DFF",
  },
  txnList: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    overflow: "hidden",
  },
  txnItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  txnLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  txnIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  txnInfo: {
    flex: 1,
  },
  txnLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#292929",
  },
  txnDate: {
    fontSize: 11,
    color: "#999999",
    marginTop: 2,
  },
  txnRight: {
    alignItems: "flex-end",
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  txnAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  emptyState: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#292929",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#656565",
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: "#192DFF",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
  payoutButton: {
    backgroundColor: "#192DFF",
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  payoutButtonDisabled: {
    opacity: 0.5,
  },
  payoutButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  bottomSpacer: {
    height: 40,
  },
});

export default HostEarningsScreen;
