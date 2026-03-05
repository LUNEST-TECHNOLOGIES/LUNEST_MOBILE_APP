import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

// Calendar Icon for empty state
const CalendarIcon = ({ size = 60, color = "#9CA3AF" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 2V6"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8 2V6"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3 10H21"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="16" r="2" stroke={color} strokeWidth={1.5} />
  </Svg>
);

// Search Icon for explore button
const SearchIcon = ({ size = 20, color = "#FFFFFF" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth={2} />
    <Path
      d="M21 21L16.65 16.65"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const EmptyBookingState = ({ type, onAction }) => {
  const router = useRouter();

  const getContent = () => {
    switch (type?.toLowerCase()) {
      case "upcoming":
        return {
          icon: <CalendarIcon />,
          title: "No upcoming bookings",
          subtitle: "Start exploring properties and make your first booking!",
          buttonText: "Explore Now",
          onPress: () => router.push("/(tabs)"),
        };
      case "completed":
        return {
          icon: <CalendarIcon />,
          title: "No completed bookings",
          subtitle: "Your completed bookings will appear here.",
          buttonText: "Explore Now",
          onPress: () => router.push("/(tabs)"),
        };
      case "canceled":
      case "cancelled":
        return {
          icon: <CalendarIcon />,
          title: "No cancelled bookings",
          subtitle: "Great! You have no cancelled bookings.",
          buttonText: null,
          onPress: null,
        };
      default:
        return {
          icon: <CalendarIcon />,
          title: `No ${type} bookings`,
          subtitle: `You don't have any ${type} bookings yet.`,
          buttonText: "Explore Now",
          onPress: () => router.push("/(tabs)"),
        };
    }
  };

  const content = getContent();

  return (
    <View style={styles.emptyState}>
      <View style={styles.iconContainer}>{content.icon}</View>
      <Text style={styles.emptyTitle}>{content.title}</Text>
      <Text style={styles.emptySubtitle}>{content.subtitle}</Text>

      {content.buttonText && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction || content.onPress}
          activeOpacity={0.8}
        >
          <SearchIcon size={18} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>{content.buttonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 20,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#010135",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    gap: 10,
    minWidth: 200,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default EmptyBookingState;
