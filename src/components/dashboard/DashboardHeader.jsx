/**
 * Dashboard Header Component
 * Shows location and notification bell with badge (same as guest HomeHeader)
 */

import { Pressable, StyleSheet, Text, View } from "react-native";
import LocationIcon from "../../assets/icons/home/LocationIcon.svg";
import NotificationIcon from "../../assets/icons/home/NotificationIcon.svg";

const DashboardHeader = ({
  location = "Abuja, Nigeria.",
  notificationCount = 0,
  onLocationPress,
  onNotificationPress,
}) => {
  // Safe string conversion
  const safeLocation = String(location || "Abuja, Nigeria.");
  const safeNotificationCount = Number(notificationCount) || 0;

  return (
    <View style={styles.container}>
      {/* Location - Left Side */}
      <Pressable style={styles.locationContainer} onPress={onLocationPress}>
        <LocationIcon width={22} height={22} color="#192DFF" />
        <Text style={styles.locationText}>{safeLocation}</Text>
      </Pressable>

      {/* Notification - Right Side */}
      <Pressable
        style={styles.notificationButton}
        onPress={onNotificationPress}
      >
        <NotificationIcon width={24} height={24} color="#292929" />
        {safeNotificationCount > 0 && (
          <View style={styles.badgeWrapper}>
            <Text style={styles.badgeText}>
              {safeNotificationCount > 99
                ? "99"
                : String(safeNotificationCount)}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  notificationButton: {
    width: 24,
    height: 24,
    position: "relative",
  },
  badgeWrapper: {
    position: "absolute",
    top: 2,
    left: 12,
    borderRadius: 7,
    backgroundColor: "#0308ac",
    width: 12,
    height: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 6,
    fontWeight: "700",
    color: "#e5efff",
    textAlign: "center",
  },
});

export default DashboardHeader;
