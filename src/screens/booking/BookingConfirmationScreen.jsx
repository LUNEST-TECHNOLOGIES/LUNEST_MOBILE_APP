import { Ionicons } from "@expo/vector-icons";
import { Asset } from "expo-asset"; // New Import
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    ImageBackground,
    Linking,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import ArrowLeftIcon from "../../assets/icons/bookings/arrow-left.svg";
import CalendarIcon from "../../assets/icons/bookings/calendar.svg";
import CancelIcon from "../../assets/icons/bookings/cancel.svg";
import ChecksDoubleIcon from "../../assets/icons/bookings/checks-double-v.svg";
import ConfettiIcon from "../../assets/icons/bookings/confetti.svg";
import DownloadIcon from "../../assets/icons/bookings/download.svg";
import PendingStatusIcon from "../../assets/icons/bookings/pending-status.svg";
import ReservedIcon from "../../assets/icons/bookings/reserved.svg";
import CountdownTimer from "../../components/booking/confirmation/CountdownTimer";
import DownloadOptionsModal from "../../components/common/DownloadOptionsModal"; // New Import
import ToastNotification, {
    TOAST_TYPE,
} from "../../components/common/ToastNotification";
import ReviewFeedbackModal from "../../components/modals/ReviewFeedbackModal";
import authService from "../../services/authService";
import bookingService from "../../services/bookingService";

