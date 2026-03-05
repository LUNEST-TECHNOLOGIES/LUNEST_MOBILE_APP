/**
 * TransactionHistoryScreen - Display all wallet transactions
 * Transaction types: BOOKING, ADD_FUNDS, WITHDRAWAL, EARNING, REFUND, APP_CHARGE
 * Status types: CONFIRMED, PENDING, FAILED
 */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import authService from "../../services/authService";
import configService from "../../services/configService";

/**
 * Back Arrow Icon - Same style as other profile screens
 */
const BackIcon = ({ size = 24, color = "black" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15.0003 20.67C14.8103 20.67 14.6203 20.6 14.4703 20.45L7.95027 13.93C6.89027 12.87 6.89027 11.13 7.95027 10.07L14.4703 3.55002C14.7603 3.26002 15.2403 3.26002 15.5303 3.55002C15.8203 3.84002 15.8203 4.32002 15.5303 4.61002L9.01027 11.13C8.53027 11.61 8.53027 12.39 9.01027 12.87L15.5303 19.39C15.8203 19.68 15.8203 20.16 15.5303 20.45C15.3803 20.59 15.1903 20.67 15.0003 20.67Z"
      fill={color}
    />
  </Svg>
);

// Transaction type icons and colors
const TRANSACTION_CONFIG = {
  // New unified categories
  BOOKING: {
    icon: "calendar-outline",
    label: "Booking Payment",
    color: "#192DFF",
    flow: "outflow",
    description: "Payment for booking",
  },
  TOP_UP: {
    icon: "add-circle-outline",
    label: "Wallet Funding",
    color: "#0308AC",
    flow: "inflow",
    description: "Added to wallet",
  },
  REWARD: {
    icon: "gift-outline",
    label: "Cash Reward",
    color: "#2E7D32",
    flow: "inflow",
    description: "Promotional reward",
  },
  WITHDRAWAL: {
    icon: "arrow-up-circle-outline",
    label: "Withdrawal",
    color: "#B70808",
    flow: "outflow",
    description: "Withdrawn to bank",
  },
  REFUND: {
    icon: "refresh-circle-outline",
    label: "Refund",
    color: "#0308AC",
    flow: "inflow",
    description: "Booking refund",
  },
  HOST_EARNING: {
    icon: "home-outline",
    label: "Rent Income (Net)",
    color: "#2E7D32",
    flow: "inflow",
    description: "Earned from guest booking (net of fees)",
  },
  PLATFORM_FEE: {
    icon: "card-outline",
    label: "App fee (deduction)",
    color: "#B70808",
    flow: "outflow",
    description: "Platform service fee",
  },
  TRANSFER: {
    icon: "swap-horizontal-outline",
    label: "Transfer",
    color: "#192DFF",
    flow: "outflow",
    description: "Wallet transfer",
  },
  SECURITY_DEPOSIT: {
    icon: "lock-closed-outline",
    label: "Caution Fee",
    color: "#192DFF",
    flow: "outflow",
    description: "Held caution fee",
  },
  // Legacy types for backward compatibility
  BOOKING_PAYMENT: {
    icon: "calendar-outline",
    label: "Booking Payment",
    color: "#192DFF",
    flow: "outflow",
    description: "Payment for booking",
  },
  PAYMENT: {
    icon: "wallet-outline",
    label: "Payment",
    color: "#192DFF",
    flow: "outflow",
    description: "Payment transaction",
  },
  ADDED_FUNDS: {
    icon: "add-circle-outline",
    label: "Wallet Funding",
    color: "#0308AC",
    flow: "inflow",
    description: "Added to wallet",
  },
  EARNING: {
    icon: "trending-up-outline",
    label: "Earning",
    color: "#2E7D32",
    flow: "inflow",
    description: "Earned from booking",
  },
  APP_CHARGE: {
    icon: "card-outline",
    label: "App fee (deduction)",
    color: "#B70808",
    flow: "outflow",
    description: "Platform service fee",
  },
  CASH_REWARD: {
    icon: "gift-outline",
    label: "Cash Reward",
    color: "#2E7D32",
    flow: "inflow",
    description: "Promotional reward",
  },
  // Cancellation transaction types
  CANCELLATION_PENALTY: {
    icon: "alert-circle-outline",
    label: "Cancellation Penalty",
    color: "#B70808",
    flow: "outflow",
    description: "Cancellation penalty deduction",
  },
  CANCELLATION_REFUND: {
    icon: "refresh-circle-outline",
    label: "Cancellation Refund",
    color: "#0308AC",
    flow: "inflow",
    description: "Refund from booking cancellation",
  },
  // Booking breakdown types (host-side) — legacy, kept for backward compatibility
  RENT: {
    icon: "home-outline",
    label: "Rent Income",
    color: "#2E7D32",
    flow: "inflow",
    description: "Rent payment for booking",
  },
  SERVICE_CHARGE: {
    icon: "construct-outline",
    label: "Service Charge",
    color: "#2E7D32",
    flow: "inflow",
    description: "Service/cleaning fee for booking",
  },
};

// Status badge colors
const STATUS_CONFIG = {
  COMPLETED: {
    bg: "rgba(49, 235, 61, 0.3)",
    text: "#2E7D32",
    label: "Confirmed",
  },
  PENDING: {
    bg: "rgba(253, 174, 49, 0.3)",
    text: "#EF6C00",
    label: "Pending",
  },
  FAILED: {
    bg: "rgba(241, 99, 99, 0.3)",
    text: "#FD3131",
    label: "Failed",
  },
  ON_HOLD: {
    bg: "rgba(25, 45, 255, 0.2)",
    text: "#192DFF",
    label: "On Hold",
  },
};

// Filter options
const FILTER_OPTIONS = [
  { key: "ALL", label: "All" },
  { key: "INFLOW", label: "Inflow" },
  { key: "OUTFLOW", label: "Outflow" },
];

const TransactionHistoryScreen = () => {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [totalInflow, setTotalInflow] = useState(0);
  const [totalOutflow, setTotalOutflow] = useState(0);
  const [error, setError] = useState(null);

  // Group transactions by month
  const groupTransactionsByMonth = (txns) => {
    const grouped = {};
    // Filter valid transactions
    const validTxns = txns.filter(txn => txn && typeof txn === 'object' && txn.amount !== undefined);
    validTxns.forEach((txn) => {
      const date = new Date(txn.timestamp || txn.createdAt);
      const monthYear = date.toLocaleString("en-US", {
        month: "short",
        year: "numeric",
      });
      if (!grouped[monthYear]) {
        grouped[monthYear] = {
          month: monthYear,
          transactions: [],
          total: 0,
        };
      }
      grouped[monthYear].transactions.push(txn);
      // Calculate monthly total
      if (isInflowTransaction(txn.type, txn.originalType)) {
        grouped[monthYear].total += txn.amount;
      } else {
        grouped[monthYear].total -= txn.amount;
      }
    });
    return Object.values(grouped);
  };

  // Determine if transaction is inflow based on config or type field
  const isInflowTransaction = (type, txnType) => {
    // If we have the new schema with type = CREDIT/DEBIT
    if (txnType === "CREDIT") return true;
    if (txnType === "DEBIT") return false;

    // Fall back to category-based check
    const config = TRANSACTION_CONFIG[type];
    if (config) {
      return config.flow === "inflow";
    }
    // Fallback for unknown types - check common inflow categories
    return [
      "ADDED_FUNDS",
      "EARNING",
      "HOST_EARNING",
      "REFUND",
      "CANCELLATION_REFUND",
      "CASH_REWARD",
      "TOP_UP",
      "REWARD",
      "RENT",
      "SERVICE_CHARGE",
    ].includes(type);
  };

  // Fetch transactions from API
  const fetchTransactions = async () => {
    try {
      setError(null);
      const token = await authService.getToken();
      const baseURL = await configService.getBaseURL();

      if (!token) {
        setError("Please log in to view transactions");
        setLoading(false);
        return;
      }

      // Use unified transactions endpoint for all transaction types
      const response = await fetch(`${baseURL}/v1/my-transactions?limit=100`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("[TransactionHistory] API Response:", data);

        // Backend returns { success: true, body: { transactions, total, page, totalPages } }
        const txnList = data.body?.transactions || data.body || data.data || [];
        console.log("[TransactionHistory] Transaction list:", txnList);

        // Ensure txnList is an array
        if (!Array.isArray(txnList)) {
          console.error("[TransactionHistory] txnList is not an array:", txnList);
          setTransactions([]);
          setTotalInflow(0);
          setTotalOutflow(0);
          return;
        }

        // Filter out invalid transactions
        const validTxns = txnList.filter(txn => txn && typeof txn === 'object');
        console.log("[TransactionHistory] Valid transactions:", validTxns.length);

        // Map category to type for UI compatibility
        const mappedTxns = validTxns.map((txn) => ({
          ...txn,
          // Use category as the display type; preserve original CREDIT/DEBIT as originalType
          originalType: txn.type,
          type: txn.category || txn.type,
          timestamp: txn.createdAt || txn.timestamp,
          // Add method and status display
          method: txn.channel || "SYSTEM",
          status: txn.status || "COMPLETED",
          amount: parseFloat(txn.amount) || 0,
        }));

        console.log("[TransactionHistory] Mapped transactions:", mappedTxns);
        setTransactions(mappedTxns);

        // Calculate totals
        let inflow = 0;
        let outflow = 0;
        mappedTxns.forEach((txn) => {
          if (isInflowTransaction(txn.type, txn.originalType)) {
            inflow += txn.amount;
          } else {
            outflow += txn.amount;
          }
        });
        setTotalInflow(inflow);
        setTotalOutflow(outflow);
      } else {
        const errorData = await response.json();
        console.error("[TransactionHistory] API Error:", errorData);

        // Provide user-friendly error messages
        let errorMessage = "Failed to load transactions";
        if (response.status === 401) {
          errorMessage = "Please log in to view your transactions";
        } else if (response.status === 500) {
          errorMessage = "Server error. Please try again later";
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }

        setError(errorMessage);
      }
    } catch (err) {
      console.error("[TransactionHistory] Network Error:", err);

      // Check if it's a network error
      if (!navigator.onLine) {
        setError(
          "No internet connection. Please check your connection and try again.",
        );
      } else {
        setError(
          "Unable to load transactions. Please check your connection and try again.",
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions();
  }, []);

  // Filter transactions based on active filter
  const getFilteredTransactions = () => {
    if (activeFilter === "ALL") return transactions;
    if (activeFilter === "INFLOW") {
      return transactions.filter((txn) => isInflowTransaction(txn.type, txn.originalType));
    }
    return transactions.filter((txn) => !isInflowTransaction(txn.type, txn.originalType));
  };

  const formatAmount = (amount) => {
    return `₦${amount?.toLocaleString("en-NG") || "0"}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const weekday = date.toLocaleString("en-US", { weekday: "short" });
    const time = date.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${day} ${weekday}, ${time.toLowerCase()}`;
  };

  // Render single transaction item
  const renderTransactionItem = ({ item }) => {
    // Validate item
    if (!item || typeof item !== 'object' || item.amount === undefined) {
      console.error('[TransactionHistory] Invalid transaction item:', item);
      return null;
    }

    const config = TRANSACTION_CONFIG[item.type] || TRANSACTION_CONFIG.BOOKING;
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.COMPLETED;
    const isInflow = isInflowTransaction(item.type, item.originalType);

    // Format payment method for display
    const paymentMethod = item.method || "SYSTEM";
    const methodLabel = paymentMethod === "PAYSTACK" ? "Paystack" :
                       paymentMethod === "WALLET" ? "Wallet" : paymentMethod;

    const isStandardized = item.description && (
      item.description.includes("(deduction)") || 
      item.description.includes("VAT on") ||
      item.description.includes("Host VAT") ||
      item.description.includes("Caution Fee") ||
      item.description.includes("Rent fee") ||
      item.description.includes("Earnings from") ||
      item.description.includes("Booking Payment") ||
      item.description.includes("App fee") ||
      item.description.includes("VAT")
    );
    
    const displayLabel = isStandardized ? item.description : config.label;

    return (
      <Pressable
        style={styles.transactionItem}
        onPress={() => {
          router.push({
            pathname: "/transaction-detail",
            params: {
              transactionId: item._id || item.reference,
              transactionType: displayLabel,
              amount: formatAmount(item.amount),
              status: statusConfig.label,
              dateTime: formatDate(item.timestamp || item.createdAt),
              description: item.description,
              method: methodLabel,
            },
          });
        }}
      >
        <View style={styles.transactionLeft}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: config.color + "20" },
            ]}
          >
            <Ionicons name={config.icon} size={24} color={config.color} />
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionType}>{displayLabel}</Text>
            <View style={styles.transactionMeta}>
              <Text style={styles.transactionDate}>
                {formatDate(item.timestamp || item.createdAt)}
              </Text>
              <View style={styles.methodBadge}>
                <Text style={styles.transactionMethod}>
                  {methodLabel}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.transactionRight}>
          <View
            style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}
          >
            <Text style={[styles.statusText, { color: statusConfig.text }]}>
              {statusConfig.label}
            </Text>
          </View>
          <Text
            style={[
              styles.transactionAmount,
              { color: isInflow ? "#0308AC" : "#B70808" },
            ]}
          >
            {isInflow ? "+" : "-"} {formatAmount(item.amount)}
          </Text>
        </View>
      </Pressable>
    );
  };

  // Render month section header
  const renderMonthHeader = (month, total) => (
    <View style={styles.monthHeader}>
      <Text style={styles.monthText}>{month}</Text>
      <View style={styles.monthTotal}>
        <Text style={styles.totalLabel}>Total:</Text>
        <Text style={styles.totalValue}>{formatAmount(Math.abs(total))}</Text>
      </View>
    </View>
  );

  // Render filter tabs
  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      {FILTER_OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.key}
          style={[
            styles.filterTab,
            activeFilter === option.key && styles.filterTabActive,
          ]}
          onPress={() => setActiveFilter(option.key)}
        >
          <Text
            style={[
              styles.filterText,
              activeFilter === option.key && styles.filterTextActive,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render summary cards
  const renderSummaryCards = () => (
    <View style={styles.summaryContainer}>
      <View style={[styles.summaryCard, { backgroundColor: "#C7D6FE" }]}>
        <View style={styles.summaryIcon}>
          <Ionicons name="arrow-down-circle" size={32} color="#192DFF" />
        </View>
        <View style={styles.summaryInfo}>
          <Text style={styles.summaryLabel}>Cash Inflow</Text>
          <Text style={[styles.summaryAmount, { color: "#010135" }]}>
            {formatAmount(totalInflow)}
          </Text>
        </View>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: "#F5E6E6" }]}>
        <View style={styles.summaryIcon}>
          <Ionicons name="arrow-up-circle" size={32} color="#B70808" />
        </View>
        <View style={styles.summaryInfo}>
          <Text style={styles.summaryLabel}>Cash Outflow</Text>
          <Text style={[styles.summaryAmount, { color: "#B70808" }]}>
            {formatAmount(totalOutflow)}
          </Text>
        </View>
      </View>
    </View>
  );

  const filteredTransactions = getFilteredTransactions();
  const groupedTransactions = groupTransactionsByMonth(filteredTransactions);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <BackIcon size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Filter Tabs */}
      {renderFilterTabs()}

      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* Earnings & Expenses Label */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {activeFilter === "ALL"
            ? "Earnings & Expenses"
            : activeFilter === "INFLOW"
              ? "Earnings"
              : "Expenses"}
        </Text>
      </View>

      {/* Transaction List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#192DFF" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#B70808" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchTransactions}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredTransactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>
            {activeFilter === "ALL"
              ? "No transactions yet"
              : activeFilter === "INFLOW"
                ? "No inflow transactions"
                : "No outflow transactions"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeFilter === "ALL"
              ? "Your transaction history will appear here once you make a booking, add funds, or receive earnings"
              : activeFilter === "INFLOW"
                ? "Earnings, wallet funding, refunds, and rewards will appear here"
                : "Booking payments, withdrawals, and service charges will appear here"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedTransactions}
          keyExtractor={(item) => item.month}
          renderItem={({ item }) => (
            <View style={styles.monthSection}>
              {renderMonthHeader(item.month, item.total)}
              <View style={styles.transactionList}>
                {item.transactions.map((txn, index) => (
                  <View key={txn._id || index}>
                    {renderTransactionItem({ item: txn })}
                  </View>
                ))}
              </View>
            </View>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    alignItems: "center",
  },
  filterTabActive: {
    backgroundColor: "#E5EFFF",
    borderColor: "#192DFF",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#484848",
  },
  filterTextActive: {
    color: "#192DFF",
  },
  summaryContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    gap: 10,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryInfo: {
    flex: 1,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#000000",
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#666666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#192DFF",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 40,
  },
  monthSection: {
    marginBottom: 16,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  monthText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#010135",
  },
  monthTotal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#010135",
  },
  totalValue: {
    fontSize: 12,
    fontWeight: "500",
    color: "#292929",
  },
  transactionList: {
    backgroundColor: "#F6F6F6",
    paddingHorizontal: 20,
  },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E7E7E7",
  },
  transactionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  transactionInfo: {
    flex: 1,
    gap: 4,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000000",
  },
  transactionMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transactionDate: {
    fontSize: 12,
    color: "#5D5D5D",
  },
  methodBadge: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  transactionMethod: {
    fontSize: 10,
    color: "#666666",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  transactionRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: "500",
  },
});

export default TransactionHistoryScreen;
