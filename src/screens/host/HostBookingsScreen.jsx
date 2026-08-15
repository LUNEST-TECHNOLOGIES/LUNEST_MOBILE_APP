/**
 * Host Bookings Screen
 * View and manage bookings for host's properties
 * Includes filter tabs, empty state, and booking cards
 *
 * DATA ISOLATION: This screen fetches only bookings for the authenticated host's properties
 * using the /my-bookings endpoint which filters by host's listings on the backend.
 */

import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import ToastNotification, {
  TOAST_TYPE,
} from "../../components/common/ToastNotification";
import BookingCard from "../../components/host/BookingCard";
import BookingActionModal, {
  BOOKING_ACTION,
} from "../../components/modals/BookingActionModal";
import BookingTipsOverlay from "../../components/modals/BookingTipsOverlay";
import GuestProfileModal from "../../components/modals/GuestProfileModal";
import authService from "../../services/authService";
import bookingService from "../../services/bookingService";
import configService from "../../services/configService";
import { resolveImageUrlSync } from "../../utils/imageUtils";
import { HostBookingsSkeleton } from "../../components/skeletons";

// Filter tab options
const FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "reserved", label: "Reserved" },
  { id: "confirmed", label: "Confirmed" },
  { id: "ongoing", label: "Ongoing" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

// Booking status configs
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
  PENDING: {
    label: "RESERVED",
    color: "#FDAE31",
    bgColor: "rgba(253, 174, 49, 0.1)",
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

// Icons
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

const InfoIcon = ({ size = 18, color = "#FD3131" }) => (
  <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
    <Circle cx="9" cy="9" r="7" stroke={color} strokeWidth={1.5} />
    <Path d="M9 6V9" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Circle cx="9" cy="12" r="0.5" fill={color} />
  </Svg>
);

const EmptyBookingIcon = ({ size = 128, color = "#E0E0E0" }) => (
  <Svg width={size} height={size} viewBox="0 0 128 128" fill="none">
    <Rect
      x="24"
      y="20"
      width="80"
      height="88"
      rx="8"
      stroke={color}
      strokeWidth={4}
    />
    <Path d="M40 12V28" stroke={color} strokeWidth={4} strokeLinecap="round" />
    <Path d="M88 12V28" stroke={color} strokeWidth={4} strokeLinecap="round" />
    <Path d="M24 44H104" stroke={color} strokeWidth={4} />
    <Rect x="40" y="56" width="16" height="12" rx="2" fill={color} />
    <Rect x="72" y="56" width="16" height="12" rx="2" fill={color} />
    <Rect x="40" y="80" width="16" height="12" rx="2" fill={color} />
    <Rect x="72" y="80" width="16" height="12" rx="2" fill={color} />
  </Svg>
);

/**
 * Status Badge Component - Dark background with colored text
 */
const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;

  const getIcon = () => {
    switch (status) {
      case "CANCELED":
      case "CANCELLED":
        return <CloseIcon color={config.color} />;
      case "CONFIRMED":
        return <CheckIcon color={config.color} />;
      case "COMPLETED":
        return <DoubleCheckIcon color={config.color} />;
      case "PENDING":
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

// Demo property image
const DEMO_PROPERTY_IMAGE = require("../../assets/images/prop_image.png");

// BookingCard moved to its own component

/**
 * Filter Tab Component
 */
const FilterTab = ({ tab, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.filterTab, isActive && styles.filterTabActive]}
    onPress={onPress}
  >
    <Text
      style={[styles.filterTabText, isActive && styles.filterTabTextActive]}
    >
      {tab.label}
    </Text>
    {isActive && <View style={styles.activeIndicator} />}
  </TouchableOpacity>
);

/**
 * Empty State Component
 */
const EmptyState = ({ onViewListings }) => (
  <View style={styles.emptyContainer}>
    <EmptyBookingIcon size={128} />
    <Text style={styles.emptyTitle}>No Bookings Yet</Text>
    <Text style={styles.emptySubtext}>
      You'll see all your rental requests and tenant bookings here once guests
      start reaching out.
    </Text>
    <TouchableOpacity
      style={styles.viewListingsButton}
      onPress={onViewListings}
    >
      <Text style={styles.viewListingsText}>View My Listings</Text>
    </TouchableOpacity>
  </View>
);

/**
 * Host Bookings Screen
 */
const HostBookingsScreen = () => {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const containerWidth = Math.min(width - 40, 500);

  const [selectedFilter, setSelectedFilter] = useState("all");

  // Modal state for guest profile
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [guestModalData, setGuestModalData] = useState({});

  // Modal state for booking tips
  const [showTipsModal, setShowTipsModal] = useState(false);

  // Modal state for booking actions (confirm/cancel)
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(BOOKING_ACTION.CONFIRM);
  const [actionBooking, setActionBooking] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Toast notification state
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState(TOAST_TYPE.SUCCESS);
  const [toastMessage, setToastMessage] = useState("");

  // API state for host's bookings (only this host's property bookings)
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Show toast notification helper
   */
  const showToastMessage = (type, message) => {
    setToastType(type);
    setToastMessage(message);
    setShowToast(true);
  };

  /**
   * Fetch host's bookings from API
   * Uses /my-bookings endpoint which returns ONLY bookings for this host's properties
   */
  const fetchBookings = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError(null);

      console.log("📋 [HostBookings] Fetching host-specific bookings...");
      const baseURL = await configService.getBaseURL();
      const result = await bookingService.fetchHostBookings();

      if (result.success) {
        // Debug: Log each booking's bookedBy field to verify population
        console.log("📋 [HostBookings] Raw bookings data:", result.bookings);
        (result.bookings || []).forEach((booking, idx) => {
          console.log(`Booking #${idx + 1} bookedBy:`, booking.bookedBy);
        });
        // Transform API data to match component format
        const formattedBookings = (result.bookings || []).map((booking) => {
          // Resolve listing image safely (handle strings, objects, and relative paths)
          const rawImage =
            booking.propertyImage ||
            booking.imageUrl ||
            booking.listing?.images?.[0] ||
            booking.listing?.propertyImages?.[0] ||
            booking.listing?.coverImage ||
            null;

          let propertyImage = resolveImageUrlSync(rawImage, baseURL);

          return {
            id: booking._id,
            bookingId:
              booking.referenceCode ||
              booking.reference ||
              booking.bookingId ||
              `LNS-${booking._id?.slice(-8).toUpperCase()}`,
            guestName: booking.bookedBy?.firstName
              ? `${booking.bookedBy.firstName} ${booking.bookedBy.lastName || ""}`.trim()
              : booking.bookedBy?.fullName || "Guest",
            guestEmail: booking.bookedBy?.emailAddress || booking.bookedBy?.email || "",
            guestPhone:
              booking.bookedBy?.phoneNumber || booking.bookedBy?.phone || "",
            guestAvatar: resolveImageUrlSync(
              booking.bookedBy?.profilePicture || booking.bookedBy?.avatar || null,
              baseURL
            ),
            guestId: booking.bookedBy?._id,
            propertyName:
              booking.propertyName ||
              booking.listing?.title ||
              booking.listing?.propertyTitle ||
              "Property",
            propertyImage: propertyImage,
            dates: (() => {
              const latestCheckOut = (() => {
                if (booking.extensions && booking.extensions.length > 0) {
                  const dates = booking.extensions
                    .map((e) => e.newCheckOut || e.checkOut)
                    .filter(Boolean)
                    .map((d) => new Date(d))
                    .filter((d) => !isNaN(d.getTime()));
                  if (dates.length > 0) {
                    dates.sort((a, b) => b - a);
                    return dates[0].toISOString();
                  }
                }
                return booking.checkOut;
              })();
              return formatDateRange(booking.checkIn, latestCheckOut);
            })(),
            nights: (() => {
              const initialNights = calculateNights(booking.checkIn, booking.checkOut);
              const extensionNights = (booking.extensions || []).reduce((acc, ext) => {
                return acc + (Number(ext.extraNights || ext.nights) || 0);
              }, 0);
              return initialNights + extensionNights;
            })(),
            price: (() => {
              const breakdown = booking.pricingBreakdown;
              const listingPricePerNight = Number(booking.listing?.price || 0);
              const initialNights = calculateNights(booking.checkIn, booking.checkOut);

              // 1. Initial Accommodation / Rent Fee:
              const rentFee = (() => {
                if (listingPricePerNight > 0 && initialNights > 0) {
                  return listingPricePerNight * initialNights;
                }
                if (breakdown?.rentFee !== undefined && breakdown?.rentFee !== null && Number(breakdown.rentFee) > 0) {
                  return Number(breakdown.rentFee);
                }
                const rawPrice = Number(booking.totalAmount?.price || booking.totalPrice || booking.price || 0);
                const secDep = Number(breakdown?.securityDeposit || breakdown?.cautionFee || booking.listing?.securityDeposit || booking.listing?.cautionFee || 0);
                const sc = Number(breakdown?.serviceCharge || booking.listing?.serviceCharge || 0);
                const netBase = Math.max(0, rawPrice - secDep);
                const estimatedRent = Math.round((netBase / 1.05375) - sc);
                if (estimatedRent > 0) {
                  return estimatedRent;
                }
                return rawPrice > 0 ? Math.round(rawPrice / 1.05375) : 0;
              })();

              // 2. Service charge
              const serviceFee = Number(
                breakdown?.serviceCharge ||
                booking.listing?.serviceCharge ||
                0
              );

              // 3. Subtotal & host deductions (3% fee + 7.5% VAT on fee)
              const hostSubtotal = rentFee + serviceFee;
              const hostFee = Math.round(hostSubtotal * 0.03);
              const hostVat = Math.round(hostFee * 0.075);
              const totalHostDeduction = hostFee + hostVat;
              const baseHostEarnings = hostSubtotal - totalHostDeduction;

              // 4. Extension earnings
              const extensionEarnings = (booking.extensions || []).reduce((acc, ext) => {
                return acc + Number(ext.pricingBreakdown?.hostEarnings || ext.pricingBreakdown?.hostTotal || ext.hostEarnings || ext.rentFee || 0);
              }, 0);

              return baseHostEarnings + extensionEarnings;
            })(),
            status: booking.status?.toUpperCase() || "PENDING",
            // Preserve raw data for details screen
            rawCheckIn: booking.checkIn || "",
            rawCheckOut: booking.checkOut || "",
            guests: booking.guests || null,
            paymentMethod: booking.paymentMethod || "",
            createdAt: booking.createdAt || "",
            // Preserve the full bookedBy object for modal use
            bookedBy: booking.bookedBy || null,
            // Preserve original unmasked phone/email for modal display
            originalGuestPhone: booking.bookedBy?.phoneNumber || booking.bookedBy?.phone || "",
            originalGuestEmail: booking.bookedBy?.emailAddress || booking.bookedBy?.email || "",
          };
        });

        // Redact guest email
        const redactEmail = (email) => {
          if (!email || typeof email !== "string") return "N/A";
          const [name, domain] = email.split("@");
          const visibleName = name.slice(0, 2) + "*".repeat(3);
          const visibleDomain =
            domain.slice(0, 1) + "*".repeat(3) + domain.slice(-2);
          return `${visibleName}@${visibleDomain}`;
        };

        // Redact guest Phone Number
        const redactPhone = (phone) => {
          if (!phone || typeof phone !== "string") return "N/A";
          const visibleNumber =
            "+234" + "*".repeat(phone.length - 7) + phone.slice(-4);
          return `${visibleNumber}`;
        };

        console.log(
          `✅ [HostBookings] Loaded ${formattedBookings.length} bookings`,
        );
        console.log(
          "📋 [HostBookings] Formatted bookings sample:",
          formattedBookings[0],
        );

        // Only mask guestEmail/guestPhone for display in the list, not for modal
        setBookings(
          formattedBookings.map((booking) => ({
            ...booking,
            guestEmail: redactEmail(booking.guestEmail),
            guestPhone: redactPhone(booking.guestPhone),
          })),
        );
      } else {
        console.warn(
          "⚠️ [HostBookings] Failed to fetch bookings:",
          result.message,
        );
        setError(result.message || "Failed to load bookings");
      }
    } catch (err) {
      console.error("❌ [HostBookings] Error fetching bookings:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Format date range for display
   */
  const formatDateRange = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return "Dates TBD";
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const options = { month: "short", day: "numeric" };
    const start = startDate.toLocaleDateString("en-US", options);
    const end = endDate.toLocaleDateString("en-US", options);
    const year = endDate.getFullYear();
    return `${start}-${end.split(" ")[1]}, ${year}`;
  };

  /**
   * Calculate number of nights
   */
  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  };

  // Fetch bookings on mount and when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const checkAuthAndFetch = async () => {
        const token =
          await require("../../services/authService").default.getToken();
        if (!token) {
          setError("You are not authenticated. Please log in again.");
          setLoading(false);
          // Optionally, redirect to login screen:
          // router.replace("/login");
          return;
        }
        fetchBookings();
      };
      checkAuthAndFetch();
    }, []),
  );

  // Pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings(false);
  };

  // Filter bookings based on selected tab
  const filteredBookings = bookings.filter((booking) => {
    switch (selectedFilter) {
      case "all":
        return true;
      case "reserved":
        return booking.status === "PENDING" || booking.status === "RESERVED";
      case "confirmed":
        return booking.status === "CONFIRMED";
      case "ongoing":
        return booking.status === "ONGOING";
      case "completed":
        return booking.status === "COMPLETED";
      case "cancelled":
        return booking.status === "CANCELED" || booking.status === "CANCELLED";
      default:
        return true;
    }
  });

  const handleViewDetails = (booking) => {
    // Get unredacted guest info from the preserved bookedBy object
    const guest = booking.bookedBy || {};
    const realName = guest.firstName
      ? `${guest.firstName} ${guest.lastName || ""}`.trim()
      : booking.guestName || "Guest";
    const realEmail = guest.emailAddress || guest.email || "";
    const realPhone = guest.phoneNumber || guest.phone || "";
    const realAvatar = guest.profilePicture || guest.avatar || "";

    // Navigate to HostBookingDetailsScreen with correct expo-router API
    router.push({
      pathname: "/host-booking-details",
      params: {
        id: String(booking.id || ""),
        bookingRefCode: booking.bookingId || "",
        propertyName: booking.propertyName || "Property",
        propertyImage: booking.propertyImage || "",
        status: booking.status || "PENDING",
        dates: booking.dates || "",
        nights: String(booking.nights || 1),
        price: String(booking.price || 0),
        checkIn: booking.rawCheckIn || "",
        checkOut: booking.rawCheckOut || "",
        guestsAdults: String(booking.guests?.adults || 1),
        guestsChildren: String(booking.guests?.children || 0),
        guestsPets: String(booking.guests?.pets || 0),
        paymentMethod: booking.paymentMethod || "",
        createdAt: booking.createdAt || "",
        guestName: realName,
        guestPhone: realPhone,
        guestEmail: realEmail,
        guestAvatar: realAvatar,
      },
    });
  };

  /**
   * Open confirm booking modal
   */
  const handleMarkConfirmed = (booking) => {
    setActionBooking(booking);
    setActionType(BOOKING_ACTION.CONFIRM);
    setShowActionModal(true);
  };

  /**
   * Open cancel booking modal
   */
  const handleCancelBooking = (booking) => {
    setActionBooking(booking);
    setActionType(BOOKING_ACTION.CANCEL);
    setShowActionModal(true);
  };

  /**
   * Execute booking action after modal confirmation
   */
  const handleActionConfirmed = async (reasonData) => {
    if (!actionBooking) return;

    setIsActionLoading(true);
    const newStatus =
      actionType === BOOKING_ACTION.CONFIRM ? "CONFIRMED" : "CANCELED";

    try {
      const result = await bookingService.updateBookingStatus(
        actionBooking.id,
        newStatus,
        reasonData
      );

      setShowActionModal(false);
      setIsActionLoading(false);

      if (result.success) {
        // Show success toast
        if (actionType === BOOKING_ACTION.CONFIRM) {
          showToastMessage(
            TOAST_TYPE.SUCCESS,
            "Booking confirmed successfully!",
          );
        } else {
          showToastMessage(
            TOAST_TYPE.SUCCESS,
            "Booking cancelled successfully!",
          );
        }
        // Refresh bookings list
        fetchBookings(false);
      } else {
        showToastMessage(
          TOAST_TYPE.ERROR,
          result.message || "Failed to update booking",
        );
      }
    } catch (err) {
      setShowActionModal(false);
      setIsActionLoading(false);
      showToastMessage(
        TOAST_TYPE.ERROR,
        "Something went wrong. Please try again.",
      );
    }
  };

  /**
   * Close action modal
   */
  const handleActionModalClose = () => {
    if (!isActionLoading) {
      setShowActionModal(false);
      setActionBooking(null);
    }
  };

  const handleMessage = async (guestData) => {
    // Show guest profile modal when clicking message
    if (__DEV__) {
      console.log("[HostBookingsScreen] handleMessage - guestData:", guestData);
      console.log("[HostBookingsScreen] guestId:", guestData?.guestId);
    }
    
    setGuestModalData(guestData);
    setShowGuestModal(true);
    
    // Always fetch complete guest profile to ensure we have the latest rating
    if (guestData?.guestId) {
      try {
        if (__DEV__) {
          console.log("[HostBookingsScreen] Fetching profile for guestId:", guestData.guestId);
        }
        
        const profileResult = await authService.fetchUserById(guestData.guestId);
        
        if (__DEV__) {
          console.log("[HostBookingsScreen] Profile result:", profileResult);
          console.log("[HostBookingsScreen] Guest rating from DB:", profileResult?.user?.guestRating);
        }
        
        if (profileResult.success && profileResult.user) {
          // Update with latest guest profile data including rating
          const latestRating = profileResult.user.guestRating || 0;
          setGuestModalData((prev) => ({
            ...prev,
            rating: latestRating,
            isVerified: profileResult.user.isVerified ?? prev.isVerified,
          }));
          
          if (__DEV__) {
            console.log("[HostBookingsScreen] Updated guestModalData with rating:", latestRating);
          }
        }
      } catch (error) {
        console.log("Error fetching guest profile for modal:", error);
      }
    }
  };

  const handleMessageGuest = () => {
    // Message functionality is currently disabled
    // TODO: Enable when messaging feature is implemented
    console.log("Message guest functionality is currently disabled");
    setShowGuestModal(false);
  };

  const handleViewListings = () => {
    router.push("/(host-tabs)/listings");
  };

  // Show empty state when no bookings match filter
  const showEmptyState = filteredBookings.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <TouchableOpacity
          style={styles.tipsButton}
          onPress={() => setShowTipsModal(true)}
        >
          <InfoIcon size={18} color="#FD3131" />
          <Text style={styles.tipsText}>Tips</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScrollView}
        contentContainerStyle={styles.filterContainer}
      >
        {FILTER_TABS.map((tab) => (
          <FilterTab
            key={tab.id}
            tab={tab}
            isActive={selectedFilter === tab.id}
            onPress={() => setSelectedFilter(tab.id)}
          />
        ))}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <HostBookingsSkeleton />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchBookings()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
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
          {showEmptyState ? (
            <EmptyState onViewListings={handleViewListings} />
          ) : (
            <View
              style={[
                styles.bookingsList,
                { width: containerWidth, alignSelf: "center" },
              ]}
            >
              {filteredBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onViewDetails={() => handleViewDetails(booking)}
                  onMarkConfirmed={() => handleMarkConfirmed(booking)}
                  onCancel={() => handleCancelBooking(booking)}
                  onMessage={handleMessage}
                />
              ))}
            </View>
          )}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}

      {/* Guest Profile Modal */}
      <GuestProfileModal
        visible={showGuestModal}
        onClose={() => {
          setShowGuestModal(false);
          setGuestModalData({});
        }}
        onMessageGuest={handleMessageGuest}
        guest={guestModalData}
        guestId={guestModalData?.guestId}
      />

      {/* Booking Tips Modal */}
      <BookingTipsOverlay
        visible={showTipsModal}
        onClose={() => setShowTipsModal(false)}
      />

      {/* Booking Action Confirmation Modal */}
      <BookingActionModal
        visible={showActionModal}
        actionType={actionType}
        booking={actionBooking}
        isHost={true}
        onConfirm={handleActionConfirmed}
        onClose={handleActionModalClose}
        isLoading={isActionLoading}
      />

      {/* Toast Notification */}
      <ToastNotification
        visible={showToast}
        type={toastType}
        message={toastMessage}
        onHide={() => setShowToast(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    position: "relative",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "500",

    color: "#000000",
    textAlign: "center",
  },
  tipsButton: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  tipsText: {
    fontSize: 12,
    fontWeight: "500",

    color: "#FD3131",
  },
  filterScrollView: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  filterContainer: {
    paddingHorizontal: 20,
    gap: 28,
    alignItems: "center",
  },
  filterTab: {
    paddingVertical: 12,
    alignItems: "center",
  },
  filterTabActive: {
    borderBottomWidth: 0,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: "500",

    color: "#6D6D6D",
  },
  filterTabTextActive: {
    color: "#192DFF",
    fontWeight: "700",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    left: "50%",
    marginLeft: -4,
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: "#192DFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  bookingsList: {
    gap: 8,
  },
  // Booking Card Styles
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
  },
  viewDetailsButton: {
    borderWidth: 1,
    borderColor: "#000000",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  viewDetailsText: {
    fontSize: 11,
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
  // Empty State Styles
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",

    color: "#525252",
    lineHeight: 20,
    marginTop: 25,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 16,

    color: "#7C7C7C",
    lineHeight: 26,
    marginTop: 10,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  viewListingsButton: {
    backgroundColor: "#010135",
    borderRadius: 25,
    paddingVertical: 20,
    paddingHorizontal: 66,
    marginTop: 32,
  },
  viewListingsText: {
    fontSize: 16,
    fontWeight: "700",

    color: "#FFFFFF",
    lineHeight: 16,
  },
  bottomSpacer: {
    height: 120,
  },
  // Loading State Styles
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,

    color: "#6D6D6D",
    marginTop: 12,
  },
  // Error State Styles
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 14,

    color: "#FD3131",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",

    color: "#FFFFFF",
  },
});

export default HostBookingsScreen;
