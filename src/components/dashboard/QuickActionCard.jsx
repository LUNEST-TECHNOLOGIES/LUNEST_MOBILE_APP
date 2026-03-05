/**
 * Quick Action Card Component
 * Shows action items like Upcoming Bookings, New Messages
 */

import { Pressable, StyleSheet, Text, View } from "react-native";

const QuickActionCard = ({
  label = "Action",
  count = 0,
  countLabel = "New",
  variant = "blue", // 'blue' or 'orange'
  onPress,
}) => {
  const getColors = () => {
    switch (variant) {
      case "orange":
        return {
          background: "#FFF1EC",
          badge: "#EF6C00",
        };
      case "blue":
      default:
        return {
          background: "#ECF2FF",
          badge: "#6371F1",
        };
    }
  };

  const colors = getColors();
  const safeLabel = String(label || "Action");

  return (
    <Pressable
      style={[styles.container, { backgroundColor: colors.background }]}
      onPress={onPress}
    >
      <Text style={styles.label}>{safeLabel}</Text>
      {count > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.badge }]}>
          <Text style={styles.badgeText}>
            {count} {countLabel}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",

    color: "#000000",
    flex: 1,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",

    color: "#FFFFFF",
  },
});

export default QuickActionCard;
