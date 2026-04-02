import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import ArrowLeftIcon from "../../assets/icons/bookings/arrow-left.svg";
import referralService from "../../services/referralService";

const CouponHistoryScreen = () => {
  const router = useRouter();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCouponHistory();
  }, []);

  const fetchCouponHistory = async () => {
    setLoading(true);
    try {
      const result = await referralService.getCouponHistory();
      if (result.success) {
        setCoupons(result.history || []);
      } else {
        Alert.alert("Error", result.message || "Failed to fetch coupon history");
        setCoupons([]);
      }
    } catch (error) {
      console.error("[CouponHistoryScreen] Error fetching history:", error);
      Alert.alert("Error", "An error occurred while fetching coupon history");
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCouponHistory();
    setRefreshing(false);
  };

  const handleGoBack = () => {
    router.back();
  };

  const renderCouponCard = (item) => {
    const appliedDate = item.appliedDate ? new Date(item.appliedDate) : null;
    const formattedDate = appliedDate
      ? appliedDate.toLocaleDateString("en-NG", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "N/A";

    return (
      <View style={styles.couponCard}>
        <View style={styles.couponHeader}>
          <Text style={styles.couponCode}>{item.code || "N/A"}</Text>
          <View
            style={[
              styles.statusBadge,
              item.status === "USED" && styles.statusUsed,
              item.status === "PENDING" && styles.statusPending,
              item.status === "REDEEMED" && styles.statusRedeemed,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                styles[`statusText${item.status || "PENDING"}`],
              ]}
            >
              {item.status || "PENDING"}
            </Text>
          </View>
        </View>

        <View style={styles.couponDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Discount:</Text>
            <Text style={styles.detailValue}>
              ₦{(item.discountAmount || 0).toLocaleString("en-NG")}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Booking:</Text>
            <Text style={[styles.detailValue, styles.bookingRef]}>
              {item.bookingId ? `#${item.bookingId.substring(0, 8)}...` : "N/A"}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date Applied:</Text>
            <Text style={styles.detailValue}>{formattedDate}</Text>
          </View>

          {item.expiryDate && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Expires:</Text>
              <Text
                style={[
                  styles.detailValue,
                  new Date(item.expiryDate) < new Date() && styles.expiredText,
                ]}
              >
                {new Date(item.expiryDate).toLocaleDateString("en-NG")}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No Coupons Yet</Text>
      <Text style={styles.emptyMessage}>
        Coupons you apply to bookings will appear here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleGoBack}>
          <ArrowLeftIcon width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Coupon History</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#192DFF" />
          <Text style={styles.loadingText}>Loading coupon history...</Text>
        </View>
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={(item, index) => item._id || `coupon-${index}`}
          renderItem={({ item }) => renderCouponCard(item)}
          ListEmptyComponent={renderEmptyState}
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.1}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#010135",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  couponCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  couponHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  couponCode: {
    fontSize: 16,
    fontWeight: "700",
    color: "#010135",
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  statusUsed: {
    backgroundColor: "#E8F5E9",
  },
  statusPending: {
    backgroundColor: "#FFF3E0",
  },
  statusRedeemed: {
    backgroundColor: "#E3F2FD",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  statusTextUSED: {
    color: "#2E7D32",
  },
  statusTextPENDING: {
    color: "#F57C00",
  },
  statusTextREDEEMED: {
    color: "#1976D2",
  },
  couponDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 13,
    color: "#010135",
    fontWeight: "600",
  },
  bookingRef: {
    fontFamily: "monospace",
    fontSize: 12,
  },
  expiredText: {
    color: "#EF4444",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#010135",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default CouponHistoryScreen;
