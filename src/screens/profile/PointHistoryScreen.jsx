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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import useCachedFetch from "../../hooks/useCachedFetch";
import referralService from "../../services/referralService";

/**
 * Back Arrow Icon - Same style as PaymentSettings
 */
const BackIcon = ({ size = 24, color = "black" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15.0003 20.67C14.8103 20.67 14.6203 20.6 14.4703 20.45L7.95027 13.93C6.89027 12.87 6.89027 11.13 7.95027 10.07L14.4703 3.55002C14.7603 3.26002 15.2403 3.26002 15.5303 3.55002C15.8203 3.84002 15.8203 4.32002 15.5303 4.61002L9.01027 11.13C8.53027 11.61 8.53027 12.39 9.01027 12.87L15.5303 19.39C15.8203 19.68 15.8203 20.16 15.5303 20.45C15.3803 20.59 15.1903 20.67 15.0003 20.67Z"
      fill={color}
    />
  </Svg>
);

const PointHistoryScreen = () => {
  const router = useRouter();
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetcher for useCachedFetch - Gets Summary and First Page
  const fetchInitialData = useCallback(async () => {
    const [summaryResult, historyResult] = await Promise.all([
      referralService.getPointsSummary(),
      referralService.getPointsHistory(1),
    ]);

    if (!summaryResult.success && !historyResult.success) {
      throw new Error("Failed to load points data");
    }

    return {
      summary: summaryResult.success ? summaryResult.data : null,
      history: historyResult.success ? historyResult.data?.records || [] : [],
      pagination: historyResult.success ? historyResult.data?.pagination || {} : {},
    };
  }, []);

  const {
      data: cachedData,
      loading,
      refreshing,
      onRefresh: triggerRefresh
  } = useCachedFetch("points_data", fetchInitialData, {
      ttl: 60 * 1000,
      initialData: { summary: null, history: [], pagination: {} },
      persist: true
  });

  // Sync cached data to local state when it updates
  useEffect(() => {
    if (cachedData) {
      setSummary(cachedData.summary);
      // If we are on page 1, sync history. If on later pages, we don't overwrite with page 1 unless refreshing.
      if (page === 1) {
        setHistory(cachedData.history || []);
        const totalPages = cachedData.pagination?.pages || 1;
        setHasMore(1 < totalPages);
      }
    }
  }, [cachedData, page]); // Only sync when cachedData changes or we reset to page 1

  // Handle manual refresh (Pull to Refresh)
  const onRefresh = () => {
    setPage(1); // Reset page
    triggerRefresh(); // Trigger cached fetch refresh
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore || loading) return;
    
    setLoadingMore(true);
    const nextPage = page + 1;
    
    try {
      const result = await referralService.getPointsHistory(nextPage);
      if (result.success) {
        const newRecords = result.data?.records || [];
        const pagination = result.data?.pagination || {};
        
        if (newRecords.length > 0) {
          setHistory((prev) => [...prev, ...newRecords]);
          setPage(nextPage);
          setHasMore(nextPage < (pagination.pages || 1));
        } else {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error("Error loading more history:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case "REFERRAL":
        return { name: "people-outline", color: "#4CAF50" };
      case "HOST_REFERRAL":
        return { name: "home-outline", color: "#2196F3" };
      case "BOOKING_REWARD":
        return { name: "calendar-outline", color: "#FF9800" };
      case "REDEMPTION":
        return { name: "swap-horizontal-outline", color: "#E53935" };
      default:
        return { name: "star-outline", color: "#9C27B0" };
    }
  };

  const getLabel = (type) => {
    switch (type) {
      case "REFERRAL":
        return "Referral Reward";
      case "HOST_REFERRAL":
        return "Host Referral Bonus";
      case "BOOKING_REWARD":
        return "Booking Reward";
      case "REDEMPTION":
        return "Points Redeemed";
      default:
        return "Points";
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const renderSummary = () => {
    if (!summary) return null;

    const progressPercent = Math.min(
      100,
      ((1000 - (summary.nextCouponAt || 1000)) / 1000) * 100
    );

    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Points Balance</Text>
        <Text style={styles.summaryBalance}>
          {(summary.availableBalance || 0).toLocaleString()}
          <Text style={styles.summaryUnit}> pts</Text>
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemLabel}>Total Earned</Text>
            <Text style={styles.summaryItemValue}>
              {(summary.totalEarned || 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemLabel}>Redeemed</Text>
            <Text style={styles.summaryItemValue}>
              {(summary.totalRedeemed || 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemLabel}>Coupons</Text>
            <Text style={styles.summaryItemValue}>
              {summary.couponsEarned || 0}
            </Text>
          </View>
        </View>

        {/* Progress to next coupon */}
        <View style={styles.progressContainer}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>Next coupon</Text>
            <Text style={styles.progressValue}>
              {summary.nextCouponAt || 1000} pts away
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progressPercent}%` }]}
            />
          </View>
        </View>
      </View>
    );
  };

  const renderHistoryItem = ({ item }) => {
    const icon = getIconForType(item.type);
    const isNegative = (item.point || 0) < 0;

    return (
      <View style={styles.historyItem}>
        <View style={[styles.iconCircle, { backgroundColor: `${icon.color}15` }]}>
          <Ionicons name={icon.name} size={20} color={icon.color} />
        </View>
        <View style={styles.historyContent}>
          <Text style={styles.historyLabel}>{getLabel(item.type)}</Text>
          <Text style={styles.historyDesc} numberOfLines={1}>
            {item.description || formatDate(item.createdAt)}
          </Text>
        </View>
        <View style={styles.historyRight}>
          <Text
            style={[
              styles.historyPoints,
              isNegative ? styles.pointsNegative : styles.pointsPositive,
            ]}
          >
            {isNegative ? "" : "+"}
            {item.point}
          </Text>
          <Text style={styles.historyDate}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="trophy-outline" size={64} color="#CCC" />
      <Text style={styles.emptyTitle}>No Points Yet</Text>
      <Text style={styles.emptySubtitle}>
        Refer friends and complete bookings to earn points!
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#007BFF" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header - Matches PaymentSettingsScreen */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <BackIcon size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>Loyalty Points</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading && !refreshing && history.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, index) => item._id || `${index}`}
          renderItem={renderHistoryItem}
          ListHeaderComponent={renderSummary}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  // ─── Summary Card ──────────────────────────────────────────
  summaryCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 13,
    color: "#888",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  summaryBalance: {
    fontSize: 36,
    fontWeight: "700",
    color: "#007BFF",
    marginBottom: 16,
  },
  summaryUnit: {
    fontSize: 16,
    fontWeight: "500",
    color: "#999",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryItemLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  summaryItemValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 4,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: "#888",
  },
  progressValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007BFF",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#F0F0F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#007BFF",
    borderRadius: 3,
  },
  // ─── History Items ─────────────────────────────────────────
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  historyDesc: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  historyRight: {
    alignItems: "flex-end",
  },
  historyPoints: {
    fontSize: 16,
    fontWeight: "700",
  },
  pointsPositive: {
    color: "#4CAF50",
  },
  pointsNegative: {
    color: "#E53935",
  },
  historyDate: {
    fontSize: 11,
    color: "#BBB",
    marginTop: 2,
  },
  // ─── Empty + Footer ────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    alignItems: "center",
  },
});

export default PointHistoryScreen;
