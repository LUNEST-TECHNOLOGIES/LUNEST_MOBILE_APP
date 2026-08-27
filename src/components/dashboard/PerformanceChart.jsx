/**
 * Performance Chart Component
 * Shows modern analytics bar charts for Bookings, Earnings, and combined data
 * With responsive tablet scaling, interactive filter tabs, and refined analytics UI.
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

// Modern Single Bar Chart Component
const BarChart = ({
  data = [],
  title,
  subtitle,
  valueFormatter,
  color = "#192DFF",
  lightColor = "#EEF2FF",
  maxValue,
  badgeText,
  cardWidth,
}) => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const max = maxValue || Math.max(...data, 1);
  const activeIndex = data.indexOf(Math.max(...data));
  const totalValue = data.reduce((acc, val) => acc + val, 0);

  return (
    <View style={[styles.chartCard, cardWidth ? { width: cardWidth } : null]}>
      {/* Header */}
      <View style={styles.chartHeader}>
        <View style={styles.chartTitleContainer}>
          <Text style={styles.chartSubtitle}>{subtitle}</Text>
          <View style={styles.titleRow}>
            <Text style={styles.chartTitle}>{title}</Text>
            {badgeText && (
              <View style={[styles.badge, { backgroundColor: lightColor }]}>
                <TrendUpIcon size={10} color={color} />
                <Text style={[styles.badgeText, { color }]}>{badgeText}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={[styles.totalAmount, { color }]}>
            {valueFormatter ? valueFormatter(totalValue) : totalValue}
          </Text>
        </View>
      </View>

      {/* Chart Area */}
      <View style={styles.chartArea}>
        {/* Y-Axis Labels */}
        <View style={styles.yAxis}>
          {[3, 2, 1, 0].map((i) => (
            <Text key={i} style={styles.yAxisLabel}>
              {valueFormatter
                ? valueFormatter((max / 3) * i)
                : Math.round((max / 3) * i)}
            </Text>
          ))}
        </View>

        {/* Bars Container */}
        <View style={styles.barsContainer}>
          {/* Background Grid Lines */}
          <View style={styles.gridLines}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[styles.gridLine, i > 0 && styles.gridLineDashed]}
              />
            ))}
          </View>

          {/* Bar Columns */}
          <View style={styles.bars}>
            {data.map((value, index) => {
              const barHeight = Math.max(6, Math.min(125, (value / max) * 125));
              const isActive = index === activeIndex;
              return (
                <View key={index} style={styles.barColumn}>
                  {/* Track Background */}
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: barHeight,
                          backgroundColor: isActive ? color : `${color}55`,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* X-Axis Labels */}
      <View style={styles.xAxis}>
        {days.map((day, index) => {
          const isActive = index === activeIndex;
          return (
            <Text
              key={index}
              style={[styles.xAxisLabel, isActive && styles.xAxisLabelActive]}
            >
              {day}
            </Text>
          );
        })}
      </View>
    </View>
  );
};

// Combined Bar Chart for Yearly Trends
const CombinedBarChart = ({ bookingsData = [], earningsData = [], years = [], cardWidth }) => {
  const max = 4000000;
  return (
    <View style={[styles.chartCard, cardWidth ? { width: cardWidth } : null]}>
      {/* Header */}
      <View style={styles.chartHeader}>
        <View style={styles.chartTitleContainer}>
          <Text style={styles.chartSubtitle}>Annual Growth Overview</Text>
          <Text style={styles.chartTitle}>Yearly Comparison</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#7C3AED" }]} />
            <Text style={styles.legendText}>Earnings</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#192DFF" }]} />
            <Text style={styles.legendText}>Bookings</Text>
          </View>
        </View>
      </View>

      {/* Chart Area */}
      <View style={styles.chartArea}>
        {/* Y-Axis Labels */}
        <View style={styles.yAxis}>
          {["₦4M", "₦3M", "₦2M", "₦1M", "₦0"].map((label, i) => (
            <Text key={i} style={styles.yAxisLabel}>
              {label}
            </Text>
          ))}
        </View>

        {/* Grouped Bars */}
        <View style={styles.groupedBarsContainer}>
          {/* Background Grid Lines */}
          <View style={styles.gridLines}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[styles.gridLine, i > 0 && styles.gridLineDashed]}
              />
            ))}
          </View>

          <View style={styles.groupedBarsRow}>
            {years.map((year, index) => {
              const earnHeight = Math.max(6, Math.min(125, ((earningsData[index] || 0) / max) * 125));
              const bookHeight = Math.max(6, Math.min(125, ((bookingsData[index] || 0) / max) * 125));
              return (
                <View key={index} style={styles.groupedBarColumn}>
                  <View style={styles.groupedBars}>
                    <View
                      style={[
                        styles.groupedBar,
                        {
                          height: earnHeight,
                          backgroundColor: "#7C3AED",
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.groupedBar,
                        {
                          height: bookHeight,
                          backgroundColor: "#192DFF",
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* X-Axis Labels */}
      <View style={styles.yearAxis}>
        {years.map((year, index) => (
          <Text key={index} style={styles.yearAxisLabel}>
            {year}
          </Text>
        ))}
      </View>
    </View>
  );
};

// Demo data for charts
const DEMO_BOOKINGS_DATA = [3, 5, 8, 12, 7, 10, 6];
const DEMO_EARNINGS_DATA = [
  150000, 250000, 400000, 600000, 350000, 500000, 300000,
];
const DEMO_YEARLY_BOOKINGS = [1200000, 1800000, 2500000, 3200000];
const DEMO_YEARLY_EARNINGS = [2000000, 2800000, 3500000, 4000000];

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

  const formatBookings = (value) => {
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return Math.round(value).toString();
  };

  const formatEarnings = (value) => {
    if (value >= 1000000) return `₦${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `₦${(value / 1000).toFixed(0)}K`;
    return `₦${value.toLocaleString()}`;
  };

  const carouselCardWidth = isTablet ? 360 : Math.min(width - 48, 340);
  const singleCardWidth = isTablet ? Math.min(width - 48, 720) : width - 40;

  const renderCharts = () => {
    switch (selectedFilter) {
      case "bookings":
        return (
          <BarChart
            data={bookingsData}
            title="Bookings Trend"
            subtitle="Weekly Reservations"
            valueFormatter={formatBookings}
            color="#192DFF"
            lightColor="#EEF2FF"
            maxValue={15}
            badgeText="Peak: Thu"
            cardWidth={singleCardWidth}
          />
        );
      case "earnings":
        return (
          <BarChart
            data={earningsData}
            title="Revenue Trend"
            subtitle="Weekly Earnings"
            valueFormatter={formatEarnings}
            color="#7C3AED"
            lightColor="#F5F3FF"
            maxValue={700000}
            badgeText="+18% Growth"
            cardWidth={singleCardWidth}
          />
        );
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
            {/* Bookings Chart */}
            <BarChart
              data={bookingsData}
              title="Bookings"
              subtitle="Weekly Reservations"
              valueFormatter={formatBookings}
              color="#192DFF"
              lightColor="#EEF2FF"
              maxValue={15}
              badgeText="Active"
              cardWidth={carouselCardWidth}
            />

            {/* Earnings Chart */}
            <BarChart
              data={earningsData}
              title="Earnings"
              subtitle="Weekly Net Revenue"
              valueFormatter={formatEarnings}
              color="#7C3AED"
              lightColor="#F5F3FF"
              maxValue={700000}
              badgeText="+18%"
              cardWidth={carouselCardWidth}
            />

            {/* Combined Yearly Chart */}
            <CombinedBarChart
              bookingsData={yearlyBookings}
              earningsData={yearlyEarnings}
              years={years}
              cardWidth={carouselCardWidth}
            />
          </ScrollView>
        );
    }
  };

  return (
    <View style={[styles.container, isTablet && styles.containerTablet]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionTitle}>Performance & Insights</Text>
          <Text style={styles.sectionSubtitle}>Real-time analytics and booking trends</Text>
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
    padding: 20,
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
    marginBottom: 16,
  },
  chartTitleContainer: {
    gap: 4,
  },
  chartSubtitle: {
    fontSize: 12,
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
    fontSize: 18,
    fontWeight: "700",
    color: "#010135",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  totalBadge: {
    alignItems: "flex-end",
  },
  totalLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 1,
  },
  chartArea: {
    flexDirection: "row",
    height: 140,
    alignItems: "flex-end",
  },
  yAxis: {
    width: 45,
    height: 125,
    justifyContent: "space-between",
    paddingBottom: 2,
  },
  yAxisLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "500",
    textAlign: "left",
  },
  barsContainer: {
    flex: 1,
    height: 125,
    position: "relative",
    justifyContent: "flex-end",
  },
  gridLines: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
  },
  gridLine: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },
  gridLineDashed: {
    borderStyle: "dashed",
    borderWidth: 0.5,
    borderColor: "#E2E8F0",
    backgroundColor: "transparent",
  },
  bars: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 125,
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
  },
  barTrack: {
    width: 14,
    height: 125,
    backgroundColor: "#F8FAFC",
    borderRadius: 7,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 7,
  },
  xAxis: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingLeft: 45,
    marginTop: 10,
  },
  xAxisLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
    textAlign: "center",
  },
  xAxisLabelActive: {
    color: "#010135",
    fontWeight: "700",
  },
  legendRow: {
    flexDirection: "row",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  groupedBarsContainer: {
    flex: 1,
    height: 125,
    position: "relative",
    justifyContent: "flex-end",
  },
  groupedBarsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 125,
  },
  groupedBarColumn: {
    alignItems: "center",
    flex: 1,
  },
  groupedBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  groupedBar: {
    width: 12,
    borderRadius: 6,
    minHeight: 6,
  },
  yearAxis: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingLeft: 45,
    marginTop: 10,
  },
  yearAxisLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    textAlign: "center",
  },
});

export default PerformanceChart;
