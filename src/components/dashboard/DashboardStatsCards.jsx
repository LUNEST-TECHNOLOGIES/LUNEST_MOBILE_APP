/**
 * Dashboard Stats Cards Component
 * Shows Total Earnings, Listing Views, and Total Listings
 */

import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

// Earnings Icon (wallet)
const EarningsIcon = ({ size = 38 }) => (
  <View
    style={[
      styles.iconContainer,
      { width: size, height: size, backgroundColor: "#1E3A8A" },
    ]}
  >
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 18V19C21 20.1 20.1 21 19 21H5C3.89 21 3 20.1 3 19V5C3 3.9 3.89 3 5 3H19C20.1 3 21 3.9 21 5V6H12C10.89 6 10 6.9 10 8V16C10 17.1 10.89 18 12 18H21ZM12 16H22V8H12V16ZM16 13.5C15.17 13.5 14.5 12.83 14.5 12C14.5 11.17 15.17 10.5 16 10.5C16.83 10.5 17.5 11.17 17.5 12C17.5 12.83 16.83 13.5 16 13.5Z"
        fill="#FFFFFF"
      />
    </Svg>
  </View>
);

// Bookings Icon (calendar)
const BookingsIcon = ({ size = 39 }) => (
  <View
    style={[
      styles.iconContainer,
      { width: size, height: size, backgroundColor: "#6366F1" },
    ]}
  >
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 4H5C3.89 4 3 4.9 3 6V20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V10H19V20ZM19 8H5V6H19V8ZM9 14H7V12H9V14ZM13 14H11V12H13V14ZM17 14H15V12H17V14ZM9 18H7V16H9V18ZM13 18H11V16H13V18ZM17 18H15V16H17V18Z"
        fill="#FFFFFF"
      />
    </Svg>
  </View>
);

// Listings Icon (building)
const ListingsIcon = ({ size = 38 }) => (
  <View
    style={[
      styles.iconContainer,
      { width: size, height: size, backgroundColor: "#059669" },
    ]}
  >
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 7V3H2V21H22V7H12ZM6 19H4V17H6V19ZM6 15H4V13H6V15ZM6 11H4V9H6V11ZM6 7H4V5H6V7ZM10 19H8V17H10V19ZM10 15H8V13H10V15ZM10 11H8V9H10V11ZM10 7H8V5H10V7ZM20 19H12V17H14V15H12V13H14V11H12V9H20V19ZM18 11H16V13H18V11ZM18 15H16V17H18V15Z"
        fill="#FFFFFF"
      />
    </Svg>
  </View>
);

// Rating Icon (star)
const RatingIcon = ({ size = 38 }) => (
  <View
    style={[
      styles.iconContainer,
      { width: size, height: size, backgroundColor: "#FDB913" },
    ]}
  >
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z"
        fill="#FFFFFF"
      />
    </Svg>
  </View>
);


