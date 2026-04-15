import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
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
    View
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
import DownloadConfirmationModal from "../../components/common/DownloadConfirmationModal";
import DownloadOptionsModal from "../../components/common/DownloadOptionsModal";
import ToastNotification, {
    TOAST_TYPE,
} from "../../components/common/ToastNotification";
import CautionDisputeModal from "../../components/modals/CautionDisputeModal";
import CheckoutConfirmationModal from "../../components/modals/CheckoutConfirmationModal";
import CautionActionModal from "../../components/modals/CautionActionModal";
import ReviewFeedbackModal from "../../components/modals/ReviewFeedbackModal";
import { DEMO_TERMS } from "../../constants/termsConfig";
import authService from "../../services/authService";
import bookingService from "../../services/bookingService";
import configService from "../../services/configService";
import { downloadFile, saveRefAsImage } from "../../utils/downloadUtils";
import { resolveImageUrlSync } from "../../utils/imageUtils";

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
  const [baseURL, setBaseURL] = useState("");

  // ── Caution Action State ──
  const [showCautionActionModal, setShowCautionActionModal] = useState(false);
  const [cautionActionType, setCautionActionType] = useState("RELEASE"); // "RELEASE" or "DISPUTE"
  const [pendingCautionAction, setPendingCautionAction] = useState(null); // { action, reason }
  
  // ── Derive Coupon Values from Params or Fetch ──
  const pBreakdown = booking?.pricingBreakdown;
  
  // C) AUTO-CALCULATE COUPON DISCOUNT: If coupon is applied but discount is 0/missing, calculate it on-the-fly
  const rawCouponApplied = (params.couponApplied === "true") || !!(booking?.couponApplied?.code || booking?.couponCode);
  const rawCouponCode = params.couponCode || booking?.couponApplied?.code || booking?.couponCode || (rawCouponApplied ? "Applied" : "");
  
  // Get discount from multiple sources and validate
  let rawCouponDiscount = parseFloat(params.couponDiscount) || booking?.couponApplied?.discountApplied || pBreakdown?.couponDiscount || 0;
  
  // If coupon is applied but discount is 0 or doesn't match expected value, recalculate
  let calculatedDiscount = rawCouponDiscount;
  const serviceBase = (pBreakdown?.rentFee || 0) + (pBreakdown?.serviceCharge || 0); // EXCLUDE caution fee from discount base
  const totalBaseBeforeDiscount = serviceBase + (pBreakdown?.securityDeposit || 0);
  const couponValue = booking?.couponApplied?.value || booking?.couponValue || 0;
  
  // Always recalculate if we have coupon data to ensure accuracy
  if (rawCouponApplied && couponValue > 0 && serviceBase > 0) {
    const expectedDiscount = Math.round((serviceBase * couponValue) / 100);
    // Use calculated if raw is 0 or differs significantly
    if (rawCouponDiscount === 0 || Math.abs(rawCouponDiscount - expectedDiscount) > serviceBase * 0.01) {
      calculatedDiscount = expectedDiscount;
      console.log(`[BookingConfirmation] Recalculated coupon discount (Rent/SC base only):`, {
        couponCode: rawCouponCode,
        serviceBase,
        couponValue,
        rawDiscount: rawCouponDiscount,
        calculatedDiscount
      });
    }
  }
  
  // If we have a discounted subtotal but no discount amount, calculate discount from that
  if (calculatedDiscount === 0 && pBreakdown?.discountedSubtotal > 0 && totalBaseBeforeDiscount > 0) {
    const derivedDiscount = totalBaseBeforeDiscount - pBreakdown.discountedSubtotal;
    if (derivedDiscount > 0) {
      calculatedDiscount = Math.round(derivedDiscount);
    }
  }
  
  const couponApplied = rawCouponApplied || calculatedDiscount > 0;
  const couponCode = rawCouponCode;
  const couponDiscount = calculatedDiscount;
  
  // Ensure that if we forcefully recalculated the discount, we also recalculate the 
  // cascading fields (App Fee, VAT, Total) so the math tallies perfectly in the UI.
  const hasRecalculated = calculatedDiscount !== rawCouponDiscount && rawCouponDiscount > 0;
  
  // Base values
  const baseRentFee = pBreakdown?.rentFee || booking?.amount || 0;
  const baseServiceCharge = pBreakdown?.serviceCharge || booking?.serviceCharge || 0;
  const baseSecurityDeposit = pBreakdown?.securityDeposit || booking?.securityDeposit || 0;
  
  // Recalculated values if needed
  const displayDiscountedTaxable = (baseRentFee + baseServiceCharge) - couponDiscount;
  const displayAfterCoupon = displayDiscountedTaxable + baseSecurityDeposit;
  
  const guestFeePercent = pBreakdown?.guestFeePercent || 5;
  const vatPercent = pBreakdown?.vatPercent || 7.5;
  
  const displayGuestFee = hasRecalculated ? Math.round((displayAfterCoupon * guestFeePercent) / 100) : (pBreakdown?.guestFee || 0);
  const displayGuestVat = hasRecalculated ? Math.round((displayGuestFee * vatPercent) / 100) : (pBreakdown?.guestVat || 0);
  const displayTotal = hasRecalculated ? (displayAfterCoupon + displayGuestFee + displayGuestVat) : (pBreakdown?.guestTotal || 0);
  
  const subtotalBeforeDiscount = parseFloat(params.subtotalBeforeDiscount) || booking?.subtotalBeforeDiscount || pBreakdown?.subtotalBeforeCoupon || totalBaseBeforeDiscount || 0;
  
  // Use stored coupon value from booking data, not calculated from discount amount
  const storedCouponValue = booking?.couponApplied?.value || booking?.couponValue || 0;
  const couponPercentage = storedCouponValue > 0 ? storedCouponValue : (subtotalBeforeDiscount > 0 ? Math.round((couponDiscount / subtotalBeforeDiscount) * 100) : 0);
  const isCouponFullCoverage = couponDiscount > 0 && subtotalBeforeDiscount > 0 && couponDiscount >= subtotalBeforeDiscount;
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false); // Changed state name
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [downloadModalState, setDownloadModalState] = useState({
    visible: false,
    type: 'loading',
    title: 'Downloading...',
    message: 'Please wait while we prepare your document.'
  }); // New state for capture
  const [showCheckoutModal, setShowCheckoutModal] = useState(false); // New state for checkout confirmation

  // Review state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);

  // Caution Fee state
  const [isResolvingCaution, setIsResolvingCaution] = useState(false);
  const [showCautionDisputeModal, setShowCautionDisputeModal] = useState(false);
  const [cautionDisputeReason, setCautionDisputeReason] = useState("");

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

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return num.toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const viewRef = useRef();

  // Check if this is a reserved booking with countdown
  const isReserved =
    (params.status || "").toLowerCase() === "reserved" ||
    params.reserveAndPayLater === "true" ||
    (booking?.status || "").toLowerCase() === "reserved";
  const countdownTime = parseInt(params.countdownTime) || 3600;

  const [userData, setUserData] = useState(null);

  // Helper function to convert image URLs to full URLs
  const convertImageUrl = (image) => {
    if (!image) return null;
    let path = typeof image === "object" ? image.url || image.uri : image;
    return resolveImageUrlSync(path, baseURL);
  };

  // Parse review images robustly (handles JSON strings and arrays)
  const parseImages = (imagesData) => {
    if (!imagesData) return [];
    if (Array.isArray(imagesData)) return imagesData.filter((img) => !!img);
    if (typeof imagesData === "string" && imagesData.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(imagesData);
        return Array.isArray(parsed) ? parsed.filter((img) => !!img) : [];
      } catch (e) {
        return [imagesData];
      }
    }
    if (typeof imagesData === "string" && imagesData.length > 0)
      return [imagesData];
    return [];
  };

  useEffect(() => {
    // Load dynamic base URL
    configService.getBaseURL().then(url => setBaseURL(url));

    authService
      .getUserData()
      .then((data) => setUserData(data))
      .catch(() => {});

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
      .catch((err) => {
        console.error("[BookingConfirmation] Initial fetch error:", err);
      })
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
  
  // ── Step 1: Core Status & Metadata ──
  const status = val("status", "status", "Pending");
  const statusLower = status.toLowerCase();
  const bookingType = val("bookingType", "bookingType");
  const guests = val("guests", "guests", "1");
  const paymentMethod = val("paymentMethod", "paymentMethod");
  
  // ── Step 2: Date Formatting (checkIn/checkOut) ──
  const checkIn = booking?.checkIn
    ? (() => {
        try {
          let date = new Date(booking.checkIn);
          if (isNaN(date.getTime())) {
            const isoMatch = booking.checkIn.toString().match(/(\d{4})-(\d{2})-(\d{2})/);
            if (isoMatch) date = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
          }
          if (isNaN(date.getTime())) return "Invalid Date";
          return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
        } catch (error) { return "Date Error"; }
      })()
    : params.checkIn || "-";
    
  const checkOut = booking?.checkOut
    ? (() => {
        try {
          let date = new Date(booking.checkOut);
          if (isNaN(date.getTime())) {
            const isoMatch = booking.checkOut.toString().match(/(\d{4})-(\d{2})-(\d{2})/);
            if (isoMatch) date = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
          }
          if (isNaN(date.getTime())) return "Invalid Date";
          return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
        } catch (error) { return "Date Error"; }
      })()
    : params.checkOut || "-";
    
  // ── Step 3: Property Details ──
  const propertyName = booking?.listing?.propertyName || booking?.listing?.title || booking?.propertyName || params.propertyName || "-";
  
  const propertyAddress = (() => {
    const isConfirmed = ["confirmed", "ongoing"].includes(statusLower);
    if (isConfirmed) {
      const listing = booking?.listing;
      if (listing?.propertyLocation?.fullAddress) return listing.propertyLocation.fullAddress;
      const parts = [];
      if (listing?.address) parts.push(listing.address);
      if (listing?.city) parts.push(listing.city);
      if (listing?.state) parts.push(listing.state);
      if (listing?.country) parts.push(listing.country);
      if (parts.length > 0) return parts.join(", ");
      return booking?.location || params.location || "-";
    }
    const listing = booking?.listing;
    if (listing?.city && listing?.state) return `${listing.city}, ${listing.state}`;
    return params.location || "-";
  })();
  
  // ── Step 4: Pricing & Fees ──
  const rawTotal = booking?.totalAmount?.price ?? booking?.amount ?? (params.totalPaid ? parseFloat(params.totalPaid) : 0);
  const safeTotal = isNaN(rawTotal) ? 0 : rawTotal;
  const rentFee = pBreakdown?.rentFee ?? Math.round(safeTotal * 0.7);
  const serviceCharge = pBreakdown?.serviceCharge ?? Math.round(safeTotal * 0.05);
  const securityDeposit = pBreakdown?.securityDeposit ?? Math.round(safeTotal * 0.025);
  const appCharge = pBreakdown?.totalGuestFee ?? pBreakdown?.guestFee ?? 0;
  const hostAppCharge = pBreakdown?.totalHostFee !== undefined ? pBreakdown.totalHostFee : Math.round(rentFee * 0.03);
  
  // Use pricing breakdown guestTotal which already has coupon applied, or calculate
  const calculatedSubtotal = (pBreakdown?.rentFee || 0) + (pBreakdown?.serviceCharge || 0) + (pBreakdown?.securityDeposit || 0);
  const finalSubtotal = pBreakdown?.discountedSubtotal || (calculatedSubtotal - couponDiscount) || calculatedSubtotal;
  const guestTotal = pBreakdown?.guestTotal ?? (finalSubtotal + appCharge) ?? safeTotal;
  
  const totalAmount = booking?.totalAmount?.price !== undefined 
    ? `₦${Number(booking.totalAmount.price).toLocaleString()}` 
    : booking?.total !== undefined 
      ? `₦${Number(booking.total).toLocaleString()}` 
      : params.totalPaid !== undefined 
        ? `₦${Number(params.totalPaid).toLocaleString()}` 
        : "-";
        
  const refCode = booking?.referenceCode || booking?.refCode || params.bookingRefCode || booking?._id || "-";
  
  // ── Step 5: User & Views ──
  const currentUserId = userData?._id || userData?.id;
  const isGuest = currentUserId && booking?.bookedBy && 
    ((typeof booking.bookedBy === "string" && booking.bookedBy === currentUserId) || booking.bookedBy?._id === currentUserId);
  const isHostView = userData?.userType === "HOST" && !isGuest;
  
  // ── Step 6: Payment Details ──
  const displayPaymentMethod = (() => {
    if (couponApplied && paymentMethod === "Coupon") return "Coupon Full Coverage";
    if (!paymentMethod || paymentMethod === "-") return "Not Specified";
    const methodMap = { CARD: "Card", WALLET: "Wallet", PAYSTACK: "Card (Paystack)", Coupon: "Coupon Full Coverage" };
    return methodMap[paymentMethod] || paymentMethod;
  })();
  
  // ── Step 7: Logging ──
  console.log('🔍 [BookingConfirmation] Final Data:', {
    bookingId,
    status: statusLower,
    checkIn,
    checkOut,
    couponApplied,
    couponCode,
    couponDiscount,
    subtotalBeforeDiscount,
    guestTotal,
    propertyAddress: propertyAddress.substring(0, 50) + '...'
  });

  // Polling logic for PENDING bookings
  useEffect(() => {
    let pollingInterval;
    const isPending = statusLower === "pending" || statusLower === "pending_payment";

    if (isPending && bookingId && booking) {
      console.log(`[BookingConfirmation] Starting status polling for ${bookingId} (Current: ${statusLower})`);
      
      pollingInterval = setInterval(async () => {
        try {
          const result = await bookingService.fetchBookingById(bookingId);
          if (result?.success && result?.booking) {
            const newStatus = (result.booking.status || "").toLowerCase();
            if (newStatus !== statusLower) {
              console.log(`[BookingConfirmation] Status changed: ${statusLower} -> ${newStatus}`);
              setBooking(result.booking);
              
              // If it's now confirmed, we can stop polling
              if (newStatus === "confirmed" || newStatus === "completed") {
                clearInterval(pollingInterval);
                showToastMessage("Booking confirmed successfully!", TOAST_TYPE.SUCCESS);
              }
            }
          }
        } catch (error) {
          console.warn("[BookingConfirmation] Polling error:", error);
        }
      }, 3000); // Poll every 3 seconds for better responsiveness
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        console.log("[BookingConfirmation] Polling stopped");
      }
    };
  }, [bookingId, statusLower, !!booking]);
  
  // Status badge color
  const statusColors = {
    confirmed: { bg: "rgba(49, 235, 61, 0.3)", text: "#2e7d32" },
    pending: { bg: "rgba(255, 193, 7, 0.2)", text: "#f57f17" },
    cancelled: { bg: "rgba(244, 67, 54, 0.2)", text: "#c62828" },
    completed: { bg: "rgba(33, 150, 243, 0.2)", text: "#1565c0" },
    reserved: { bg: "rgba(33, 150, 243, 0.15)", text: "#1976d2" },
    expired: { bg: "rgba(244, 67, 54, 0.1)", text: "#c62828" },
    ongoing: { bg: "rgba(255, 152, 0, 0.2)", text: "#ef6c00" },
    failed: { bg: "rgba(244, 67, 54, 0.2)", text: "#c62828" },
    pending_payment: { bg: "rgba(255, 193, 7, 0.2)", text: "#f57f17" },
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
      case "failed":
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
      case "failed":
        return "Payment Failed";
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
      case "failed":
        return params.error || "Something went wrong with your payment. Please try again to secure your booking.";
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
    // expo-print/Sharing is only available on native (iOS/Android)
    if (Platform.OS === "web") {
      Alert.alert("Not Supported", "PDF download is not available on web. Please use 'Save as Image' instead.");
      return;
    }

    try {
      // Load Logo (non-blocking — PDF will render without logo if this fails)
      let logoSrc = "";
      try {
        const asset = Asset.fromModule(logoImage);
        await asset.downloadAsync();
        if (asset.localUri) {
          const logoBase64 = await FileSystem.readAsStringAsync(asset.localUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          logoSrc = `data:image/png;base64,${logoBase64}`;
        } else {
          console.warn("[BookingConfirmation] Logo asset localUri is null, proceeding without logo");
        }
      } catch (logoError) {
        console.warn("[BookingConfirmation] Logo loading failed, proceeding without logo:", logoError.message);
      }
      
      const cautionStatusText = (booking?.securityDepositResolution?.status || "HELD").replace(/_/g, " ");
      const cautionStatusGuestText = (booking?.securityDepositResolution?.status || "HELD/REFUNDABLE").replace(/_/g, " ");

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
            ${logoSrc ? `<div class="header-logo"><img src="${logoSrc}" alt="Lunest Logo" /></div>` : `<div class="header-logo"><h2 style="color: #010135;">LUNEST</h2></div>`}
            <h1>Booking Confirmation</h1>
            <div class="status"><span class="badge" style="background-color: ${badgeColor.bg}; color: ${badgeColor.text}">${status}</span></div>
            <div class="row"><span class="label">Property name:</span><span class="value">${propertyName}</span></div>
            <div class="row"><span class="label">Property address:</span><span class="value">${propertyAddress}</span></div>
            <div class="row"><span class="label">Booking Type:</span><span class="value">${bookingType}</span></div>
            <div class="row"><span class="label">Guests:</span><span class="value">${guests} Guest${guests > 1 ? "s" : ""}</span></div>
            <div class="row"><span class="label">Check in:</span><span class="value">${checkIn}</span></div>
            <div class="row"><span class="label">Check out:</span><span class="value">${checkOut}</span></div>
            <div class="row"><span class="label">Payment Method:</span><span class="value">${paymentMethod}</span></div>
            ${
              isHostView
                ? `
              <div class="row"><span class="label">Rent + Service Fee:</span><span class="value">₦${formatCurrency(rentFee)}</span></div>
              <div class="row"><span class="label">Host/Landlord Fee (incl. VAT):</span><span class="value">- ₦${formatCurrency(hostAppCharge)}</span></div>
              <div class="row"><span class="label">Caution Fee:</span><span class="value">₦${formatCurrency(securityDeposit)} (${cautionStatusText})</span></div>
              <div class="total-row"><span class="total-label">Your Earnings:</span><span class="total-value">₦${formatCurrency(rentFee - hostAppCharge)}</span></div>
            `
                : `
              <div class="row"><span class="label">Rent Fee:</span><span class="value">₦${formatCurrency(rentFee)}</span></div>
              <div class="row"><span class="label">Service Charge:</span><span class="value">₦${formatCurrency(serviceCharge)}</span></div>
              <div class="row"><span class="label">Caution Fee:</span><span class="value">₦${formatCurrency(securityDeposit)} (${cautionStatusGuestText})</span></div>
              ${couponApplied && couponDiscount > 0 ? `
                <div class="row"><span class="label" style="color: #2E7D32;">Discount (${couponCode}):</span><span class="value" style="color: #2E7D32;">- ₦${formatCurrency(couponDiscount)}</span></div>
              ` : ""}
              ${
                pBreakdown?.guestFee > 0
                  ? `
                <div class="row"><span class="label">App Charge:</span><span class="value">₦${formatCurrency(pBreakdown.guestFee)}</span></div>
                <div class="row"><span class="label">VAT (7.5%):</span><span class="value">₦${formatCurrency(pBreakdown.guestVat)}</span></div>
              `
                  : appCharge > 0
                    ? `
                <div class="row"><span class="label">App Charge (incl. VAT):</span><span class="value">₦${formatCurrency(appCharge)}</span></div>
              `
                    : ""
              }
              <div class="total-row"><span class="total-label">Amount Paid:</span><span class="total-value">₦${formatCurrency(displayTotal || guestTotal)}</span></div>
            `
            }
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
      console.error("[BookingConfirmation] PDF generation failed:", e);
      Alert.alert("Error", `Failed to generate PDF: ${e.message || "Unknown error"}`);
    }
  };

  // --- Image Capture & Save (Universal) ---
  const captureAndSaveImage = async () => {
    if (Platform.OS === 'web') {
      try {
        setIsCapturing(true);
        const { toPng } = require('html-to-image');
        
        if (viewRef.current) {
          const dataUrl = await toPng(viewRef.current, {
            backgroundColor: "#FFFFFF",
            cacheBust: true,
            pixelRatio: 2,
          });
          
          await saveRefAsImage(dataUrl, `Lunest-Booking-${refCode}.png`);
        } else {
          throw new Error("Capture reference not found");
        }
      } catch (error) {
        console.error("[WebCapture] Error:", error);
        Alert.alert("Error", "Failed to download image on web. Please use a modern browser.");
      } finally {
        setIsCapturing(false);
        setShowDownloadOptions(false);
      }
      return;
    }

    try {
      setIsCapturing(true);
      // Brief delay to allow React to re-render without buttons
      setTimeout(async () => {
        try {
          setDownloadModalState({
            visible: true,
            type: 'loading',
            title: 'Saving Image...',
            message: 'Preparing your booking confirmation image.'
          });
          
          const localUri = await captureRef(viewRef, {
            format: "png",
            quality: 1,
          });
          await saveRefAsImage(localUri, `Booking_Confirmation_${refCode}.png`);
          
          setDownloadModalState({
            visible: true,
            type: 'success',
            title: 'Image Saved',
            message: 'The booking confirmation has been saved to your gallery.'
          });
        } catch (innerError) {
          console.warn("Capture failed:", innerError);
          setDownloadModalState({
            visible: true,
            type: 'error',
            title: 'Capture Failed',
            message: 'Failed to save the booking confirmation image.'
          });
        } finally {
          setIsCapturing(false);
          setShowDownloadOptions(false);
        }
      }, 150);
    } catch (e) {
      console.warn("Image capture/save failed:", e);
      setDownloadModalState({
        visible: true,
        type: 'error',
        title: 'Save Failed',
        message: 'An unexpected error occurred while saving the image.'
      });
      setIsCapturing(false);
    }
  };

  const handleAgreementDownload = async () => {
    const statusLower = (
      params.status ||
      booking?.status ||
      "PENDING"
    ).toLowerCase();
    const allowedStatuses = ["confirmed", "ongoing", "completed"];

    if (!allowedStatuses.includes(statusLower)) {
      Alert.alert(
        "Download Restricted",
        "Rental agreements are only available for confirmed, ongoing, or completed bookings.",
      );
      return;
    }

    setLoading(true);
    setDownloadModalState({
      visible: true,
      type: 'loading',
      title: 'Downloading Agreement...',
      message: 'Generating your rental agreement PDF.'
    });
    try {
      const result = await bookingService.fetchRentalAgreement(bookingId);
      if (result.success && result.url) {
        await downloadFile(result.url, `Agreement_${refCode}.pdf`, "application/pdf");
        setDownloadModalState({
          ...downloadModalState,
          type: 'success',
          title: 'Download Complete',
          message: 'The rental agreement has been downloaded successfully.'
        });
      } else {
        throw new Error(result.message || "Failed to fetch agreement from server");
      }
    } catch (e) {
      console.warn("Agreement download error:", e);
      setDownloadModalState({
        ...downloadModalState,
        type: 'error',
        title: 'Download Failed',
        message: e.message || "An error occurred while downloading the agreement."
      });
    } finally {
      setLoading(false);
      setShowDownloadOptions(false);
    }
  };

  const handleReceiptDownload = async () => {
    setLoading(true);
    setDownloadModalState({
      visible: true,
      type: 'loading',
      title: 'Downloading Receipt...',
      message: 'Generating your receipt PDF.'
    });
    try {
      const result = await bookingService.fetchReceipt(bookingId);
      if (result.success && result.url) {
        await downloadFile(result.url, `Receipt_${refCode}.pdf`, "application/pdf");
        setDownloadModalState({
          ...downloadModalState,
          type: 'success',
          title: 'Download Complete',
          message: 'The receipt has been downloaded successfully.'
        });
      } else {
        throw new Error(result.message || "Failed to fetch receipt from server");
      }
    } catch (e) {
      console.warn("Receipt download error:", e);
      setDownloadModalState({
        ...downloadModalState,
        type: 'error',
        title: 'Download Failed',
        message: e.message || "An error occurred while downloading the receipt."
      });
    } finally {
      setLoading(false);
      setShowDownloadOptions(false);
    }
  };

  const handleContinueToPayment = () => {
    // Collect all useful data from the existing booking object for the summary
    const guestsInfo = booking?.guests || {};
    
    router.push({
      pathname: "/booking-summary",
      params: {
        listingId: booking?.listing?._id || params.listingId,
        propertyName: propertyName || booking?.listing?.propertyName,
        location: booking?.listing?.location || params.location,
        price: booking?.totalAmount?.price || params.price,
        checkInDate: params.checkInDate || params.checkIn || (booking?.checkIn ? format(new Date(booking.checkIn), "d-M-yyyy") : ""),
        checkOutDate: params.checkOutDate || params.checkOut || (booking?.checkOut ? format(new Date(booking.checkOut), "d-M-yyyy") : ""),
        adults: guests || guestsInfo.adults || "2",
        children: guestsInfo.children || "0",
        pets: guestsInfo.pets || "No pets",
        fromReservation: "true",
        bookingId: bookingId,
        showPaymentModal: "true",
        // Pass the existing breakdown to ensure consistency
        priceBreakdown: booking?.pricingBreakdown ? JSON.stringify(booking.pricingBreakdown) : undefined
      },
    });
  };

  // Handle Checkout
  const handleCheckout = async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      // Use confirmCheckout instead of updateBookingStatus to avoid payment processing
      const result = await bookingService.confirmCheckout(bookingId);
      if (result.success) {
        setShowCheckoutModal(false);
        setBooking((prev) => ({ ...prev, status: "COMPLETED" }));
        showToastMessage("Checked out successfully!", TOAST_TYPE.SUCCESS);
      } else {
        showToastMessage(result.message || "Failed to check out.", TOAST_TYPE.ERROR);
      }
    } catch (e) {
      console.warn("[BookingConfirmation] Checkout failed:", e);
      showToastMessage("An unexpected error occurred during check-out.", TOAST_TYPE.ERROR);
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
      let uploadedImageUrls = reviewData.images || [];

      // 1. Upload images if any
      if (reviewData.images && reviewData.images.length > 0) {
        console.log("[BookingConfirmation] Uploading review images...");
        const uploadResult = await bookingService.uploadReviewImages(
          reviewData.images,
        );
        if (uploadResult.success && uploadResult.images) {
          uploadedImageUrls = uploadResult.images;
        } else {
          Alert.alert(
            "Upload Failed",
            "Could not upload review images. Proceeding without them?",
            [
              {
                text: "Cancel",
                onPress: () => {
                  throw new Error("Upload cancelled");
                },
                style: "cancel",
              },
              { text: "OK", onPress: () => {} },
            ],
          );
          uploadedImageUrls = [];
        }
      }

      const result = await bookingService.submitReview(
        bookingId,
        finalRating,
        reviewData.feedback,
        uploadedImageUrls,
        reviewData.categories,
        isHostView ? "HOST" : "GUEST",
      );

      if (result.success) {
        setShowReviewModal(false);
        showToastMessage("Thank you for your feedback!", TOAST_TYPE.SUCCESS);

        // Update local booking state
        if (booking) {
          const reviewField = isHostView ? "hostReview" : "guestReview";
          setBooking({
            ...booking,
            [reviewField]: {
              rating: finalRating,
              feedback: reviewData.feedback,
              images: uploadedImageUrls,
              reviewedAt: new Date(),
            },
          });
          // Update the component's reviewRating state for the card UI
          setReviewRating(finalRating);
        }
      } else {
        showToastMessage(
          result.message || "Failed to submit review.",
          TOAST_TYPE.ERROR,
        );
      }
    } catch (error) {
      console.error("[BookingConfirmation] Submit review error:", error);
      showToastMessage(
        "An error occurred. Please try again.",
        TOAST_TYPE.ERROR,
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleResolveCautionFee = async (action, reason = "") => {
    // If not already confirmed via CautionActionModal, intercept and show it
    if (!showCautionActionModal && action !== "PENDING") {
      setCautionActionType(action === "DISPUTE" ? "DISPUTE" : "RELEASE");
      setPendingCautionAction({ action, reason });
      setShowCautionActionModal(true);
      
      // If it was a dispute, we close the dispute input modal first
      if (action === "DISPUTE") {
        setShowCautionDisputeModal(false);
      }
      return;
    }

    executeResolveCautionFee(action, reason);
  };

  const executeResolveCautionFee = async (action, reason = "") => {
    setIsResolvingCaution(true);
    try {
      const result = await bookingService.resolveCautionFee(
        refCode,
        action,
        reason,
      );
      if (result.success) {
        showToastMessage(
          `Caution fee ${action === "DISPUTE" ? "dispute submitted" : "released"} successfully!`,
          TOAST_TYPE.SUCCESS,
        );
        // Update local booking state
        if (booking) {
          const statusMap = {
            RELEASE_TO_GUEST: "RELEASED_TO_GUEST",
            RELEASE_TO_HOST: "RELEASED_TO_HOST",
            DISPUTE: "DISPUTED",
          };
          setBooking({
            ...booking,
            securityDepositResolution: {
              status: statusMap[action] || action,
              reason: reason,
              resolvedAt: new Date(),
              resolvedBy: isHostView ? "HOST" : "GUEST",
            },
          });
        }
        setShowCautionDisputeModal(false);
        setCautionDisputeReason("");
      } else {
        showToastMessage(
          result.message || "Failed to resolve caution fee.",
          TOAST_TYPE.ERROR,
        );
      }
    } catch (error) {
      console.error(
        "[BookingConfirmation] Caution fee resolution error:",
        error,
      );
      showToastMessage(
        "An error occurred. Please try again.",
        TOAST_TYPE.ERROR,
      );
    } finally {
      setIsResolvingCaution(false);
      setShowCautionActionModal(false);
      setPendingCautionAction(null);
    }
  };

  const handleConfirmCautionAction = () => {
    if (pendingCautionAction) {
      handleResolveCautionFee(pendingCautionAction.action, pendingCautionAction.reason);
    }
  };


  // Go Home
  const handleGoHome = () => {
    router.replace("/(tabs)");
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

            {/* Property Address - Clickable for confirmed/ongoing bookings */}
            <View style={[styles.detailRow, { marginBottom: 8, alignItems: 'flex-start' }]}>
              <Text style={styles.detailLabel}>Address:</Text>
              <View style={{ flex: 1, marginLeft: -20 }}>
                {(statusLower === "ongoing" || statusLower === "confirmed") ? (
                  <TouchableOpacity
                    onPress={() => {
                      if (propertyAddress) {
                        const encodedAddress = encodeURIComponent(propertyAddress);
                        const mapUrl = Platform.select({
                          ios: `maps://?q=${encodedAddress}`,
                          android: `geo:0,0?q=${encodedAddress}`,
                        });
                        Linking.canOpenURL(mapUrl).then((supported) => {
                          if (supported) {
                            Linking.openURL(mapUrl);
                          } else {
                            // Fallback to Google Maps web
                            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`);
                          }
                        }).catch(() => {
                          Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`);
                        });
                      }
                    }}
                    activeOpacity={0.7}
                    style={{ flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap' }}
                  >
                    <Text
                      style={[styles.detailValue, { color: "#6371F1", fontSize: 13, textDecorationLine: 'underline', flex: 1 }]}
                      numberOfLines={3}
                      ellipsizeMode="tail"
                    >
                      {propertyAddress}
                    </Text>
                    <Ionicons name="map-outline" size={14} color="#6371F1" style={{ marginLeft: 4, marginTop: 2 }} />
                  </TouchableOpacity>
                ) : (
                  <Text
                    style={[styles.detailValue, { color: "#666", fontSize: 13, flex: 1 }]}
                    numberOfLines={3}
                    ellipsizeMode="tail"
                  >
                    {propertyAddress}
                  </Text>
                )}
              </View>
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
                  <Text style={styles.detailValue}>
                    ₦{formatCurrency(rentFee)}
                  </Text>
                </View>
                <View style={[styles.detailRow, { marginBottom: 4 }]}>
                  <Text style={styles.detailLabel}>
                    Host/Landlord Fee (incl. VAT):
                  </Text>
                  <Text style={styles.detailValue}>
                    - ₦{formatCurrency(hostAppCharge)}
                  </Text>
                </View>
                <View style={[styles.detailRow, { marginBottom: 4 }]}>
                  <Text style={styles.detailLabel}>Caution Fee (Held):</Text>
                  <Text style={styles.detailValue}>
                    ₦{formatCurrency(securityDeposit)}
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Your Earnings:</Text>
                  <Text style={styles.totalValue}>
                    ₦{formatCurrency(rentFee - hostAppCharge)}
                  </Text>
                </View>
                <Text style={styles.escrowNote}>
                  * Caution fee is held in escrow and will be released to guest
                  unless a dispute is raised.
                </Text>
              </>
            ) : (
              // Guest View: Show all charges
              <>
                <View style={[styles.detailRow, styles.breakdownRow, { marginBottom: 2 }]}>
                  <Text style={styles.detailLabel}>Rent Fee:</Text>
                  <Text style={styles.detailValue}>
                    ₦{formatCurrency(rentFee)}
                  </Text>
                </View>
                <View style={[styles.detailRow, styles.breakdownRow, { marginBottom: 2 }]}>
                  <Text style={styles.detailLabel}>Service Charge:</Text>
                  <Text style={styles.detailValue}>
                    ₦{formatCurrency(serviceCharge)}
                  </Text>
                </View>
                <View style={[styles.detailRow, styles.breakdownRow, { marginBottom: 2 }]}>
                  <Text style={styles.detailLabel}>
                    Caution Fee (Refundable):
                  </Text>
                  <Text style={styles.detailValue}>
                    ₦{formatCurrency(securityDeposit)}
                  </Text>
                </View>
                
                {/* Subtotal before coupon */}
                <View style={[styles.detailRow, styles.breakdownRow, { marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: "#f0f0f0" }]}>
                  <Text style={[styles.detailLabel, { fontWeight: "600" }]}>Subtotal:</Text>
                  <Text style={[styles.detailValue, { fontWeight: "600" }]}>
                    ₦{formatCurrency(rentFee + serviceCharge + securityDeposit)}
                  </Text>
                </View>
                
                {/* Coupon Discount Display */}
                {couponApplied && couponDiscount > 0 && (
                  <>
                    <View style={[styles.detailRow, styles.breakdownRow, { marginBottom: 2, marginTop: 2 }]}>
                      <Text style={[styles.detailLabel, { color: "#2E7D32", fontWeight: "600" }]}>
                        Coupon Code:
                      </Text>
                      <Text style={[styles.detailValue, { color: "#2E7D32", fontWeight: "600", fontSize: 14 }]}>
                        {couponCode}
                      </Text>
                    </View>
                    <View style={[styles.detailRow, styles.breakdownRow, { marginBottom: 2 }]}>
                      <Text style={[styles.detailLabel, { color: "#2E7D32", fontWeight: "600" }]}>
                        Coupon Discount {couponPercentage > 0 && `(${couponPercentage}%)`}:
                      </Text>
                      <Text style={[styles.detailValue, { color: "#2E7D32", fontWeight: "600" }]}>
                        -₦{formatCurrency(couponDiscount)}
                      </Text>
                    </View>
                    
                    <View style={{ marginTop: 2, marginBottom: 8, paddingHorizontal: 4 }}>
                      <Text style={{ color: "#D32F2F", fontStyle: "italic", fontSize: 11, textAlign: 'right' }}>
                        * Coupon applies to Rent & Service only. Caution fee is preserved.
                      </Text>
                    </View>
                    
                    {/* Show discounted subtotal if coupon applied */}
                    <View style={[styles.detailRow, styles.breakdownRow, { marginTop: 2 }]}>
                      <Text style={[styles.detailLabel, { fontWeight: "500", color: "#666" }]}>
                        After Coupon:
                      </Text>
                      <Text style={[styles.detailValue, { fontWeight: "500", color: "#666" }]}>
                        ₦{formatCurrency(displayAfterCoupon)}
                      </Text>
                    </View>
                  </>
                )}
                
                {/* App Charge and VAT - calculated after coupon discount */}
                {(pBreakdown?.guestFee !== undefined || hasRecalculated) ? (
                  <>
                    <View style={[styles.detailRow, styles.breakdownRow, { marginTop: 4, marginBottom: 2 }]}>
                      <Text style={styles.detailLabel}>App Charge (5%):</Text>
                      <Text style={styles.detailValue}>
                        ₦{formatCurrency(displayGuestFee)}
                      </Text>
                    </View>
                    <View style={[styles.detailRow, styles.breakdownRow, { marginBottom: 2 }]}>
                      <Text style={styles.detailLabel}>VAT (7.5%):</Text>
                      <Text style={styles.detailValue}>
                        ₦{formatCurrency(displayGuestVat)}
                      </Text>
                    </View>
                  </>
                ) : (
                  appCharge > 0 && (
                    <>
                      <View style={[styles.detailRow, styles.breakdownRow, { marginTop: 4, marginBottom: 2 }]}>
                        <Text style={styles.detailLabel}>App Charge (5%):</Text>
                        <Text style={styles.detailValue}>
                          ₦{formatCurrency(appCharge / 1.075)}
                        </Text>
                      </View>
                      <View style={[styles.detailRow, styles.breakdownRow, { marginBottom: 2 }]}>
                        <Text style={styles.detailLabel}>VAT (7.5%):</Text>
                        <Text style={styles.detailValue}>
                          ₦{formatCurrency(appCharge - appCharge / 1.075)}
                        </Text>
                      </View>
                    </>
                  )
                )}
                
                {/* Final Total / Amount Paid */}
                <View style={[styles.totalRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 2, borderTopColor: "#e0e0e0" }]}>
                  <Text style={[styles.totalLabel, { fontWeight: "700", fontSize: 16 }]}>
                    Amount Paid:
                  </Text>
                  <Text style={[styles.totalValue, { fontWeight: "700", fontSize: 18, color: couponApplied && couponDiscount > 0 ? "#2E7D32" : "#000" }]}>
                    ₦{formatCurrency(displayTotal)}
                  </Text>
                </View>
                
                {!isHostView && (
                  <Text style={styles.escrowNote}>
                    * Caution fee is held securely in escrow and will be refunded after checkout, provided the host raises no disputes.
                  </Text>
                )}
              </>
            )}

            {/* Booking Ref Code */}
            <View style={[styles.detailRow, { marginTop: 15 }]}>
              <Text style={styles.detailLabel}>Booking ref. code:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {refCode}
              </Text>
            </View>

            {/* Payment Method - Only for Confirmed/Ongoing Guest bookings */}
            {(statusLower === "ongoing" || statusLower === "confirmed") && !isHostView && (
              <View style={[styles.detailRow, { marginTop: 10 }]}>
                <Text style={styles.detailLabel}>Payment Method:</Text>
                <Text 
                  style={[
                    styles.detailValue,
                    couponApplied && { color: "#2E7D32", fontWeight: "600" }
                  ]}
                >
                  {displayPaymentMethod}
                </Text>
              </View>
            )}

            {/* Host Contact Information - Only for Ongoing/Confirmed Guest bookings */}
            {(statusLower === "ongoing" || statusLower === "confirmed") && !isHostView && (
              <View style={styles.hostContactSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Host Contact Information</Text>
                </View>
                <View style={[styles.detailRow, { marginTop: 10 }]}>
                    <View style={styles.hostInfoDetails}>
                        <Text style={styles.detailLabel}>Host Name</Text>
                        <Text style={styles.detailValue}>{booking?.listing?.host?.fullName || "Host"}</Text>
                    </View>
                </View>
                <TouchableOpacity 
                  style={styles.callHostBtn}
                  onPress={() => {
                    const phone = booking?.listing?.host?.phoneNumber || booking?.listing?.host?.phone;
                    if (phone) {
                      Linking.openURL(`tel:${phone}`);
                    } else {
                      showToastMessage("Host phone number not available", TOAST_TYPE.ERROR);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call" size={20} color="#fff" />
                  <Text style={styles.callHostBtnText}>
                    Call Host: {booking?.listing?.host?.phoneNumber || "N/A"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* ── Caution Fee Management (COMPLETED bookings only) ── */}
        {statusLower === "completed" &&
          securityDeposit > 0 &&
          (booking?.securityDepositResolution?.status === "PENDING" ||
            !booking?.securityDepositResolution) && (
            <View style={styles.cautionFeeCard}>
              <View style={styles.cautionFeeHeader}>
                <Ionicons name="shield-checkmark" size={24} color="#6371F1" />
                <Text style={styles.cautionFeeTitle}>Caution Fee Hold</Text>
              </View>

              <Text style={styles.cautionFeeSubtitle}>
                {isHostView
                  ? `The caution fee of ₦${securityDeposit.toLocaleString()} is currently held in escrow. Please inspect the property and release the fee if everything is in order, or raise a dispute if there are damages.`
                  : `Your caution fee of ₦${securityDeposit.toLocaleString()} is currently on hold. It will be automatically refunded within 24-48 hours if no damages are reported by the host.`}
              </Text>

              {isHostView ? (
                <View style={styles.cautionActionRow}>
                  <TouchableOpacity
                    style={styles.releaseBtn}
                    onPress={() => handleResolveCautionFee("RELEASE_TO_GUEST")}
                    disabled={isResolvingCaution}
                  >
                    {isResolvingCaution ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.releaseBtnText}>
                        Release to Guest
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.disputeBtnOutline}
                    onPress={() => setShowCautionDisputeModal(true)}
                    disabled={isResolvingCaution}
                  >
                    <Text style={styles.disputeBtnTextOutline}>
                      Raise Dispute
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.disputeBtnOutline}
                  onPress={() => setShowCautionDisputeModal(true)}
                  disabled={isResolvingCaution}
                >
                  <Text style={styles.disputeBtnTextOutline}>Raise Dispute</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

        {/* Show resolution status if not pending */}
        {statusLower === "completed" &&
          securityDeposit > 0 &&
          booking?.securityDepositResolution?.status &&
          booking?.securityDepositResolution?.status !== "PENDING" && (
            <View style={styles.cautionFeeCard}>
              <View style={styles.cautionFeeHeader}>
                <Ionicons
                  name={
                    booking.securityDepositResolution.status ===
                      "RELEASE_TO_GUEST" ||
                    booking.securityDepositResolution.status ===
                      "RELEASED_TO_GUEST"
                      ? "checkmark-circle"
                      : "alert-circle"
                  }
                  size={24}
                  color={
                    booking.securityDepositResolution.status ===
                      "RELEASE_TO_GUEST" ||
                    booking.securityDepositResolution.status ===
                      "RELEASED_TO_GUEST"
                      ? "#22C55E"
                      : "#EF4444"
                  }
                />
                <Text style={styles.cautionFeeTitle}>Caution Fee Status</Text>
              </View>

              <Text style={styles.cautionFeeSubtitle}>
                {(booking.securityDepositResolution.status ===
                  "RELEASE_TO_GUEST" ||
                  booking.securityDepositResolution.status ===
                    "RELEASED_TO_GUEST") &&
                  (isHostView
                    ? `The caution fee of ₦${securityDeposit.toLocaleString()} has been released to the guest.`
                    : `Your caution fee of ₦${securityDeposit.toLocaleString()} has been released back to you.`)}
                {(booking.securityDepositResolution.status ===
                  "RELEASE_TO_HOST" ||
                  booking.securityDepositResolution.status ===
                    "RELEASED_TO_HOST" ||
                  booking.securityDepositResolution.status ===
                    "RELEASE_TO_LANDLORD" ||
                  booking.securityDepositResolution.status ===
                    "RELEASED_TO_LANDLORD") &&
                  (isHostView
                    ? `The caution fee of ₦${securityDeposit.toLocaleString()} was credited to you due to reported damages or issues.`
                    : `The caution fee of ₦${securityDeposit.toLocaleString()} was credited to the host due to reported damages or issues.`)}
                {(booking.securityDepositResolution.status === "DISPUTED" ||
                  booking.securityDepositResolution.status === "DISPUTE") &&
                  `The caution fee of ₦${securityDeposit.toLocaleString()} is currently under investigation by our admin team and will be credited or adjusted based on their decision.`}
              </Text>

              <Text style={styles.cautionStatusText}>
                Current Status:{" "}
                {booking.securityDepositResolution.status.replace(/_/g, " ")}
              </Text>
              {booking.securityDepositResolution.reason && (
                <Text style={styles.cautionReasonText}>
                  Note: {booking.securityDepositResolution.reason}
                </Text>
              )}
            </View>
          )}

        {/* ── Review Section (COMPLETED bookings only) ── */}
        {statusLower === "completed" && (
          <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Ionicons name="star" size={24} color="#FFB800" />
              <Text style={styles.reviewTitle}>
                {isHostView ? "Rate your Guest" : "Rate your Stay"}
              </Text>
            </View>

            <Text style={styles.rateSubtitle}>
              {isHostView
                ? `How was your experience hosting ${booking?.bookedBy?.fullName || "this guest"}?`
                : `How was your experience staying at ${propertyName}? Your review helps the community.`}
            </Text>

            {/* 5-star rating stars */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => {
                const currentReview = isHostView
                  ? booking?.hostReview
                  : booking?.guestReview;
                const isSelected =
                  star <= (currentReview?.rating || reviewRating);
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
                !!(isHostView
                  ? booking?.hostReview?.rating
                  : booking?.guestReview?.rating) && styles.reviewBtnDisabled,
              ]}
              onPress={() => setShowReviewModal(true)}
              activeOpacity={0.8}
              disabled={
                !!(isHostView
                  ? booking?.hostReview?.rating
                  : booking?.guestReview?.rating) || isSubmittingReview
              }
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.reviewBtnText}>
                {isHostView
                  ? booking?.hostReview?.rating
                    ? "Review Submitted"
                    : "Write a Guest Review"
                  : booking?.guestReview?.rating
                    ? "Review Submitted"
                    : "Write a Property Review"}
              </Text>
            </TouchableOpacity>

            {(() => {
              const currentReview = isHostView
                ? booking?.hostReview
                : booking?.guestReview;
              const reviewImages = parseImages(currentReview?.images);
              if (reviewImages.length === 0 && !currentReview?.feedback)
                return null;

              return (
                <>
                  {reviewImages.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.reviewImagesScroll}
                    >
                      {reviewImages.map((img, imgIdx) => (
                        <Image
                          key={imgIdx}
                          source={{ uri: convertImageUrl(img) }}
                          style={styles.reviewImageThumb}
                          contentFit="cover"
                          cachePolicy="disk"
                          {...(Platform.OS === 'web' && { crossOrigin: "anonymous" })}
                        />
                      ))}
                    </ScrollView>
                  )}
                  {currentReview?.feedback ? (
                    <View style={styles.feedbackQuoteContainer}>
                      <Ionicons
                        name="chatbox-outline"
                        size={14}
                        color="#6371F1"
                        style={{ opacity: 0.3 }}
                      />
                      <Text style={styles.reviewFeedbackText}>
                        {currentReview.feedback}
                      </Text>
                    </View>
                  ) : null}
                </>
              );
            })()}
          </View>
        )}
      </ScrollView>

      {/* Checkout Confirmation Modal */}
      <CheckoutConfirmationModal
        visible={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        onConfirm={handleCheckout}
        isLoading={loading}
        title="Confirm Check-out"
        description="Are you sure you want to end your booking? This will officially mark your stay as completed."
        warningText="Please ensure you have packed all belongings and followed host's checkout instructions."
        cancelLabel="Cancel"
        confirmLabel="Confirm Check-out"
      />

      {/* Review Modal */}
      <ReviewFeedbackModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSubmit={handleSubmitReview}
        isLoading={isSubmittingReview}
        guestName={
          isHostView
            ? booking?.bookedBy?.fullName || "Guest"
            : booking?.listing?.host?.fullName || "Host"
        }
        rating={reviewRating}
        isHost={isHostView}
        toastVisible={toastVisible}
        toastConfig={toastConfig}
        onToastHide={() => setToastVisible(false)}
      />

      {/* Toast Notification */}
      <ToastNotification
        visible={toastVisible}
        type={toastConfig.type}
        message={toastConfig.message}
        onHide={() => setToastVisible(false)}
      />

      <CautionDisputeModal
        visible={showCautionDisputeModal}
        onClose={() => setShowCautionDisputeModal(false)}
        onSubmit={(reason) => handleResolveCautionFee("DISPUTE", reason)}
        isLoading={isResolvingCaution}
        reason={cautionDisputeReason}
        onReasonChange={setCautionDisputeReason}
        title="Raise Caution Fee Dispute"
        subtitle={
          isHostView
            ? "Provide clear details about the damages or issues. This will be reviewed by our compliance team within 24-48 hours."
            : "If you believe the caution fee was deducted unfairly, provide details about the issue. Our team will review within 24-48 hours."
        }
        placeholder={
          isHostView
            ? "Describe damage (e.g., Broken TV screen, stained rug...)"
            : "e.g., Property damage claims are false, item was in good condition, etc."
        }
        submitLabel="Submit Dispute"
      />

      {/* ── Caution Action Confirmation ── */}
      <CautionActionModal
        visible={showCautionActionModal}
        onClose={() => setShowCautionActionModal(false)}
        onConfirm={handleConfirmCautionAction}
        isLoading={isResolvingCaution}
        type={cautionActionType}
        amount={securityDeposit}
        targetName={booking?.bookedBy?.fullName || "the guest"}
      />

      {/* Fixed Bottom Section - Hide when capturing */}
      {!isCapturing && (
        <View style={styles.bottomSection}>
          {/* Refund Policy Notice - Hide for completed/cancelled if desired, keeping for all for now */}
          {statusLower !== "cancelled" &&
            statusLower !== "expired" &&
            statusLower !== "completed" && (
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
                  <Text style={styles.outlineDangerButtonText}>
                    Cancel Reservation
                  </Text>
                </Pressable>
              </>
            ) : statusLower === "failed" ? (
                <>
                  <Pressable
                    style={[styles.primaryButton, styles.buttonFlex]}
                    onPress={handleContinueToPayment}
                  >
                    <Text style={styles.primaryButtonText}>
                      Retry Payment
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.outlineButton, styles.buttonFlex, { marginLeft: 10 }]}
                    onPress={handleGoHome}
                  >
                    <Text style={styles.outlineButtonText}>Go Home</Text>
                  </Pressable>
                </>
            ) : statusLower === "ongoing" && !isHostView ? (
              <>
                <Pressable
                  style={[styles.primaryButton, styles.buttonFlex]}
                  onPress={() => setShowCheckoutModal(true)}
                >
                  <Text style={styles.primaryButtonText}>Check-out</Text>
                </Pressable>
                <Pressable
                  style={[styles.outlineButton, styles.buttonFlex]}
                  onPress={handleShare}
                >
                  <Text style={styles.outlineButtonText}>Share Stay</Text>
                </Pressable>
              </>
            ) : statusLower === "confirmed" ? (
              <>
                <Pressable
                  style={[styles.outlineButton, styles.buttonFlex]}
                  onPress={handleShare}
                >
                  <Text style={styles.outlineButtonText}>Share Booking</Text>
                </Pressable>
                <Pressable
                  style={[styles.outlineButton, styles.buttonFlex, { marginLeft: 10 }]}
                  onPress={handleGoHome}
                >
                  <Text style={styles.outlineButtonText}>Go Home</Text>
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
                  style={[styles.outlineButton, styles.buttonFlex, { marginLeft: 10 }]}
                  onPress={handleGoHome}
                >
                  <Text style={styles.outlineButtonText}>Go Home</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      )}

      {/* Cancellation Policy Overlay Modal */}
      <Modal
        visible={showPolicyModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={() => setShowPolicyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowPolicyModal(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{DEMO_TERMS.cancellationPolicy.title}</Text>
              <Pressable onPress={() => setShowPolicyModal(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color="#000" />
              </Pressable>
            </View>
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalLastUpdated}>
                Last Updated: {DEMO_TERMS.cancellationPolicy.lastUpdated}
              </Text>
              {DEMO_TERMS.cancellationPolicy.sections.map((section, index) => (
                <View key={index} style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{section.title}</Text>
                  <Text style={styles.modalBodyText}>{section.content}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Listing Agreement Overlay Modal */}
      <Modal
        visible={showAgreementModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={() => setShowAgreementModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowAgreementModal(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{DEMO_TERMS.listingAgreement.title}</Text>
              <Pressable onPress={() => setShowAgreementModal(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color="#000" />
              </Pressable>
            </View>
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalLastUpdated}>
                Last Updated: {DEMO_TERMS.listingAgreement.lastUpdated}
              </Text>
              {DEMO_TERMS.listingAgreement.sections.map((section, index) => (
                <View key={index} style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{section.title}</Text>
                  <Text style={styles.modalBodyText}>{section.content}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Download Options Modal */}
      <DownloadOptionsModal
        visible={showDownloadOptions}
        onClose={() => setShowDownloadOptions(false)}
        onSaveImage={captureAndSaveImage}
        onDownloadReceipt={handleReceiptDownload}
        onDownloadAgreement={handleAgreementDownload}
      />

      <DownloadConfirmationModal
        visible={downloadModalState.visible}
        onClose={() => setDownloadModalState(prev => ({ ...prev, visible: false }))}
        title={downloadModalState.title}
        message={downloadModalState.message}
        type={downloadModalState.type}
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
                The property will be released immediately and may no longer be
                available.
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
    alignItems: "flex-start",
    gap: 20,
    minHeight: 32, // Moderately reduced from 40 for better global spacing
  },
  breakdownRow: {
    minHeight: 24, // Tighter spacing specifically for pricing breakdown items
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
  reviewImagesScroll: {
    marginTop: 10,
    marginBottom: 5,
  },
  reviewImageThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: "#F3F4F6",
  },

  // Caution Fee Card - Section above the modal
  cautionFeeCard: {
    backgroundColor: "#F0F2FF",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  cautionFeeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  cautionFeeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#010135",
  },
  cautionFeeSubtitle: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
    marginBottom: 16,
  },
  cautionActionRow: {
    flexDirection: "row",
    gap: 12,
  },
  releaseBtn: {
    flex: 1,
    backgroundColor: "#22C55E",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  releaseBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  disputeBtnOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#EF4444",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  disputeBtnTextOutline: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
  },

  // Caution Dispute Modal Styles
  cautionOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  cautionModalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "85%",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  cautionModalTop: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
    position: "relative",
    height: 40,
  },
  cautionDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },
  cautionModalCloseBtn: {
    position: "absolute",
    right: 14,
    top: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  cautionModalCloseBtnPressed: {
    backgroundColor: "#E5E7EB",
  },
  cautionContentWrapper: {
    flex: 1,
    flexDirection: "column",
  },
  cautionContentScroll: {
    flex: 1,
  },
  cautionIconContainer: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  cautionIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  cautionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  cautionDesc: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  cautionFormSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  cautionFormLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B5563",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  cautionTextInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1F2937",
    minHeight: 110,
    fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
  },
  cautionCharCounter: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "right",
    marginTop: 6,
  },
  cautionInfoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 10,
    backgroundColor: "#DBEAFE",
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
  },
  cautionInfoText: {
    flex: 1,
    fontSize: 12,
    color: "#1E40AF",
    lineHeight: 18,
  },
  cautionActionPanel: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  cautionDismissBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  cautionDismissBtnActive: {
    backgroundColor: "#E5E7EB",
  },
  cautionDismissBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4B5563",
  },
  cautionSubmitBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#FB7363",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#FB7363",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cautionSubmitBtnActive: {
    backgroundColor: "#E55A50",
    ...Platform.select({
      ios: {
        shadowOpacity: 0.35,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  cautionSubmitContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cautionSubmitBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Policy Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    maxHeight: "85%",
    minHeight: 300,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    flex: 1,
    marginRight: 16,
  },
  modalBody: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  modalLastUpdated: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
    marginBottom: 16,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#010135",
    marginBottom: 10,
  },
  modalBodyText: {
    fontSize: 14,
    color: "#525252",
    lineHeight: 22,
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

  // Checkout Confirmation Modal Styles
  confirmCheckoutModal: {
    width: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    alignSelf: "center",
    marginTop: "auto",
    marginBottom: "auto",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  checkoutIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  checkoutModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  checkoutModalDesc: {
    fontSize: 15,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  checkoutWarningBox: {
    flexDirection: "row",
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    marginBottom: 24,
    alignItems: "center",
    gap: 10,
  },
  checkoutWarningText: {
    flex: 1,
    fontSize: 13,
    color: "#B91C1C",
    lineHeight: 18,
    fontWeight: "500",
  },
  checkoutActionRow: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  checkoutCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  checkoutCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4B5563",
  },
  checkoutConfirmBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#6371F1",
    alignItems: "center",
  },
  checkoutConfirmText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Host Contact Styles
  hostContactSection: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  hostInfoDetails: {
    flex: 1,
    gap: 4,
  },
  callHostBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#22C55E",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  callHostBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default BookingConfirmationScreen;