// Banner image
const bannerImage = require("../../assets/images/Frame 1618873475.png");
const logoImage = require("../../assets/images/LUNEST PNG 1 1.png"); // New Import
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const BookingConfirmationScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const bookingId = params.bookingId || params.id;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false); // Changed state name
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false); // New state for capture
  
  // Review state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastConfig, setToastConfig] = useState({
    type: TOAST_TYPE.SUCCESS,
    message: "",
  });

  const showToastMessage = (message, type = TOAST_TYPE.SUCCESS) => {
    setToastConfig({ message, type });
    setToastVisible(true);
  };

  const viewRef = useRef();

  // Check if this is a reserved booking with countdown
  const isReserved =
    (params.status || "").toLowerCase() === "reserved" ||
    params.reserveAndPayLater === "true" ||
    (booking?.status || "").toLowerCase() === "reserved";
  const countdownTime = parseInt(params.countdownTime) || 3600;

  const [userData, setUserData] = useState(null);

  useEffect(() => {
    authService.getUserData().then(data => setUserData(data)).catch(() => {});

    if (!bookingId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    bookingService
      .fetchBookingById(bookingId)
      .then((result) => {
        if (result?.success && result?.booking) {
          setBooking(result.booking);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bookingId]);

  // Helper: get value from fetched booking or route params
  const val = (bookingKey, paramKey, fallback = "-") => {
    if (booking?.[bookingKey] !== undefined && booking?.[bookingKey] !== null) {
      return String(booking[bookingKey]);
    }
    if (params[paramKey || bookingKey]) {
      return String(params[paramKey || bookingKey]);
    }
    return fallback;
  };

  // Derive display values
  const status = val("status", "status", "Pending");
  const propertyName =
    booking?.listing?.propertyName ||
    booking?.listing?.title ||
    booking?.propertyName ||
    params.propertyName ||
    "-";
  const propertyAddress = 
    booking?.listing?.location || 
    booking?.location || 
    params.location || 
    "-";
  const bookingType = val("bookingType", "bookingType");
  const checkIn = booking?.checkIn
    ? new Date(booking.checkIn).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : params.checkIn || "-";
  const checkOut = booking?.checkOut
    ? new Date(booking.checkOut).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : params.checkOut || "-";
  const paymentMethod = val("paymentMethod", "paymentMethod");
  const totalAmount =
    booking?.totalAmount?.price !== undefined
      ? `₦${Number(booking.totalAmount.price).toLocaleString()}`
      : booking?.total !== undefined
        ? `₦${Number(booking.total).toLocaleString()}`
        : params.totalPaid !== undefined
          ? `₦${Number(params.totalPaid).toLocaleString()}`
          : "-";
  ("-");
  const guests = val("guests", "guests", "1");
  const refCode =
    booking?.referenceCode ||
    booking?.refCode ||
    params.bookingRefCode ||
    booking?._id ||
    "-";

  // Pricing breakdown (from API or fallback)
  const currentUserId = userData?._id || userData?.id;
  const isGuest = currentUserId && booking?.bookedBy && (
    (typeof booking.bookedBy === 'string' && booking.bookedBy === currentUserId) ||
    (booking.bookedBy._id === currentUserId)
  );
  
  // Show Host view only if user is a HOST AND they are NOT the guest who booked it
  const isHostView = userData?.userType === 'HOST' && !isGuest;

  const pBreakdown = booking?.pricingBreakdown;
  const rawTotal =
    booking?.totalAmount?.price ?? 
    booking?.amount ?? 
    (params.totalPaid ? parseFloat(params.totalPaid) : 0);
    
  const safeTotal = isNaN(rawTotal) ? 0 : rawTotal;

  const rentFee = pBreakdown?.rentFee ?? Math.round(safeTotal * 0.7);
  const serviceCharge =
    pBreakdown?.serviceCharge ?? Math.round(safeTotal * 0.05);
  const securityDeposit =
    pBreakdown?.securityDeposit ?? Math.round(safeTotal * 0.025);
  const appCharge = pBreakdown?.totalGuestFee ?? pBreakdown?.guestFee ?? 0;
  const hostAppCharge = pBreakdown?.totalHostFee !== undefined ? pBreakdown.totalHostFee : Math.round(rentFee * 0.03);
  const guestTotal = pBreakdown?.guestTotal ?? safeTotal;

  // Status badge color
  const statusLower = status.toLowerCase();
  const statusColors = {
    confirmed: { bg: "rgba(49, 235, 61, 0.3)", text: "#2e7d32" },
    pending: { bg: "rgba(255, 193, 7, 0.2)", text: "#f57f17" },
    cancelled: { bg: "rgba(244, 67, 54, 0.2)", text: "#c62828" },
    completed: { bg: "rgba(33, 150, 243, 0.2)", text: "#1565c0" },
    reserved: { bg: "rgba(33, 150, 243, 0.15)", text: "#1976d2" },
    expired: { bg: "rgba(244, 67, 54, 0.1)", text: "#c62828" },
    ongoing: { bg: "rgba(255, 152, 0, 0.2)", text: "#ef6c00" },
  };

  // Status-specific icon for the hero banner
  const getStatusIcon = () => {
    switch (statusLower) {
      case "confirmed":
        return <ConfettiIcon width={40} height={40} />;
      case "pending":
        return <PendingStatusIcon width={36} height={36} />;
      case "cancelled":
        return <CancelIcon width={36} height={36} />;
      case "completed":
        return <ChecksDoubleIcon width={36} height={36} />;
      case "reserved":
        return <ReservedIcon width={36} height={36} />;
      case "ongoing":
        return <ConfettiIcon width={40} height={40} />;
      case "expired":
        return <CancelIcon width={36} height={36} />;
      default:
        return <ConfettiIcon width={40} height={40} />;
    }
  };

  // Status-specific hero text
  const getHeroText = () => {
    switch (statusLower) {
      case "confirmed":
        return "You are Booked in Style!";
      case "reserved":
        return "Your Stay Is Reserved!";
      case "pending":
        return "Your Booking is Pending";
      case "completed":
        return "Thank You for Your Stay!";
      case "ongoing":
        return "Enjoy Your Stay!";
      case "cancelled":
        return "Your Booking is Cancelled";
      case "expired":
        return "Reservation Expired";
      default:
        return "You are Booked in Style!";
    }
  };

  // Status-specific subtext
  const getHeroSubtext = () => {
    switch (statusLower) {
      case "confirmed":
        return "Your booking has been confirmed. We look forward to hosting you!";
      case "reserved":
        return "We've reserved this stay for you. Complete your booking within 1 hour to keep it.";
      case "pending":
        return "Your booking request has been sent. You'll be notified once the host responds.";
      case "completed":
        return "We hope you enjoyed your stay. Feel free to leave a review!";
      case "ongoing":
        return "Your stay is currently active. Let us know if you need anything!";
      case "cancelled":
        return "This booking has been cancelled. Contact support for any questions.";
      case "expired":
        return "Your reservation time has expired. Please make a new booking.";
      default:
        return null;
    }
  };

  // Handle reservation timer expiry — auto-cancel booking
  const handleTimerExpire = async () => {
    if (!bookingId) return;
    try {
      const result = await bookingService.updateBookingStatus(
        bookingId,
        "CANCELLED",
      );
      if (result.success) {
        Alert.alert(
          "Reservation Expired",
          "Your reservation time has expired. The booking has been automatically cancelled.",
          [{ text: "OK", onPress: () => router.replace("/(tabs)") }],
        );
      }
    } catch (e) {
      console.warn("[BookingConfirmation] Auto-cancel failed:", e);
    }
  };
  const badgeColor = statusColors[statusLower] || statusColors.pending;

  // Generate PDF (Booking Confirmation)
  const generateConfirmationPDF = async () => {
    try {
      // Load Logo
      const asset = Asset.fromModule(logoImage);
      await asset.downloadAsync();
      const logoBase64 = await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const logoSrc = `data:image/png;base64,${logoBase64}`;

      const confirmationHtml = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: sans-serif; padding: 40px; color: #000; }
              .header-logo { text-align: center; margin-bottom: 20px; }
              .header-logo img { height: 60px; width: auto; }
              h1 { font-size: 22px; text-align: center; margin-bottom: 30px; }
              .status { text-align: center; margin-bottom: 20px; }
              .badge { display: inline-block; padding: 4px 16px; border-radius: 20px; 
                       background: rgba(49, 235, 61, 0.3); color: #2e7d32; font-weight: 600; }
              .row { display: flex; justify-content: space-between; padding: 12px 0; 
                     border-bottom: 1px solid #f0f0f0; }
              .label { color: #525252; font-size: 14px; font-weight: 500; }
              .value { font-weight: 600; font-size: 14px; text-align: right; }
              .total-row { display: flex; justify-content: space-between; padding: 16px 0; 
                           border-top: 2px solid #f0f0f0; margin-top: 8px; }
              .total-label { font-weight: 700; font-size: 16px; color: #000; }
              .total-value { font-weight: 700; font-size: 16px; color: #000; }
              .footer { text-align: center; margin-top: 40px; color: #999; font-size: 12px; border-top: 1px solid #f0f0f0; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header-logo"><img src="${logoSrc}" alt="Lunest Logo" /></div>
            <h1>Booking Confirmation</h1>
            <div class="status"><span class="badge" style="background-color: ${badgeColor.bg}; color: ${badgeColor.text}">${status}</span></div>
            <div class="row"><span class="label">Property name:</span><span class="value">${propertyName}</span></div>
            <div class="row"><span class="label">Property address:</span><span class="value">${propertyAddress}</span></div>
            <div class="row"><span class="label">Booking Type:</span><span class="value">${bookingType}</span></div>
            <div class="row"><span class="label">Guests:</span><span class="value">${guests} Guest${guests > 1 ? "s" : ""}</span></div>
            <div class="row"><span class="label">Check in:</span><span class="value">${checkIn}</span></div>
            <div class="row"><span class="label">Check out:</span><span class="value">${checkOut}</span></div>
            <div class="row"><span class="label">Payment Method:</span><span class="value">${paymentMethod}</span></div>
            ${isHostView ? `
              <div class="row"><span class="label">Rent + Service Fee:</span><span class="value">₦${rentFee.toLocaleString()}</span></div>
              <div class="row"><span class="label">Host Fee (incl. VAT):</span><span class="value">- ₦${hostAppCharge.toLocaleString()}</span></div>
              <div class="row"><span class="label">Caution Fee (Held):</span><span class="value">₦${securityDeposit.toLocaleString()}</span></div>
              <div class="total-row"><span class="total-label">Your Earnings:</span><span class="total-value">₦${(rentFee - hostAppCharge).toLocaleString()}</span></div>
            ` : `
              <div class="row"><span class="label">Rent Fee:</span><span class="value">₦${rentFee.toLocaleString()}</span></div>
              <div class="row"><span class="label">Service Charge:</span><span class="value">₦${serviceCharge.toLocaleString()}</span></div>
              <div class="row"><span class="label">Caution Fee (Refundable):</span><span class="value">₦${securityDeposit.toLocaleString()}</span></div>
              ${pBreakdown?.guestFee > 0 ? `
                <div class="row"><span class="label">App Charge:</span><span class="value">₦${pBreakdown.guestFee.toLocaleString()}</span></div>
                <div class="row"><span class="label">VAT (7.5%):</span><span class="value">₦${pBreakdown.guestVat.toLocaleString()}</span></div>
              ` : appCharge > 0 ? `
                <div class="row"><span class="label">App Charge (incl. VAT):</span><span class="value">₦${appCharge.toLocaleString()}</span></div>
              ` : ""}
              <div class="total-row"><span class="total-label">Total Paid:</span><span class="total-value">₦${guestTotal.toLocaleString()}</span></div>
            `}
            <div class="row"><span class="label">Booking ref. code:</span><span class="value">${refCode}</span></div>
            <div class="footer">
                <p>Lunest — You are Booked in Style!</p>
                <p>Thank you for choosing Lunest.</p>
            </div>
            <!-- Generated: ${new Date().toISOString()} -->
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({
        html: confirmationHtml,
        base64: false,
      });
      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
      });
    } catch (e) {
      console.warn("Confirmation PDF generation failed:", e);
      Alert.alert("Error", "Failed to generate PDF");
    }
  };

  // Capture as Image and Share
  const captureAndSaveImage = async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Not Supported",
        "Saving as image is currently available on the mobile app only.",
      );
      return;
    }
    try {
      setIsCapturing(true);

      // Brief delay to allow React to re-render without buttons
      setTimeout(async () => {
        try {
            const localUri = await captureRef(viewRef, {
                format: "png",
                quality: 1,
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(localUri, {
                    mimeType: "image/png",
                    dialogTitle: "Save Booking Confirmation"
                });
            } else {
                Alert.alert("Success", "Screenshot captured locally.");
            }
        } catch (innerError) {
             console.warn("Capture failed:", innerError);
             Alert.alert("Error", "Failed to capture image");
        } finally {
            setIsCapturing(false);
            setShowDownloadOptions(false);
        }
      }, 150);

    } catch (e) {
      console.warn("Image capture/save failed:", e);
      Alert.alert("Error", "Failed to save image");
      setIsCapturing(false);
    }
  };

  // Handle Download Button Press
  const handleDownload = () => {
    setShowDownloadOptions(true);
  };

  // Helper Data for Agreement Download
  const handleAgreementDownload = async () => {
    if (statusLower !== "confirmed") {
      Alert.alert(
        "Download Restricted",
        "Rental agreements are only available for confirmed bookings. Please complete your payment to access the agreement.",
      );
      return;
    }

    try {
      setLoading(true);
      const result = await bookingService.fetchRentalAgreement(bookingId);

      if (!result.success) {
        Alert.alert(
          "Error",
          result.message || "Failed to fetch rental agreement.",
        );
        return;
      }

      const { url } = result;

      if (Platform.OS === "web") {
        Linking.openURL(url);
        return;
      }

      const filename = `Rental_Agreement_${refCode}.pdf`;
      const fileUri = FileSystem.documentDirectory + filename;

      const downloadRes = await FileSystem.downloadAsync(url, fileUri);

      if (downloadRes.status !== 200) {
        Alert.alert("Error", "Failed to download agreement.");
        return;
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
          dialogTitle: "Download Rental Agreement",
        });
      } else {
        Alert.alert("Success", "Agreement downloaded to documents.");
      }
    } catch (e) {
      console.warn("Agreement download error:", e);
      Alert.alert("Error", "Failed to download rental agreement: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Continue to Payment
  const handleContinueToPayment = () => {
    router.push({
      pathname: "/booking-summary",
      params: {
        listingId: listing?.listing?._id || params.listingId,
        propertyName: propertyName,
        location: booking?.listing?.location || params.location,
        price: booking?.totalAmount?.price || params.price,
        checkInDate: params.checkInDate || params.checkIn,
        checkOutDate: params.checkOutDate || params.checkOut,
        adults: guests,
        children: "0",
        pets: "No pets",
        fromReservation: "true",
        bookingId: bookingId,
        showPaymentModal: "true",
      },
    });
  };

  // Handle Checkout
  const handleCheckout = async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      const result = await bookingService.updateBookingStatus(
        bookingId,
        "COMPLETED"
      );
      if (result.success) {
        setBooking(prev => ({ ...prev, status: 'COMPLETED' }));
        Alert.alert(
          "Checked Out",
          "You have successfully checked out. We hope you enjoyed your stay!",
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Error", result.message || "Failed to check out.");
      }
    } catch (e) {
      console.warn("[BookingConfirmation] Checkout failed:", e);
      Alert.alert("Error", "An unexpected error occurred during check-out.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Cancel Reservation
  const handleCancelReservation = async () => {
    if (!bookingId) return;
    try {
      setIsCancelling(true);
      const result = await bookingService.updateBookingStatus(
        bookingId,
        "CANCELLED",
      );
      if (result.success) {
        setShowCancelModal(false);
        Alert.alert(
          "Reservation Cancelled",
          "Your reservation has been cancelled successfully.",
          [{ text: "OK", onPress: () => router.replace("/(tabs)") }],
        );
      } else {
        Alert.alert("Error", result.message || "Failed to cancel reservation.");
      }
    } catch (e) {
      console.warn("[BookingConfirmation] Cancellation failed:", e);
      Alert.alert("Error", "An unexpected error occurred while cancelling.");
    } finally {
      setIsCancelling(false);
    }
  };

  // Share
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Booking Confirmation\n\nProperty: ${propertyName}\nCheck-in: ${checkIn}\nCheck-out: ${checkOut}\nRef: ${refCode}\nStatus: ${status}`,
      });
    } catch (_) {}
  };

  // ───── Review Handlers ─────
  const handleStarPress = (star) => {
    if (booking?.guestReview?.rating) return;
    setReviewRating(star);
    // Auto-open review modal after selecting rating
    setTimeout(() => setShowReviewModal(true), 300);
  };

  const handleSubmitReview = async (reviewData) => {
    if (!bookingId) return;
    setIsSubmittingReview(true);
    try {
      // Use the rating returned from the modal (calculated average)
      const finalRating = reviewData.rating || reviewRating;
      
      const result = await bookingService.submitReview(
        bookingId,
        finalRating,
        reviewData.feedback,
        reviewData.images,
        reviewData.categories
      );

      if (result.success) {
        setShowReviewModal(false);
        showToastMessage("Thank you for your feedback!", TOAST_TYPE.SUCCESS);

        // Update local booking state
        if (booking) {
          const reviewField = isHostView ? 'hostReview' : 'guestReview';
          setBooking({
            ...booking,
            [reviewField]: {
              rating: finalRating,
              categories: reviewData.categories,
              feedback: reviewData.feedback,
              images: reviewData.images,
              reviewedAt: new Date(),
            },
          });
          // Update the component's reviewRating state for the card UI
          setReviewRating(finalRating);
        }
      } else {
        showToastMessage(result.message || "Failed to submit review.", TOAST_TYPE.ERROR);
      }
    } catch (error) {
      console.error("[BookingConfirmation] Submit review error:", error);
      showToastMessage("An error occurred. Please try again.", TOAST_TYPE.ERROR);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Go back
  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#010135" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={handleGoBack}
          hitSlop={12}
        >
          <ArrowLeftIcon width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Booking Confirmation</Text>
        <Pressable
          style={styles.downloadButton}
          onPress={() => setShowDownloadOptions(true)}
          hitSlop={12}
        >
          <DownloadIcon width={22} height={22} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Card */}
        <View ref={viewRef} collapsable={false} style={styles.card}>
          <Image
            source={logoImage}
            style={{
              width: 100,
              height: 40,
              resizeMode: "contain",
              alignSelf: "center",
              marginBottom: 10,
            }}
          />
          {/* Status Row */}
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Booking Status</Text>
            <View
              style={[styles.statusBadge, { backgroundColor: badgeColor.bg }]}
            >
              <Text style={[styles.statusText, { color: badgeColor.text }]}>
                {status}
              </Text>
            </View>
          </View>

          {/* Countdown Timer — only for Reserved bookings */}
          {statusLower === "reserved" && (
            <CountdownTimer
              initialTime={countdownTime}
              bookingId={bookingId}
              onExpire={handleTimerExpire}
            />
          )}

          {/* Hero Banner */}
          <ImageBackground
            source={bannerImage}
            style={styles.heroBanner}
            imageStyle={styles.heroBannerImage}
            resizeMode="cover"
          >
            <View style={styles.heroContent}>
              <View style={styles.statusIconCircle}>{getStatusIcon()}</View>
              <Text style={styles.heroText}>{getHeroText()}</Text>
              {getHeroSubtext() && (
                <Text style={styles.heroSubtext}>{getHeroSubtext()}</Text>
              )}
            </View>
          </ImageBackground>

          {/* Details Section */}
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Property name:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {propertyName}
              </Text>
            </View>

            {/* Property Address */}
            <View style={[styles.detailRow, { marginBottom: 8 }]}>
              <Text style={styles.detailLabel}>Address:</Text>
              <Text style={[styles.detailValue, { color: '#666', fontSize: 13 }]} numberOfLines={2}>
                {propertyAddress}
              </Text>
            </View>

            {/* Booking Type */}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Booking Type:</Text>
              <Text style={styles.detailValue}>{bookingType}</Text>
            </View>

            {/* Check-in / Check-out */}
            <View style={styles.dateRow}>
              <View style={styles.dateBlock}>
                <View style={styles.dateLabelRow}>
                  <CalendarIcon width={16} height={16} />
                  <Text style={styles.dateLabel}>Check in</Text>
                </View>
                <Text style={styles.dateValue}>{checkIn}</Text>
              </View>
              <View style={styles.dateBlock}>
                <View style={styles.dateLabelRow}>
                  <CalendarIcon width={16} height={16} />
                  <Text style={styles.dateLabel}>Check out</Text>
                </View>
                <Text style={styles.dateValue}>{checkOut}</Text>
              </View>
            </View>

            {/* Pricing Breakdown Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pricing Breakdown</Text>
            </View>

            {isHostView ? (
              // Host View: Show earnings and security deposit held
              <>
                <View style={[styles.detailRow, { marginBottom: 4 }]}>
                  <Text style={styles.detailLabel}>Rent + Service Fee:</Text>
                  <Text style={styles.detailValue}>₦{rentFee.toLocaleString()}</Text>
                </View>
                <View style={[styles.detailRow, { marginBottom: 4 }]}>
                  <Text style={styles.detailLabel}>Host Fee (incl. VAT):</Text>
                  <Text style={styles.detailValue}>- ₦{hostAppCharge.toLocaleString()}</Text>
                </View>
                <View style={[styles.detailRow, { marginBottom: 4 }]}>
                  <Text style={styles.detailLabel}>Caution Fee (Held):</Text>
                  <Text style={styles.detailValue}>₦{securityDeposit.toLocaleString()}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Your Earnings:</Text>
                  <Text style={styles.totalValue}>
                    ₦{(rentFee - hostAppCharge).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.escrowNote}>* Caution fee is held in escrow and returned to guest upon completion.</Text>
              </>
            ) : (
              // Guest View: Show all charges
              <>
                <View style={[styles.detailRow, { marginBottom: 4 }]}>
                  <Text style={styles.detailLabel}>Rent Fee:</Text>
                  <Text style={styles.detailValue}>₦{rentFee.toLocaleString()}</Text>
                </View>
                <View style={[styles.detailRow, { marginBottom: 4 }]}>
                  <Text style={styles.detailLabel}>Service Charge:</Text>
                  <Text style={styles.detailValue}>₦{serviceCharge.toLocaleString()}</Text>
                </View>
                <View style={[styles.detailRow, { marginBottom: 4 }]}>
                  <Text style={styles.detailLabel}>Caution Fee (Refundable):</Text>
                  <Text style={styles.detailValue}>₦{securityDeposit.toLocaleString()}</Text>
                </View>
                {pBreakdown?.guestFee !== undefined ? (
                  <>
                    <View style={[styles.detailRow, { marginBottom: 4 }]}>
                      <Text style={styles.detailLabel}>App Charge:</Text>
                      <Text style={styles.detailValue}>
                        ₦{pBreakdown.guestFee.toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.detailRow, { marginBottom: 4 }]}>
                      <Text style={styles.detailLabel}>VAT (7.5%):</Text>
                      <Text style={styles.detailValue}>
                        ₦{pBreakdown.guestVat.toLocaleString()}
                      </Text>
                    </View>
                  </>
                ) : appCharge > 0 && (
                  <>
                    <View style={[styles.detailRow, { marginBottom: 4 }]}>
                      <Text style={styles.detailLabel}>App Charge:</Text>
                      <Text style={styles.detailValue}>
                        ₦{(appCharge / 1.075).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </Text>
                    </View>
                    <View style={[styles.detailRow, { marginBottom: 4 }]}>
                      <Text style={styles.detailLabel}>VAT (7.5%):</Text>
                      <Text style={styles.detailValue}>
                        ₦{(appCharge - (appCharge / 1.075)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </Text>
                    </View>
                  </>
                )}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Paid:</Text>
                  <Text style={styles.totalValue}>
                    ₦{guestTotal.toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.escrowNote}>* Caution fee will be refunded automatically when booking is completed.</Text>
              </>
            )}

            {/* Booking Ref Code */}
            <View style={[styles.detailRow, { marginTop: 15 }]}>
              <Text style={styles.detailLabel}>Booking ref. code:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {refCode}
              </Text>
            </View>
            </View>
          </View>

          {/* ── Review Section (COMPLETED bookings only) ── */}
          {statusLower === 'completed' && (
            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Ionicons name="star" size={24} color="#FFB800" />
                <Text style={styles.reviewTitle}>
                  {isHostView ? "Rate your Guest" : "Rate your Stay"}
                </Text>
              </View>
              
              <Text style={styles.rateSubtitle}>
                {isHostView 
                  ? `How was your experience hosting ${booking?.bookedBy?.fullName || 'this guest'}?`
                  : `How was your experience staying at ${propertyName}? Your review helps the community.`
                }
              </Text>

              {/* 5-star rating stars */}
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const currentReview = isHostView ? booking?.hostReview : booking?.guestReview;
                  const isSelected = star <= (currentReview?.rating || reviewRating);
                  return (
                    <TouchableOpacity
                      key={star}
                      onPress={() => handleStarPress(star)}
                      activeOpacity={0.7}
                      style={styles.starWrapper}
                      disabled={!!currentReview?.rating || isSubmittingReview}
                    >
                      <Ionicons
                        name={isSelected ? "star" : "star-outline"}
                        size={36}
                        color={isSelected ? "#FFB800" : "#D1D1D6"}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[
                  styles.reviewBtn,
                  !!(isHostView ? booking?.hostReview?.rating : booking?.guestReview?.rating) && styles.reviewBtnDisabled
                ]}
                onPress={() => setShowReviewModal(true)}
                activeOpacity={0.8}
                disabled={!!(isHostView ? booking?.hostReview?.rating : booking?.guestReview?.rating) || isSubmittingReview}
              >
                <Ionicons name="create-outline" size={18} color="#fff" />
                <Text style={styles.reviewBtnText}>
                  {isHostView 
                    ? (booking?.hostReview?.rating ? "Review Submitted" : "Write a Guest Review")
                    : (booking?.guestReview?.rating ? "Review Submitted" : "Write a Property Review")
                  }
                </Text>
              </TouchableOpacity>

              {((isHostView ? booking?.hostReview?.feedback : booking?.guestReview?.feedback)) ? (
                <View style={styles.feedbackQuoteContainer}>
                  <Ionicons name="quote" size={14} color="#6371F1" style={{ opacity: 0.3 }} />
                  <Text style={styles.reviewFeedbackText}>
                    {isHostView ? booking.hostReview.feedback : booking.guestReview.feedback}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>

      {/* Review Modal */}
      <ReviewFeedbackModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSubmit={handleSubmitReview}
        isLoading={isSubmittingReview}
        guestName={isHostView ? (booking?.bookedBy?.fullName || "Guest") : (booking?.listing?.host?.fullName || "Host")}
        rating={reviewRating}
        isHost={isHostView}
      />

      {/* Toast Notification */}
      <ToastNotification
        visible={toastVisible}
        type={toastConfig.type}
        message={toastConfig.message}
        onHide={() => setToastVisible(false)}
      />

      {/* Fixed Bottom Section - Hide when capturing */}
      {!isCapturing && (
      <View style={styles.bottomSection}>
        {/* Refund Policy Notice - Hide for completed/cancelled if desired, keeping for all for now */}
        {statusLower !== 'cancelled' && statusLower !== 'expired' && statusLower !== 'completed' && (
            <Pressable
            style={styles.policyNotice}
            onPress={() => setShowPolicyModal(true)}
            >
            <Ionicons name="information-circle" size={18} color="#fd3131" />
            <Text style={styles.policyText}>
                <Text style={styles.policyRedText}>
                {"This booking is non-refundable. "}
                </Text>
                <Text style={styles.policyLinkText}>View Policy</Text>
            </Text>
            </Pressable>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          {statusLower === "reserved" ? (
            <>
              <Pressable
                style={[styles.primaryButton, styles.buttonFlex]}
                onPress={handleContinueToPayment}
              >
                <Text style={styles.primaryButtonText}>
                  Continue to Payment
                </Text>
              </Pressable>
              <Pressable
                style={[styles.outlineDangerButton, styles.buttonFlex]}
                onPress={() => setShowCancelModal(true)}
              >
                <Text style={styles.outlineDangerButtonText}>Cancel Reservation</Text>
              </Pressable>
            </>
          ) : statusLower === "ongoing" && !isHostView ? (
            <>
              <Pressable
                style={[styles.primaryButton, styles.buttonFlex]}
                onPress={handleCheckout}
              >
                <Text style={styles.primaryButtonText}>Check-out</Text>
              </Pressable>
              <Pressable
                style={[styles.outlineButton, styles.buttonFlex]}
                onPress={handleShare}
              >
                <Text style={styles.outlineButtonText}>Share</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                style={[styles.primaryButton, styles.buttonFlex]}
                onPress={handleShare}
              >
                <Text style={styles.primaryButtonText}>Share</Text>
              </Pressable>
              <Pressable
                style={[styles.outlineButton, styles.buttonFlex]}
                onPress={handleGoBack}
              >
                <Text style={styles.outlineButtonText}>Go Home</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
      )}

      {/* Cancellation Policy Overlay Modal */}
      <Modal visible={showPolicyModal} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowPolicyModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancellation Policy</Text>
              <Pressable onPress={() => setShowPolicyModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalBodyText}>
                This booking is non-refundable. Once confirmed, cancellations
                will not be eligible for a refund.
              </Text>
              <Text style={styles.modalBodyText}>
                If you need to make changes to your booking, please contact the
                host directly or reach out to Lunest support for assistance.
              </Text>
              <Text style={styles.modalBodyText}>
                For reserved bookings, you have 1 hour to complete your payment.
                If payment is not received within this window, the reservation
                will be automatically cancelled.
              </Text>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Download Options Modal */}
      <DownloadOptionsModal
        visible={showDownloadOptions}
        onClose={() => setShowDownloadOptions(false)}
        onSaveImage={captureAndSaveImage}
        onDownloadReceipt={generateConfirmationPDF}
        onDownloadAgreement={handleAgreementDownload}
      />

      {/* Cancel Reservation Modal */}
      <Modal visible={showCancelModal} transparent animationType="fade">
        <View style={styles.cancelModalOverlay}>
          <View style={styles.popUpReservation}>
            <View style={styles.areYouSureYouWantToCanceParent}>
              <Text style={styles.areYouSure}>
                Are you sure you want to cancel this reservation?
              </Text>
              <Text style={styles.thePropertyWill}>
                The property will be released immediately and may no longer be available.
              </Text>
            </View>
            <View style={styles.buttonStyle3Parent}>
              <Pressable
                style={[styles.buttonStyle3, styles.modalButtonFlexBox]}
                onPress={handleCancelReservation}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#b70808" />
                ) : (
                  <Text style={styles.modalCancelButtonText}>Yes, Cancel</Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.buttonStyle2, styles.modalButtonFlexBox]}
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={styles.modalKeepButtonText}>
                  Keep my Reservation
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    gap: 12,
  },
  loadingText: {
    color: "#525252",
    fontSize: 14,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  downloadButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 16,
    paddingBottom: 20,
  },

  // Card
  card: {
    borderRadius: 10,
    backgroundColor: "#fff",
    padding: 10,
    gap: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#efefef",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 36,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: "0px 4px 36px #efefef",
      },
    }),
  },

  // Status Row
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Hero Banner
  heroBanner: {
    height: Math.min(SCREEN_WIDTH * 0.45, 200),
    borderRadius: 6,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  heroBannerImage: {
    borderRadius: 6,
  },
  heroContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
  },
  statusIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#fff",
    textAlign: "center",
  },
  heroSubtext: {
    fontSize: 12,
    fontWeight: "400",
    color: "#fff",
    textAlign: "center",
    marginTop: 2,
  },

  // Details Section
  detailsSection: {
    gap: 25,
    paddingHorizontal: 2,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#525252",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    flexShrink: 1,
    textAlign: "right",
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#010135",
  },
  escrowNote: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#666",
    marginTop: 8,
    lineHeight: 18,
  },

  // Date Row
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
  },
  dateBlock: {
    alignItems: "center",
    gap: 8,
  },
  dateLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#656565",
  },
  dateValue: {
    fontSize: 12,
    fontWeight: "500",
    color: "#000",
  },

  // Total
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },

  // Bottom Fixed Section
  bottomSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "android" ? 24 : 8,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#f0f0f0",
    gap: 16,
  },

  // Policy Notice
  policyNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  policyText: {
    fontSize: 12,
    flex: 1,
  },
  policyRedText: {
    color: "#fd3131",
  },
  policyLinkText: {
    color: "#010135",
    fontWeight: "500",
  },

  // Buttons
  // Buttons
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    justifyContent: "space-between",
  },
  buttonFlex: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#010135",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Aeonik TRIAL", // As requested
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: "#010135",
    backgroundColor: "#fff",
  },
  outlineButtonText: {
    color: "#010135",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Aeonik TRIAL",
  },
  outlineDangerButton: {
    borderWidth: 1,
    borderColor: "#b70808",
    backgroundColor: "#fff",
  },
  outlineDangerButtonText: {
    color: "#b70808",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Aeonik TRIAL",
  },

  // Premium Review card styles
  reviewCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginHorizontal: 10,
    marginTop: 24,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  rateSubtitle: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 24,
  },
  starWrapper: {
    padding: 4,
  },
  reviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#6371F1",
    width: "100%",
  },
  reviewBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  feedbackQuoteContainer: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#6371F1",
    marginTop: 16,
    flexDirection: "row",
    gap: 8,
  },
  reviewFeedbackText: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#374151",
    flex: 1,
    lineHeight: 20,
  },

  // Policy Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 30,
    maxHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  modalBody: {
    flex: 1,
  },
  modalBodyText: {
    fontSize: 14,
    color: "#525252",
    lineHeight: 22,
    marginBottom: 16,
  },

  // Download Modal Styles
  downloadOptionsGap: {
    gap: 12,
    marginTop: 8,
  },
  primaryModalButton: {
    flexDirection: "row",
    backgroundColor: "#010135",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryModalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryModalButton: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryModalButtonText: {
    color: "#010135",
    fontSize: 16,
    fontWeight: "600",
  },

  // Cancel Modal Styles
  cancelModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  popUpReservation: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  areYouSureYouWantToCanceParent: {
    width: "100%",
    gap: 16,
    alignItems: "center",
    marginBottom: 32,
  },
  areYouSure: {
    fontSize: 18,
    textAlign: "center",
    color: "#010135",
    fontWeight: "700",
  },
  thePropertyWill: {
    fontSize: 14,
    textAlign: "center",
    color: "#666",
    lineHeight: 20,
  },
  buttonStyle3Parent: {
    width: "100%",
    gap: 12,
  },
  modalButtonFlexBox: {
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 25,
    width: "100%",
  },
  buttonStyle3: {
    borderColor: "#b70808",
    borderWidth: 1,
  },
  modalCancelButtonText: {
    color: "#b70808",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonStyle2: {
    backgroundColor: "#010135",
  },
  modalKeepButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default BookingConfirmationScreen;
