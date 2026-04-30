/**
 * Performance Chart Component
 * Shows bar charts for Bookings, Earnings, and combined data
 * With filter tabs: All, Bookings, Earnings
 *
 * NOTE: For production, consider using a charting library like:
 * - react-native-chart-kit
 * - victory-native
 * - react-native-gifted-charts
 *
 * This is a simplified placeholder implementation.
 */

import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

// Filter tabs
const FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "bookings", label: "Bookings" },
  { id: "earnings", label: "Earnings" },
];

// Chevron Down Icon
const ChevronDownIcon = ({ size = 8, color = "#010135" }) => (
  <Svg width={size} height={size / 2} viewBox="0 0 8 4" fill="none">
    <Path
      d="M1 1L4 3L7 1"
      stroke={color}
      strokeWidth={1.5}
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

// Simple Bar Chart Component
const BarChart = ({
  data,
  title,
  subtitle,
  valueFormatter,
  color = "#EF6C00",
  maxValue,
}) => {
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const max = maxValue || Math.max(...data, 1);

  // Find the index of the max value for highlighting
  const activeIndex = data.indexOf(Math.max(...data));

  return (
    <View style={styles.chartContainer}>
      {/* Header */}
      <View style={styles.chartHeader}>
        <View style={styles.chartInfo}>
          <Text style={styles.chartSubtitle}>{subtitle}</Text>
          <Text style={styles.chartTitle}>{title}</Text>
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

        {/* Bars */}
        <View style={styles.barsContainer}>
          {/* Grid Lines */}
          <View style={styles.gridLines}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[styles.gridLine, i > 0 && styles.gridLineDashed]}
              />
            ))}
          </View>

          {/* Bars */}
          <View style={styles.bars}>
            {data.map((value, index) => {
              const height = (value / max) * 118;
              const isActive = index === activeIndex;
              return (
                <View key={index} style={styles.barColumn}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height,
                        backgroundColor: isActive ? color : `${color}40`,
                        borderRadius: 12, // Fully rounded bars
                      },
                    ]}
                  />
                  {isActive && <View style={styles.activeDot} />}
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* X-Axis Labels */}
      <View style={styles.xAxis}>
        {days.map((day, index) => (
          <Text key={index} style={styles.xAxisLabel}>
            {day}
          </Text>
        ))}
      </View>

      {/* Divider */}
      <View style={styles.divider} />
    </View>
  );
};

