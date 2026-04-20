/**
 * Bookings Screen
 * Shows the authenticated user's own bookings with support for notification navigation
 *
 * DATA ISOLATION: Uses /guest-bookings endpoint which filters by the authenticated user's ID
 * ENHANCED: Supports highlighting specific bookings from notifications
 */

import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useCachedFetch from "../../hooks/useCachedFetch";


import EmptyState from "../../components/common/EmptyState";
import ToastNotification, { TOAST_TYPE } from "../../components/common/ToastNotification";

// Import booking components
import {
    BookingCard,
    BookingsHeader,
    EmptyBookingState,
    BookingSkeleton,
} from "../../components/booking";

// Import Host Profile Modal
import HostProfileModal from "../../components/modals/HostProfileModal";

// Import booking service for API calls
import bookingService from "../../services/bookingService";
import configService from "../../services/configService";

const BookingsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState("Upcoming");


  // Modal state for host profile
  const [showHostModal, setShowHostModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // API state for user's own bookings
  const [error, setError] = useState(null);

  // Highlighting state for notifications
  const [highlightedBookingId, setHighlightedBookingId] = useState(
    params?.bookingId || null,
  );
  const [isHostMode, setIsHostMode] = useState(params?.hostMode === "true");

  // Toast Notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState(TOAST_TYPE.SUCCESS);

  const showToast = (message, type = TOAST_TYPE.SUCCESS) => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  /**
   * Get image from listing data - handles various formats
   * Returns full URL (with base URL if needed)
   */
  const getListingImage = async (listing, baseURL) => {
    if (!listing) return null;

    let imageUrl = null;

    // Try propertyImages first
    if (listing.propertyImages && listing.propertyImages.length > 0) {
      const firstImage = listing.propertyImages[0];
      if (typeof firstImage === "string") {
        imageUrl = firstImage;
      } else if (firstImage && firstImage.url) {
        imageUrl = firstImage.url;
      }
    }

    // Try images array
    if (!imageUrl && listing.images && listing.images.length > 0) {
      const firstImage = listing.images[0];
      if (typeof firstImage === "string") {
        imageUrl = firstImage;
      } else if (firstImage && firstImage.url) {
        imageUrl = firstImage.url;
      }
    }

    // Try coverImage
    if (!imageUrl && listing.coverImage) {
      if (typeof listing.coverImage === "string") {
        imageUrl = listing.coverImage;
      } else if (listing.coverImage.url) {
        imageUrl = listing.coverImage.url;
      }
    }

    // Return null if no image found
    if (!imageUrl) return null;

    // If URL is relative, prepend base URL
    if (imageUrl && !imageUrl.startsWith("http")) {
      return `${baseURL}${imageUrl}`;
    }

    return imageUrl;
  };

  /**
   * Fetch guest's own bookings from API
   * Uses /guest-bookings endpoint which returns ONLY this guest's bookings
   */
  /**
   * Raw fetcher for guest bookings — used by useCachedFetch.
   * Returns the formatted bookings array.
   */
  async function fetchBookingsRaw() {
    setError(null);
    console.log("📋 [GuestBookings] Fetching guest-specific bookings...");

    const baseURL = await configService.getBaseURL();
    const result = await bookingService.fetchGuestBookings();

    if (result.success) {
      console.log(
        `✅ Fetched ${result.bookings?.length || 0} bookings from backend`,
      );

      const formattedBookings = await Promise.all(
        (result.bookings || []).map(async (booking) => {
          const id =
            typeof booking._id === "string"
              ? booking._id
              : (booking._id && booking._id.$oid) || "";
          const listing = booking.listing || {};
          const imageUrl = await getListingImage(listing, baseURL);
          const getFullAddress = () => {
            if (listing.address) {
              const parts = [
                listing.address.street,
                listing.address.city,
                listing.address.state,
                listing.address.country,
              ].filter(Boolean);
              if (parts.length > 0) return parts.join(", ");
            }
            return (
              listing.city ||
              listing.location ||
              listing.fullAddress ||
              "Location"
            );
          };
          return {
            id,
            createdAt: booking.createdAt,
            propertyName:
              listing.propertyTitle ||
              listing.propertyName ||
              listing.title ||
              listing.name ||
              "Property",
            location: getFullAddress(),
            fullAddress:
              listing.address?.fullAddress ||
              listing.fullAddress ||
              getFullAddress(),
            checkIn: formatDate(booking.checkIn),
            checkOut: formatDate(booking.checkOut),
            status: (() => {
              let mappedStatus = mapStatus(booking.status);
              if (mappedStatus === "reserved") {
                const bookingCreated = new Date(
                  booking.createdAt || booking.checkIn,
                ).getTime();
                const oneHourAgo = Date.now() - 60 * 60 * 1000;
                if (bookingCreated < oneHourAgo) {
                  mappedStatus = "expired";
                }
              }
              return mappedStatus;
            })(),
            bookingType: mapBookingType(
              booking.type || listing.pricingPeriod,
            ),
            image: imageUrl,
            rawCheckIn: booking.checkIn,
            rawCreatedAt: booking.createdAt,
            listingId: listing._id || listing.id,
            price: listing.price || 0,
            bedrooms: listing.bedrooms || 0,
            bathrooms: listing.bathrooms || 0,
            guests: listing.guests || 1,
            amenities: listing.amenities || [],
            description: listing.description || "",
            hostId: listing.host?._id || listing.host,
            hostName: booking.host?.firstName
              ? `${booking.host.firstName} ${booking.host.lastName || ""}`.trim()
              : listing.host?.firstName
                ? `${listing.host.firstName} ${listing.host.lastName || ""}`.trim()
                : "Host",
            hostEmail: booking.host?.email || listing.host?.email || "",
            hostPhone: booking.host?.phone || listing.host?.phone || "",
            hostAvatar: booking.host?.avatar || listing.host?.avatar || null,
            nights: booking.nights,
            totalPrice: booking.totalPrice,
            serviceCharge: booking.serviceCharge,
            taxes: booking.taxes,
            paymentMethod: booking.paymentMethod,
            refCode: booking.refCode,
            additionalNotes: booking.additionalNotes,
          };
        }),
      );
      console.log(
        `✅ [GuestBookings] Loaded ${formattedBookings.length} bookings`,
      );
      return formattedBookings;
    } else {
      console.warn(
        "⚠️ [GuestBookings] Failed to fetch bookings:",
        result.message,
      );
      setError(result.message || "Failed to load bookings");
      return [];
    }
  }

  // ── Cached bookings (stale-while-revalidate) ──
  const {
    data: bookings,
    loading,
    refreshing,
    onRefresh: onCachedRefresh,
    mutate: mutateBookings,
  } = useCachedFetch(
    "bookings:guestBookings",
    fetchBookingsRaw,
    { revalidateOnFocus: true, staleTTL: 5_000 },
  );

  const safeBookings = bookings || [];

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    if (!dateString) return "TBD";
    const date = new Date(dateString);
    const options = { day: "numeric", month: "short", year: "numeric" };
    return date.toLocaleDateString("en-US", options).replace(",", ",");
  };

  /**
   * Map backend status to frontend format
   */
  const mapStatus = (status) => {
    const statusMap = {
      PENDING: "pending",
      RESERVED: "reserved",
      CONFIRMED: "confirmed",
      ONGOING: "ongoing",
      COMPLETED: "completed",
      CANCELED: "cancelled",
      CANCELLED: "cancelled",
      EXPIRED: "expired",
      PENDING_PAYMENT: "pending_payment",
    };
    return statusMap[status?.toUpperCase()] || "pending";
  };

  /**
   * Map booking type to display format
   */
  const mapBookingType = (type) => {
    if (!type) return "Daily";
    const typeStr = String(type).toUpperCase();
    const typeMap = {
      DAILY: "Daily",
      WEEKLY: "Weekly",
      MONTHLY: "Monthly",
      YEARLY: "Yearly",
      NIGHT: "Daily",
      NIGHTLY: "Daily",
      WEEK: "Weekly",
      MONTH: "Monthly",
      YEAR: "Yearly",
    };
    return typeMap[typeStr] || "Daily";
  };

  // Check for expired reservations on focus
  useFocusEffect(
    useCallback(() => {
      checkAndCancelExpiredReservations();
    }, []),
  );

  /**
   * Check for expired reservations and auto-cancel them
   * This handles cases where reservations expired while app was in background
   */
  const checkAndCancelExpiredReservations = async () => {
    try {
      const now = Date.now();
      const expiredBookings = safeBookings.filter((booking) => {
        if (booking.status !== "reserved" && booking.status !== "pending_payment") return false;

        const bookingCreated = new Date(
          booking.rawCreatedAt || booking.rawCheckIn || booking.checkIn,
        ).getTime();
        const oneHourAgo = now - 60 * 60 * 1000;

        return bookingCreated < oneHourAgo;
      });

      if (expiredBookings.length > 0) {
        console.log(
          `[BookingsScreen] Found ${expiredBookings.length} expired reservations to cancel`,
        );

        // Cancel each expired booking
        for (const booking of expiredBookings) {
          try {
            console.log(
              `[BookingsScreen] Auto-cancelling expired booking ${booking.id}`,
            );
            await bookingService.updateBookingStatus(
              booking.id,
              "CANCELLED",
            );
          } catch (error) {
            console.error(
              `[BookingsScreen] Failed to cancel expired booking ${booking.id}:`,
              error,
            );
          }
        }

        // Refresh bookings list after cancellations
        setTimeout(() => mutateBookings(), 1000);
      }
    } catch (error) {
      console.error(
        "[BookingsScreen] Error checking expired reservations:",
        error,
      );
    }
  };

  // Pull to refresh — delegates to the cached hook
  const onRefresh = () => {

    onCachedRefresh();
  };

  const handleTabPress = (tab) => {

    setActiveTab(tab);
  };

  /**
   * Filter bookings based on selected tab
   */
  const getBookingsForTab = () => {
    switch (activeTab) {
      case "Upcoming":
        return safeBookings.filter((b) =>
          ["pending", "reserved", "pending_payment", "confirmed", "ongoing"].includes(b.status),
        );
      case "Completed":
        return safeBookings.filter((b) => b.status === "completed");
      case "Canceled":
        return safeBookings.filter(
          (b) => b.status === "cancelled" || b.status === "expired",
        );
      default:
        return [];
    }
  };

  const handleViewDetails = (booking) => {
    try {
      const statusMap = {
        confirmed: "Confirmed",
        pending: "Pending",
        reserved: "Reserved",
        pending_payment: "Pending Payment",
        completed: "Completed",
        cancelled: "Cancelled",
        expired: "Expired",
      };

      const refCode =
        booking.refCode ||
        `LUN${booking.id?.slice(-8).toUpperCase() || Date.now().toString().slice(-6)}`;

      // Defensive: Only navigate if booking.id is a valid MongoDB ObjectId
      if (
        typeof booking.id === "string" &&
        booking.id.length === 24 &&
        /^[a-fA-F0-9]{24}$/.test(booking.id)
      ) {
        router.push({
          pathname: "/booking-details",
          params: {
            bookingId: booking.id, // Use formatted id for confirmation screen
            // ...existing params for backward compatibility
            id: booking.id,
            bookingRefCode: refCode,
            propertyName: booking.propertyName,
            propertyAddress: booking.fullAddress || booking.location || "",
            bookingType: booking.bookingType || "Daily",
            status: statusMap[booking.status] || booking.status,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            nights: booking.nights,
            guests: booking.guests,
            bookedOn: booking.createdAt,
            price: booking.totalPrice || 0,
            serviceCharge: booking.serviceCharge || 0,
            taxes: booking.taxes || 0,
            totalPaid: booking.totalPrice || 0,
            paymentMethod: booking.paymentMethod || "Wallet Balance",
            guestName: booking.hostName || "Host",
            guestPhone: booking.hostPhone || "",
            guestEmail: booking.hostEmail || "",
            guestProfilePictureUrl: booking.hostAvatar || "",
            guestKycStatus: "VERIFIED",
            additionalNotes: booking.additionalNotes || "",
          },
        });
      } else {
        showToast("Invalid booking ID. Please contact support.", TOAST_TYPE.ERROR);
      }
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  const handleCancelBooking = async (booking) => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this booking? This action cannot be undone.",
      [
        { text: "No, Keep It", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await bookingService.updateBookingStatus(
                booking.id,
                "CANCELLED",
              );
              if (result.success) {
                showToast("Your booking has been cancelled successfully.");
                mutateBookings(); // Refresh bookings

              } else {
                showToast(result.message || "Failed to cancel booking", TOAST_TYPE.ERROR);
              }
            } catch (error) {
              console.error("Error cancelling booking:", error);
              showToast("Failed to cancel booking. Please try again.", TOAST_TYPE.ERROR);
            }
          },
        },
      ],
    );
  };

  const handlePayNow = (booking) => {
    console.log("Pay now:", booking.id);
    // Navigate to booking summary with payment modal to select payment method
    router.push({
      pathname: "/booking-summary",
      params: {
        bookingId: booking.id,
        amount: booking.totalPrice || 0,
        price: booking.totalPrice || 0,
        propertyName: booking.propertyName,
        listingId: booking.listingId,
        location: booking.location || "",
        coverImage: booking.image || "", // Use the 'image' field which contains the listing cover
        checkInDate: booking.checkIn,
        checkOutDate: booking.checkOut,
        bookingType: booking.bookingType,
        fromReservation: "true",
        showPaymentModal: "true",
      },
    });
  };

  const handleChat = (booking) => {
    // Show host profile modal when clicking chat on confirmed booking
    setSelectedBooking(booking);
    setShowHostModal(true);
  };

  const handleMessageHost = () => {
    // Navigate to messages/chat with host
    console.log("Opening chat with host for booking:", selectedBooking?.id);
    setShowHostModal(false);
    // TODO: Navigate to actual chat screen
    // router.push(`/messages/${selectedBooking?.hostId}`);
  };

  const filteredBookings = getBookingsForTab();

  // Wrap getBookingsForTab to use safeBookings

  // Show loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <BookingsHeader activeTab={activeTab} onTabPress={handleTabPress} />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <BookingSkeleton />
          <BookingSkeleton />
          <BookingSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header with Tabs */}
      <BookingsHeader activeTab={activeTab} onTabPress={handleTabPress} />

      {/* Bookings List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4F46E5"]}
          />
        }
      >
        {filteredBookings.length > 0 ? (
          filteredBookings.map((booking, index) => (
            <View 
              key={booking.id}
            >
              <BookingCard
                booking={booking}
                onViewDetails={handleViewDetails}
                onCancelBooking={handleCancelBooking}
                onPayNow={handlePayNow}
                onChat={handleChat}
              />
            </View>
          ))
        ) : (
          <EmptyBookingState 
            type={activeTab}
            onAction={() => router.push("/")}
          />
        )}
        {/* Bottom spacing for nav bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Host Profile Modal */}
      <HostProfileModal
        visible={showHostModal}
        onClose={() => setShowHostModal(false)}
        onMessageHost={handleMessageHost}
        hostId={selectedBooking?.hostId}
        isConfirmed={selectedBooking?.status === 'confirmed'}
        status={selectedBooking?.status}
        host={{
          name: selectedBooking?.hostName || "Host",
          email: selectedBooking?.hostEmail || "",
          phone: selectedBooking?.hostPhone || "",
          rating: selectedBooking?.hostRating || null,
          isVerified: true,
          avatar: selectedBooking?.hostAvatar || null,
        }}
      />

      {/* Toast Notification */}
      <ToastNotification
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  bottomSpacer: {
    height: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,

    color: "#666666",
    marginTop: 12,
  },
});

export default BookingsScreen;
