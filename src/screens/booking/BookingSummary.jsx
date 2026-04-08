import { differenceInDays, format, parse } from "date-fns";
import * as Linking from "expo-linking";
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
import PaymentMethodModal from "../../components/modals/PaymentMethodModal";
import authService from "../../services/authService";
import bookingService from "../../services/bookingService";
import paymentService from "../../services/paymentService";

// Default property image fallback
const DEFAULT_PROPERTY_IMAGE = require("../../assets/images/prop_image.png");

const BookingSummary = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [showCancelPolicy, setShowCancelPolicy] = useState(false);
  // Show payment modal immediately if coming from reservation Pay Now
  const [showPaymentModal, setShowPaymentModal] = useState(
    params.showPaymentModal === "true",
  );
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fetchedBooking, setFetchedBooking] = useState(null);
  const [isFetchingBooking, setIsFetchingBooking] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
  
  // Extract additional notes from params
  const additionalNotes = params.notes || "";

  // Debug: Log received dates
  console.log("[BookingSummary] Received dates:", {
    checkInDate: params?.checkInDate,
    checkOutDate: params?.checkOutDate,
    checkInType: typeof params?.checkInDate,
    checkOutType: typeof params?.checkOutDate
  });

  // Cover image URL from listing images - validate it's a valid URL
  const coverImage =
    params.coverImage &&
    (params.coverImage.startsWith("http") ||
      params.coverImage.startsWith("https"))
      ? params.coverImage
      : null;

  // Log for debugging
  console.log("[BookingSummary] Cover image URL:", params.coverImage);
  console.log("[BookingSummary] Validated cover image:", coverImage);

  // Host's original rental price per period
  const rentalPrice =
    parseFloat(params.price) || parseFloat(params.amount) || 1200000;

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
      rentalSubtotal = rentalPrice * numberOfNights;
      periodUnits = numberOfNights;
      periodLabel = "night";
      break;
    case "month":
      rentalSubtotal = rentalPrice * numberOfMonths;
      periodUnits = numberOfMonths;
      periodLabel = "month";
      break;
    case "year":
      rentalSubtotal = rentalPrice * numberOfYears;
      periodUnits = numberOfYears;
      periodLabel = "year";
      break;
    default:
      rentalSubtotal = rentalPrice * numberOfNights;
      periodUnits = numberOfNights;
      periodLabel = "night";
  }

  // Service charge (set by host) - comes from listing, NOT a percentage
  const serviceCharge = parseFloat(params?.serviceCharge) || 0;

  // Caution Fee (set by host, refundable) - comes from listing
  const securityDeposit = parseFloat(params?.securityDeposit) || 0;

  const hostSubtotal = rentalSubtotal + serviceCharge;

  // Host's Total = rental + service charge + caution fee (what host priced)
  const hostTotal = hostSubtotal + securityDeposit;

  // NEW: Coupon applies to Rent + Service Charge (taxable components)
  // The Security Deposit is a refundable escrow amount and should NOT be discounted.
  const GUEST_FEE_PERCENT = 5;
  const VAT_PERCENT = 7.5;

  // Calculate coupon discount on HOST SUBTOTAL (excluding caution fee)
  let couponDiscountAmount = 0;
  if (couponApplied && couponDiscount > 0) {
    couponDiscountAmount = Math.min(couponDiscount, hostSubtotal);
  }
  
  // Discounted subtotal (Rent + SC) and original caution fee
  const discountedHostSubtotal = Math.max(0, hostSubtotal - couponDiscountAmount);
  const discountedGuestBase = discountedHostSubtotal + securityDeposit;
  
  // App fee and VAT calculated on DISCOUNTED guest base (Net Rent/SC + Full Caution)
  const guestFeeBase = Math.round((discountedGuestBase * GUEST_FEE_PERCENT) / 100);
  const guestVat = Math.round((guestFeeBase * VAT_PERCENT) / 100);
  const appCharge = guestFeeBase + guestVat;

  // Final total = discounted subtotal + caution fee + app fee + VAT
  const total = discountedGuestBase + appCharge;
  
  // Subtotal before coupon (for display)
  const subtotalBeforeDiscount = hostTotal;
  
  // Subtotal after coupon (for display)
  const discountedSubtotal = discountedGuestBase;

  // PREFER FETCHED BOOKING PRICING IF AVAILABLE
  const displayPricing = fetchedBooking?.pricingBreakdown || {
    rentalSubtotal,
    serviceCharge,
    securityDeposit,
    hostTotal,
    appCharge,
    subtotalBeforeDiscount: hostTotal,
    couponDiscount,
    total,
    guestTotal: total,
    rentalPrice,
    numberOfUnits: periodUnits,
    pricingPeriod,
    periodLabel
  };

  const [couponLoading, setCouponLoading] = useState(false);

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
      if (result.success) {
        const couponData = result.data;
        const discount = couponData.discount;
        
        // Check if coupon has already been used by this user (NO REUSE)
        if (couponData.hasBeenUsedByUser) {
          const errorMsg = "This coupon has already been used by you. You can only use each coupon once.";
          showToast(errorMsg, TOAST_TYPE.ERROR);
          setCouponCode("");
          setCouponDiscount(0);
          setCouponApplied(false);
          setCouponLoading(false);
          return;
        }
        
        // Check if coupon has usage limits
        if (couponData.maxUses && couponData.usedCount >= couponData.maxUses) {
          showToast("This coupon has reached its usage limit", TOAST_TYPE.ERROR);
          setCouponCode("");
          setCouponDiscount(0);
          setCouponApplied(false);
          setCouponLoading(false);
          return;
        }
        
        // Check if coupon is expired
        if (couponData.expiryDate && new Date(couponData.expiryDate) < new Date()) {
          showToast("This coupon has expired", TOAST_TYPE.ERROR);
          setCouponCode("");
          setCouponDiscount(0);
          setCouponApplied(false);
          setCouponLoading(false);
          return;
        }
        
        // FIXED → flat amount, PERCENTAGE → % of discountable subtotal (rent + service)
        const amount =
          discount.type === "PERCENTAGE"
            ? Math.round(hostSubtotal * (discount.value / 100))
            : discount.value;
        setCouponDiscount(amount);
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
        
        // Show success toast
        showToast(
          `Coupon applied! You save ₦${amount.toLocaleString()}`,
          TOAST_TYPE.SUCCESS
        );
      } else {
        // Handle specific coupon validation errors with clear user-friendly messages
        let errorMsg = "Invalid coupon code";
        
        if (result.message) {
          const msg = result.message.toLowerCase();
          if (msg.includes("not found") || msg.includes("doesn't exist") || msg.includes("invalid")) {
            errorMsg = "This coupon code doesn't exist. Please check and try again.";
          } else if (msg.includes("expired")) {
            errorMsg = "This coupon has expired and can no longer be used.";
          } else if (msg.includes("usage") || msg.includes("limit")) {
            errorMsg = "This coupon has reached its usage limit.";
          } else if (msg.includes("minimum") || msg.includes("amount")) {
            errorMsg = "This booking doesn't meet the minimum amount required for this coupon.";
          } else {
            errorMsg = result.message;
          }
        }
        
        showToast(errorMsg, TOAST_TYPE.ERROR);
        setCouponCode("");
        setCouponDiscount(0);
        setCouponApplied(false);
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
      // Rental breakdown using displayPricing helper
      rentalPrice: displayPricing.rentalPrice || rentalPrice,
      numberOfUnits: displayPricing.numberOfUnits || periodUnits,
      pricingPeriod: displayPricing.pricingPeriod || pricingPeriod,
      periodLabel: displayPricing.periodLabel || periodLabel,
      rentalSubtotal: displayPricing.rentalSubtotal || rentalSubtotal,

      // Additional charges
      serviceCharge: displayPricing.serviceCharge || serviceCharge,
      serviceChargeLabel: "Service Charge",
      securityDeposit: displayPricing.securityDeposit || securityDeposit,

      // Totals
      hostTotal: displayPricing.hostTotal || hostTotal,
      appCharge: displayPricing.appCharge || appCharge,
      amount: displayPricing.total,
      totalAmount: {
        price: displayPricing.total,
        currency: "NGN",
      },
      discount: displayPricing.couponDiscount || couponDiscount,
      couponCode: couponCode.trim(),
      total: displayPricing.total,
    },
  };

  // If client passed a calculated breakdown, prefer it for display and totals
  try {
    const passedBreakdownRaw = params?.priceBreakdown;
    const passedBreakdown =
      typeof passedBreakdownRaw === "string" && passedBreakdownRaw.length > 0
        ? JSON.parse(passedBreakdownRaw)
        : passedBreakdownRaw;

    if (passedBreakdown && typeof passedBreakdown === "object") {
      bookingSummary.pricing.rentalSubtotal =
        passedBreakdown.baseAmount ?? bookingSummary.pricing.rentalSubtotal;
      bookingSummary.pricing.numberOfUnits =
        passedBreakdown.units ?? bookingSummary.pricing.numberOfUnits;
      bookingSummary.pricing.periodUnits =
        passedBreakdown.periodUnits ?? bookingSummary.pricing.periodUnits;
      bookingSummary.pricing.periodLabel =
        passedBreakdown.periodLabel ?? bookingSummary.pricing.periodLabel;
      // Use the passed service fee as a platform/processing fee display (may differ from host serviceCharge)
      bookingSummary.pricing.serviceFee = passedBreakdown.serviceFee ?? 0;
      bookingSummary.pricing.securityDeposit =
        passedBreakdown.deposit ?? bookingSummary.pricing.securityDeposit;

      const hostSubtotalNew =
        bookingSummary.pricing.rentalSubtotal +
        (bookingSummary.pricing.serviceCharge || 0);

      bookingSummary.pricing.hostTotal =
        hostSubtotalNew + bookingSummary.pricing.securityDeposit;

      // Restrict coupon calculation to only the rent/service subtotal
      let couponDiscountAmountNew = 0;
      if (couponApplied && bookingSummary.pricing.discount > 0) {
        couponDiscountAmountNew = Math.min(bookingSummary.pricing.discount, hostSubtotalNew);
      }
      
      const discountedHostSubtotalNew = Math.max(0, hostSubtotalNew - couponDiscountAmountNew);
      const discountedGuestBaseNew = discountedHostSubtotalNew + bookingSummary.pricing.securityDeposit;

      // Apply app fees mapped only to the discounted base
      const guestFeeBaseNew = Math.round(
        (discountedGuestBaseNew * GUEST_FEE_PERCENT) / 100,
      );
      const guestVatNew = Math.round((guestFeeBaseNew * VAT_PERCENT) / 100);
      
      bookingSummary.pricing.appCharge = guestFeeBaseNew + guestVatNew;
      bookingSummary.pricing.subtotal =
        bookingSummary.pricing.hostTotal + bookingSummary.pricing.appCharge;

      // Arithmetic amount to pay
      bookingSummary.pricing.total = Math.max(
        0,
        discountedGuestBaseNew + bookingSummary.pricing.appCharge
      );
    }
  } catch (e) {
    // ignore parse errors
    console.warn("[BookingSummary] Failed to parse passed priceBreakdown", e);
  }

  const handleGoBack = () => {
    router.back();
  };

  const handleEdit = () => {
    router.back();
  };

  const handleProceedToPayment = async () => {
    // If coupon covers the full amount (total = 0), create booking directly without payment modal
    if (couponApplied && couponDiscount > 0 && bookingSummary.pricing.total === 0) {
      setIsProcessing(true);
      try {
        const user = await authService.getUserData();

        const parseDate = (dateStr) => {
          if (!dateStr) return new Date().toISOString();
          
          console.log("[BookingSummary] parseDate input:", dateStr);
          
          if (typeof dateStr === "string" && dateStr.includes("-")) {
            // Handle both YYYY-MM-DD and D-M-YYYY
            const parts = dateStr.split("-");
            if (parts.length === 3) {
              const year = parts[0].length === 4 ? parts[0] : parts[2];
              const month = parts[0].length === 4 ? parts[1] : parts[1];
              const day = parts[0].length === 4 ? parts[2] : parts[0];
              
              const parsedDate = new Date(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day),
              );
              console.log("[BookingSummary] parseDate result:", parsedDate.toISOString());
              return parsedDate.toISOString();
            }
          }
          
          // Try other formats
          if (typeof dateStr === "string" && dateStr.includes("/")) {
            const parts = dateStr.split("/");
            if (parts.length === 3) {
              const [day, month, year] = parts;
              const parsedDate = new Date(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day),
              );
              console.log("[BookingSummary] parseDate (d/M/yyyy):", parsedDate.toISOString());
              return parsedDate.toISOString();
            }
          }
          
          const parsed = new Date(dateStr);
          const result = isNaN(parsed.getTime())
            ? new Date().toISOString()
            : parsed.toISOString();
          console.log("[BookingSummary] parseDate (fallback):", result);
          return result;
        };

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
            adults:
              parseInt(params?.adults) || bookingSummary.property.guests.adults,
            children:
              parseInt(params?.children) ||
              bookingSummary.property.guests.children,
            pets: 0,
          },
          checkIn: parseDate(
            params?.checkInDate || bookingSummary.property.checkIn,
          ),
          checkOut: parseDate(
            params?.checkOutDate || bookingSummary.property.checkOut,
          ),
          // Coupon covers full amount - no external payment needed
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
            amountPaidViaPayment: 0, // Coupon covers full amount
            couponType: "FULL_COVERAGE", // Indicates coupon fully covered the cost
          },
          bookedBy: user?._id || user?.id,
          couponCode: couponCode.trim(),
          couponDiscount: couponDiscount,
          additionalNotes: additionalNotes, // Add additional notes
        };

        const existingBookingId = params?.bookingId; // Assuming bookingId can be passed as a param for updates

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
          // Track coupon usage if a coupon was applied
          if (couponApplied && couponCode.trim()) {
            const referralService = (await import("../../services/referralService")).default;
            await referralService.trackCouponUsage(
              couponCode.trim(),
              result.booking?._id,
              couponDiscount
            ).catch(err => {
              console.warn("[BookingSummary] Failed to track coupon usage:", err);
              // Don't fail the booking if tracking fails
            });
          }

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
      return;
    }
    // Show payment method selection modal
    setShowPaymentModal(true);
  };

  const handlePaymentMethodSelect = async (paymentData) => {
    console.log("[BookingSummary] Payment method selected:", paymentData);
    console.log("[BookingSummary] Coupon details:", {
      couponApplied,
      couponCode,
      couponDiscount,
      hostTotal,
      total: bookingSummary.pricing.total,
      displayTotal: bookingSummary.pricing.total || total,
    });
    setShowPaymentModal(false);
    setIsProcessing(true);

    try {
      // Get current user info
      const user = await authService.getUserData();
      // Helper function to convert date string to ISO format
      const parseDate = (dateStr) => {
        if (!dateStr) return new Date().toISOString();
        
        // If it's already a valid date string (like ISO), use it
        const dateObj = new Date(dateStr);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString();
        }

        // Handle both YYYY-MM-DD and D-M-YYYY
        if (typeof dateStr === "string" && dateStr.includes("-")) {
          const parts = dateStr.split("-");
          if (parts.length === 3) {
            const year = parts[0].length === 4 ? parts[0] : parts[2];
            const month = parts[0].length === 4 ? parts[1] : parts[1];
            const day = parts[0].length === 4 ? parts[2] : parts[0];
            
            const parsed = new Date(
              parseInt(year),
              parseInt(month) - 1,
              parseInt(day),
            );
            if (!isNaN(parsed.getTime())) {
              return parsed.toISOString();
            }
          }
        }
        
        // Final fallback
        return new Date().toISOString();
      };

      // Map booking type to valid enum values
      const mapBookingType = (type) => {
        if (!type) return "DAILY";
        const upperType = type.toUpperCase();
        // Handle combined types like "DAILY/WEEKLY"
        if (upperType.includes("/")) {
          const firstType = upperType.split("/")[0].trim();
          if (["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(firstType)) {
            return firstType;
          }
        }
        // Map variations to valid enum values
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

      // Prepare booking data
      // Send hostTotal to backend - backend will calculate guest total (hostTotal + 5%)
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
          adults:
            parseInt(params?.adults) || bookingSummary.property.guests.adults,
          children:
            parseInt(params?.children) ||
            bookingSummary.property.guests.children,
          pets: 0,
        },
        checkIn: parseDate(
          params?.checkInDate || bookingSummary.property.checkIn,
        ),
        checkOut: parseDate(
          params?.checkOutDate || bookingSummary.property.checkOut,
        ),
        paymentMethod: paymentData.reserveAndPayLater
          ? null
          : paymentData.paymentMethod?.toUpperCase(),
        // Send hostTotal (before 5% guest fee) - backend adds 5% when processing payment
        totalAmount: {
          price: displayHostTotal, // Backend expects host's total, it calculates guest total
          currency: "NGN",
        },
        // Enhanced price breakdown with coupon and payment tracking
        priceBreakdown: {
          rentalSubtotal: displayRentalSubtotal,
          serviceCharge: displayServiceCharge,
          securityDeposit: displaySecurityDeposit,
          hostTotal: displayHostTotal,
          guestFee: displayAppCharge,
          subtotalBeforeDiscount: displayHostTotal + displayAppCharge, // Total before coupon
          couponApplied: couponApplied,
          couponCode: couponCode.trim() || null,
          couponDiscount: couponDiscount || 0, // Discount amount from coupon
          amountAfterCoupon: displayTotal, // Amount to pay after coupon deduction
          guestTotal: displayTotal,
          paymentMethodUsed: paymentData.reserveAndPayLater
            ? "RESERVE_AND_PAY_LATER"
            : paymentData.paymentMethod?.toUpperCase() || "WALLET",
          amountPaidViaPayment: displayTotal, // What user actually paid through payment method
        },
        bookedBy: user?._id || user?.id,
        couponCode: couponCode.trim() || undefined,
        couponDiscount: couponDiscount || undefined,
        additionalNotes: additionalNotes, // Add additional notes
      };

      // Determine booking status based on payment method
      if (paymentData.reserveAndPayLater) {
        // Reserve and Pay Later - Create booking with RESERVED status
        bookingData.status = "RESERVED";

        const result = existingBookingId
          ? await bookingService.updateBookingStatus(existingBookingId, "RESERVED", {
              pricingBreakdown: bookingData.priceBreakdown,
              couponCode: bookingData.couponCode,
              couponDiscount: bookingData.couponDiscount
            })
          : await bookingService.createBooking(bookingData);

        if (result.success) {
          // Track coupon usage if a coupon was applied
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

          // Navigate to booking confirmation with reserved status
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
              // Countdown: 1 hour to pay (3600 seconds)
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
        paymentData.paymentMethod === "card"
      ) {
        // Paystack/Card payment - Use Paystack checkout
        try {
          // Get user email
          const email = user?.email || user?.emailAddress;
          if (!email) {
            showToast("Please update your profile with an email address", TOAST_TYPE.ERROR);
            return;
          }

          // Initialize Paystack payment
          const paymentResult = await paymentService.initializePayment(
            displayTotal,
            email,
            {
              type: "BOOKING",
              listingId: params?.listingId,
              description: `Booking for ${bookingSummary.property.title}`,
            },
          );

          console.log("[BookingSummary] Paystack payment initialized:", {
            amount: displayTotal,
            email: email,
            reference: paymentResult.reference,
            hasAuthUrl: !!paymentResult.authorization_url,
            couponApplied,
            couponCode,
            couponDiscount,
          });

          if (paymentResult.authorization_url) {
            // Create callback URL for deep linking back to app
            let callbackUrl;
            if (Platform.OS === "web") {
              // Standardize web callback URL
              callbackUrl = window.location.origin + "/payment-callback";
            } else {
              callbackUrl = Linking.createURL("payment-callback", {
                queryParams: {
                  type: "booking_payment",
                  amount: displayTotal.toString(),
                },
              });
            }

            // PERSIST CONTEXT
            const paymentContext = {
              type: "BOOKING",
              bookingData: bookingData,
              propertyName: bookingSummary.property.title,
              location: bookingSummary.property.location,
              coverImage: bookingSummary.property.coverImage || "",
              bookingType: bookingSummary.property.bookingType,
              checkIn: bookingSummary.property.checkIn,
              checkOut: bookingSummary.property.checkOut,
            };

            if (Platform.OS === "web") {
              localStorage.setItem("lunest_payment_context", JSON.stringify(paymentContext));
              window.location.href = paymentResult.authorization_url;
              return; // Stop here on web to avoid triggering popup blockers
            } else {
              await AsyncStorage.setItem("lunest_payment_context", JSON.stringify(paymentContext));
              // Proceed to browser open...
            }

            // Open Paystack checkout with auth session for better deep linking
            const browserResult = await WebBrowser.openAuthSessionAsync(
              paymentResult.authorization_url,
              callbackUrl,
            );

            console.log("[BookingSummary] Browser result:", browserResult);

            // Check if deep link was successful
            if (browserResult.type === "success") {
              console.log("[BookingSummary] Deep link successful, payment callback handled");
              // The payment-callback screen will handle verification
              return;
            }

            // Fallback: Verify payment after browser closes
            console.log("[BookingSummary] Browser closed, verifying payment status...");

            // Verify payment after browser closes
            const verifyResult = await paymentService.verifyPayment(
              paymentResult.reference,
            );

            if (verifyResult.status === "COMPLETED") {
              // Payment successful - create confirmed booking
              bookingData.status = "CONFIRMED";
              bookingData.paymentReference = paymentResult.reference;

              const result = existingBookingId
                ? await bookingService.updateBookingStatus(existingBookingId, "CONFIRMED", {
                    paymentMethod: paymentData.paymentMethod?.toUpperCase(),
                    paymentReference: paymentResult.reference,
                    pricingBreakdown: bookingData.priceBreakdown,
                    couponCode: bookingData.couponCode,
                    couponDiscount: bookingData.couponDiscount
                  })
                : await bookingService.createBooking(bookingData);

              if (result.success) {
                // Track coupon usage if a coupon was applied
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
                    status: "Confirmed",
                    propertyName: bookingSummary.property.title,
                    location: bookingSummary.property.location,
                    coverImage: bookingSummary.property.coverImage || "",
                    bookingType: bookingSummary.property.bookingType,
                    checkIn: bookingSummary.property.checkIn,
                    checkOut: bookingSummary.property.checkOut,
                    paymentMethod: "Paystack",
                    total: `₦${displayTotal.toLocaleString()}`,
                    refCode: result.booking?.referenceCode || generateRefCode(),
                    bookingId: result.booking?._id,
                    listingId: params?.listingId,
                    propertyImage: bookingSummary.property.coverImage || "",
                    couponApplied: couponApplied ? "true" : "false",
                    couponCode: couponCode || "",
                    couponDiscount: couponDiscount.toString(),
                    subtotalBeforeDiscount: (displayHostTotal + displayAppCharge).toString(),
                  },
                });
              } else {
                showToast("Booking creation failed after payment. Please contact support.", TOAST_TYPE.ERROR);
              }
            } else if (verifyResult.status === "CANCELED") {
              showToast("Payment was canceled. Please try again.", TOAST_TYPE.INFO);
            } else {
              showToast("Your payment is being processed. Please check your bookings.", TOAST_TYPE.INFO);
            }
          } else {
            showToast("Failed to initialize payment. Please try again.", TOAST_TYPE.ERROR);
          }
        } catch (paystackError) {
          console.error("[BookingSummary] Paystack error:", paystackError);
          const gatewayMsg = paystackError?.response?.body?.gateway_response;
          const displayMessage = gatewayMsg || paystackError.message || "Failed to process payment";
          showToast(displayMessage, TOAST_TYPE.ERROR);
        }
      } else {
        // Wallet payment - Create booking with CONFIRMED status
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
          // Track coupon usage if a coupon was applied
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

          // Navigate to booking confirmation with confirmed status
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
              couponApplied: couponApplied ? "true" : "false",
              couponCode: couponCode || "",
              couponDiscount: couponDiscount.toString(),
              subtotalBeforeDiscount: (displayHostTotal + displayAppCharge).toString(),
            },
          });
        } else {
          const errorMsg = result.message || "Failed to process payment. Please try again.";
          showToast(errorMsg, TOAST_TYPE.ERROR);
        }
      }
    } catch (error) {
      console.error("[BookingSummary] Error processing payment:", error);
      const errorMsg = error?.message || "An error occurred. Please try again.";
      showToast(errorMsg, TOAST_TYPE.ERROR);
    } finally {
      setIsProcessing(false);
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
              <Pressable style={styles.editButton} onPress={handleEdit}>
                <Text style={styles.editButtonText}>Edit</Text>
              </Pressable>
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
              {couponDiscount > 0 && (
                <>
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceLabel, { color: "#27AE60" }]}>
                      Coupon Discount
                    </Text>
                    <Text style={[styles.priceAmount, { color: "#27AE60" }]}>
                      -₦
                      {couponDiscount.toLocaleString("en-NG", {
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
                      {discountedSubtotal.toLocaleString("en-NG", {
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
                    {couponDiscount > 0 ? "Calculated on discounted amount. Note: caution fee is NOT discounted." : ""}
                  </Text>
                </View>
                <Text style={styles.priceAmount}>
                  ₦
                  {guestFeeBase.toLocaleString("en-NG", {
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
                  {guestVat.toLocaleString("en-NG", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>

              {/* Free Booking Info Alert */}
              {couponDiscount > 0 &&
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
                      Your coupon covers the full booking amount. Click "Proceed
                      to booking" to confirm your reservation instantly.
                    </Text>
                  </View>
                )}

              {/* Total */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  {couponDiscount > 0 ? "Amount to Pay:" : "Total:"}
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
              {couponApplied &&
                couponDiscount > 0 &&
                bookingSummary.pricing.total === 0
                ? "Proceed to booking"
                : "Proceed to Payment"}
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
                  This booking is non-refundable. Once you confirm your booking
                  and payment is processed, you will not be able to cancel or
                  request a refund.
                </Text>
                <Text style={styles.policyText}>
                  If you need to modify your booking, please contact the
                  property host directly through the messaging feature.
                </Text>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Payment Method Selection Modal */}
        <PaymentMethodModal
          visible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSelect={handlePaymentMethodSelect}
          onWalletSelect={handleWalletSelect}
          loading={isProcessing}
          totalAmount={bookingSummary.pricing.total}
          hideReserveOption={params.fromReservation === "true"}
          bookingDetails={bookingSummary}
        />

        {/* Processing Overlay */}
        {isProcessing && (
          <View style={styles.processingOverlay}>
            <View style={styles.processingCard}>
              <ActivityIndicator size="large" color="#192DFF" />
              <Text style={styles.processingText}>
                Processing your booking...
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
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
});

export default BookingSummary;