// Combined Bar Chart for Yearly Data
const CombinedBarChart = ({ bookingsData, earningsData, years }) => {
  return (
    <View style={styles.chartContainer}>
      {/* Header */}
      <View style={styles.chartHeader}>
        <View style={styles.chartInfo}>
          <Text style={styles.chartSubtitle}>Earnings & Bookings per Year</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#9747FF" }]}
              />
              <Text style={styles.legendText}>Earnings</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#EF6C00" }]}
              />
              <Text style={styles.legendText}>Bookings</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Chart Area */}
      <View style={styles.chartArea}>
        {/* Y-Axis Labels */}
        <View style={styles.yAxis}>
          {["4M", "3M", "2M", "1M", "0"].map((label, i) => (
            <Text key={i} style={styles.yAxisLabel}>
              {label}
            </Text>
          ))}
        </View>

        {/* Grouped Bars */}
        <View style={styles.groupedBarsContainer}>
          {years.map((year, index) => (
            <View key={index} style={styles.groupedBarColumn}>
              <View style={styles.groupedBars}>
                <View
                  style={[
                    styles.groupedBar,
                    {
                      height: (earningsData[index] / 4000000) * 167,
                      backgroundColor: "#9747FF",
                      borderRadius: 8,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.groupedBar,
                    {
                      height: (bookingsData[index] / 4000000) * 167,
                      backgroundColor: "#192DFF", // Lunest Blue for bookings
                      borderRadius: 8,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* X-Axis Labels */}
      <View style={styles.yearAxis}>
        {years.map((year, index) => (
          <Text key={index} style={styles.xAxisLabel}>
            {year}
          </Text>
        ))}
      </View>

      {/* Divider */}
      <View style={styles.divider} />
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
  const [selectedFilter, setSelectedFilter] = useState("all");

  const formatBookings = (value) => {
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return Math.round(value).toString();
  };

  const formatEarnings = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(2)}K`;
    return value.toFixed(2);
  };

  const renderCharts = () => {
    switch (selectedFilter) {
      case "bookings":
        return (
          <BarChart
            data={bookingsData}
            title="Bookings"
            subtitle="Weekly Booking Trends"
            valueFormatter={formatBookings}
            color="#192DFF" // Lunest Blue
            maxValue={15000}
          />
        );
      case "earnings":
        return (
          <BarChart
            data={earningsData}
            title="Earnings"
            subtitle="Weekly Revenue Growth"
            valueFormatter={formatEarnings}
            color="#9747FF" // Premium Purple
            maxValue={1500000}
          />
        );
      case "all":
      default:
        return (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartsScroll}
          >
            {/* Bookings Chart */}
            <BarChart
              data={bookingsData}
              title="Bookings"
              subtitle="Average Weekly Bookings"
              valueFormatter={formatBookings}
              color="#EF6C00"
              maxValue={15000}
            />

            {/* Earnings Chart */}
            <BarChart
              data={earningsData}
              title="Earnings"
              subtitle="Average Weekly Earnings"
              valueFormatter={formatEarnings}
              color="#9747FF"
              maxValue={1500000}
            />

            {/* Combined Yearly Chart */}
            <CombinedBarChart
              bookingsData={yearlyBookings}
              earningsData={yearlyEarnings}
              years={years}
            />
          </ScrollView>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Performance</Text>
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
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",

    color: "#292929",
  },
  filterTabs: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 2,
  },
  filterTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  filterTabActive: {
    backgroundColor: "#192DFF",
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: "500",

    color: "#656565",
  },
  filterTabTextActive: {
    color: "#FFFFFF",
  },
  singleChartContainer: {
    paddingHorizontal: 20,
  },
  chartsScroll: {
    paddingHorizontal: 20,
    gap: 14,
  },
  chartContainer: {
    width: 350,
    height: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 20,
    overflow: "hidden",
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  chartInfo: {
    gap: 5,
  },
  chartSubtitle: {
    fontSize: 14,

    color: "#9291A5",
    lineHeight: 16,
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: "700",

    color: "#010135",
    lineHeight: 22,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5EFFF",
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 8,
    gap: 13,
    height: 31,
  },
  dropdownText: {
    fontSize: 12,
    fontWeight: "500",

    color: "#010135",
  },
  chartArea: {
    flexDirection: "row",
    flex: 1,
  },
  yAxis: {
    width: 40,
    justifyContent: "space-between",
    paddingBottom: 5,
  },
  yAxisLabel: {
    fontSize: 11,

    color: "#615E83",
    textAlign: "right",
  },
  barsContainer: {
    flex: 1,
    position: "relative",
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
    backgroundColor: "#E5E5EF",
  },
  gridLineDashed: {
    borderStyle: "dashed",
    borderWidth: 0.5,
    borderColor: "#E5E5EF",
    backgroundColor: "transparent",
  },
  bars: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 118,
  },
  barColumn: {
    alignItems: "center",
    width: 20,
  },
  bar: {
    width: 14,
    borderRadius: 8,
    minHeight: 4,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.2)",
    marginTop: 4,
  },
  xAxis: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingLeft: 40,
    marginTop: 8,
  },
  xAxisLabel: {
    fontSize: 9,

    color: "#615E83",
    textAlign: "center",
    width: 30,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E5EF",
    marginTop: 10,
  },
  legendRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 5,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    fontWeight: "600",

    color: "#010135",
  },
  groupedBarsContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 167,
  },
  groupedBarColumn: {
    alignItems: "center",
  },
  groupedBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  groupedBar: {
    width: 19,
    borderRadius: 6,
    minHeight: 4,
  },
  yearAxis: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingLeft: 40,
    marginTop: 8,
  },
});

export default PerformanceChart;
