/**
 * Host Booking Details Screen
 * Displays full booking details for a host's property booking.
 * Data flows in via route params from HostBookingsScreen,
 * with a background API fetch for additional fields.
 */

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import ArrowLeftIcon from "../../assets/icons/bookings/arrow-left.svg";
import DownloadIcon from "../../assets/icons/bookings/download.svg";
import DownloadConfirmationModal from "../../components/common/DownloadConfirmationModal";
import DownloadOptionsModal from "../../components/common/DownloadOptionsModal";
import ToastNotification, {
    TOAST_TYPE,
} from "../../components/common/ToastNotification";
import BookingActionModal, {
    BOOKING_ACTION,
} from "../../components/modals/BookingActionModal";
import CancelBookingModal from "../../components/modals/CancelBookingModal";
import CautionDisputeModal from "../../components/modals/CautionDisputeModal";
import ReviewFeedbackModal from "../../components/modals/ReviewFeedbackModal";
import bookingService from "../../services/bookingService";
import configService from "../../services/configService";
import { downloadFile, saveRefAsImage } from "../../utils/downloadUtils";
import { resolveImageUrlSync } from "../../utils/imageUtils";

const logoImage = require("../../assets/images/LUNEST PNG 1 1.png"); // New Import

// Status badge colours
const STATUS_COLORS = {
  CONFIRMED: { bg: "rgba(49, 235, 61, 0.3)", text: "#2e7d32" },
  PENDING: { bg: "rgba(253, 174, 49, 0.2)", text: "#f57f17" },
  RESERVED: { bg: "rgba(253, 174, 49, 0.2)", text: "#f57f17" },
  CANCELLED: { bg: "rgba(244, 67, 54, 0.2)", text: "#c62828" },
  CANCELED: { bg: "rgba(244, 67, 54, 0.2)", text: "#c62828" },
  COMPLETED: { bg: "rgba(99, 113, 241, 0.2)", text: "#1565c0" },
  ONGOING: { bg: "rgba(25, 45, 255, 0.15)", text: "#1976d2" },
  EXPIRED: { bg: "rgba(158, 158, 158, 0.2)", text: "#616161" },
};

// Fallback property image removed as per requirement for strict data display
// const FALLBACK_PROPERTY_IMAGE = require("../../assets/images/prop_image.png");

const HostBookingDetailsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const bookingId = params.bookingId || params.id;
  const viewRef = useRef();

  // Debug: trace incoming route params
  if (__DEV__) {
    console.log(
      "[HostBookingDetails] Route params:",
      JSON.stringify({
        id: params.id,
        bookingRefCode: params.bookingRefCode,
        propertyName: params.propertyName,
        status: params.status,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        price: params.price,
        guestName: params.guestName,
        propertyImage: params.propertyImage ? "YES" : "NO",
      }),
    );
  }

  // Full booking from API
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(!!bookingId);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [resolvedImageUri, setResolvedImageUri] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [downloadModalState, setDownloadModalState] = useState({
    visible: false,
    type: 'loading',
    title: 'Downloading...',
    message: 'Please wait while we prepare your document.'
  });
  // Review state
  const [reviewRating, setReviewRating] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isResolvingCaution, setIsResolvingCaution] = useState(false);
  const [showCautionDisputeModal, setShowCautionDisputeModal] = useState(false);
  const [cautionDisputeReason, setCautionDisputeReason] = useState("");
  const [showGuestProfileModal, setShowGuestProfileModal] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false); // Added missing state for screenshot capture flow

  // Modal state for booking actions (confirm/cancel)
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(BOOKING_ACTION.CONFIRM);

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
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Fetch full booking details from API
  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchBooking = async () => {
      try {
        console.log("[HostBookingDetails] Fetching booking:", bookingId);
        const result = await bookingService.fetchHostBookings();
        if (cancelled) return;

        if (result.success && Array.isArray(result.bookings)) {
          const found = result.bookings.find(
            (b) => String(b._id) === bookingId,
          );
          if (found) {
            console.log("[HostBookingDetails] Found booking from API");
            setBooking(found);

            // Resolve property image URL
            try {
              const rawImg =
                found.listing?.images?.[0] ||
                found.listing?.propertyImages?.[0] ||
                found.listing?.coverImage ||
                found.propertyImages?.[0] ||
                found.propertyImage ||
                found.listing?.host?.avatar ||
                null;

              if (rawImg) {
                const baseUrl = configService.getBaseURLSync();
                // Use the standardized utility to resolve and strip stale IPs
                const finalUrl = resolveImageUrlSync(rawImg, baseUrl);
                if (finalUrl) {
                  setResolvedImageUri(finalUrl);
                }
              }
            } catch (imgErr) {
              console.warn("[HostBookingDetails] Image resolve error:", imgErr);
            }
          } else {
            console.warn(
              "[HostBookingDetails] Booking not found in API response",
            );
          }
        }
      } catch (err) {
        console.warn("[HostBookingDetails] Fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBooking();

    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const onRefresh = useCallback(async () => {
    let cancelled = false;
    setRefreshing(true);
    // Re-fetch booking details
    try {
      const result = await bookingService.fetchHostBookings();
      if (cancelled) return;
      if (result.success && Array.isArray(result.bookings)) {
        const found = result.bookings.find((b) => String(b._id) === bookingId);
        if (found) {
          setBooking(found);
        }
      }
    } catch (err) {
      console.warn("[HostBookingDetails] Refresh error:", err);
    } finally {
      if (!cancelled) setRefreshing(false);
    }
    return () => { cancelled = true; };
  }, [bookingId]);

  // ───── Derive display values (route params first, then API data) ─────

  const status = (booking?.status || params.status || "PENDING").toUpperCase();

  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.PENDING;

  const bookingRefCode =
    booking?.referenceCode ||
    params.bookingRefCode ||
    `LNS-${bookingId?.slice(-8).toUpperCase() || "N/A"}`;

  const propertyName =
    booking?.listing?.title ||
    booking?.listing?.propertyTitle ||
    booking?.propertyName ||
    params.propertyName ||
    "Property";

  const propertyAddress =
    [
      booking?.listing?.address ||
        booking?.listing?.location ||
        params.propertyAddress,
      booking?.listing?.city,
      booking?.listing?.state,
      booking?.listing?.country,
    ]
      .filter(Boolean)
      .join(", ") || "Address on file";

  // Property image with stability for RCTImageView
  const propertyImageSource = useMemo(() => {
    if (
      resolvedImageUri &&
      typeof resolvedImageUri === "string" &&
      resolvedImageUri.startsWith("http")
    ) {
      return { uri: resolvedImageUri };
    }
    if (
      params.propertyImage &&
      typeof params.propertyImage === "string" &&
      params.propertyImage.startsWith("http")
    ) {
      return { uri: params.propertyImage };
    }
    return null; // Strict: no fallback image
  }, [resolvedImageUri, params.propertyImage]);

  // Dates
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const checkIn = booking?.checkIn
    ? formatDate(booking.checkIn)
    : params.checkIn
      ? formatDate(params.checkIn)
      : "-";
  const checkOut = booking?.checkOut
    ? formatDate(booking.checkOut)
    : params.checkOut
      ? formatDate(params.checkOut)
      : "-";

  // Nights
  const nights = (() => {
    if (booking?.checkIn && booking?.checkOut) {
      const diff = Math.abs(
        new Date(booking.checkOut) - new Date(booking.checkIn),
      );
      return Math.ceil(diff / (1000 * 60 * 60 * 24)) || 1;
    }
    if (params.checkIn && params.checkOut) {
      const diff = Math.abs(
        new Date(params.checkOut) - new Date(params.checkIn),
      );
      return Math.ceil(diff / (1000 * 60 * 60 * 24)) || 1;
    }
    return parseInt(params.nights) || 1;
  })();

  // Guests
  const guestsDisplay = (() => {
    const adults =
      booking?.guests?.adults || parseInt(params.guestsAdults) || 1;
    const children =
      booking?.guests?.children || parseInt(params.guestsChildren) || 0;
    const pets = booking?.guests?.pets || parseInt(params.guestsPets) || 0;
    const parts = [];
    if (adults) parts.push(`${adults} Adult${adults > 1 ? "s" : ""}`);
    if (children) parts.push(`${children} Child${children > 1 ? "ren" : ""}`);
    if (pets) parts.push(`${pets} Pet${pets > 1 ? "s" : ""}`);
    return parts.join(", ") || "1 Adult";
  })();

  // Booked on
  const bookedOn = (() => {
    if (booking?.createdAt) return formatDate(booking.createdAt);
    if (params.createdAt) return formatDate(params.createdAt);
    return "-";
  })();

  // Payment — use pricingBreakdown from API when available
  const breakdown = booking?.pricingBreakdown;
  const totalPrice =
    booking?.totalAmount?.price ?? parseFloat(params.price) ?? 0;

  // Host-centric pricing derived from breakdown or calculation
  const rentFee = breakdown?.rentFee ?? Math.round(totalPrice * 0.7);
  const serviceFee = breakdown?.serviceCharge ?? Math.round(totalPrice * 0.05);

  // Use listing's security deposit as fallback to ensure consistency across the app
  const securityDeposit =
    breakdown?.securityDeposit ??
    breakdown?.cautionFee ??
    booking?.listing?.securityDeposit ??
    booking?.listing?.cautionFee ??
    Math.round(totalPrice * 0.025);

  // Taxable amount is typically Rent + Service Charge
  const hostSubtotal = rentFee + serviceFee;

  // Host service fee (commission) and its VAT
  const hostFee = breakdown?.hostFee ?? Math.round(hostSubtotal * 0.03);
  const hostVat = breakdown?.hostVat ?? Math.round(hostFee * 0.075);
  const totalHostDeduction = hostFee + hostVat;

  const hostEarnings =
    breakdown?.hostEarnings ?? hostSubtotal - totalHostDeduction;
  const guestTotal = breakdown?.guestTotal ?? totalPrice;

  // App charge and VAT as defined in the pricing model for receipt generation
  const appCharge = breakdown?.appCharge || breakdown?.guestFee || 0;
  const vat = breakdown?.vat || breakdown?.guestVat || 0;

  const paymentMethod =
    booking?.paymentMethod || params.paymentMethod || "Card";

  // Guest info
  const guestName = (() => {
    const bookedBy = booking?.bookedBy;
    if (bookedBy?.fullName) return bookedBy.fullName;
    if (bookedBy?.firstName)
      return `${bookedBy.firstName} ${bookedBy.lastName || ""}`.trim();
    return params.guestName || "Guest";
  })();

  const guestPhone = (() => {
    const bookedBy = booking?.bookedBy;
    const raw =
      bookedBy?.phoneNumber || bookedBy?.phone || params.guestPhone || "";
    if (!raw || raw === "-") return "-";
    
    // For confirmed and ongoing bookings, show the full number
    if (status === "CONFIRMED" || status === "ONGOING") return raw;
    
    // Otherwise, mask it (per user request)
    return raw.length > 7
      ? `${raw.slice(0, 4)}••••••${raw.slice(-3)}`
      : "•••••••••••";
  })();

  const guestEmail = (() => {
    const bookedBy = booking?.bookedBy;
    const raw =
      bookedBy?.emailAddress || bookedBy?.email || params.guestEmail || "";
    if (!raw || raw === "-") return "-";
    // Mask email: show first 2 chars + ••• @ first char of domain + •••
    const parts = raw.split("@");
    if (parts.length !== 2) return raw;
    const [name, domain] = parts;
    const maskedName = name.slice(0, 2) + "•••";
    const domainParts = domain.split(".");
    const maskedDomain =
      domainParts[0].slice(0, 1) +
      "•••" +
      (domainParts.length > 1 ? "." + domainParts.slice(1).join(".") : "");
    return `${maskedName}@${maskedDomain}`;
  })();

  const guestAvatar =
    booking?.bookedBy?.profilePicture ||
    booking?.bookedBy?.avatar ||
    params.guestAvatar ||
    null;

  const isVerified = booking?.bookedBy?.isVerified ?? true;

  // Additional notes
  const additionalNotes =
    booking?.additionalNotes || params.additionalNotes || "";

  // ───── Actions ─────

  const handleGoBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(host-tabs)/bookings");
  };

  const handleContactGuest = () => {
    if (
      (status === "CONFIRMED" || status === "ONGOING") &&
      guestPhone !== "-" && guestPhone !== "Hidden until confirmed"
    ) {
      const telUrl = `tel:${guestPhone.replace(/\s/g, "")}`;
      if (Platform.OS === 'web') {
        window.open(telUrl, '_self');
      } else {
        Linking.openURL(telUrl);
      }
    } else {
      Alert.alert(
        "Contact Guest",
        "Phone contact is available only for confirmed bookings.",
      );
    }
  };

  const handleApproveBooking = () => {
    setActionType(BOOKING_ACTION.CONFIRM);
    setShowActionModal(true);
  };

  const handleActionConfirmed = async () => {
    setIsActionLoading(true);
    const newStatus =
      actionType === BOOKING_ACTION.CONFIRM ? "CONFIRMED" : "CANCELED";

    try {
      const result = await bookingService.updateBookingStatus(
        bookingId,
        newStatus,
      );

      setShowActionModal(false);
      setIsActionLoading(false);

      if (result.success) {
        Alert.alert(
          "Success",
          `Booking ${actionType === BOOKING_ACTION.CONFIRM ? "confirmed" : "cancelled"} successfully!`,
          [{ text: "OK", onPress: onRefresh }],
        );
      } else {
        Alert.alert("Error", result.message || "Failed to update booking");
      }
    } catch (err) {
      setShowActionModal(false);
      setIsActionLoading(false);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  const handleCancelBooking = () => {
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async ({ reason, note }) => {
    setIsCancelling(true);
    try {
      const result = await bookingService.updateBookingStatus(
        bookingId,
        "CANCELLED",
        { cancelReason: reason, cancelNote: note },
      );
      if (result.success) {
        setShowCancelModal(false);
        Alert.alert("Cancelled", "Booking has been cancelled.", [
          { text: "OK", onPress: handleGoBack },
        ]);
      } else {
        Alert.alert("Error", result.message || "Failed to cancel.");
      }
    } catch (e) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  // ───── Download Handlers ─────

  const generateReceiptHTML = (logoSrc) => {
    return `
      <html><head><style>
        body{font-family:'Helvetica Neue',Arial,sans-serif;padding:40px;color:#1a1a2e;}
        h1{color:#010135;font-size:22px;text-align:center;letter-spacing:2px; margin-top: 10px;}
        .header{text-align:center;border-bottom:3px solid #010135;padding-bottom:16px;margin-bottom:24px;}
        .header-logo img { height: 60px; width: auto; }
        .section{margin-bottom:20px;}
        .section-title{font-size:15px;font-weight:700;color:#010135;border-bottom:1px solid #eee;padding-bottom:6px;margin-bottom:10px;}
        .row{display:flex;justify-content:space-between;padding:6px 0;}
        .label{color:#666;font-size:13px;} .value{font-size:13px;font-weight:600;}
        .total{border-top:2px solid #010135;padding-top:10px;margin-top:10px;font-weight:700;font-size:15px;}
        .footer{text-align:center;margin-top:30px;font-size:10px;color:#999;}
      </style></head><body>
        <div class="header">
          <div class="header-logo"><img src="${logoSrc}" alt="Lunest" /></div>
          <h1>LUNEST</h1><p>Booking Receipt</p>
        </div>
        <div class="section">
          <div class="section-title">Booking Details</div>
          <div class="row"><span class="label">Reference</span><span class="value">${bookingRefCode}</span></div>
          <div class="row"><span class="label">Property</span><span class="value">${propertyName}</span></div>
          <div class="row"><span class="label">Check-in</span><span class="value">${checkIn}</span></div>
          <div class="row"><span class="label">Check-out</span><span class="value">${checkOut}</span></div>
          <div class="row"><span class="label">Guests</span><span class="value">${guestsDisplay}</span></div>
          <div class="row"><span class="label">Status</span><span class="value">${status}</span></div>
        </div>
        <div class="section">
          <div class="section-title">Host/Landlord Payment Breakdown</div>
          <div class="row"><span class="label">Rent Fee</span><span class="value">₦${rentFee.toLocaleString()}</span></div>
          <div class="row"><span class="label">Service Charge</span><span class="value">₦${serviceFee.toLocaleString()}</span></div>
          <div class="row"><span class="label">Subtotal (Earnings)</span><span class="value">₦${(rentFee + serviceFee).toLocaleString()}</span></div>
          <div class="row"><span class="label">LUNEST Service Fee (3%)</span><span class="value">-₦${hostFee.toLocaleString()}</span></div>
          <div class="row"><span class="label">VAT on Service Fee (7.5%)</span><span class="value">-₦${hostVat.toLocaleString()}</span></div>
          <div class="row total"><span>Net Earning</span><span>₦${hostEarnings.toLocaleString()}</span></div>
        </div>
        <div class="section">
          <div class="section-title">Escrow & Total Tracking</div>
          <div class="row"><span class="label">Caution Fee </span><span class="value">₦${securityDeposit.toLocaleString()} (${(booking?.securityDepositResolution?.status || "HELD").replace(/_/g, " ")})</span></div>
          <div class="row"><span class="label">Guest Total Paid</span><span class="value">₦${guestTotal.toLocaleString()}</span></div>
          <div class="row"><span class="label">Payment Method</span><span class="value">${paymentMethod}</span></div>
        </div>
        <div class="section">
          <div class="section-title">Lunest Fee</div>
          <div class="row"><span class="label">App Charge</span><span class="value">₦${appCharge.toLocaleString()}</span></div>
          <div class="row"><span class="label">VAT</span><span class="value">₦${vat.toLocaleString()}</span></div>
        </div>
        <div class="section">
          <div class="section-title">Guest Information</div>
          <div class="row"><span class="label">Name</span><span class="value">${guestName}</span></div>
        </div>
        <div class="footer"><p>Generated by LUNEST on ${new Date().toLocaleDateString()}</p></div>
      </body></html>
    `;
  };

  const handleDownloadReceipt = async () => {
    setIsDownloading(true);
    setDownloadModalState({
      visible: true,
      type: 'loading',
      title: 'Downloading Receipt...',
      message: 'Generating your receipt PDF.'
    });
    try {
      const result = await bookingService.fetchReceipt(bookingId);
      if (result.success && result.url) {
        await downloadFile(result.url, `Receipt_${bookingRefCode}.pdf`, "application/pdf");
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
      setIsDownloading(false);
      setShowDownloadOptions(false);
    }
  };

  const handleDownloadAgreement = async () => {
    const allowedStatuses = ["CONFIRMED", "ONGOING", "COMPLETED"];
    if (!allowedStatuses.includes(status)) {
      Alert.alert(
        "Download Restricted",
        "Rental agreements are only available for confirmed, ongoing, or completed bookings.",
      );
      return;
    }

    setIsDownloading(true);
    setDownloadModalState({
      visible: true,
      type: 'loading',
      title: 'Downloading Agreement...',
      message: 'Generating your rental agreement PDF.'
    });
    try {
      const result = await bookingService.fetchHostAgreement(bookingId);
      if (result.success && result.url) {
        await downloadFile(result.url, `Host_Agreement_${bookingRefCode}.pdf`, "application/pdf");
        setDownloadModalState({
          ...downloadModalState,
          type: 'success',
          title: 'Download Complete',
          message: 'The agreement has been downloaded successfully.'
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
      setIsDownloading(false);
      setShowDownloadOptions(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!viewRef.current) {
        Alert.alert("Error", "Booking summary view is not ready.");
        return;
    }
    
    try {
        // 1. Show the downloading modal first
        setDownloadModalState({
            visible: true,
            type: 'loading',
            title: 'Saving Image...',
            message: 'Preparing your booking summary image.'
        });

        // 2. Hide UI clutter (buttons/headers)
        setIsCapturing(true);
        setIsDownloading(true);
        
        // 3. Brief delay to allow React to re-render without buttons
        setTimeout(async () => {
            try {
                if (Platform.OS === 'web') {
                    const { toPng } = require('html-to-image');
                    const dataUrl = await toPng(viewRef.current, {
                        backgroundColor: "#FFFFFF",
                        cacheBust: true,
                        includeQueryParams: true,
                        pixelRatio: 2,
                    });
                    await saveRefAsImage(dataUrl, `Booking_Summary_${bookingRefCode}.png`);
                } else {
                    const uri = await captureRef(viewRef, {
                        format: "png",
                        quality: 1,
                    });
                    await saveRefAsImage(uri, `Booking_Summary_${bookingRefCode}.png`);
                }

                setDownloadModalState({
                    visible: true,
                    type: 'success',
                    title: 'Image Saved',
                    message: 'The booking summary has been saved successfully.'
                });
            } catch (e) {
                console.error("[Download] Image capture error:", e);
                setDownloadModalState({
                    visible: true,
                    type: 'error',
                    title: 'Capture Failed',
                    message: e?.message?.includes('CORS')
                        ? 'Image server security (CORS) prevented the capture. Please contact support.'
                        : 'Failed to generate image summary. Please try again.'
                });
            } finally {
                setIsCapturing(false);
                setIsDownloading(false);
                setShowDownloadOptions(false);
            }
        }, 500); // Increased delay for UI stability
    } catch (outerError) {
        console.error("[Download] Outer capture error:", outerError);
        setIsDownloading(false);
        setIsCapturing(false);
    }
  };

  const handleDownloadPress = () => {
    setShowDownloadOptions(true);
  };

  // ───── Review Handlers ─────

  const handleStarPress = (star) => {
    if (hasReviewed) return;
    setReviewRating(star);
    // Auto-open review modal after selecting rating
    setTimeout(() => setShowReviewModal(true), 300);
  };

  const handleSubmitReview = async (reviewData) => {
    setIsSubmittingReview(true);
    try {
      const finalRating = reviewData.rating || reviewRating;
      let uploadedImageUrls = reviewData.images || [];

      // 1. Upload images if any
      if (reviewData.images && reviewData.images.length > 0) {
        console.log("[HostBookingDetails] Uploading review images...");
        const uploadResult = await bookingService.uploadReviewImages(
          reviewData.images,
        );
        if (uploadResult.success && uploadResult.images) {
          uploadedImageUrls = uploadResult.images;
        } else {
          Alert.alert(
            "Upload Failed",
            "Could not upload review images. Proceeding without them?",
          );
          uploadedImageUrls = [];
        }
      }

      // 2. Submit review with uploaded URLs
      const result = await bookingService.submitReview(
        bookingId,
        finalRating,
        reviewData.feedback,
        uploadedImageUrls,
        reviewData.categories,
        "HOST",
      );
      if (result.success) {
        setShowReviewModal(false);
        setHasReviewed(true);
        showToastMessage("Thank you for your feedback!", TOAST_TYPE.SUCCESS);

        // Update local booking state
        if (booking) {
          setBooking({
            ...booking,
            hostReview: {
              rating: finalRating,
              categories: reviewData.categories,
              feedback: reviewData.feedback,
              images: reviewData.images,
              reviewedAt: new Date(),
            },
          });
          setReviewRating(finalRating);
        }
      } else {
        showToastMessage(
          result.message || "Failed to submit review.",
          TOAST_TYPE.ERROR,
        );
      }
    } catch (error) {
      console.error("[HostBookingDetails] Submit review error:", error);
      showToastMessage(
        "An error occurred. Please try again.",
        TOAST_TYPE.ERROR,
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleResolveCautionFee = async (action, reason = "") => {
    if (!bookingRefCode) return;

    if (action === "RELEASE_TO_GUEST") {
      Alert.alert(
        "Release Caution Fee",
        "Are you sure you want to release the caution fee to the guest? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm Release",
            onPress: () => executeResolveCautionFee(action, reason),
            style: "default",
          },
        ],
      );
    } else {
      executeResolveCautionFee(action, reason);
    }
  };

  const executeResolveCautionFee = async (action, reason = "") => {
    setIsResolvingCaution(true);
    try {
      const result = await bookingService.resolveCautionFee(
        bookingRefCode,
        action,
        reason,
      );

      if (result.success) {
        showToastMessage(
          `Caution fee ${action === "DISPUTE" ? "dispute submitted" : "released"} successfully!`,
          TOAST_TYPE.SUCCESS,
        );
        // Update local booking state with the mapped status matching backend
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
              resolvedBy: "HOST",
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
        "[HostBookingDetails] Caution fee resolution error:",
        error,
      );
      showToastMessage(
        "An error occurred. Please try again.",
        TOAST_TYPE.ERROR,
      );
    } finally {
      setIsResolvingCaution(false);
    }
  };

  // ───── Loading state ─────

  // Show quick skeleton with route params while API loads
  const showSkeleton = loading && !params.propertyName;

  if (showSkeleton) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator size="large" color="#010135" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </SafeAreaView>
    );
  }

  // ───── Render ─────
  const isCancellable =
    status === "CONFIRMED" || status === "PENDING" || status === "RESERVED";
  const isCompleted = status === "COMPLETED";
  const alreadyReviewed = hasReviewed || !!booking?.hostReview?.rating;

  return (
    <SafeAreaView
      style={[styles.screen, Platform.OS === "android" && { paddingTop: 32 }]}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={handleGoBack} hitSlop={12}>
          <ArrowLeftIcon width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <Pressable
          style={styles.headerBtn}
          hitSlop={12}
          onPress={handleDownloadPress}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#010135" />
          ) : (
            <DownloadIcon width={22} height={22} />
          )}
        </Pressable>
      </View>

      {/* ── Scrollable Content ── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#010135"]}
          />
        }
      >
        <View
          ref={viewRef}
          collapsable={false}
          style={{ backgroundColor: "#F9FAFB", paddingBottom: 20 }}
        >
          <Image
            source={logoImage}
            style={{
              width: 100,
              height: 40,
              resizeMode: "contain",
              alignSelf: "center",
              marginVertical: 10,
            }}
          />
          {/* ── Property Card ── */}
          <View style={styles.card}>
            <Image
              source={propertyImageSource}
              style={styles.propertyImage}
              resizeMode="cover"
              fadeDuration={0}
              {...(Platform.OS === 'web' && { crossOrigin: "anonymous" })}
            />
            <View style={styles.propertyInfo}>
              <Text style={styles.propertyName}>{propertyName}</Text>
              {propertyAddress ? (
                <Text style={styles.propertyAddress}>{propertyAddress}</Text>
              ) : null}
              <View style={styles.statusRow}>
                <Text style={styles.infoLabel}>Booking Status</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusColor.bg },
                  ]}
                >
                  <Text
                    style={[styles.statusText, { color: statusColor.text }]}
                  >
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Booking Info Card ── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Booking Info</Text>
            <View style={styles.infoRows}>
              <InfoRow label="Check-in:" value={checkIn} />
              <InfoRow label="Check-out:" value={checkOut} />
              <InfoRow
                label="Total Nights:"
                value={`${nights} Night${nights > 1 ? "s" : ""}`}
              />
              <InfoRow label="Guests:" value={guestsDisplay} />
              <InfoRow label="Booked On:" value={bookedOn} />
            </View>
          </View>

          {/* ── Payment Summary Card ── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
            <View style={styles.infoRows}>
              <InfoRow
                label="Rent Fee:"
                value={`₦${rentFee.toLocaleString()}`}
              />
              {serviceFee > 0 && (
                <InfoRow
                  label="Service Charge:"
                  value={`₦${serviceFee.toLocaleString()}`}
                />
              )}
              <View
                style={[
                  styles.totalRow,
                  {
                    marginTop: 8,
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: "#eee",
                    marginBottom: 8,
                  },
                ]}
              >
                <Text style={styles.infoLabel}>Gross Earning:</Text>
                <Text style={styles.infoValue}>
                  ₦{(rentFee + serviceFee).toLocaleString()}
                </Text>
              </View>
              <InfoRow
                label="App Fee DEDUCTION (3%):"
                value={`-₦${hostFee.toLocaleString()}`}
                valueStyle={{ color: "#EF4444" }}
              />
              <InfoRow
                label="VAT on App Fee (7.5%):"
                value={`-₦${hostVat.toLocaleString()}`}
                valueStyle={{ color: "#EF4444" }}
              />
            </View>

            <View
              style={[
                styles.totalRow,
                {
                  marginTop: 8,
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: "#eee",
                },
              ]}
            >
              <Text style={[styles.infoLabel, { fontWeight: "700" }]}>
                Net Earnings:
              </Text>
              <Text
                style={[
                  styles.infoValue,
                  { color: "#22C55E", fontWeight: "700" },
                ]}
              >
                ₦{hostEarnings.toLocaleString()}
              </Text>
            </View>

            <View style={[styles.infoRows, { marginTop: 12 }]}>
              <InfoRow
                label="Caution Fee (On Hold):"
                value={`₦${securityDeposit.toLocaleString()}`}
                valueStyle={{ color: "#6B7280" }}
              />
            </View>
          </View>

          <View style={{ height: 12 }} />
          <InfoRow label="Payment Method:" value={paymentMethod} />

        {/* ── Guest Information Card ── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Guest Information</Text>
          <View style={styles.infoRows}>
            <InfoRow label="Name:" value={guestName} />
            <InfoRow label="Phone:" value={guestPhone} />
            <InfoRow label="Email Address:" value={guestEmail} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>KYC Status:</Text>
              <View style={styles.kycBadge}>
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color={isVerified ? "#31EB3D" : "#bdbdbd"}
                />
                <Text
                  style={[
                    styles.kycText,
                    { color: isVerified ? "#31EB3D" : "#bdbdbd" },
                  ]}
                >
                  {isVerified ? "VERIFIED" : "UNVERIFIED"}
                </Text>
              </View>
            </View>
          </View>
          {!isCapturing && (
            <Pressable
              style={styles.viewProfileBtn}
              onPress={() =>
                router.push({
                  pathname: "/guest-information",
                  params: {
                    guestId: booking?.bookedBy?._id || params.bookedBy,
                    guestName: guestName,
                    guestAvatar: guestAvatar,
                    isVerified: isVerified ? "true" : "false",
                  },
                })
              }
            >
              <Ionicons name="person-outline" size={16} color="#fff" />
              <Text style={styles.viewProfileText}>View Profile</Text>
            </Pressable>
          )}
        </View>

        {/* ── Additional Notes Card ── */}
        {additionalNotes ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <Text style={styles.notesText} numberOfLines={3}>
              {additionalNotes}
            </Text>
          </View>
        ) : null}

        <View style={styles.footerBranding}>
            <Text style={styles.footerBrandingText}>Generated by LUNEST • You are Booked in Style!</Text>
        </View>
        </View>

        {/* ── Caution Fee Management (COMPLETED bookings only) ── */}
        {isCompleted &&
          securityDeposit > 0 &&
          (booking?.securityDepositResolution?.status === "PENDING" ||
            !booking?.securityDepositResolution) && (
            <View style={styles.cautionFeeCard}>
              <View style={styles.cautionFeeHeader}>
                <Ionicons name="shield-checkmark" size={24} color="#6371F1" />
                <Text style={styles.cautionFeeTitle}>
                  Caution Fee Management
                </Text>
              </View>

              <Text style={styles.cautionFeeSubtitle}>
                The caution fee of ₦{securityDeposit.toLocaleString()} is
                currently on hold. Please inspect the property and decide
                whether to release it to the guest or raise a dispute if there
                are damages.
              </Text>

              <View style={styles.cautionFeeActionRow}>
                <TouchableOpacity
                  style={styles.releaseBtn}
                  onPress={() => handleResolveCautionFee("RELEASE_TO_GUEST")}
                  disabled={isResolvingCaution}
                >
                  <Text style={styles.releaseBtnText}>Release to Guest</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.disputeBtnHost}
                  onPress={() => setShowCautionDisputeModal(true)}
                  disabled={isResolvingCaution}
                >
                  <Text style={styles.disputeBtnText}>Raise Dispute</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        {/* Show resolution status if not pending */}
        {isCompleted &&
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
                      "RELEASED_TO_GUEST" ||
                    booking.securityDepositResolution.status ===
                      "RELEASE_TO_HOST" ||
                    booking.securityDepositResolution.status ===
                      "RELEASED_TO_HOST" ||
                    booking.securityDepositResolution.status ===
                      "RELEASE_TO_LANDLORD" ||
                    booking.securityDepositResolution.status ===
                      "RELEASED_TO_LANDLORD"
                      ? "checkmark-circle"
                      : "alert-circle"
                  }
                  size={24}
                  color={
                    booking.securityDepositResolution.status ===
                      "RELEASE_TO_GUEST" ||
                    booking.securityDepositResolution.status ===
                      "RELEASED_TO_GUEST" ||
                    booking.securityDepositResolution.status ===
                      "RELEASE_TO_HOST" ||
                    booking.securityDepositResolution.status ===
                      "RELEASED_TO_HOST" ||
                    booking.securityDepositResolution.status ===
                      "RELEASE_TO_LANDLORD" ||
                    booking.securityDepositResolution.status ===
                      "RELEASED_TO_LANDLORD"
                      ? "#22C55E"
                      : "#EF4444"
                  }
                />
                <Text style={styles.cautionFeeTitle}>Caution Fee Status</Text>
              </View>
              <Text style={styles.cautionStatusText}>
                Status:{" "}
                {booking.securityDepositResolution.status.replace(/_/g, " ")}
              </Text>
              <Text style={styles.cautionFeeSubtitle}>
                {(booking.securityDepositResolution.status ===
                  "RELEASE_TO_GUEST" ||
                  booking.securityDepositResolution.status ===
                    "RELEASED_TO_GUEST") &&
                  `The caution fee of ₦${securityDeposit.toLocaleString()} has been released to the guest.`}
                {(booking.securityDepositResolution.status ===
                  "RELEASE_TO_HOST" ||
                  booking.securityDepositResolution.status ===
                    "RELEASED_TO_HOST" ||
                  booking.securityDepositResolution.status ===
                    "RELEASE_TO_LANDLORD" ||
                  booking.securityDepositResolution.status ===
                    "RELEASED_TO_LANDLORD") &&
                  `The caution fee of ₦${securityDeposit.toLocaleString()} was credited to you due to reported damages or issues.`}
                {(booking.securityDepositResolution.status === "DISPUTED" ||
                  booking.securityDepositResolution.status === "DISPUTE") &&
                  `The caution fee of ₦${securityDeposit.toLocaleString()} is currently under investigation by our admin team and will be credited or adjusted based on their decision.`}
              </Text>
              {booking.securityDepositResolution.reason && (
                <Text style={styles.cautionReasonText}>
                  Reason: {booking.securityDepositResolution.reason}
                </Text>
              )}
              {booking.securityDepositResolution.status === "DISPUTED" && (
                <Text style={styles.cautionNoteText}>
                  Note: An administrator will review this dispute and decide on
                  the final credit/adjustment.
                </Text>
              )}
            </View>
          )}

        {/* ── Rate the Guest Section (COMPLETED bookings only) ── */}
        {isCompleted && (
          <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <Ionicons name="star" size={24} color="#FFB800" />
              <Text style={styles.reviewTitle}>Rate your experience</Text>
            </View>

            <Text style={styles.rateSubtitle}>
              {alreadyReviewed
                ? "Thank you for sharing your feedback on this stay!"
                : `How was your experience hosting ${guestName}? Your rating helps other hosts.`}
            </Text>

            {/* 5-star rating stars */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleStarPress(star)}
                  disabled={alreadyReviewed}
                  activeOpacity={0.7}
                  style={styles.starWrapper}
                >
                  <Ionicons
                    name={
                      star <=
                      (alreadyReviewed
                        ? booking?.hostReview?.rating || reviewRating
                        : reviewRating)
                        ? "star"
                        : "star-outline"
                    }
                    size={36}
                    color={
                      star <=
                      (alreadyReviewed
                        ? booking?.hostReview?.rating || reviewRating
                        : reviewRating)
                        ? "#FFB800"
                        : "#D1D1D6"
                    }
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Leave a Review button */}
            {!alreadyReviewed && (
              <TouchableOpacity
                style={[
                  styles.reviewBtn,
                  reviewRating === 0 && { opacity: 0.5 },
                ]}
                onPress={() => {
                  if (reviewRating === 0) {
                    Alert.alert(
                      "Rate Guest",
                      "Please select a star rating first.",
                    );
                    return;
                  }
                  setShowReviewModal(true);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={18} color="#fff" />
                <Text style={styles.reviewBtnText}>Write a Review</Text>
              </TouchableOpacity>
            )}

            {alreadyReviewed && booking?.hostReview?.feedback ? (
              <View style={styles.feedbackQuoteContainer}>
                <Ionicons
                  name="quote"
                  size={14}
                  color="#6371F1"
                  style={{ opacity: 0.3 }}
                />
                <Text style={styles.reviewFeedbackText}>
                  {booking.hostReview.feedback}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Bottom spacer */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── Fixed Bottom Buttons ── */}
      <View
        style={[
          styles.bottomSection,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <View style={styles.buttonRow}>

          <TouchableOpacity
            style={styles.contactBtn}
            onPress={handleContactGuest}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={20} color="#fff" />
            <Text style={styles.contactBtnText}>Contact Guest</Text>
          </TouchableOpacity>

          {isCancellable && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancelBooking}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Booking Action Confirmation Modal ── */}
      <BookingActionModal
        visible={showActionModal}
        actionType={actionType}
        booking={{
          bookingId: bookingRefCode,
          propertyName: propertyName,
          dates: `${checkIn} - ${checkOut}`,
          guestName: guestName,
        }}
        onConfirm={handleActionConfirmed}
        onClose={() => setShowActionModal(false)}
        isLoading={isActionLoading}
      />

      {/* ── Cancel Booking Modal ── */}
      <CancelBookingModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirmCancel={handleConfirmCancel}
        isLoading={isCancelling}
      />

      {/* ── Review Feedback Modal ── */}
      <ReviewFeedbackModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSubmit={handleSubmitReview}
        isLoading={isSubmittingReview}
        guestName={guestName}
        rating={reviewRating}
        isHost={true}
        toastVisible={toastVisible}
        toastConfig={toastConfig}
        onToastHide={() => setToastVisible(false)}
      />

      <DownloadOptionsModal
        visible={showDownloadOptions}
        onClose={() => setShowDownloadOptions(false)}
        onSaveImage={handleDownloadImage}
        onDownloadReceipt={handleDownloadReceipt}
        onDownloadAgreement={handleDownloadAgreement}
        loading={isDownloading}
      />

      <DownloadConfirmationModal
        visible={downloadModalState.visible}
        onClose={() => setDownloadModalState(prev => ({ ...prev, visible: false }))}
        title={downloadModalState.title}
        message={downloadModalState.message}
        type={downloadModalState.type}
      />

      {/* Toast Notification */}
      <ToastNotification
        visible={toastVisible}
        type={toastConfig.type}
        message={toastConfig.message}
        onHide={() => setToastVisible(false)}
      />

      {/* ── Caution Fee Dispute Modal ── */}
      <CautionDisputeModal
        visible={showCautionDisputeModal}
        onClose={() => setShowCautionDisputeModal(false)}
        onSubmit={(reason) => handleResolveCautionFee("DISPUTE", reason)}
        isLoading={isResolvingCaution}
        reason={cautionDisputeReason}
        onReasonChange={setCautionDisputeReason}
        title="Raise Caution Fee Dispute"
        subtitle="Provide clear details about the damages or issues. This will be reviewed by our compliance team within 24-48 hours."
        placeholder="Describe damage (e.g., Broken TV screen, stained rug...)"
        submitLabel="Raise Dispute"
      />
    </SafeAreaView>
  );
};

  // Reusable info row ──
const InfoRow = ({ label, value, valueStyle = {} }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, valueStyle]}>{value}</Text>
  </View>
);

// ───── Styles ─────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  headerBtn: {
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

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 12,
  },

  // Ref code row
  refCodeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  refCodeLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
  },
  refCodeValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
  },

  // Cards
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
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
    }),
  },

  footerBranding: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerBrandingText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Property card
  propertyImage: {
    height: 169,
    borderRadius: 6,
    width: "100%",
    backgroundColor: "#f5f5f5",
  },
  propertyInfo: {
    gap: 16,
  },
  propertyName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#292929",
  },
  propertyAddress: {
    fontSize: 14,
    fontWeight: "500",
    color: "#292929",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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

  // Section title
  sectionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
  },

  // Info rows
  infoRows: {
    gap: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#525252",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
    flexShrink: 1,
    textAlign: "right",
  },

  // Total row
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#bdbdbd",
    paddingTop: 12,
  },

  // KYC
  kycBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    overflow: "hidden",
  },
  kycText: {
    fontSize: 12,
    fontWeight: "500",
  },

  // View profile button
  viewProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#6371F1",
    alignSelf: "flex-start",
  },
  viewProfileText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
  },

  // Notes
  notesText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#292929",
    lineHeight: 22,
  },

  // Bottom Section re-implementation
  bottomSection: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingTop: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
  },
  contactBtn: {
    backgroundColor: "#010135",
    height: 56,
    borderRadius: 28,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  contactBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  confirmBtn: {
    backgroundColor: "#16A34A",
    height: 56,
    borderRadius: 28,
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#16A34A",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cancelBtn: {
    backgroundColor: "#FEF2F2",
    height: 56,
    borderRadius: 28,
    flex: 0.8,
    borderWidth: 1.5,
    borderColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cancelBtnText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "700",
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },

  // Premium Review card styles
  reviewCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginTop: 8,
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
  // Caution Fee Styles
  cautionFeeCard: {
    backgroundColor: "#F8FAFF",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  cautionFeeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  cautionFeeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#010135",
  },
  cautionFeeSubtitle: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    marginBottom: 16,
  },
  cautionFeeActionRow: {
    flexDirection: "row",
    gap: 12,
  },
  releaseBtn: {
    flex: 1,
    backgroundColor: "#6371F1",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  releaseBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  disputeBtnHost: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  disputeBtnText: {
    color: "#EF4444",
    fontWeight: "600",
    fontSize: 14,
  },
  cautionStatusText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#010135",
    marginTop: 4,
  },
  cautionReasonText: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 4,
    fontStyle: "italic",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end", // Slide up from bottom feel
  },
  modalKeyboardAvoiding: {
    width: "100%",
    justifyContent: "flex-end",
  },
  disputeModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    width: "100%",
    alignItems: "center",
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    marginBottom: 24,
    marginTop: -8,
  },
  modalCloseIcon: {
    position: "absolute",
    right: 20,
    top: 20,
    zIndex: 10,
  },
  modalHeaderIcon: {
    marginBottom: 16,
  },
  warningIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 8,
    letterSpacing: 1,
  },
  inputWrapper: {
    width: "100%",
    marginBottom: 32,
  },
  disputeInput: {
    borderWidth: 1.5,
    borderColor: "#F3F4F6",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    height: 120,
    textAlignVertical: "top",
    color: "#111827",
    fontSize: 15,
  },
  charCount: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "right",
    marginTop: 6,
    fontWeight: "500",
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  modalCancelBtnText: {
    color: "#4B5563",
    fontWeight: "700",
    fontSize: 15,
  },
  modalConfirmBtn: {
    flex: 1.6,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#EF4444",
    ...Platform.select({
      ios: {
        shadowColor: "#EF4444",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  modalConfirmBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  disabledBtn: {
    opacity: 0.5,
  },
});

export default HostBookingDetailsScreen;
