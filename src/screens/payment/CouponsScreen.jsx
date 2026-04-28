import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import useCachedFetch from "../../hooks/useCachedFetch";
import referralService from "../../services/referralService";

/**
 * Back Arrow Icon - Same style as PaymentSettings and PersonalInfo
 */
const BackIcon = ({ size = 24, color = "black" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15.0003 20.67C14.8103 20.67 14.6203 20.6 14.4703 20.45L7.95027 13.93C6.89027 12.87 6.89027 11.13 7.95027 10.07L14.4703 3.55002C14.7603 3.26002 15.2403 3.26002 15.5303 3.55002C15.8203 3.84002 15.8203 4.32002 15.5303 4.61002L9.01027 11.13C8.53027 11.61 8.53027 12.39 9.01027 12.87L15.5303 19.39C15.8203 19.68 15.8203 20.16 15.5303 20.45C15.3803 20.59 15.1903 20.67 15.0003 20.67Z"
      fill={color}
    />
  </Svg>
);

const CouponsScreen = () => {
  const router = useRouter();

  // Fetcher function for useCachedFetch
  const fetchCoupons = useCallback(async () => {
    const result = await referralService.getMyCoupons();
    if (result.success) {
      return result.coupons || [];
    }
    throw new Error(result.message || "Failed to load coupons");
  }, []);

  const {
      data: coupons,
      loading,
      refreshing,
      refresh
  } = useCachedFetch("my_coupons", fetchCoupons, {
      ttl: 60 * 1000,
      initialData: [],
      persist: true
  });

  const handleCopy = async (code) => {
    try {
      await Clipboard.setStringAsync(code);
      if (Platform.OS === "web") {
        window.alert("Coupon code copied!");
      } else {
        Alert.alert("Copied", "Coupon code copied to clipboard");
      }
    } catch {
      // fallback
    }
  };

  const renderCoupon = ({ item }) => {
    const isUsed = item.isUsed;
    const isExpired = item.isExpired && !isUsed;
    const discountType = item.discount?.type || "PERCENTAGE";
    const remainingBalance = item.remainingBalance || 0;
    
    // For FIXED coupons, check if there's remaining balance
    const hasRemainingBalance = discountType === "FIXED" && remainingBalance > 0;
    const isInactive = isUsed && !hasRemainingBalance || isExpired;
    
    const discountText =
      discountType === "PERCENTAGE"
        ? `${item.discount.value}% Off`
        : `₦${(item.discount?.value || 0).toLocaleString()} Off`;

    // Determine status badge
    let statusBadge = null;
    if (isExpired) {
      statusBadge = (
        <View style={styles.expiredBadge}>
          <Text style={styles.expiredText}>Expired</Text>
        </View>
      );
    } else if (hasRemainingBalance) {
      statusBadge = (
        <View style={styles.remainingBadge}>
          <Text style={styles.remainingText}>₦{remainingBalance.toLocaleString()} left</Text>
        </View>
      );
    } else if (isUsed) {
      statusBadge = (
        <View style={styles.usedBadge}>
          <Text style={styles.usedText}>Used</Text>
        </View>
      );
    } else if (item.isRefundCoupon) {
      statusBadge = (
        <View style={styles.refundBadge}>
          <Text style={styles.refundText}>Refund Credit</Text>
        </View>
      );
    } else if (item.validity === null || item.validity === undefined || item.daysLeft === 0) {
      statusBadge = (
        <View style={styles.neverExpiresBadge}>
          <Text style={styles.neverExpiresText}>Never Expires</Text>
        </View>
      );
    } else {
      statusBadge = (
        <Text style={styles.daysLeft}>
          {item.daysLeft} day{item.daysLeft !== 1 ? "s" : ""} left
        </Text>
      );
    }

    return (
      <View style={[styles.couponCard, isInactive && styles.couponInactive]}>
        {/* Decorative circles */}
        <View style={[styles.circle, styles.circleLeft]} />
        <View style={[styles.circle, styles.circleRight]} />

        <View style={styles.couponContent}>
          <View style={styles.couponHeader}>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discountText}</Text>
            </View>
            {statusBadge}
          </View>

          {hasRemainingBalance && (
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceInfoText}>
                Original: ₦{(item.discount?.value || 0).toLocaleString()} • Remaining: ₦{remainingBalance.toLocaleString()}
              </Text>
            </View>
          )}

          <View style={styles.couponDivider} />

          <View style={styles.couponFooter}>
            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>Code</Text>
              <Text style={styles.codeText}>{item.code?.toUpperCase()}</Text>
            </View>
            <TouchableOpacity
              style={[styles.copyButton, isInactive && styles.copyButtonDisabled]}
              onPress={() => !isInactive && handleCopy(item.code)}
              disabled={isInactive}
            >
              <Ionicons
                name="copy-outline"
                size={16}
                color={isExpired ? "#999" : "#007BFF"}
              />
              <Text
                style={[
                  styles.copyButtonText,
                  isInactive && styles.copyButtonTextDisabled,
                ]}
              >
                Copy
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="ticket-outline" size={64} color="#CCC" />
      <Text style={styles.emptyTitle}>No Coupons Yet</Text>
      <Text style={styles.emptySubtitle}>
        Earn points from referrals and bookings.{"\n"}At 1,000 points, you get a
        ₦1,000 coupon automatically!
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header - Matches PaymentSettingsScreen */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <BackIcon size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>My Coupons</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
        </View>
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={(item) => item.id || item.code}
          renderItem={renderCoupon}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} />
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
  couponCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  couponInactive: {
    opacity: 0.5,
  },
  circle: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F8F9FA",
    top: "50%",
    marginTop: -12,
    zIndex: 1,
  },
  circleLeft: {
    left: -12,
  },
  circleRight: {
    right: -12,
  },
  couponContent: {
    padding: 20,
  },
  couponHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  discountBadge: {
    backgroundColor: "#E8F4FD",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#007BFF",
  },
  daysLeft: {
    fontSize: 13,
    color: "#666",
  },
  expiredBadge: {
    backgroundColor: "#FFE8E8",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  expiredText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E53935",
  },
  neverExpiresBadge: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  neverExpiresText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E65100",
  },
  usedBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  usedText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2E7D32",
  },
  refundBadge: {
    backgroundColor: "#E0F2F1",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  refundText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#00695C",
  },
  remainingBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  remainingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1976D2",
  },
  balanceInfo: {
    marginBottom: 12,
  },
  balanceInfoText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  couponDivider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginBottom: 16,
    borderStyle: "dashed",
    borderWidth: 0.5,
    borderColor: "#DDD",
  },
  couponFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  codeContainer: {
    flex: 1,
  },
  codeLabel: {
    fontSize: 11,
    color: "#999",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  codeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 2,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#F0F7FF",
    borderRadius: 8,
    gap: 4,
  },
  copyButtonDisabled: {
    backgroundColor: "#F5F5F5",
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007BFF",
  },
  copyButtonTextDisabled: {
    color: "#999",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 80,
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
});

export default CouponsScreen;
