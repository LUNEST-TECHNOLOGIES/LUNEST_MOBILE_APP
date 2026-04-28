import { useState } from "react";
import {
    Alert,
    ImageBackground,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import StatusBadge from "./StatusBadge";

// Import icons
import CalendarIcon from "../../assets/icons/bookings/calendar.svg";
import ChatIcon from "../../assets/icons/bookings/chat.svg";
import TrashIcon from "../../assets/icons/bookings/trash-delete.svg";
import authService from "../../services/authService";
import configService from "../../services/configService";
import { resolveImageUrlSync } from "../../utils/imageUtils";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://api.lunest.app/v1";
const BookingCard = ({
  booking,
  onViewDetails,
  onCancelBooking,
  onPayNow,
  onChat,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const [imageError, setImageError] = useState(false);

  // Responsive calculations
  const isSmallScreen = screenWidth < 360;

  // Dynamic image size based on screen width
  const imageSize = isSmallScreen ? 100 : 120;

  // Dynamic font sizes
  const fontSizes = {
    propertyName: isSmallScreen ? 10 : 11,
    location: isSmallScreen ? 8 : 9,
    bookingType: isSmallScreen ? 8 : 9,
    dateLabel: isSmallScreen ? 7 : 8,
    dateValue: isSmallScreen ? 7 : 8,
    buttonText: isSmallScreen ? 10 : 11,
  };

  const showStatusBadge =
    booking.status === "cancelled" ||
    booking.status === "completed" ||
    booking.status === "pending" ||
    booking.status === "reserved" ||
    booking.status === "pending_payment" ||
    booking.status === "confirmed" ||
    booking.status === "ongoing" ||
    booking.status === "disputed" ||
    booking.status === "expired";

  const isPending = booking.status === "pending";
  const isReserved = booking.status === "reserved";
  const isPendingPayment = booking.status === "pending_payment";
  const isConfirmed = booking.status === "confirmed";
  const isOngoing = booking.status === "ongoing";
  const isExpired = booking.status === "expired";
  const isCancelled =
    booking.status === "cancelled" || booking.status === "expired";

  // Dynamic button padding based on screen size
  const buttonPadding = {
    horizontal: isSmallScreen ? 10 : 14,
    vertical: isSmallScreen ? 5 : 6,
  };

  // Handle image source - support both local require() and remote URLs
  const getImageSource = () => {
    if (imageError || !booking.image) {
      return null; // Removed fallback
    }
    const baseUrl = configService.getBaseURLSync();
    const resolvedUrl = resolveImageUrlSync(booking.image, baseUrl);
    return resolvedUrl ? { uri: resolvedUrl } : null;
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <View style={styles.bookingCard}>
      {/* Property Image */}
      <View
        style={[styles.imageContainer, { width: imageSize, height: imageSize }]}
      >
        <ImageBackground
          source={getImageSource()}
          style={[
            styles.propertyImage,
            { width: imageSize, height: imageSize },
          ]}
          imageStyle={styles.propertyImageStyle}
          resizeMode="cover"
          onError={handleImageError}
        >
          {/* Status Badge Overlay */}
          {showStatusBadge && (
            <StatusBadge 
              status={
                booking.status === "completed" && (booking.cautionFeeStatus === "DISPUTED" || booking.securityDepositResolution?.status === "DISPUTED")
                  ? "caution_disputed" 
                  : booking.status
              } 
            />
          )}
        </ImageBackground>
      </View>

      {/* Card Content */}
      <View style={styles.cardContent}>
        {/* Property Name & Location */}
        <View style={styles.propertyInfo}>
          <View style={styles.propertyHeader}>
            <Text
              style={[
                styles.propertyName,
                { fontSize: fontSizes.propertyName },
              ]}
              numberOfLines={1}
            >
              {booking.propertyName}
            </Text>
            <Text
              style={[styles.locationText, { fontSize: fontSizes.location }]}
            >
              {booking.location}
            </Text>
          </View>
        </View>

        {/* Booking Type */}
        <View style={styles.bookingTypeRow}>
          <Text
            style={[
              styles.bookingTypeLabel,
              { fontSize: fontSizes.bookingType },
            ]}
          >
            Booking Type:
          </Text>
          <Text
            style={[
              styles.bookingTypeValue,
              { fontSize: fontSizes.bookingType },
            ]}
          >
            {booking.bookingType}
          </Text>
        </View>

        {/* Check-in / Check-out Dates */}
        <View style={styles.dateRow}>
          {/* Check In */}
          <View style={styles.dateItem}>
            <View style={styles.dateLabelRow}>
              <CalendarIcon
                width={isSmallScreen ? 10 : 12}
                height={isSmallScreen ? 10 : 12}
                color="#656565"
              />
              <Text
                style={[styles.dateLabel, { fontSize: fontSizes.dateLabel }]}
              >
                Check in
              </Text>
            </View>
            <Text style={[styles.dateValue, { fontSize: fontSizes.dateValue }]}>
              {booking.checkIn}
            </Text>
          </View>

          {/* Check Out */}
          <View style={styles.dateItem}>
            <View style={styles.dateLabelRow}>
              <CalendarIcon
                width={isSmallScreen ? 10 : 12}
                height={isSmallScreen ? 10 : 12}
                color="#656565"
              />
              <Text
                style={[styles.dateLabel, { fontSize: fontSizes.dateLabel }]}
              >
                Check out
              </Text>
            </View>
            <Text style={[styles.dateValue, { fontSize: fontSizes.dateValue }]}>
              {booking.checkOut}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {/* Pending Status: Cancel Booking Button */}
          {isPending && (
            <>
              <Pressable
                style={[
                  styles.cancelBookingButton,
                  {
                    paddingHorizontal: buttonPadding.horizontal,
                    paddingVertical: buttonPadding.vertical,
                  },
                ]}
                onPress={() => onCancelBooking?.(booking)}
              >
                <View style={styles.trashIconContainer}>
                  <TrashIcon
                    width={isSmallScreen ? 12 : 14}
                    height={isSmallScreen ? 12 : 14}
                    color="#FFFFFF"
                  />
                </View>
                <Text
                  style={[
                    styles.cancelBookingText,
                    { fontSize: fontSizes.buttonText },
                  ]}
                >
                  Cancel booking
                </Text>
              </Pressable>
              {/* View Details Button */}
              <Pressable
                style={[
                  styles.viewDetailsButton,
                  {
                    paddingHorizontal: buttonPadding.horizontal,
                    paddingVertical: buttonPadding.vertical,
                  },
                ]}
                onPress={() => onViewDetails?.(booking)}
              >
                <Text
                  style={[
                    styles.viewDetailsText,
                    { fontSize: fontSizes.buttonText },
                  ]}
                >
                  View details
                </Text>
              </Pressable>
            </>
          )}

          {/* Reserved / Pending Payment Status: Trash Icon + Pay Now Button + View Details */}
          {(isReserved || isPendingPayment) && (
            <>
              <View style={styles.reservedButtonsContainer}>
                {/* Trash Delete Button (Cancel) */}
                <Pressable
                  style={[
                    styles.trashDeleteButton,
                    {
                      paddingHorizontal: isSmallScreen ? 5 : 7,
                      paddingVertical: buttonPadding.vertical,
                    },
                  ]}
                  onPress={async () => {
                    // For PENDING_PAYMENT status, verify payment status first
                    if (booking.status === "pending_payment") {
                      try {
                        const token = await authService.getToken();
                        if (!token) {
                          Alert.alert("Error", "Please log in to cancel booking");
                          return;
                        }

                        // Check payment status via API
                        const response = await fetch(
                          `${API_BASE_URL}/v1/payment/status/${booking.paymentReference || booking._id}`,
                          {
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json'
                            }
                          }
                        );

                        const data = await response.json();
                        
                        // If payment was successful, user should get refunded
                        const hasSuccessfulPayment = data.success && 
                          (data.status === 'COMPLETED' || data.gatewayStatus === 'success');

                        if (hasSuccessfulPayment) {
                          Alert.alert(
                            "⚠️ Payment Already Made",
                            "You have already paid for this booking. Canceling will initiate a refund. Do you want to proceed?",
                            [
                              { text: "No", style: "cancel" },
                              {
                                text: "Yes, Cancel & Refund",
                                style: "destructive",
                                onPress: () => onCancelBooking?.(booking)
                              }
                            ]
                          );
                        } else {
                          // No payment made, safe to cancel without refund
                          Alert.alert(
                            "Cancel Booking",
                            "Are you sure you want to cancel this booking? No payment has been made yet.",
                            [
                              { text: "No", style: "cancel" },
                              {
                                text: "Yes, Cancel",
                                style: "destructive",
                                onPress: () => onCancelBooking?.(booking)
                              }
                            ]
                          );
                        }
                      } catch (error) {
                        console.error("[BookingCard] Error checking payment status:", error);
                        // Fallback: proceed with normal cancellation
                        onCancelBooking?.(booking);
                      }
                    } else {
                      // For other statuses, use normal cancellation
                      onCancelBooking?.(booking);
                    }
                  }}
                >
                  <View style={styles.trashIconContainer}>
                    <TrashIcon
                      width={isSmallScreen ? 12 : 14}
                      height={isSmallScreen ? 12 : 14}
                      color="#FFFFFF"
                    />
                  </View>
                </Pressable>

                {/* Pay Now Button */}
                <Pressable
                  style={[
                    styles.payNowButton,
                    {
                      paddingHorizontal: buttonPadding.horizontal,
                      paddingVertical: buttonPadding.vertical,
                    },
                  ]}
                  onPress={() => onPayNow?.(booking)}
                >
                  <Text
                    style={[
                      styles.payNowText,
                      { fontSize: fontSizes.buttonText },
                    ]}
                  >
                    Pay now
                  </Text>
                </Pressable>
              </View>
 
              {/* View Details Button */}
              <Pressable
                style={[
                  styles.viewDetailsButton,
                  {
                    paddingHorizontal: buttonPadding.horizontal,
                    paddingVertical: buttonPadding.vertical,
                  },
                ]}
                onPress={() => onViewDetails?.(booking)}
              >
                <Text
                  style={[
                    styles.viewDetailsText,
                    { fontSize: fontSizes.buttonText },
                  ]}
                >
                  View details
                </Text>
              </Pressable>
            </>
          )}

          {/* Confirmed & Ongoing Status: Chat Icon (Left) + View Details (Right) */}
          {(isConfirmed || isOngoing) && (
            <>
              {/* Chat Button */}
              <Pressable
                style={styles.chatButton}
                onPress={() => onChat?.(booking)}
              >
                <ChatIcon
                  width={isSmallScreen ? 13 : 14}
                  height={isSmallScreen ? 14 : 17}
                />
              </Pressable>

              <View style={styles.spacer} />

              {/* View Details Button */}
              <Pressable
                style={[
                  styles.viewDetailsButton,
                  {
                    paddingHorizontal: buttonPadding.horizontal,
                    paddingVertical: buttonPadding.vertical,
                  },
                ]}
                onPress={() => onViewDetails?.(booking)}
              >
                <Text
                  style={[
                    styles.viewDetailsText,
                    { fontSize: fontSizes.buttonText },
                  ]}
                >
                  View details
                </Text>
              </Pressable>
            </>
          )}

          {/* Completed, Cancelled & Expired Status: Only View Details */}
          {(booking.status === "completed" ||
            booking.status === "cancelled" ||
            booking.status === "disputed" ||
            booking.status === "expired") && (
            <Pressable
              style={[
                styles.viewDetailsButton,
                {
                  paddingHorizontal: buttonPadding.horizontal,
                  paddingVertical: buttonPadding.vertical,
                },
              ]}
              onPress={() => onViewDetails?.(booking)}
            >
              <Text
                style={[
                  styles.viewDetailsText,
                  { fontSize: fontSizes.buttonText },
                ]}
              >
                View details
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Booking Card Styles
  bookingCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginBottom: 16,
    paddingHorizontal: 3,
    paddingVertical: 4,
    gap: 9,
    shadowColor: "rgba(239, 239, 239, 0.81)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 15,
  },
  imageContainer: {
    flexShrink: 0,
  },
  propertyImage: {
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 8,
  },
  propertyImageStyle: {
    borderRadius: 5,
  },

  // Card Content
  cardContent: {
    flex: 1,
    paddingVertical: 8,
    gap: 6,
    minWidth: 0,
  },
  propertyInfo: {
    gap: 2,
  },
  propertyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  propertyName: {
    fontWeight: "500",
    color: "#000000",
    flex: 1,
  },
  locationText: {
    color: "#000000",
    textDecorationLine: "underline",
    flexShrink: 0,
  },
  bookingTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bookingTypeLabel: {
    fontWeight: "500",
    color: "#525252",
  },
  bookingTypeValue: {
    fontWeight: "700",
    color: "#000000",
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  dateItem: {
    gap: 4,
    alignItems: "flex-start",
    flex: 1,
  },
  dateLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  dateLabel: {
    fontWeight: "700",
    color: "#656565",
  },
  dateValue: {
    fontWeight: "500",
    color: "#000000",
  },

  // Action Buttons
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },

  // Pending - Cancel Booking Button
  cancelBookingButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F16363",
    borderRadius: 16,
    gap: 5,
  },
  cancelBookingText: {
    fontWeight: "500",
    color: "#FFFFFF",
  },

  // Reserved - Trash + Pay Now Buttons
  reservedButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  trashDeleteButton: {
    backgroundColor: "#F16363",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  trashIconContainer: {
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  payNowButton: {
    backgroundColor: "#6371F1",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  payNowText: {
    fontWeight: "500",
    color: "#FFFFFF",
  },

  // Confirmed - Chat Button
  chatButton: {
    width: 24,
    height: 24,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#010135",
  },

  // Spacer for confirmed card layout
  spacer: {
    flex: 1,
  },

  // View Details Button
  viewDetailsButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  viewDetailsText: {
    fontWeight: "500",
    color: "#292929",
  },
});

export default BookingCard;
