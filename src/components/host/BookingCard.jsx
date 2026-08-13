import { useRouter } from "expo-router";
import {
    ImageBackground,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import ChatIcon from "../../assets/icons/bookings/chat.svg";
import configService from "../../services/configService";
import { resolveImageUrlSync } from "../../utils/imageUtils";

const STATUS_CONFIG = {
  CANCELED: {
    label: "CANCELED",
    color: "#FD3131",
    bgColor: "rgba(253, 49, 49, 0.1)",
  },
  CANCELLED: {
    label: "CANCELLED",
    color: "#FD3131",
    bgColor: "rgba(253, 49, 49, 0.1)",
  },
  DISPUTED: {
    label: "DISPUTED",
    color: "#DC2626",
    bgColor: "rgba(220, 38, 38, 0.1)",
  },
  CONFIRMED: {
    label: "CONFIRMED",
    color: "#31EB3D",
    bgColor: "rgba(49, 235, 61, 0.1)",
  },
  COMPLETED: {
    label: "COMPLETED",
    color: "#6371F1",
    bgColor: "rgba(99, 113, 241, 0.1)",
  },
  EXPIRED: {
    label: "EXPIRED",
    color: "#6B7280",
    bgColor: "rgba(107, 114, 128, 0.1)",
  },
  PENDING: {
    label: "PENDING",
    color: "#FDAE31",
    bgColor: "rgba(253, 174, 49, 0.1)",
  },
  PENDING_PAYMENT: {
    label: "PENDING PAYMENT",
    color: "#FF9800",
    bgColor: "rgba(255, 152, 0, 0.1)",
  },
  RESERVED: {
    label: "RESERVED",
    color: "#FDAE31",
    bgColor: "rgba(253, 174, 49, 0.1)",
  },
  ONGOING: {
    label: "ONGOING",
    color: "#192DFF",
    bgColor: "rgba(25, 45, 255, 0.1)",
  },
};

const CloseIcon = ({ size = 14, color = "#FD3131" }) => (
  <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <Path
      d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CheckIcon = ({ size = 14, color = "#31EB3D" }) => (
  <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <Path
      d="M11.667 3.5L5.25 9.917L2.333 7"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const DoubleCheckIcon = ({ size = 14, color = "#6371F1" }) => (
  <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <Path
      d="M1 7L4 10L10 4M7 10L10 7"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ClockIcon = ({ size = 14, color = "#FDAE31" }) => (
  <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <Circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth={1.5} />
    <Path
      d="M7 4V7L9 8"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const AlertIcon = ({ size = 14, color = "#DC2626" }) => (
  <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <Circle cx="7" cy="7" r="5.5" stroke={color} strokeWidth={1.5} />
    <Path
      d="M7 5V8"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    <Circle cx="7" cy="10" r="0.5" fill={color} />
  </Svg>
);

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const getIcon = () => {
    switch (status) {
      case "CANCELED":
      case "CANCELLED":
        return <CloseIcon color={config.color} />;
      case "DISPUTED":
        return <AlertIcon color={config.color} />;
      case "CONFIRMED":
        return <CheckIcon color={config.color} />;
      case "COMPLETED":
        return <DoubleCheckIcon color={config.color} />;
      case "EXPIRED":
        return <CloseIcon color={config.color} />;
      case "PENDING":
      case "PENDING_PAYMENT":
      case "RESERVED":
        return <ClockIcon color={config.color} />;
      default:
        return <ClockIcon color={config.color} />;
    }
  };
  return (
    <View style={styles.statusBadge}>
      <View style={styles.statusBadgeContent}>
        {getIcon()}
        <Text style={[styles.statusText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    </View>
  );
};

const DEMO_PROPERTY_IMAGE = require("../../assets/images/prop_image.png");

const BookingCard = ({
  booking,
  onViewDetails,
  onMarkConfirmed,
  onCancel,
  onMessage,
}) => {
  const router = useRouter();
  const isPending =
    booking.status === "PENDING" || booking.status === "RESERVED";
  const isConfirmed = booking.status === "CONFIRMED";
  const isOngoing = booking.status === "ONGOING";
  const isCompleted = booking.status === "COMPLETED";
  const checkInDate = new Date(booking.rawCheckIn || "");
  const isPastCheckIn = !isNaN(checkInDate.getTime()) && checkInDate < new Date();
  const isExpired = booking.status === "EXPIRED" || (isPending && isPastCheckIn);

  // Filter out actions for expired bookings
  const showPendingActions = isPending && !isExpired;

  // Extract guest rating and verification status
  const guestRating = booking?.bookedBy?.guestRating || 0;
  const isVerified = booking?.bookedBy?.isVerified ?? true;

  // Prepare guest data for modal
  const guestData = {
    name: booking.guestName || "Guest",
    email: booking.originalGuestEmail || booking.guestEmail || "",
    phone: booking.originalGuestPhone || booking.guestPhone || "",
    avatar: booking.guestAvatar,
    rating: guestRating,
    isVerified: isVerified,
    status: booking.status,
    guestId: booking.guestId, // Pass guestId directly to avoid email mismatch issues
  };

  // Use uploaded cover image or fallback to prop_image.png
  const getImageSource = () => {
    let raw = booking.propertyImage || booking.listing?.photos?.[0] || booking.listing?.images?.[0] || booking.listing?.propertyImages?.[0] || booking.listing?.image;
    if (typeof raw === "object" && raw) {
      raw = raw.url || raw.uri || raw.path || null;
    }
    if (typeof raw === "string" && raw.trim()) {
      const baseUrl = configService.getBaseURLSync();
      const resolvedUrl = resolveImageUrlSync(raw, baseUrl);
      if (resolvedUrl) return { uri: resolvedUrl };
    }
    return require("../../assets/images/prop_image.png");
  };

  return (
    <View style={styles.bookingCard}>
      {/* Property Image with Status Badge */}
      <ImageBackground
        source={getImageSource()}
        style={styles.propertyImage}
        imageStyle={styles.propertyImageStyle}
      >
        <StatusBadge status={booking.status} />
      </ImageBackground>

      {/* Booking Details */}
      <View style={styles.bookingDetails}>
        {/* Guest Info Row */}
        <View style={styles.guestInfoRow}>
          <View style={styles.guestNameContainer}>
            <Text style={styles.guestName}>{booking.guestName || "Guest"}</Text>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/guest-information",
                  params: {
                    guestId: booking.guestId || booking.bookedBy?._id,
                    guestName: booking.guestName || "Guest",
                    guestAvatar: booking.guestAvatar,
                    isVerified: isVerified ? "true" : "false",
                  },
                })
              }
            >
              <Text style={styles.guestProfileLink}>Guest Profile</Text>
            </Pressable>
          </View>
        </View>

        {/* Property Name */}
        <Text style={styles.propertyName} numberOfLines={1}>
          {booking.propertyName || "Property"}
        </Text>

        {/* Booking ID and Price */}
        <View style={styles.priceRow}>
          <View style={styles.bookingIdContainer}>
            <Text style={styles.bookingId}>{booking.bookingId || "N/A"}</Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              ₦{booking.price?.toLocaleString() || "0"}
            </Text>
            <Text style={styles.paidLabel}>Paid</Text>
          </View>
        </View>

        {/* Date Row */}
        <View style={styles.dateRow}>
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{booking.dates || "No dates"}</Text>
          </View>
          <View style={styles.nightsContainer}>
            <Text style={styles.nightsText}>{booking.nights || 0} Nights</Text>
          </View>
        </View>

        {/* Actions Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={onViewDetails}
          >
            <Text style={styles.viewDetailsText}>Details</Text>
          </TouchableOpacity>

          {/* Reserved/Pending - Mark as Confirmed + Cancel options */}
          {showPendingActions && (
            <View style={styles.pendingActions}>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={onMarkConfirmed}
              >
                <CheckIcon size={16} color="#31EB3D" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.declineButton} onPress={onCancel}>
                <CloseIcon size={16} color="#F16363" />
              </TouchableOpacity>
            </View>
          )}

          {/* Confirmed - Message + Cancel options */}
          {isConfirmed && (
             <TouchableOpacity style={styles.messageButton} onPress={() => onMessage(guestData)}>
               <ChatIcon width={14} height={17} />
             </TouchableOpacity>
          )}

          {/* Ongoing - Message option */}
          {isOngoing && (
            <TouchableOpacity style={styles.messageButton} onPress={() => onMessage(guestData)}>
              <ChatIcon width={14} height={17} />
            </TouchableOpacity>
          )}

          {/* Completed - Message option */}
          {isCompleted && (
            <TouchableOpacity style={styles.messageButton} onPress={() => onMessage(guestData)}>
              <ChatIcon width={14} height={17} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bookingCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 7,
    padding: 5,
    gap: 10,
    boxShadow: "0px 4px 15px rgba(239, 239, 239, 0.81)",
    elevation: 4,
  },
  propertyImage: {
    width: 120,
    height: 120,
    borderRadius: 5,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
  },
  propertyImageStyle: {
    borderRadius: 5,
  },
  statusBadge: {
    position: "absolute",
    top: 7,
    left: 5,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  statusBadgeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  bookingDetails: {
    flex: 1,
    paddingVertical: 5,
    gap: 5,
  },
  guestInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  guestNameContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
    gap: 20,
  },
  guestName: {
    fontSize: 10,
    fontWeight: "500",
    color: "#000000",
  },
  guestProfileLink: {
    fontSize: 8,
    fontWeight: "500",
    color: "#6371F1",
    textDecorationLine: "underline",
  },
  propertyName: {
    fontSize: 10,
    fontWeight: "500",
    color: "#464646",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  bookingIdContainer: {
    flexDirection: "row",
  },
  bookingId: {
    fontSize: 8,
    fontWeight: "500",
    color: "#000000",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  price: {
    fontSize: 10,
    fontWeight: "700",
    color: "#000000",
  },
  paidLabel: {
    fontSize: 8,
    color: "#292929",
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateContainer: {
    height: 9,
  },
  dateText: {
    fontSize: 8,
    color: "#000000",
  },
  nightsContainer: {
    height: 9,
  },
  nightsText: {
    fontSize: 8,
    fontWeight: "500",
    color: "#7C7C7C",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
    gap: 6,
    flexWrap: "wrap",
  },
  viewDetailsButton: {
    borderWidth: 1,
    borderColor: "#000000",
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewDetailsText: {
    fontSize: 9,
    fontWeight: "500",
    color: "#292929",
  },
  pendingActions: {
    flexDirection: "row",
    gap: 13,
  },
  acceptButton: {
    width: 27,
    height: 26,
    borderRadius: 16,
    backgroundColor: "rgba(49, 235, 61, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  declineButton: {
    width: 27,
    height: 26,
    borderRadius: 16,
    backgroundColor: "rgba(241, 99, 99, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  messageButton: {
    width: 24,
    height: 24,
    borderRadius: 16,
    backgroundColor: "#010135",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default BookingCard;
