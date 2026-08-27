/**
 * Performance Chart Component
 * Powered by react-native-chart-kit for cross-platform fidelity (Web, iOS, Android)
 * Shows modern analytics with smooth bezier line curves, bar charts, and responsive tablet scaling.
 */

import { useState } from "react";
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

// Demo data for charts
const DEMO_BOOKINGS_DATA = [3, 5, 8, 12, 7, 10, 6];
const DEMO_EARNINGS_DATA = [
  150000, 250000, 400000, 600000, 350000, 500000, 300000,
];
const DEMO_YEARLY_BOOKINGS = [12, 18, 25, 32];
const DEMO_YEARLY_EARNINGS = [2.0, 2.8, 3.5, 4.0];

const PerformanceChart = ({
  bookingsData = DEMO_BOOKINGS_DATA,
  earningsData = DEMO_EARNINGS_DATA,
  yearlyBookings = DEMO_YEARLY_BOOKINGS,
  yearlyEarnings = DEMO_YEARLY_EARNINGS,
  years = ["2022", "2023", "2024", "2025"],
}) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [selectedFilter, setSelectedFilter] = useState("all");

  const carouselCardWidth = isTablet ? 360 : Math.min(width - 48, 340);
  const singleCardWidth = isTablet ? Math.min(width - 48, 720) : width - 40;
  const chartInnerWidth = (cardWidth) => cardWidth - 32;

  const totalBookings = bookingsData.reduce((a, b) => a + b, 0);
  const totalEarnings = earningsData.reduce((a, b) => a + b, 0);

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
      r: "5",
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
      r: "5",
      strokeWidth: "2",
      stroke: "#7C3AED",
      fill: "#FFFFFF",
    },
    propsForBackgroundLines: {
      strokeDasharray: "4, 4",
      stroke: "#F1F5F9",
    },
  };

  // Yearly Bar Chart Config
  const yearlyChartConfig = {
    backgroundColor: "#FFFFFF",
    backgroundGradientFrom: "#FFFFFF",
    backgroundGradientTo: "#FFFFFF",
    decimalPlaces: 1,
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

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={[styles.totalAmount, { color: "#192DFF" }]}>
            {totalBookings} stays
          </Text>
        </View>
      </View>

      <RNCLineChart
        data={{
          labels: days,
          datasets: [{ data: bookingsData }],
        }}
        width={chartInnerWidth(cardW)}
        height={160}
        chartConfig={bookingsChartConfig}
        bezier
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
          <Text style={styles.chartSubtitle}>Weekly Net Revenue</Text>
          <View style={styles.titleRow}>
            <Text style={styles.chartTitle}>Earnings Growth</Text>
            <View style={[styles.badge, { backgroundColor: "#F5F3FF" }]}>
              <TrendUpIcon size={10} color="#7C3AED" />
              <Text style={[styles.badgeText, { color: "#7C3AED" }]}>+18% Growth</Text>
            </View>
          </View>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={[styles.totalAmount, { color: "#7C3AED" }]}>
            ₦{(totalEarnings / 1000).toFixed(0)}K
          </Text>
        </View>
      </View>

      <RNCLineChart
        data={{
          labels: days,
          datasets: [{ data: earningsData.map((val) => val / 1000) }],
        }}
        width={chartInnerWidth(cardW)}
        height={160}
        formatYLabel={(val) => `₦${Math.round(val)}K`}
        chartConfig={earningsChartConfig}
        bezier
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
          <Text style={styles.chartSubtitle}>Annual Growth (Millions ₦)</Text>
          <Text style={styles.chartTitle}>Yearly Revenue</Text>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalLabel}>4-Yr Total</Text>
          <Text style={[styles.totalAmount, { color: "#010135" }]}>
            ₦{yearlyEarnings.reduce((a, b) => a + b, 0).toFixed(1)}M
          </Text>
        </View>
      </View>

      <RNCBarChart
        data={{
          labels: years,
          datasets: [{ data: yearlyEarnings }],
        }}
        width={chartInnerWidth(cardW)}
        height={160}
        formatYLabel={(val) => `₦${val}M`}
        chartConfig={yearlyChartConfig}
        style={styles.rncChart}
        withInnerLines
        showValuesOnTopOfBars
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
