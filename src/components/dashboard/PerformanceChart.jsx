/**
 * Performance Chart Component
 * Powered by react-native-chart-kit for cross-platform fidelity (Web, iOS, Android)
 * Shows modern analytics with smooth bezier line curves, bar charts, and responsive tablet scaling.
 * Fully synchronized with live host dashboard data.
 */

import { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { BarChart as RNCBarChart, LineChart as RNCLineChart } from "react-native-chart-kit";
import Svg, { Path } from "react-native-svg";

// Filter tabs
const FILTER_TABS = [
  { id: "all", label: "All Insights" },
  { id: "bookings", label: "Bookings" },
  { id: "earnings", label: "Earnings" },
];

// Trend Up Icon
const TrendUpIcon = ({ size = 12, color = "#10B981" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 6L13.5 15.5L8.5 10.5L1 18M23 6H17M23 6V12"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Filter Tab Component
const FilterTab = ({ tab, isActive, onPress }) => (
  <Pressable
    style={[styles.filterTab, isActive && styles.filterTabActive]}
    onPress={onPress}
  >
    <Text
      style={[styles.filterTabText, isActive && styles.filterTabTextActive]}
    >
      {tab.label}
    </Text>
  </Pressable>
);

/**
 * Generate rolling 7-day labels ending on today
 */
const getRolling7Days = () => {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    result.push(dayNames[d.getDay()]);
  }
  return result;
};

/**
 * Generate last 4 year labels ending on current year
 */
const getLast4Years = () => {
  const currentYear = new Date().getFullYear();
  const result = [];
  for (let i = 3; i >= 0; i--) {
    result.push(String(currentYear - i));
  }
  return result;
};

/**
 * Format currency amounts with smart abbreviation
 */
const formatNaira = (amount) => {
  const num = Math.round(Number(amount) || 0);
  if (num === 0) return "₦0";
  if (num >= 1000000) return `₦${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `₦${Math.round(num / 1000)}K`;
  return `₦${num.toLocaleString()}`;
};

const PerformanceChart = ({
  bookingsData,
  earningsData,
  yearlyBookings,
  yearlyEarnings,
  years,
  days,
}) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [selectedFilter, setSelectedFilter] = useState("all");

  const carouselCardWidth = isTablet ? 360 : Math.min(width - 48, 340);
  const singleCardWidth = isTablet ? Math.min(width - 48, 720) : width - 40;
  const chartInnerWidth = (cardWidth) => cardWidth - 32;

  // Ensure normalized 7-day arrays for weekly charts
  const safeBookingsData = useMemo(() => {
    if (Array.isArray(bookingsData) && bookingsData.length > 0) {
      return bookingsData.map((v) => Number(v) || 0);
    }
    return [0, 0, 0, 0, 0, 0, 0];
  }, [bookingsData]);

  const safeEarningsData = useMemo(() => {
    if (Array.isArray(earningsData) && earningsData.length > 0) {
      return earningsData.map((v) => Number(v) || 0);
    }
    return [0, 0, 0, 0, 0, 0, 0];
  }, [earningsData]);

  // Ensure normalized 4-year arrays for yearly charts
  const safeYearlyBookings = useMemo(() => {
    if (Array.isArray(yearlyBookings) && yearlyBookings.length > 0) {
      return yearlyBookings.map((v) => Number(v) || 0);
    }
    return [0, 0, 0, 0];
  }, [yearlyBookings]);

  const safeYearlyEarnings = useMemo(() => {
    if (Array.isArray(yearlyEarnings) && yearlyEarnings.length > 0) {
      return yearlyEarnings.map((v) => Number(v) || 0);
    }
    return [0, 0, 0, 0];
  }, [yearlyEarnings]);

  const dayLabels = useMemo(() => {
    if (Array.isArray(days) && days.length === 7) return days;
    return getRolling7Days();
  }, [days]);

  const yearLabels = useMemo(() => {
    if (Array.isArray(years) && years.length === 4) return years;
    return getLast4Years();
  }, [years]);

  // Totals tallying directly with the plotted chart values
  const totalBookings = useMemo(() => {
    return safeBookingsData.reduce((a, b) => a + b, 0);
  }, [safeBookingsData]);

  const totalEarnings = useMemo(() => {
    return safeEarningsData.reduce((a, b) => a + b, 0);
  }, [safeEarningsData]);

  const total4YrEarnings = useMemo(() => {
    return safeYearlyEarnings.reduce((a, b) => a + b, 0);
  }, [safeYearlyEarnings]);

  // Earnings Chart Scaling & Formatting
  const maxWeeklyEarning = useMemo(() => {
    return Math.max(...safeEarningsData, 0);
  }, [safeEarningsData]);

  const isWeeklyMillions = maxWeeklyEarning >= 1000000;
  const isWeeklyThousands = maxWeeklyEarning >= 1000 && !isWeeklyMillions;

  const scaledEarningsData = useMemo(() => {
    if (isWeeklyMillions) {
      return safeEarningsData.map((v) => Number((v / 1000000).toFixed(2)));
    }
    if (isWeeklyThousands) {
      return safeEarningsData.map((v) => Number((v / 1000).toFixed(1)));
    }
    return safeEarningsData;
  }, [safeEarningsData, isWeeklyMillions, isWeeklyThousands]);

  const earningsYLabel = (val) => {
    const num = Number(val) || 0;
    if (isWeeklyMillions) return `₦${num.toFixed(1)}M`;
    if (isWeeklyThousands) return `₦${Math.round(num)}K`;
    return `₦${Math.round(num)}`;
  };

  // Yearly Bar Chart Scaling & Formatting
  const maxYearlyEarning = useMemo(() => {
    return Math.max(...safeYearlyEarnings, 0);
  }, [safeYearlyEarnings]);

  const isYearlyMillions = maxYearlyEarning >= 1000000;
  const isYearlyThousands = maxYearlyEarning >= 1000 && !isYearlyMillions;

  const scaledYearlyEarnings = useMemo(() => {
    if (isYearlyMillions) {
      return safeYearlyEarnings.map((v) => Number((v / 1000000).toFixed(2)));
    }
    if (isYearlyThousands) {
      return safeYearlyEarnings.map((v) => Number((v / 1000).toFixed(1)));
    }
    return safeYearlyEarnings;
  }, [safeYearlyEarnings, isYearlyMillions, isYearlyThousands]);

  const yearlyYLabel = (val) => {
    const num = Number(val) || 0;
    if (isYearlyMillions) return `₦${num.toFixed(1)}M`;
    if (isYearlyThousands) return `₦${Math.round(num)}K`;
    return `₦${Math.round(num)}`;
  };

  // Trend badge calculation (first half of 7-day vs second half)
  const earningsTrendBadge = useMemo(() => {
    const firstHalf = safeEarningsData.slice(0, 3).reduce((a, b) => a + b, 0);
    const secondHalf = safeEarningsData.slice(4).reduce((a, b) => a + b, 0);
    if (firstHalf === 0 && secondHalf === 0) return "Live";
    if (firstHalf === 0 && secondHalf > 0) return "+100% Growth";
    const pct = Math.round(((secondHalf - firstHalf) / (firstHalf || 1)) * 100);
    return `${pct >= 0 ? "+" : ""}${pct}% Growth`;
  }, [safeEarningsData]);

  // Common chart configuration for Bookings (Lunest Blue)
  const bookingsChartConfig = {
    backgroundColor: "#FFFFFF",
    backgroundGradientFrom: "#FFFFFF",
    backgroundGradientTo: "#FFFFFF",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(25, 45, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4.5",
      strokeWidth: "2",
      stroke: "#192DFF",
      fill: "#FFFFFF",
    },
    propsForBackgroundLines: {
      strokeDasharray: "4, 4",
      stroke: "#F1F5F9",
    },
  };

  // Common chart configuration for Earnings (Violet)
  const earningsChartConfig = {
    backgroundColor: "#FFFFFF",
    backgroundGradientFrom: "#FFFFFF",
    backgroundGradientTo: "#FFFFFF",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4.5",
      strokeWidth: "2",
      stroke: "#7C3AED",
      fill: "#FFFFFF",
    },
    propsForBackgroundLines: {
      strokeDasharray: "4, 4",
      stroke: "#F1F5F9",
    },
  };

  // Yearly Bar Chart Config (Navy)
  const yearlyChartConfig = {
    backgroundColor: "#FFFFFF",
    backgroundGradientFrom: "#FFFFFF",
    backgroundGradientTo: "#FFFFFF",
    decimalPlaces: isYearlyMillions ? 1 : 0,
    color: (opacity = 1) => `rgba(1, 1, 53, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    barPercentage: 0.6,
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeDasharray: "4, 4",
      stroke: "#F1F5F9",
    },
  };

  const renderSingleBookingsChart = (cardW) => (
    <View style={[styles.chartCard, { width: cardW }]}>
      <View style={styles.chartHeader}>
        <View style={styles.chartTitleContainer}>
          <Text style={styles.chartSubtitle}>Weekly Reservations</Text>
          <View style={styles.titleRow}>
            <Text style={styles.chartTitle}>Bookings Trend</Text>
            <View style={[styles.badge, { backgroundColor: "#EEF2FF" }]}>
              <TrendUpIcon size={10} color="#192DFF" />
              <Text style={[styles.badgeText, { color: "#192DFF" }]}>Active</Text>
            </View>
          </View>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalLabel}>7-Day Total</Text>
          <Text style={[styles.totalAmount, { color: "#192DFF" }]}>
            {totalBookings} {totalBookings === 1 ? "stay" : "stays"}
          </Text>
        </View>
      </View>

      <RNCLineChart
        data={{
          labels: dayLabels,
          datasets: [{ data: safeBookingsData }],
        }}
        width={chartInnerWidth(cardW)}
        height={160}
        chartConfig={bookingsChartConfig}
        bezier
        fromZero
        segments={4}
        style={styles.rncChart}
        withInnerLines
        withOuterLines={false}
        withVerticalLines={false}
      />
    </View>
  );

  const renderSingleEarningsChart = (cardW) => (
    <View style={[styles.chartCard, { width: cardW }]}>
      <View style={styles.chartHeader}>
        <View style={styles.chartTitleContainer}>
          <Text style={styles.chartSubtitle}>
            Weekly Net Revenue {isWeeklyMillions ? "(Millions ₦)" : isWeeklyThousands ? "(Thousands ₦)" : "(₦)"}
          </Text>
          <View style={styles.titleRow}>
            <Text style={styles.chartTitle}>Earnings Growth</Text>
            <View style={[styles.badge, { backgroundColor: "#F5F3FF" }]}>
              <TrendUpIcon size={10} color="#7C3AED" />
              <Text style={[styles.badgeText, { color: "#7C3AED" }]}>{earningsTrendBadge}</Text>
            </View>
          </View>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalLabel}>7-Day Total</Text>
          <Text style={[styles.totalAmount, { color: "#7C3AED" }]}>
            {formatNaira(totalEarnings)}
          </Text>
        </View>
      </View>

      <RNCLineChart
        data={{
          labels: dayLabels,
          datasets: [{ data: scaledEarningsData }],
        }}
        width={chartInnerWidth(cardW)}
        height={160}
        formatYLabel={earningsYLabel}
        chartConfig={earningsChartConfig}
        bezier
        fromZero
        segments={4}
        style={styles.rncChart}
        withInnerLines
        withOuterLines={false}
        withVerticalLines={false}
      />
    </View>
  );

  const renderYearlyBarChart = (cardW) => (
    <View style={[styles.chartCard, { width: cardW }]}>
      <View style={styles.chartHeader}>
        <View style={styles.chartTitleContainer}>
          <Text style={styles.chartSubtitle}>
            Annual Growth {isYearlyMillions ? "(Millions ₦)" : isYearlyThousands ? "(Thousands ₦)" : "(₦)"}
          </Text>
          <Text style={styles.chartTitle}>Yearly Revenue</Text>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalLabel}>4-Yr Total</Text>
          <Text style={[styles.totalAmount, { color: "#010135" }]}>
            {formatNaira(total4YrEarnings)}
          </Text>
        </View>
      </View>

      <RNCBarChart
        data={{
          labels: yearLabels,
          datasets: [{ data: scaledYearlyEarnings }],
        }}
        width={chartInnerWidth(cardW)}
        height={160}
        formatYLabel={yearlyYLabel}
        chartConfig={yearlyChartConfig}
        style={styles.rncChart}
        withInnerLines
        showValuesOnTopOfBars={maxYearlyEarning > 0}
        fromZero
      />
    </View>
  );

  const renderCharts = () => {
    switch (selectedFilter) {
      case "bookings":
        return renderSingleBookingsChart(singleCardWidth);
      case "earnings":
        return renderSingleEarningsChart(singleCardWidth);
      case "all":
      default:
        return (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.chartsScroll,
              isTablet && { paddingHorizontal: 24, gap: 16 },
            ]}
          >
            {renderSingleBookingsChart(carouselCardWidth)}
            {renderSingleEarningsChart(carouselCardWidth)}
            {renderYearlyBarChart(carouselCardWidth)}
          </ScrollView>
        );
    }
  };

  return (
    <View style={[styles.container, isTablet && styles.containerTablet]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionTitle}>Performance & Insights</Text>
          <Text style={styles.sectionSubtitle}>Real-time analytics and booking curves</Text>
        </View>
        <View style={styles.filterTabs}>
          {FILTER_TABS.map((tab) => (
            <FilterTab
              key={tab.id}
              tab={tab}
              isActive={selectedFilter === tab.id}
              onPress={() => setSelectedFilter(tab.id)}
            />
          ))}
        </View>
      </View>

      {selectedFilter === "all" ? (
        renderCharts()
      ) : (
        <View style={styles.singleChartContainer}>{renderCharts()}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  containerTablet: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    flexWrap: "wrap",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#010135",
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  filterTabs: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: "#010135",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  filterTabTextActive: {
    color: "#FFFFFF",
  },
  singleChartContainer: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  chartsScroll: {
    paddingHorizontal: 20,
    gap: 14,
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 14,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  chartTitleContainer: {
    gap: 2,
  },
  chartSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#010135",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 10,
    gap: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  totalBadge: {
    alignItems: "flex-end",
  },
  totalLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "500",
  },
  totalAmount: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 1,
  },
  rncChart: {
    marginVertical: 4,
    borderRadius: 16,
    paddingRight: 36,
  },
});

export default PerformanceChart;
