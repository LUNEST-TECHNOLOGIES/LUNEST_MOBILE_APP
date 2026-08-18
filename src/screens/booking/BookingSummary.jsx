import { differenceInDays, format, parse } from "date-fns";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import ArrowLeftIcon from "../../assets/icons/bookings/arrow-left.svg";
import CalendarIcon from "../../assets/icons/vuesax/outline/calendar.svg";
import ToastNotification, { TOAST_TYPE } from "../../components/common/ToastNotification";
import ConfirmBookingModal from "../../components/modals/ConfirmBookingModal";
import KycRequiredModal from "../../components/modals/KycRequiredModal";
import PaymentMethodModal from "../../components/modals/PaymentMethodModal";
import authService from "../../services/authService";
import bookingService from "../../services/bookingService";
import configService from "../../services/configService";
import paymentService from "../../services/paymentService";
import profileService from "../../services/profileService";
import { getUserData } from "../../services/userDataService";

// Default property image fallback
const DEFAULT_PROPERTY_IMAGE = require("../../assets/images/prop_image.png");

const BookingSummary = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [showCancelPolicy, setShowCancelPolicy] = useState(false);
  // Show payment modal immediately if coming from reservation Pay Now
  const [showPaymentModal, setShowPaymentModal] = useState(
    params.showPaymentModal === "true",
  );
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponType, setCouponType] = useState(null); // 'FIXED' or 'PERCENTAGE'
  const [couponValue, setCouponValue] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [fetchedBooking, setFetchedBooking] = useState(null);
  const [isFetchingBooking, setIsFetchingBooking] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [baseURL, setBaseURL] = useState("");

  useEffect(() => {
    setMounted(true);
    configService.getBaseURL().then(url => setBaseURL(url)).catch(() => {});
  }, []);

  // Toast notifications
  const [toastVisible, setToastVisible] = useState(false);
  const [toastConfig, setToastConfig] = useState({
    type: TOAST_TYPE.SUCCESS,
    message: "",
  });

  const showToast = (message, type = TOAST_TYPE.SUCCESS) => {
    setToastConfig({ message, type });
    setToastVisible(true);
  };

  // Check if this is from a reservation payment
  const fromReservation = params.fromReservation === "true";
  const existingBookingId = params.bookingId;

  // Get property data from params
  const listingId = params.listingId;
  const propertyName = params.propertyName || "Property";
  const propertyLocation = params.location || "Lagos, Nigeria";
  const hostId = params.hostId;
  
  // Extract additional notes from params
  const additionalNotes = params.notes || "";

  // Debug: Log received dates
  console.log("[BookingSummary] Received dates:", {
    checkInDate: params?.checkInDate,
    checkOutDate: params?.checkOutDate,
    checkInType: typeof params?.checkInDate,
    checkOutType: typeof params?.checkOutDate
  });

  // Cover image URL resolution with base URL normalization and fallback to fetched booking listings
  const coverImage = (() => {
    const rawCover = params.coverImage || fetchedBooking?.listing?.propertyImages?.[0] || fetchedBooking?.listing?.images?.[0];
    const coverUrlStr = typeof rawCover === 'object' ? (rawCover?.url || rawCover?.uri || '') : (rawCover ? String(rawCover) : '');
    if (!coverUrlStr || coverUrlStr === 'undefined' || coverUrlStr === 'null' || coverUrlStr === '[object Object]') {
      return null;
    }
    if (coverUrlStr.startsWith("http") || coverUrlStr.startsWith("https") || coverUrlStr.startsWith("blob:") || coverUrlStr.startsWith("data:")) {
      return coverUrlStr;
    }
    if (baseURL) {
      return `${baseURL}${coverUrlStr.startsWith("/") ? "" : "/"}${coverUrlStr}`;
    }
    return null;
  })();

  // Log for debugging
  console.log("[BookingSummary] Cover image URL:", params.coverImage);
  console.log("[BookingSummary] Validated cover image:", coverImage);

  // Host's original rental price per period
  const rawPrice = parseFloat(params.price) || parseFloat(params.amount) || 0;
  const rentalPrice = isNaN(rawPrice) ? 0 : rawPrice;

  // Calculate number of nights from check-in and check-out dates
  const calculateNumberOfNights = () => {
    const checkInDate = params?.checkInDate;
    const checkOutDate = params?.checkOutDate;

    console.log("[BookingSummary] calculateNumberOfNights input:", {
      checkInDate,
      checkOutDate
    });

    if (!checkInDate || !checkOutDate) {
      console.log("[BookingSummary] No dates provided, returning fallback 4");
      return 4; // fallback to 4 nights if dates not provided
    }

    try {
      // Parse dates from ISO format "YYYY-MM-DD" or standard ISO
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);

      console.log("[BookingSummary] calculateNumberOfNights parsed dates:", {
        checkIn,
        checkOut,
        checkInYear: checkIn.getFullYear(),
        checkOutYear: checkOut.getFullYear()
      });

      // Calculate difference in days
      const nights = differenceInDays(checkOut, checkIn);

      // Ensure at least 1 night and not negative
      const result = Math.max(1, nights);
      console.log("[BookingSummary] calculateNumberOfNights result:", result);
      return result;
    } catch (error) {
      console.error("[BookingSummary] Error calculating nights:", error);
      return 4; // fallback
    }
  };

  // Calculate number of months
  const calculateNumberOfMonths = () => {
    const checkInDate = params?.checkInDate;
    const checkOutDate = params?.checkOutDate;

    if (!checkInDate || !checkOutDate) {
      return 1; // fallback to 1 month
    }

    try {
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);

      let months =
        (checkOut.getFullYear() - checkIn.getFullYear()) * 12 +
        (checkOut.getMonth() - checkIn.getMonth());
      if (checkOut.getDate() < checkIn.getDate()) months -= 1;

      return Math.max(1, months);
    } catch (error) {
      console.warn("Error calculating number of months:", error);
      return 1;
    }
  };

  // Calculate number of years
  const calculateNumberOfYears = () => {
    const checkInDate = params?.checkInDate;
    const checkOutDate = params?.checkOutDate;

    if (!checkInDate || !checkOutDate) {
      return 1; // fallback to 1 year
    }

    try {
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);

      let years = checkOut.getFullYear() - checkIn.getFullYear();
      if (
        checkOut.getMonth() < checkIn.getMonth() ||
        (checkOut.getMonth() === checkIn.getMonth() &&
          checkOut.getDate() < checkIn.getDate())
      ) {
        years -= 1;
      }

      return Math.max(1, years);
    } catch (error) {
      console.warn("Error calculating number of years:", error);
    }
  };
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    authService.getUserData().then(data => setUserData(data)).catch(() => {});
    
    // Fetch existing booking if bookingId is provided
    if (existingBookingId) {
      // Ensure we have a string ID if it's somehow an object
      let cleanId = existingBookingId;
      if (typeof existingBookingId === 'object' && existingBookingId !== null) {
        cleanId = existingBookingId.path || existingBookingId._id || existingBookingId.id || String(existingBookingId);
      }
      
      setIsFetchingBooking(true);
      bookingService.fetchBookingById(cleanId)
        .then(result => {
          if (result.success && result.booking) {
            setFetchedBooking(result.booking);
            // If the booking already has a coupon, update the state
            if (result.booking.couponApplied) {
              setCouponCode(result.booking.couponApplied.code || "");
              setCouponDiscount(result.booking.couponApplied.discountApplied || 0);
              setCouponType(result.booking.couponApplied.type || 'FIXED');
              setCouponValue(result.booking.couponApplied.value || 0);
              setCouponApplied(true);
            }
          }
        })
        .catch(err => console.error("[BookingSummary] Fetch booking error:", err))
        .finally(() => setIsFetchingBooking(false));
    }
  }, [existingBookingId]);

  // Format date for display (e.g., "15 Jun, 2025")
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return null;
    
    // Ensure we have a valid Date object
    // If it's already an ISO string (YYYY-MM-DD), Date() parses it correctly and unambiguously
    const date = new Date(dateStr);
    
    // Check if valid
    if (!isNaN(date.getTime())) {
      const formatted = format(date, "d MMM, yyyy");
      console.log("[BookingSummary] formatDisplayDate result:", formatted, "year:", date.getFullYear());
      return formatted;
    }

    try {
      // Handle legacy format fallback "15-6-2025" (day-month-year)
      const parsed = parse(dateStr, "d-M-yyyy", new Date());
      if (!isNaN(parsed.getTime())) {
        const formatted = format(parsed, "d MMM, yyyy");
        console.log("[BookingSummary] formatDisplayDate (legacy d-M-yyyy):", formatted);
        return formatted;
      }
      
      // Try other fallback format "d/MM/yyyy"
      const parsed2 = parse(dateStr, "d/MM/yyyy", new Date());
      if (!isNaN(parsed2.getTime())) {
        const formatted = format(parsed2, "d MMM, yyyy");
        return formatted;
      }
      
      console.warn("[BookingSummary] could not parse dateStr:", dateStr);
      return dateStr;
    } catch (error) {
      console.error("Error formatting display date:", error, dateStr);
      return dateStr;
    }
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString();

    // 1. Try direct parsing if it's a valid date string
    const dateObj = new Date(dateStr);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString();
    }

    // 2. Try date-fns parsing for display formats like "15 Jun, 2025" or "15 Jun 2025"
    if (typeof dateStr === "string") {
      try {
        const cleaned = dateStr.trim();
        const parsed = parse(cleaned, "d MMM, yyyy", new Date());
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString();
        }
      } catch (e) {}

      try {
        const cleaned = dateStr.trim();
        const parsed = parse(cleaned, "d MMM yyyy", new Date());
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString();
        }
      } catch (e) {}
    }

    // 3. Manual splits for standard date formats containing hyphens
    if (typeof dateStr === "string" && dateStr.includes("-")) {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const year = parts[0].length === 4 ? parts[0] : parts[2];
        const month = parts[1];
        const day = parts[0].length === 4 ? parts[2] : parts[0];
        
        const parsed = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day)
        );
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString();
        }
      }
    }

    // 4. Manual splits for standard date formats containing slashes
    if (typeof dateStr === "string" && dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        const [day, month, year] = parts;
        const parsed = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day)
        );
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString();
        }
      }
    }

    // Fallback to current date
    console.warn("[BookingSummary] parseDate fallback to current date for:", dateStr);
    return new Date().toISOString();
  };

  const numberOfNights = calculateNumberOfNights();
  const numberOfMonths = calculateNumberOfMonths();
  const numberOfYears = calculateNumberOfYears();
  const pricingPeriod = params.pricingPeriod || "night"; // Use passed pricingPeriod or default to "night"

  // Calculate rental subtotal based on period
  let rentalSubtotal = rentalPrice;
  let periodUnits = 1;
  let periodLabel = "night";

  switch (pricingPeriod.toLowerCase()) {
    case "night":
      rentalSubtotal = (params.fromReservation === "true" || params.bookingId) 
        ? rentalPrice 
        : rentalPrice * numberOfNights;
      periodUnits = numberOfNights;
      periodLabel = "night";
      break;
    case "month":
      rentalSubtotal = (params.fromReservation === "true" || params.bookingId) 
        ? rentalPrice 
        : rentalPrice * numberOfMonths;
      periodUnits = numberOfMonths;
      periodLabel = "month";
      break;
    case "year":
      rentalSubtotal = (params.fromReservation === "true" || params.bookingId) 
        ? rentalPrice 
        : rentalPrice * numberOfYears;
      periodUnits = numberOfYears;
      periodLabel = "year";
      break;
    default:
      rentalSubtotal = (params.fromReservation === "true" || params.bookingId) 
        ? rentalPrice 
        : rentalPrice * numberOfNights;
      periodUnits = numberOfNights;
      periodLabel = "night";
  }

  // Service charge (set by host) - comes from listing, NOT a percentage
  const rawServiceCharge = parseFloat(params?.serviceCharge);
  const serviceCharge = isNaN(rawServiceCharge) ? 0 : rawServiceCharge;
  
  // Caution Fee (set by host, refundable) - comes from listing
  const rawSecurityDeposit = parseFloat(params?.securityDeposit);
  const securityDeposit = isNaN(rawSecurityDeposit) ? 0 : rawSecurityDeposit;
  
  // Logic: If rentalPrice looks like a full total (e.g. from legacy BookingsScreen), 
  // and we also have serviceCharge/securityDeposit, we might be double-counting.
  // However, with my latest fix to BookingsScreen, params.price is now the base listing price.
  const hostSubtotal = (rentalSubtotal || 0) + serviceCharge;
  
  // Host's Total = rental + service charge + caution fee (what host priced)
  const hostTotal = hostSubtotal + securityDeposit;

  // NEW: Coupon applies to Rent + Service Charge (taxable components)
  // The Security Deposit is a refundable escrow amount and should NOT be discounted.
  const GUEST_FEE_PERCENT = 5;
  const VAT_PERCENT = 7.5;
  const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

  // Calculate coupon discount on HOST SUBTOTAL (excluding caution fee)
  let couponDiscountAmount = 0;
  if (couponApplied && couponDiscount > 0) {
    couponDiscountAmount = Math.min(couponDiscount, hostSubtotal);
  }
  
  // Discounted subtotal (Rent + SC) and original caution fee
  const discountedHostSubtotal = round2(Math.max(0, hostSubtotal - couponDiscountAmount));
  const discountedGuestBase = round2(discountedHostSubtotal + securityDeposit);
  
  // App fee and VAT calculated on DISCOUNTED guest base (Net Rent/SC + Full Caution)
  const guestFeeBase = discountedGuestBase > 0 ? round2((discountedGuestBase * GUEST_FEE_PERCENT) / 100) : 0;
  const guestVat = guestFeeBase > 0 ? round2((guestFeeBase * VAT_PERCENT) / 100) : 0;
  const appCharge = round2(guestFeeBase + guestVat);

  // Final total = discounted subtotal + caution fee + app fee + VAT
  const calculatedTotal = round2(discountedGuestBase + guestFeeBase + guestVat);
  const total = isNaN(calculatedTotal) ? 0 : calculatedTotal;
  
  // Subtotal before coupon (for display)
  const subtotalBeforeDiscount = hostTotal;
  
  // Subtotal after coupon (for display)
  const discountedSubtotal = discountedGuestBase;

  // PREFER FETCHED BOOKING PRICING IF AVAILABLE
  const pb = fetchedBooking?.pricingBreakdown;

  const finalRentSubtotal = pb?.rentalSubtotal ?? (pb?.taxableAmount ? round2(pb.taxableAmount - (pb.serviceCharge || 0)) : rentalSubtotal);
  const finalServiceCharge = pb?.serviceCharge ?? serviceCharge;
  const finalSecurityDeposit = pb?.securityDeposit ?? pb?.cautionFee ?? securityDeposit;
  const finalCouponDiscount = pb?.couponDiscount ?? couponDiscountAmount;
  const finalDiscountedSubtotal = pb?.discountedSubtotal ?? discountedGuestBase;
  const finalGuestFee = pb?.guestFee ?? guestFeeBase;
  const finalGuestVat = pb?.guestVat ?? guestVat;
  const finalAppCharge = round2(finalGuestFee + finalGuestVat);
  const finalTotal = pb?.guestTotal ?? pb?.total ?? (fetchedBooking?.totalAmount?.price) ?? total;

  const handleApplyCoupon = async () => {
    // Toggle: if already applied, remove coupon
    if (couponApplied) {
      setCouponCode("");
      setCouponDiscount(0);
      setCouponApplied(false);
      showToast("Coupon removed", TOAST_TYPE.INFO);
      return;
    }
    if (!couponCode.trim()) {
      showToast("Please enter a coupon code", TOAST_TYPE.ERROR);
      return;
    }
    setCouponLoading(true);
    try {
      const referralService = (await import("../../services/referralService"))
        .default;
      // Pass the discountable booking amount for validation checks
      const result = await referralService.validateCoupon(couponCode.trim(), hostSubtotal);
      
      if (!result.success) {
        // Handle specific error codes from referralService
        const errorMsg = result.message || "Invalid coupon code";
        
        if (result.code === "COUPON_ALREADY_USED") {
          showToast("This coupon has already been used. You can only use percentage coupons once.", TOAST_TYPE.ERROR);
        } else if (result.code === "COUPON_NO_BALANCE") {
          showToast("This coupon has no remaining balance. The fixed amount has been fully used.", TOAST_TYPE.ERROR);
        } else if (errorMsg.toLowerCase().includes("expired")) {
          showToast("This coupon has expired", TOAST_TYPE.ERROR);
        } else {
          showToast(errorMsg, TOAST_TYPE.ERROR);
        }
        
        setCouponCode("");
        setCouponDiscount(0);
        setCouponApplied(false);
        setCouponLoading(false);
        return;
      }
      
      const couponData = result.data;
      const discount = couponData.discount;
      
      // FIXED → flat amount, PERCENTAGE → % of discountable subtotal (rent + service)
      const amount =
        discount.type === "PERCENTAGE"
          ? Math.round(hostSubtotal * (discount.value / 100))
          : discount.value;
      
      setCouponDiscount(amount);
      setCouponType(discount.type);
      setCouponValue(discount.value);
      setCouponApplied(true);
      
      // Log coupon application for debugging
      console.log("[BookingSummary] Coupon applied successfully:", {
        code: couponCode.trim(),
        discountType: discount.type,
        discountValue: discount.value,
        calculatedAmount: amount,
        hostSubtotal: hostSubtotal,
        newTotal: hostTotal - amount,
      });
      
      // Show success toast with appropriate message based on coupon type
      if (discount.type === "FIXED" && couponData.remainingBalance > 0) {
        showToast(
          `Coupon applied! ₦${amount.toLocaleString()} discount (₦${couponData.remainingBalance.toLocaleString()} remaining)`,
          TOAST_TYPE.SUCCESS
        );
      } else {
        showToast(
          `Coupon applied! You save ₦${amount.toLocaleString()}`,
          TOAST_TYPE.SUCCESS
        );
      }
    } catch (error) {
      console.error("[BookingSummary] Coupon validation error:", error);
      
      // Handle network or server errors with user-friendly messages
      let errorMsg = "Unable to validate coupon. Please try again.";
      
      if (error?.response?.status === 404) {
        errorMsg = "Coupon not found. Please check the code and try again.";
      } else if (error?.response?.status === 400) {
        errorMsg = error?.response?.data?.message || "Invalid coupon code.";
      } else if (error?.response?.status >= 500) {
        errorMsg = "Server error. Please try again in a moment.";
      } else if (error?.message?.includes("Network")) {
        errorMsg = "Network error. Please check your connection.";
      }
      
      showToast(errorMsg, TOAST_TYPE.ERROR);
      setCouponCode("");
      setCouponDiscount(0);
      setCouponApplied(false);
    } finally {
      setCouponLoading(false);
    }
  };

  const bookingSummary = {
    property: {
      title: propertyName,
      location: propertyLocation,
      coverImage: coverImage,
      bookingType: params?.bookingType || fetchedBooking?.type || "Daily",
      checkIn: formatDisplayDate(params?.checkInDate) || formatDisplayDate(fetchedBooking?.checkIn) || "15 Jun, 2025",
      checkOut: formatDisplayDate(params?.checkOutDate) || formatDisplayDate(fetchedBooking?.checkOut) || "19 Jun, 2025",
      guests: {
        adults: params?.adults || fetchedBooking?.guests?.adults || 2,
        children: params?.children || fetchedBooking?.guests?.children || 0,
        pets: params?.pets || "No pets",
      },
    },
    pricing: {
      rentalPrice,
      rentalSubtotal: finalRentSubtotal,
      numberOfUnits: periodUnits,
      pricingPeriod,
      periodLabel,
      serviceCharge: finalServiceCharge,
      serviceChargeLabel: "Service Charge",
      securityDeposit: finalSecurityDeposit,
      hostTotal: round2(finalRentSubtotal + finalServiceCharge + finalSecurityDeposit),
      subtotalBeforeDiscount: round2(finalRentSubtotal + finalServiceCharge + finalSecurityDeposit),
      couponDiscount: finalCouponDiscount,
      discount: finalCouponDiscount,
      couponCode: couponCode.trim(),
      discountedSubtotal: finalDiscountedSubtotal,
      guestFee: finalGuestFee,
      guestVat: finalGuestVat,
      appCharge: finalAppCharge,
      total: finalTotal,
      amount: finalTotal,
      totalAmount: {
        price: finalTotal,
        currency: "NGN",
      },
    },
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  const handleEdit = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  const handleProceedToPayment = async () => {
    try {
      let currentUser = (await getUserData()) || (await authService.getUserData()) || {};
      let profileData = (await profileService.getProfileData()) || {};

      let isVerified =
        currentUser?.verified === true ||
        currentUser?.kycStatus === "VERIFIED" ||
        currentUser?.kycStatus === "APPROVED" ||
        profileData?.verified === true ||
        profileData?.kycStatus === "VERIFIED" ||
        profileData?.kycStatus === "APPROVED";

      if (!isVerified) {
        try {
          const profile = await authService.fetchProfile();
          const pData = profile?.data || profile?.body || profile;
          isVerified = pData?.kycStatus === "VERIFIED" || pData?.kycStatus === "APPROVED" || !!pData?.verified;
        } catch (err) {
          console.warn("[BookingSummary] Failed to check live KYC status:", err);
        }
      }

      if (!isVerified) {
        setShowKycModal(true);
        return;
      }
    } catch (err) {
      console.warn("[BookingSummary] KYC validation error:", err);
    }

    // Show confirmation modal first
    setShowConfirmModal(true);
  };

  const handleConfirmedStep = () => {
    setShowConfirmModal(false);
    
    // If coupon covers the full amount (total = 0), create booking directly
    if (couponApplied && couponDiscount > 0 && bookingSummary.pricing.total === 0) {
      processFreeBooking();
    } else {
      // Show payment method selection modal
      setShowPaymentModal(true);
    }
  };

  const processFreeBooking = async () => {
    setIsProcessing(true);
    try {
      const user = await authService.getUserData();
      
      const mapBookingType = (type) => {
        if (!type) return "DAILY";
        const upperType = type.toUpperCase();
        if (upperType.includes("/")) {
          const firstType = upperType.split("/")[0].trim();
          if (["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(firstType))
            return firstType;
        }
        const typeMap = {
          DAILY: "DAILY",
          WEEKLY: "WEEKLY",
          MONTHLY: "MONTHLY",
          YEARLY: "YEARLY",
          ANNUALLY: "YEARLY",
          ANNUAL: "YEARLY",
          NIGHT: "DAILY",
          NIGHTLY: "DAILY",
        };
        return typeMap[upperType] || "DAILY";
      };

      const displayHostTotal = bookingSummary.pricing.hostTotal;
      const displayRentalSubtotal = bookingSummary.pricing.rentalSubtotal;
      const displayServiceCharge = bookingSummary.pricing.serviceCharge || 0;
      const displaySecurityDeposit =
        bookingSummary.pricing.securityDeposit || 0;
      const displayAppCharge = bookingSummary.pricing.appCharge || 0;
      const displayTotal = bookingSummary.pricing.total || 0;

      const bookingData = {
        listing: params?.listingId,
        type: mapBookingType(bookingSummary.property.bookingType),
        guests: {
          adults: parseInt(params?.adults) || bookingSummary.property.guests.adults,
          children: parseInt(params?.children) || bookingSummary.property.guests.children,
          pets: 0,
        },
        checkIn: parseDate(params?.checkInDate || fetchedBooking?.checkIn || bookingSummary.property.checkIn),
        checkOut: parseDate(params?.checkOutDate || fetchedBooking?.checkOut || bookingSummary.property.checkOut),
        paymentMethod: null,
        status: "CONFIRMED",
        totalAmount: { price: displayHostTotal, currency: "NGN" },
        priceBreakdown: {
          rentalSubtotal: displayRentalSubtotal,
          serviceCharge: displayServiceCharge,
          securityDeposit: displaySecurityDeposit,
          hostTotal: displayHostTotal,
          guestFee: displayAppCharge,
          subtotalBeforeDiscount: displayHostTotal + displayAppCharge,
          couponApplied: true,
          couponCode: couponCode.trim(),
          couponDiscount: couponDiscount,
          amountAfterCoupon: displayTotal,
          guestTotal: displayTotal,
          paymentMethodUsed: "COUPON",
          amountPaidViaPayment: 0,
          couponType: "FULL_COVERAGE",
        },
        bookedBy: user?._id || user?.id,
        couponCode: couponCode.trim(),
        couponDiscount: couponDiscount,
        additionalNotes: additionalNotes,
      };

      const existingBookingId = params?.bookingId;

      const result = existingBookingId
        ? await bookingService.updateBookingStatus(existingBookingId, "CONFIRMED", {
            paymentMethod: "COUPON",
            paymentReference: null,
            pricingBreakdown: bookingData.priceBreakdown,
            couponCode: bookingData.couponCode,
            couponDiscount: bookingData.couponDiscount,
          })
        : await bookingService.createBooking(bookingData);

      if (result.success) {
        setIsSuccess(true);
        setSuccessMessage("Booking Confirmed!");
        
        if (couponApplied && couponCode.trim()) {
          const referralService = (await import("../../services/referralService")).default;
          await referralService.trackCouponUsage(
            couponCode.trim(),
            result.booking?._id,
            couponDiscount
          ).catch(err => {
            console.warn("[BookingSummary] Failed to track coupon usage:", err);
          });
        }

        // Small delay to let user see the success state
        await new Promise(resolve => setTimeout(resolve, 1500));

        router.replace({
          pathname: "/booking-confirmation",
          params: {
            status: "Confirmed",
            propertyName: bookingSummary.property.title,
            location: bookingSummary.property.location,
            coverImage: bookingSummary.property.coverImage || "",
            bookingType: bookingSummary.property.bookingType,
            checkIn: bookingSummary.property.checkIn,
            checkOut: bookingSummary.property.checkOut,
            paymentMethod: "Coupon",
            total: `₦${displayTotal.toLocaleString()}`,
            refCode: result.booking?.referenceCode || generateRefCode(),
            bookingId: result.booking?._id,
            listingId: params?.listingId,
            couponApplied: couponApplied ? "true" : "false",
            couponCode: couponCode.trim() || "",
            couponDiscount: couponDiscount || 0,
            subtotalBeforeDiscount: displayHostTotal + displayAppCharge,
          },
        });
      } else {
        showToast(result.message || "Failed to create booking. Please try again.", TOAST_TYPE.ERROR);
      }
    } catch (error) {
      console.error("[BookingSummary] Coupon booking error:", error);
      showToast("An error occurred while processing your booking. Please try again.", TOAST_TYPE.ERROR);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentMethodSelect = async (paymentData) => {
    console.log("[BookingSummary] Payment method selected:", paymentData);
    setShowPaymentModal(false);
    setIsProcessing(true);

    try {
      const user = await authService.getUserData();
      const mapBookingType = (type) => {
        if (!type) return "DAILY";
        const upperType = type.toUpperCase();
        if (upperType.includes("/")) {
          const firstType = upperType.split("/")[0].trim();
          if (["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(firstType)) {
            return firstType;
          }
        }
        const typeMap = {
          DAILY: "DAILY",
          WEEKLY: "WEEKLY",
          MONTHLY: "MONTHLY",
          YEARLY: "YEARLY",
          ANNUALLY: "YEARLY",
          ANNUAL: "YEARLY",
          NIGHT: "DAILY",
          NIGHTLY: "DAILY",
        };
        return typeMap[upperType] || "DAILY";
      };

      const displayHostTotal = bookingSummary.pricing.hostTotal;
      const displayRentalSubtotal = bookingSummary.pricing.rentalSubtotal;
      const displayServiceCharge = bookingSummary.pricing.serviceCharge || 0;
      const displaySecurityDeposit =
        bookingSummary.pricing.securityDeposit || 0;
      const displayAppCharge = bookingSummary.pricing.appCharge || 0;
      const displayTotal = bookingSummary.pricing.total || total;
      
      const bookingData = {
        listing: params?.listingId,
        type: mapBookingType(bookingSummary.property.bookingType),
        guests: {
          adults: parseInt(params?.adults) || bookingSummary.property.guests.adults,
          children: parseInt(params?.children) || bookingSummary.property.guests.children,
          pets: 0,
        },
        checkIn: parseDate(params?.checkInDate || fetchedBooking?.checkIn || bookingSummary.property.checkIn),
        checkOut: parseDate(params?.checkOutDate || fetchedBooking?.checkOut || bookingSummary.property.checkOut),
        paymentMethod: paymentData.reserveAndPayLater
          ? null
          : paymentData.paymentMethod?.toUpperCase(),
        totalAmount: {
          price: displayHostTotal,
          currency: "NGN",
        },
        priceBreakdown: {
          rentalSubtotal: displayRentalSubtotal,
          serviceCharge: displayServiceCharge,
          securityDeposit: displaySecurityDeposit,
          hostTotal: displayHostTotal,
          guestFee: displayAppCharge,
          subtotalBeforeDiscount: displayHostTotal + displayAppCharge,
          couponApplied: couponApplied,
          couponCode: couponCode.trim() || null,
          couponDiscount: couponDiscount || 0,
          amountAfterCoupon: displayTotal,
          guestTotal: displayTotal,
          paymentMethodUsed: paymentData.reserveAndPayLater
            ? "RESERVE_AND_PAY_LATER"
            : paymentData.paymentMethod?.toUpperCase() || "WALLET",
          amountPaidViaPayment: displayTotal,
        },
        bookedBy: user?._id || user?.id,
        couponCode: couponCode.trim() || undefined,
        couponDiscount: couponDiscount || undefined,
        additionalNotes: additionalNotes,
      };

      if (paymentData.reserveAndPayLater) {
        bookingData.status = "RESERVED";
        const result = existingBookingId
          ? await bookingService.updateBookingStatus(existingBookingId, "RESERVED", {
              pricingBreakdown: bookingData.priceBreakdown,
              couponCode: bookingData.couponCode,
              couponDiscount: bookingData.couponDiscount
            })
          : await bookingService.createBooking(bookingData);

        if (result.success) {
          if (couponApplied && couponCode.trim()) {
            const referralService = (await import("../../services/referralService")).default;
            await referralService.trackCouponUsage(
              couponCode.trim(),
              result.booking?._id,
              couponDiscount
            ).catch(err => {
              console.warn("[BookingSummary] Failed to track coupon usage:", err);
            });
          }

          router.replace({
            pathname: "/booking-confirmation",
            params: {
              status: "Reserved",
              propertyName: bookingSummary.property.title,
              location: bookingSummary.property.location,
              coverImage: bookingSummary.property.coverImage || "",
              bookingType: bookingSummary.property.bookingType,
              checkIn: bookingSummary.property.checkIn,
              checkOut: bookingSummary.property.checkOut,
              paymentMethod: "Reserve & Pay Later",
              total: `₦${displayTotal.toLocaleString()}`,
              refCode: result.booking?.referenceCode || generateRefCode(),
              reserveAndPayLater: "true",
              countdownTime: "3600",
              bookingId: result.booking?._id,
              listingId: params?.listingId,
              couponApplied: couponApplied ? "true" : "false",
              couponCode: couponCode || "",
              couponDiscount: couponDiscount.toString(),
              subtotalBeforeDiscount: (displayHostTotal + displayAppCharge).toString(),
            },
          });
        } else {
          showToast(result.message || "Failed to create reservation. Please try again.", TOAST_TYPE.ERROR);
        }
      } else if (
        paymentData.paymentMethod === "paystack" ||
        paymentData.paymentMethod === "card" ||
        paymentData.paymentMethod === "kora"
      ) {
        try {
          setIsInitializingPayment(true);
          const email = user?.email || user?.emailAddress;
          if (!email) {
            showToast("Please update your profile with an email address", TOAST_TYPE.ERROR);
            setIsInitializingPayment(false);
            return;
          }

          bookingData.status = "PENDING_PAYMENT";
          let bookingResult;
          if (existingBookingId) {
            bookingResult = await bookingService.updateBookingStatus(existingBookingId, "PENDING_PAYMENT", {
              pricingBreakdown: bookingData.priceBreakdown,
              couponCode: bookingData.couponCode,
              couponDiscount: bookingData.couponDiscount
            });
          } else {
            bookingResult = await bookingService.createBooking(bookingData);
          }

          if (!bookingResult.success) {
            showToast(bookingResult.message || "Failed to prepare booking. Please try again.", TOAST_TYPE.ERROR);
            setIsInitializingPayment(false);
            return;
          }

          const bId = bookingResult.booking?._id || existingBookingId;

          // Build callback URL (same pattern as AddFundsScreen)
          const API_BASE = require("../../services/apiClient").default.baseURL || process.env.EXPO_PUBLIC_API_URL || "";

          let callbackUrl;
          if (Platform.OS === "web") {
            callbackUrl = `${window.location.origin}/payment-callback?type=booking_payment&bookingId=${bId}&amount=${displayTotal}`;
          } else {
            callbackUrl = `${API_BASE}/v1/payment/callback?type=booking_payment&bookingId=${bId}&amount=${displayTotal}&origin=mobile`;
          }

          const selectedProvider = paymentData.paymentMethod === "kora" ? "kora" : "paystack";
          const paymentResult = await paymentService.initializePayment({
            amount: displayTotal,
            email,
            provider: selectedProvider,
            metadata: {
              type: "BOOKING",
              bookingId: bId,
              guestId: user?._id || user?.id,
              hostId: hostId || params?.hostId,
              listingId: params?.listingId,
              description: `Booking for ${bookingSummary.property.title}`,
              origin: Platform.OS === "web" ? "web" : "mobile",
              callback_url: callbackUrl,
            },
          });

          const authUrl = paymentResult?.authorization_url || paymentResult?.data?.authorization_url || paymentResult?.checkout_url || paymentResult?.url;
          const paymentRef = paymentResult?.reference || paymentResult?.data?.reference || paymentResult?.ref;

          if (!authUrl) {
            showToast(paymentResult?.message || "Failed to initialize payment. Please try again.", TOAST_TYPE.ERROR);
            setIsInitializingPayment(false);
            return;
          }

          const paymentContext = {
            type: "BOOKING",
            bookingId: bId,
            propertyName: bookingSummary.property.title,
            location: bookingSummary.property.location,
            coverImage: bookingSummary.property.coverImage || "",
            bookingType: bookingSummary.property.bookingType,
            checkIn: bookingSummary.property.checkIn,
            checkOut: bookingSummary.property.checkOut,
            listingId: params?.listingId,
          };

          if (Platform.OS === "web") {
            if (typeof window !== "undefined") {
              localStorage.setItem("lunest_payment_context", JSON.stringify(paymentContext));
              window.location.href = authUrl;
            }
            return;
          }

          // Save context + pending ref for AppState resume recovery
          await AsyncStorage.multiSet([
            ["lunest_payment_context", JSON.stringify(paymentContext)],
            ["@lunest_pending_payment_ref", paymentRef || ""]
          ]);

          // Single unified browser open — same for iOS and Android
          let browserResult = { type: "dismissed" };
          try {
            browserResult = await WebBrowser.openAuthSessionAsync(
              authUrl,
              Linking.createURL("payment-callback"),
            );
          } catch (browserErr) {
            console.warn("[BookingSummary] openAuthSessionAsync error:", browserErr);
          }

          // Clear pending ref — routing directly to callback screen now
          await AsyncStorage.removeItem("@lunest_pending_payment_ref");

          // Always route to payment-callback as the single verification point
          router.push({
            pathname: "/payment-callback",
            params: {
              reference: paymentResult.reference,
              status: browserResult.type === "success" ? "success" : "pending",
              type: "booking_payment",
              bookingId: bId,
              amount: displayTotal.toString(),
            },
          });

        } catch (paystackError) {
          console.error("[BookingSummary] Paystack error:", paystackError);
          showToast(paystackError.message || "Failed to process payment", TOAST_TYPE.ERROR);
        } finally {
          setIsInitializingPayment(false);
        }
      } else {
        bookingData.status = "CONFIRMED";
        const existingBookingIdFromParams = params?.bookingId || params?.existingBookingId;
        const result = existingBookingIdFromParams
          ? await bookingService.updateBookingStatus(existingBookingIdFromParams, "CONFIRMED", {
              paymentMethod: "WALLET",
              pricingBreakdown: bookingData.priceBreakdown,
              couponCode: bookingData.couponCode,
              couponDiscount: bookingData.couponDiscount
            })
          : await bookingService.createBooking(bookingData);

        if (result.success) {
          setIsSuccess(true);
          setSuccessMessage("Booking Confirmed!");

          if (couponApplied && couponCode.trim()) {
            const referralService = (await import("../../services/referralService")).default;
            await referralService.trackCouponUsage(
              couponCode.trim(),
              result.booking?._id,
              couponDiscount
            ).catch(err => {
              console.warn("[BookingSummary] Failed to track coupon usage:", err);
            });
          }

          await new Promise(resolve => setTimeout(resolve, 1500));

          router.replace({
            pathname: "/booking-confirmation",
            params: {
              status: "Confirmed",
              propertyName: bookingSummary.property.title,
              location: bookingSummary.property.location,
              coverImage: bookingSummary.property.coverImage || "",
              bookingType: bookingSummary.property.bookingType,
              checkIn: bookingSummary.property.checkIn,
              checkOut: bookingSummary.property.checkOut,
              paymentMethod: "Wallet",
              total: `₦${total.toLocaleString()}`,
              refCode: result.booking?.referenceCode || generateRefCode(),
              bookingId: result.booking?._id,
              listingId: params?.listingId,
              isPending: "true",
              couponApplied: couponApplied ? "true" : "false",
              couponCode: couponCode || "",
              couponDiscount: couponDiscount.toString(),
              subtotalBeforeDiscount: (displayHostTotal + displayAppCharge).toString(),
            },
          });
        } else {
          showToast(result.message || "Failed to process payment. Please try again.", TOAST_TYPE.ERROR);
        }
      }
    } catch (error) {
      console.error("[BookingSummary] Error processing payment:", error);
      showToast(error?.message || "An error occurred. Please try again.", TOAST_TYPE.ERROR);
    } finally {
      setIsProcessing(false);
      setIsInitializingPayment(false);
    }
  };

  // Handle wallet payment selection - navigate to wallet payment screen
  const handleWalletSelect = (paymentData) => {
    console.log(
      "[BookingSummary] Wallet selected, navigating to wallet screen",
    );
    setShowPaymentModal(false);
    router.push({
      pathname: "/pay-with-wallet",
      params: {
        amount: total, // Guest total (what guest pays) - for display
        hostTotal: hostTotal, // Host's total (before 5% fee) - for backend
        propertyName: bookingSummary.property.title,
        listingId: listingId,
        bookingType: bookingSummary.property.bookingType,
        checkIn: bookingSummary.property.checkIn,
        checkOut: bookingSummary.property.checkOut,
        adults: bookingSummary.property.guests.adults,
        children: bookingSummary.property.guests.children,
        // Pass reservation info if coming from Pay Now on reserved booking
        fromReservation: fromReservation ? "true" : "false",
        bookingId: existingBookingId || "",
        couponCode: couponCode.trim() || "",
        couponDiscount: couponDiscount || 0,
      },
    });
  };

  // Generate a reference code for the booking
  const generateRefCode = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `LUN${timestamp}${random}`.toUpperCase();
  };

  if (!mounted) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleGoBack}>
            <ArrowLeftIcon width={24} height={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Booking Summary</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Booking Details Card */}
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              {/* Property Cover Image */}
              <Image
                source={
                  bookingSummary.property.coverImage
                    ? { uri: bookingSummary.property.coverImage }
                    : DEFAULT_PROPERTY_IMAGE
                }
                style={styles.propertyImage}
                resizeMode="cover"
              />

              {/* Property Details */}
              <View style={styles.detailsContainer}>
                <View style={styles.titleLocationRow}>
                  <Text style={styles.propertyTitle}>
                    {bookingSummary.property.title}
                  </Text>
                  <Text style={styles.location}>
                    {bookingSummary.property.location}
                  </Text>
                </View>

                {/* Booking Type */}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Booking Type:</Text>
                  <Text style={styles.infoValue}>
                    {bookingSummary.property.bookingType}
                  </Text>
                </View>

                {/* Check-in/Check-out */}
                <View style={styles.datesRow}>
                  <View style={styles.dateColumn}>
                    <View style={styles.dateHeader}>
                      <CalendarIcon width={16} height={16} />
                      <Text style={styles.dateLabel}>Check in</Text>
                    </View>
                    <Text style={styles.dateValue}>
                      {bookingSummary.property.checkIn}
                    </Text>
                  </View>
                  <View style={styles.spacer} />
                  <View style={styles.dateColumn}>
                    <View style={styles.dateHeader}>
                      <CalendarIcon width={16} height={16} />
                      <Text style={styles.dateLabel}>Check out</Text>
                    </View>
                    <Text style={styles.dateValue}>
                      {bookingSummary.property.checkOut}
                    </Text>
                  </View>
                </View>

                {/* Guests */}
                <View style={styles.guestsRow}>
                  <Text style={styles.guestsLabel}>Guests:</Text>
                  <Text style={styles.guestsValue}>
                    • {bookingSummary.property.guests.adults} Adults •{" "}
                    {bookingSummary.property.guests.children} Children •{" "}
                    {bookingSummary.property.guests.pets}
                  </Text>
                </View>
              </View>

              {/* Edit Button */}
              {!fromReservation && (
                <Pressable style={styles.editButton} onPress={handleEdit}>
                  <Text style={styles.editButtonText}>Edit</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Price Breakdown */}
          <View style={styles.priceBreakdownSection}>
            <Text style={styles.sectionTitle}>Price Breakdown:</Text>

            <View style={styles.priceCard}>
              {/* Rental Price Section */}
              <View style={[styles.priceRow, styles.priceRowTop]}>
                <View>
                  <Text style={styles.priceLabel}>Rental Price</Text>
                  <Text style={styles.priceSublabel}>
                    ₦
                    {Number(bookingSummary.pricing.rentalPrice).toLocaleString(
                      "en-NG",
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                    )}{" "}
                    × {bookingSummary.pricing.numberOfUnits}{" "}
                    {bookingSummary.pricing.periodLabel}
                  </Text>
                </View>
                <Text style={styles.priceAmount}>
                  ₦
                  {Number(bookingSummary.pricing.rentalSubtotal).toLocaleString(
                    "en-NG",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}
                </Text>
              </View>

              {/* Service Charge - Set by host */}
              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.priceLabel}>Service Charge</Text>
                  <Text style={styles.priceSublabel}>(Set by host)</Text>
                </View>
                <Text style={styles.priceAmount}>
                  ₦
                  {Number(bookingSummary.pricing.serviceCharge).toLocaleString(
                    "en-NG",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}
                </Text>
              </View>

              {/* Caution Fee */}
              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.priceLabel}>Caution Fee</Text>
                  <Text style={styles.priceSublabel}>(Refundable)</Text>
                </View>
                <Text style={styles.priceAmount}>
                  ₦
                  {Number(
                    bookingSummary.pricing.securityDeposit,
                  ).toLocaleString("en-NG", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>

              {/* Subtotal Before Coupon */}
              <View style={[styles.priceRow, styles.subtotalRow]}>
                <Text style={styles.subtotalLabel}>Subtotal:</Text>
                <Text style={styles.subtotalAmount}>
                  ₦
                  {(
                    bookingSummary.pricing.rentalSubtotal +
                    bookingSummary.pricing.serviceCharge +
                    bookingSummary.pricing.securityDeposit
                  ).toLocaleString("en-NG", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>

              {/* Coupon Section */}
              <View style={styles.couponSection}>
                <Text style={styles.couponLabel}>Coupon</Text>
                <View style={styles.couponInputRow}>
                  <TextInput
                    style={[
                      styles.couponInput,
                      couponApplied && {
                        backgroundColor: "#f0f0f0",
                        color: "#999",
                      },
                    ]}
                    placeholder="Enter coupon code"
                    placeholderTextColor="#999"
                    value={couponCode}
                    onChangeText={setCouponCode}
                    editable={!couponApplied}
                  />
                  <Pressable
                    style={[
                      styles.couponButton,
                      couponApplied && {
                        backgroundColor: "#27AE60",
                        borderColor: "#27AE60",
                      },
                      couponLoading && { opacity: 0.7 },
                    ]}
                    onPress={handleApplyCoupon}
                    disabled={couponLoading}
                  >
                    {couponLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.couponButtonText}>
                        {couponApplied ? "Remove" : "Apply"}
                      </Text>
                    )}
                  </Pressable>
                </View>
                <Text style={styles.couponOptional}>Optional</Text>
                {couponDiscount > 0 && (
                  <Text style={styles.couponSuccess}>
                    Discount applied: ₦
                    {couponDiscount.toLocaleString("en-NG", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                )}
              </View>

              {/* Coupon Discount Row */}
              {bookingSummary.pricing.couponDiscount > 0 && (
                <>
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceLabel, { color: "#27AE60" }]}>
                      Coupon Discount {couponType === "PERCENTAGE" && couponValue > 0 ? `(${couponValue}%)` : ""}
                    </Text>
                    <Text style={[styles.priceAmount, { color: "#27AE60" }]}>
                      -₦
                      {Number(bookingSummary.pricing.couponDiscount).toLocaleString("en-NG", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </View>
                  
                  {/* After Coupon Subtotal */}
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceLabel, { color: "#666" }]}>
                      After Coupon
                    </Text>
                    <Text style={[styles.priceAmount, { color: "#666" }]}>
                      ₦
                      {Number(bookingSummary.pricing.discountedSubtotal).toLocaleString("en-NG", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </View>
                </>
              )}

              {/* App Charge (5% of Discounted Subtotal) */}
              <View style={styles.priceRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.priceLabel}>
                    App Charge ({GUEST_FEE_PERCENT}%)
                  </Text>
                  <Text style={styles.priceSublabel}>
                    {bookingSummary.pricing.couponDiscount > 0 ? "Calculated on discounted amount. Note: caution fee is NOT discounted." : ""}
                  </Text>
                </View>
                <Text style={styles.priceAmount}>
                  ₦
                  {Number(bookingSummary.pricing.guestFee).toLocaleString("en-NG", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>

              {/* VAT on App Charge */}
              <View style={[styles.priceRow, styles.priceRowBottom]}>
                <View>
                  <Text style={styles.priceLabel}>
                    VAT ({VAT_PERCENT}% of App Charge)
                  </Text>
                </View>
                <Text style={styles.priceAmount}>
                  ₦
                  {Number(bookingSummary.pricing.guestVat).toLocaleString("en-NG", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>

              {/* Free Booking Info Alert */}
              {bookingSummary.pricing.couponDiscount > 0 &&
                bookingSummary.pricing.total === 0 && (
                  <View
                    style={{
                      backgroundColor: "#E8F5E9",
                      borderRadius: 8,
                      padding: 12,
                      marginVertical: 8,
                      borderLeftWidth: 4,
                      borderLeftColor: "#27AE60",
                    }}
                  >
                    <Text
                      style={{
                        color: "#1B5E20",
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      🎉 Booking is FREE!
                    </Text>
                    <Text
                      style={{
                        color: "#2E7D32",
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      Your coupon covers the full booking amount. Click &quot;Proceed
                      to booking&quot; to confirm your reservation instantly.
                    </Text>
                  </View>
                )}

              {/* Total */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  {bookingSummary.pricing.couponDiscount > 0 ? "Amount to Pay:" : "Total:"}
                </Text>
                <Text style={styles.totalAmount}>
                  ₦
                  {Number(bookingSummary.pricing.total).toLocaleString(
                    "en-NG",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}
                </Text>
              </View>
            </View>
          </View>

          {/* Cancellation Policy */}
          <Pressable
            style={styles.cancellationSection}
            onPress={() => setShowCancelPolicy(true)}
          >
            <Text style={styles.cancellationText}>
              <Text>This booking is non-refundable. </Text>
              <Text style={styles.cancellationLink}>View Policy</Text>
            </Text>
          </Pressable>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Proceed to Payment Button */}
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 20) }
          ]}
        >
          <Pressable
            style={[
              styles.proceedButton,
              couponApplied &&
                couponDiscount > 0 &&
                bookingSummary.pricing.total === 0 && {
                  backgroundColor: "#27AE60",
                },
            ]}
            onPress={handleProceedToPayment}
          >
            <Text style={styles.proceedButtonText}>
              Confirm Booking
            </Text>
          </Pressable>
        </View>

        {/* Cancellation Policy Modal */}
        <Modal visible={showCancelPolicy} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setShowCancelPolicy(false)}
            />
            <View style={styles.policyContainer}>
              <View style={styles.policyHeader}>
                <Text style={styles.policyTitle}>Cancellation Policy</Text>
                <Pressable onPress={() => setShowCancelPolicy(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.policyContent}>
                <Text style={styles.policyText}>
                  Lunest follows a sliding-scale refund policy based on how early you cancel:
                </Text>
                <View style={{ marginVertical: 10, gap: 8 }}>
                   <Text style={styles.policyText}>• <Text style={{fontWeight: '700'}}>7+ Days before check-in:</Text> Full cash refund (minus ₦5,000 platform processing fee).</Text>
                   <Text style={styles.policyText}>• <Text style={{fontWeight: '700'}}>3 – 7 Days before:</Text> 80% refund (issued as platform credit) and 20% penalty.</Text>
                   <Text style={styles.policyText}>• <Text style={{fontWeight: '700'}}>48 – 72 Hours before:</Text> 60% refund (issued as platform credit) and 40% penalty.</Text>
                   <Text style={styles.policyText}>• <Text style={{fontWeight: '700'}}>&lt; 48 Hours before:</Text> 50% refund (issued as platform credit) and 50% penalty.</Text>
                </View>
                <Text style={styles.policyText}>
                  Please note that once the stay has officially started, or if the check-in time has passed, refunds are generally not available. Platform credits are issued as unique coupons valid for 1 year.
                </Text>
              </ScrollView>
            </View>
          </View>
        </Modal>
  
        {/* Booking Confirmation Modal */}
        <ConfirmBookingModal
          visible={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmedStep}
          bookingDetails={{
            propertyName: bookingSummary.property.title,
            location: bookingSummary.property.location,
            checkIn: params?.checkInDate || bookingSummary.property.checkIn,
            checkOut: params?.checkOutDate || bookingSummary.property.checkOut,
          }}
          pricing={{
            subtotal: bookingSummary.pricing.rentalSubtotal,
            serviceCharge: bookingSummary.pricing.serviceCharge,
            appCharge: bookingSummary.pricing.appCharge,
            securityDeposit: bookingSummary.pricing.securityDeposit,
            couponDiscount: couponDiscount,
            total: bookingSummary.pricing.total,
          }}
        />

        {/* Payment Method Selection Modal */}
        <PaymentMethodModal
          visible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSelect={handlePaymentMethodSelect}
          onWalletSelect={handleWalletSelect}
          loading={isProcessing}
          totalAmount={bookingSummary.pricing.total}
          bookingDetails={bookingSummary}
          hideReserveOption={fromReservation}
        />

        {/* KYC Required Modal */}
        <KycRequiredModal
          visible={showKycModal}
          onClose={() => setShowKycModal(false)}
        />


        {/* Processing Overlay */}
        {isProcessing && (
          <View style={styles.processingOverlay}>
            <View style={styles.processingCard}>
              {isSuccess ? (
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="checkmark-circle" size={60} color="#2E7D32" />
                  <Text style={[styles.processingText, { color: '#2E7D32' }]}>
                    {successMessage || "Booking Confirmed!"}
                  </Text>
                </View>
              ) : (
                <>
                  <ActivityIndicator size="large" color="#192DFF" />
                  <Text style={styles.processingText}>
                    Processing your booking...
                  </Text>
                </>
              )}
            </View>
          </View>
        )}

        {/* Initializing Payment Overlay */}
        {isInitializingPayment && (
          <View style={styles.processingOverlay}>
            <View style={styles.processingCard}>
              <ActivityIndicator size="large" color="#192DFF" />
              <Text style={styles.processingText}>
                Proceeding to Secure Payment...
              </Text>
              <Text style={styles.processingSubtext}>
                Please wait while we set up your checkout session.
              </Text>
            </View>
          </View>
        )}

        {/* Toast Notification */}
        <ToastNotification
          visible={toastVisible}
          type={toastConfig.type}
          message={toastConfig.message}
          onHide={() => setToastVisible(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    flex: 1,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  cardContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  card: {
    borderRadius: 10,
    backgroundColor: "#fff",
    shadowColor: "#efefef",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 36,
    elevation: 8,
    padding: 16,
    gap: 12,
  },
  imagePlaceholder: {
    width: "100%",
    height: 169,
    borderRadius: 8,
    backgroundColor: "#E8E8E8",
  },
  propertyImage: {
    width: "100%",
    height: 169,
    borderRadius: 8,
    backgroundColor: "#E8E8E8",
  },
  detailsContainer: {
    gap: 12,
  },
  titleLocationRow: {
    gap: 4,
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  location: {
    fontSize: 14,
    color: "#7C7C7C",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#656565",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
  },
  datesRow: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
  },
  dateColumn: {
    gap: 4,
  },
  spacer: {
    flex: 1,
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#656565",
  },
  dateValue: {
    fontSize: 12,
    fontWeight: "500",
    color: "#000",
  },
  guestsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  guestsLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#656565",
  },
  guestsValue: {
    fontSize: 12,
    fontWeight: "500",
    color: "#000",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0E2F5D",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: "flex-start",
    gap: 8,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#fff",
  },
  priceBreakdownSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
  },
  priceCard: {
    borderRadius: 10,
    backgroundColor: "#fff",
    shadowColor: "#efefef",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 36,
    elevation: 8,
    overflow: "hidden",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  priceRowTop: {
    borderTopWidth: 0,
    paddingTop: 12,
  },
  priceRowBottom: {
    borderBottomWidth: 0.5,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#656565",
  },
  priceSublabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#656565",
  },
  priceValueContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  priceAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
  },
  priceUnit: {
    fontSize: 10,
    color: "#999",
  },
  subtotalRow: {
    borderBottomWidth: 0,
    paddingVertical: 12,
  },
  subtotalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
  },
  subtotalAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
  },
  couponSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  couponLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#656565",
  },
  couponInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  couponInput: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bdbdbd",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: "#000",
  },
  couponPlaceholder: {
    fontSize: 12,
    color: "#999",
  },
  couponButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#192DFF",
    backgroundColor: "#192DFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 70,
  },
  couponButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#fff",
  },
  couponOptional: {
    fontSize: 10,
    color: "#000",
  },
  couponSuccess: {
    fontSize: 11,
    fontWeight: "600",
    color: "#27AE60",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  cancellationSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  cancellationText: {
    fontSize: 12,
    color: "#E74C3C",
  },
  cancellationLink: {
    fontWeight: "600",
    color: "#010135",
  },
  bottomSpacer: {
    height: 120, // Increased to ensure content scrolls above the sticky footer
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
    backgroundColor: "#fff",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  proceedButton: {
    backgroundColor: "#010135",
    paddingVertical: 14,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
  },
  policyContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  policyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  closeButton: {
    fontSize: 24,
    color: "#000",
  },
  policyContent: {
    gap: 12,
  },
  policyText: {
    fontSize: 12,
    color: "#292929",
    lineHeight: 18,
    marginBottom: 12,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  processingCard: {
    backgroundColor: "#FFF",
    padding: 30,
    borderRadius: 16,
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  processingText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#010135",
    marginTop: 8,
  },
  processingSubtext: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
  },
});

export default BookingSummary;
