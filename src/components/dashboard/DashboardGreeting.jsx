/**
 * Dashboard Greeting Component
 * Shows personalized greeting, plan badge with upgrade option
 */

import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

// Arrow Up Icon for upgrade
const ArrowUpIcon = ({ size = 10, color = "#FFFFFF" }) => (
  <Svg width={size} height={size} viewBox="0 0 10 10" fill="none">
    <Path
      d="M5 2L5 8M5 2L2 5M5 2L8 5"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const DashboardGreeting = ({
  userName = "User",
  planType = "Basic Plan",
  lastUpdated = null
}) => {
  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Safe string conversions
  const safeUserName = String(userName || "User");
  const safePlanType = String(planType || "Basic Plan");
  // Prefer first name for greeting (use first token of the full name)
  const displayName = safeUserName.split(" ")[0] || safeUserName;

  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        <Text style={styles.greeting}>
          {getGreeting()}, {displayName}!
        </Text>
        {lastUpdated && (
          <Text style={{ fontSize: 10, color: "#2E7D32", fontWeight: "600", marginTop: 2 }}>
            ● LIVE · {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>
      <View style={styles.planSection}>
        <View style={styles.planBadgeContainer}>
          <Text style={styles.planText}>{safePlanType}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 8,
  },
  greeting: {
    fontSize: 16,
    fontWeight: "700",

    color: "#010135",
    flex: 1,
  },
  planSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  planBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2E7D32",
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 6,
  },
  planText: {
    fontSize: 11,
    fontWeight: "500",

    color: "#FFFFFF",
  },
  upgradeIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#192DFF",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default DashboardGreeting;
