/**
 * Recent Activity Item Component
 * Shows notification/activity items on the dashboard
 */

import { Image, Pressable, StyleSheet, Text, View } from "react-native";

// Default logo/icon placeholder
const DefaultActivityIcon = () => (
  <View style={styles.defaultIcon}>
    <Text style={styles.defaultIconText}>L</Text>
  </View>
);

const RecentActivityItem = ({ activity, onPress }) => {
  const { iconUri, title, subtitle, date, type = "notification" } = activity;

  // Safe string conversion for all text values
  const safeTitle = String(title || "Activity");
  const safeSubtitle = String(subtitle || "No details");
  const safeDate = String(date || "Just now");

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        {/* Icon/Logo */}
        {iconUri ? (
          <Image source={{ uri: iconUri }} style={styles.icon} />
        ) : (
          <DefaultActivityIcon />
        )}

        {/* Text Content */}
        <View style={styles.textContent}>
          <Text style={styles.title} numberOfLines={2}>
            {safeTitle}
          </Text>
          <View style={styles.bottomRow}>
            <Text style={styles.subtitle}>{safeSubtitle}</Text>
            <Text style={styles.date}>{safeDate}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

// Recent Activities Section with multiple items
const RecentActivitiesSection = ({ activities = [], onActivityPress }) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent Activities</Text>

      {activities.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No recent activity</Text>
          <Text style={styles.emptySubtext}>
            Your booking requests and messages will appear here
          </Text>
        </View>
      ) : (
        <View style={styles.activitiesList}>
          {activities.map((activity, index) => (
            <RecentActivityItem
              key={activity.id || index}
              activity={activity}
              onPress={() => onActivityPress?.(activity)}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 14,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    
    color: "#292929",
  },
  activitiesList: {
    gap: 0,
  },
  container: {
    height: 75,
    borderRadius: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#E7E7E7",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 10,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 35,
  },
  defaultIcon: {
    width: 40,
    height: 40,
    borderRadius: 35,
    backgroundColor: "#192DFF",
    justifyContent: "center",
    alignItems: "center",
  },
  defaultIconText: {
    fontSize: 18,
    fontWeight: "700",
    
    color: "#FFFFFF",
  },
  textContent: {
    flex: 1,
    justifyContent: "center",
    gap: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: "500",
    
    color: "#000000",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "700",
    
    color: "#000000",
  },
  date: {
    fontSize: 10,
    fontWeight: "700",
    
    color: "#888888",
  },
  emptyState: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    
    color: "#292929",
  },
  emptySubtext: {
    fontSize: 14,
    
    color: "#656565",
    marginTop: 8,
    textAlign: "center",
  },
});

export { RecentActivitiesSection, RecentActivityItem };
export default RecentActivitiesSection;
