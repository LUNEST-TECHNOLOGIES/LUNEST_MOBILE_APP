import { Pressable, StyleSheet, Text, View } from "react-native";

const TABS = ["Upcoming", "Completed", "Canceled"];

const BookingsHeader = ({ activeTab, onTabPress }) => {
  return (
    <View style={styles.headerSection}>
      {/* Title - Centered */}
      <Text style={styles.headerTitle}>My Bookings</Text>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            style={styles.tabItem}
            onPress={() => onTabPress?.(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
            {activeTab === tab && <View style={styles.activeIndicator} />}
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerSection: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#000000",
    textAlign: "center",
    paddingVertical: 20,
  },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    gap: 20,
  },
  tabItem: {
    alignItems: "center",
    width: 89,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6D6D6D",
  },
  activeTabText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#192DFF",
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#192DFF",
    marginTop: 7,
  },
});

export default BookingsHeader;
