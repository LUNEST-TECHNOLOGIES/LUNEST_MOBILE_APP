import { BlurView } from "expo-blur";
import { StyleSheet, Text, View } from "react-native";

// Import icons
import ChecksDoubleIcon from "../../assets/icons/bookings/checks-double-v.svg";
import CloseIcon from "../../assets/icons/bookings/close-x.svg";
import ConfirmedIcon from "../../assets/icons/bookings/done-v.svg";
import PendingIcon from "../../assets/icons/bookings/pending-status.svg";
import ReservedIcon from "../../assets/icons/bookings/reserved.svg";

const StatusBadge = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case "cancelled":
        return {
          text: "CANCELED",
          color: "#FD3131",
          width: 90,
          icon: <CloseIcon width={8} height={8} color="#FD3131" />,
        };
      case "completed":
        return {
          text: "COMPLETED",
          color: "#4365FF",
          width: 95,
          icon: <ChecksDoubleIcon width={12} height={12} color="#4365FF" />,
        };
      case "pending":
        return {
          text: "PENDING",
          color: "#FDAE31",
          width: 80,
          icon: <PendingIcon width={14} height={14} color="#FDAE31" />,
        };
      case "reserved":
        return {
          text: "RESERVED",
          color: "#464AE5",
          width: 85,
          icon: <ReservedIcon width={14} height={14} color="#464AE5" />,
        };
      case "pending_payment":
        return {
          text: "PENDING PAYMENT",
          color: "#FDAE31",
          width: 140,
          icon: <PendingIcon width={14} height={14} color="#FDAE31" />,
        };
      case "confirmed":
        return {
          text: "CONFIRMED",
          color: "#31EB3D",
          width: 95,
          icon: <ConfirmedIcon width={14} height={14} color="#31EB3D" />,
        };
      case "ongoing":
        return {
          text: "ONGOING",
          color: "#192DFF",
          width: 90,
          icon: <PendingIcon width={14} height={14} color="#192DFF" />,
        };
      case "expired":
        return {
          text: "EXPIRED",
          color: "#9E9E9E",
          width: 85,
          icon: <CloseIcon width={8} height={8} color="#9E9E9E" />,
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <View style={[styles.statusBadgeContainer, { width: config.width }]}>
      <BlurView intensity={40} tint="dark" style={styles.blurView}>
        <View style={styles.statusBadgeContent}>
          <View style={styles.statusIconContainer}>{config.icon}</View>
          <Text style={[styles.statusText, { color: config.color }]}>
            {config.text}
          </Text>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  statusBadgeContainer: {
    borderRadius: 20,
    overflow: "hidden",
    height: 22,
  },
  blurView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  statusBadgeContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  statusIconContainer: {
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
});

export default StatusBadge;