// Format currency with 2 decimal places
const formatCurrency = (amount) => {
  const num = typeof amount === "number" ? amount : parseFloat(amount || 0);
  const validNum = isNaN(num) ? 0 : num;
  const formatted = validNum.toFixed(2);
  return `₦${formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
};

// Format number with suffix
const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + "M";
  }
  if (num >= 1000) {
    return num.toLocaleString();
  }
  return num.toString();
};

const DashboardStatsCards = ({
  totalEarnings = 0,
  walletBalance = 0,
  pendingBalance = 0,
  pendingBalanceLabel = "Pending Earnings:",
  onHoldEarnings = 0,
  onHoldCaution = 0,
  onHoldPlatformFee = 0,
  onHoldVat = 0,
  totalBookings = 0,
  totalListings = 0,
  hostRating = 0,
  hostRatingCount = 0,
  bookingsPeriod = "30 days",
  earningsPeriod = "Last 30 Days",
}) => {
  const effectiveEarnings = Number(totalEarnings) || Number(walletBalance) || 0;
  const effectiveWallet = Number(walletBalance) || Number(totalEarnings) || 0;

  // Safe string conversion for all dynamic text
  const safeEarningsValue = String(formatCurrency(effectiveEarnings));
  const safeWalletValue = String(formatCurrency(effectiveWallet));
  const safePendingValue = String(formatCurrency(pendingBalance));
  const safeOnHoldEarnings = String(formatCurrency(onHoldEarnings));
  const safeOnHoldCaution = String(formatCurrency(onHoldCaution));
  const safeOnHoldFee = String(formatCurrency(onHoldPlatformFee));
  const safeOnHoldVat = String(formatCurrency(onHoldVat));
  const safeBookingsValue = String(formatNumber(totalBookings));
  const safeListingsValue = String(totalListings);
  const safeEarningsPeriod = String(earningsPeriod);
  const safeBookingsPeriod = String(bookingsPeriod);

  return (
    <View style={styles.container}>
      {/* Earnings Section - Full width dark card */}
      <View style={styles.earningsCard}>
        <View style={styles.cardContent}>
          <EarningsIcon />
          <View style={styles.cardInfo}>
            <Text style={styles.earningsLabel}>
              Total Earnings ({safeEarningsPeriod})
            </Text>
            <Text style={styles.earningsValue}>{safeEarningsValue}</Text>
            
            <View style={styles.walletBalanceRow}>
              <Text style={styles.walletBalanceLabel}>Available Balance:</Text>
              <Text style={styles.walletBalanceValue}>{safeWalletValue}</Text>
            </View>

            <View style={styles.pendingBalanceRow}>
              <Text style={styles.pendingBalanceLabel}>{pendingBalanceLabel}</Text>
              <Text style={styles.pendingBalanceValue}>{safePendingValue}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom row - Two smaller cards */}
      <View style={styles.bottomRow}>
        {/* Total Bookings */}
        <View style={styles.smallCard}>
          <View style={styles.cardContent}>
            <BookingsIcon />
            <View style={styles.cardInfo}>
              <Text style={styles.smallCardLabel}>Total Bookings</Text>
              <View style={styles.viewsRow}>
                <Text style={styles.smallCardValue}>{safeBookingsValue}</Text>
                <Text style={styles.periodText}>({safeBookingsPeriod})</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Total Listings */}
        <View style={styles.smallCard}>
          <View style={styles.cardContent}>
            <ListingsIcon />
            <View style={styles.cardInfo}>
              <Text style={styles.smallCardLabel}>Total Listings</Text>
              <Text style={styles.smallCardValue}>{safeListingsValue}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Performance row - Two smaller cards */}
      <View style={[styles.bottomRow, { marginTop: 16 }]}>
        {/* Host Rating */}
        <View style={[styles.smallCard, { backgroundColor: "#FFF7ED" }]}>
          <View style={styles.cardContent}>
            <RatingIcon />
            <View style={styles.cardInfo}>
              <Text style={styles.smallCardLabel}>Average Rating</Text>
              <View style={styles.viewsRow}>
                <Text style={styles.smallCardValue}>
                  {Number(hostRating).toFixed(1)}
                </Text>
                <Text style={styles.periodText}>/ 5.0</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Total Reviews */}
        <View style={[styles.smallCard, { backgroundColor: "#F0FDFA" }]}>
          <View style={styles.cardContent}>
            <ListingsIcon />
            <View style={styles.cardInfo}>
              <Text style={styles.smallCardLabel}>Total Reviews</Text>
              <Text style={styles.smallCardValue}>{hostRatingCount}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingHorizontal: 20,
  },
  earningsCard: {
    backgroundColor: "#010135", // Lunest Blue
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 22,
    shadowColor: "#010135",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  iconContainer: {
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    padding: 2,
  },
  cardInfo: {
    flex: 1,
    gap: 8,
  },
  earningsLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.6)",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  earningsValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 10,
  },
  walletBalanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.12)", // Enhanced Glassmorphism
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  walletBalanceLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.8)",
  },
  walletBalanceValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pendingBalanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingHorizontal: 6,
  },
  pendingBalanceLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.5)",
  },
  pendingBalanceValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FACC15", // Premium Gold
  },
  breakdownContainer: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    gap: 4,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  breakdownLabel: {
    fontSize: 10,
    fontWeight: "400",
    color: "#FFFFFF",
    opacity: 0.6,
  },
  breakdownValue: {
    fontSize: 10,
    fontWeight: "500",
    color: "#FFFFFF",
    opacity: 0.9,
  },
  bottomRow: {
    flexDirection: "row",
    gap: 36,
  },
  smallCard: {
    flex: 1,
    backgroundColor: "#C7D6FE",
    borderRadius: 20,
    height: 67,
    shadowColor: "rgba(152, 152, 152, 0.2)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  smallCardLabel: {
    fontSize: 12,
    fontWeight: "500",
    
    color: "#000000",
  },
  smallCardValue: {
    fontSize: 16,
    fontWeight: "700",
    
    color: "#010135",
  },
  viewsRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  periodText: {
    fontSize: 10,
    fontWeight: "500",
    
    color: "#010135",
    marginLeft: 4,
  },
});

export default DashboardStatsCards;
