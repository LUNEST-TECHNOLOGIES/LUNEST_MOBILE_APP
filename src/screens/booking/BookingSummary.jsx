import { differenceInDays, format, parse } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ArrowLeftIcon from "../../assets/icons/bookings/arrow-left.svg";
import CalendarIcon from "../../assets/icons/vuesax/outline/calendar.svg";
import PaymentMethodModal from "../../components/modals/PaymentMethodModal";
import authService from "../../services/authService";
import bookingService from "../../services/bookingService";
import paymentService from "../../services/paymentService";

// Default property image fallback
const DEFAULT_PROPERTY_IMAGE = require("../../assets/images/prop_image.png");

const BookingSummary = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [showCancelPolicy, setShowCancelPolicy] = useState(false);
  // Show payment modal immediately if coming from reservation Pay Now
  const [showPaymentModal, setShowPaymentModal] = useState(
    params.showPaymentModal === "true",
  );
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if this is from a reservation payment
  const fromReservation = params.fromReservation === "true";
  const existingBookingId = params.bookingId;

  // Get property data from params
  const listingId = params.listingId;
  const propertyName = params.propertyName || "Property";
  const propertyLocation = params.location || "Lagos, Nigeria";

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

    if (!checkInDate || !checkOutDate) {
      return 4; // fallback to 4 nights if dates not provided
    }

    try {
      // Parse dates from format "15-6-2025" (day-month-year)
      const checkIn = parse(checkInDate, 'd-M-yyyy', new Date());
      const checkOut = parse(checkOutDate, 'd-M-yyyy', new Date());

      // Calculate difference in days
      const nights = differenceInDays(checkOut, checkIn);

      // Ensure at least 1 night and not negative
      return Math.max(1, nights);
    } catch (error) {
      console.warn('Error calculating number of nights:', error);
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
      const checkIn = parse(checkInDate, 'd-M-yyyy', new Date());
      const checkOut = parse(checkOutDate, 'd-M-yyyy', new Date());

      const months = (checkOut.getFullYear() - checkIn.getFullYear()) * 12 + (checkOut.getMonth() - checkIn.getMonth());
      if (checkOut.getDate() < checkIn.getDate()) months -= 1;

      return Math.max(1, months);
    } catch (error) {
      console.warn('Error calculating number of months:', error);
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
      const checkIn = parse(checkInDate, 'd-M-yyyy', new Date());
      const checkOut = parse(checkOutDate, 'd-M-yyyy', new Date());

      let years = checkOut.getFullYear() - checkIn.getFullYear();
      if (checkOut.getMonth() < checkIn.getMonth() || (checkOut.getMonth() === checkIn.getMonth() && checkOut.getDate() < checkIn.getDate())) {
        years -= 1;
      }

      return Math.max(1, years);
    } catch (error) {
      console.warn('Error calculating number of years:', error);
      return 1;
    }
  };

  // Format date for display (e.g., "15 Jun, 2025")
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return null;

    try {
      const date = parse(dateStr, 'd-M-yyyy', new Date());
      return format(date, 'd MMM, yyyy');
    } catch (error) {
      console.warn('Error formatting display date:', error);
      return dateStr; // fallback to original string
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

  // App charge for guest (5% of total amount including caution fee)
  const GUEST_FEE_PERCENT = 5;
  const VAT_PERCENT = 7.5;
  
  // Base fee is on (Rent + SC + Caution Fee)
  const guestFeeBase = Math.round((hostTotal * GUEST_FEE_PERCENT) / 100);
  const guestVat = Math.round((guestFeeBase * VAT_PERCENT) / 100);
  const appCharge = guestFeeBase + guestVat;

  // Calculate subtotal before discount (what guest pays)
  const subtotal = hostTotal + appCharge;

  // Calculate total with discount
  const total = Math.max(0, subtotal - couponDiscount);

  const [couponLoading, setCouponLoading] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const referralService = (await import("../../services/referralService")).default;
      const result = await referralService.validateCoupon(couponCode.trim());
      if (result.success) {
        const discount = result.data.discount;
        // FIXED → flat amount, PERCENTAGE → % of subtotal
        const amount =
          discount.type === "PERCENTAGE"
            ? Math.round(subtotal * (discount.value / 100))
            : discount.value;
        setCouponDiscount(amount);
      } else {
        Alert.alert("Invalid Coupon", result.message || "Coupon code is invalid or expired.");
        setCouponCode("");
        setCouponDiscount(0);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to validate coupon. Please try again.");
      setCouponDiscount(0);
    } finally {
      setCouponLoading(false);
    }
  };

  const bookingSummary = {
    property: {
      title: propertyName,
      location: propertyLocation,
      coverImage: coverImage,
      bookingType: params?.bookingType || "Daily",
      checkIn: formatDisplayDate(params?.checkInDate) || "15 Jun, 2025",
      checkOut: formatDisplayDate(params?.checkOutDate) || "19 Jun, 2025",
      guests: {
        adults: params?.adults || 2,
        children: params?.children || 2,
        pets: params?.pets || "No pets",
      },
    },
    pricing: {
      // Rental breakdown
      rentalPrice: rentalPrice,
      numberOfUnits: periodUnits,
      pricingPeriod: pricingPeriod,
      periodLabel: periodLabel,
      rentalSubtotal: rentalSubtotal,

      // Additional charges (set by host)
      serviceCharge: serviceCharge, // Service charge set by host (not percentage)
      serviceChargeLabel: "Service Charge", // Label for display
      securityDeposit: securityDeposit,

      // Host's total before platform fee
      hostTotal: hostTotal,

      // App charge (5% guest fee)
      appCharge: appCharge,
      amount: params.totalPrice,
      totalAmount: {
        price: total,
        currency: "NGN",
      },
      discount: couponDiscount,
      couponCode: couponCode.trim(),
      total: total,
    },
  };

  // If client passed a calculated breakdown, prefer it for display and totals
  try {
    const passedBreakdownRaw = params?.priceBreakdown;
    const passedBreakdown = typeof passedBreakdownRaw === 'string' && passedBreakdownRaw.length > 0
      ? JSON.parse(passedBreakdownRaw)
      : passedBreakdownRaw;

    if (passedBreakdown && typeof passedBreakdown === 'object') {
      bookingSummary.pricing.rentalSubtotal = passedBreakdown.baseAmount ?? bookingSummary.pricing.rentalSubtotal;
      bookingSummary.pricing.numberOfUnits = passedBreakdown.units ?? bookingSummary.pricing.numberOfUnits;
      bookingSummary.pricing.periodUnits = passedBreakdown.periodUnits ?? bookingSummary.pricing.periodUnits;
      bookingSummary.pricing.periodLabel = passedBreakdown.periodLabel ?? bookingSummary.pricing.periodLabel;
      // Use the passed service fee as a platform/processing fee display (may differ from host serviceCharge)
      bookingSummary.pricing.serviceFee = passedBreakdown.serviceFee ?? 0;
      bookingSummary.pricing.securityDeposit = passedBreakdown.deposit ?? bookingSummary.pricing.securityDeposit;

      // Recompute hostTotal based on rentalSubtotal + host serviceCharge (host-set) + caution fee
      const hostSubtotalNew = bookingSummary.pricing.rentalSubtotal + (bookingSummary.pricing.serviceCharge || 0);
      bookingSummary.pricing.hostTotal = hostSubtotalNew + bookingSummary.pricing.securityDeposit;

      const guestFeeBaseNew = Math.round((bookingSummary.pricing.hostTotal * GUEST_FEE_PERCENT) / 100);
      const guestVatNew = Math.round((guestFeeBaseNew * VAT_PERCENT) / 100);
      bookingSummary.pricing.appCharge = guestFeeBaseNew + guestVatNew;
      bookingSummary.pricing.subtotal = bookingSummary.pricing.hostTotal + bookingSummary.pricing.appCharge;

      bookingSummary.pricing.total = passedBreakdown.total ?? Math.max(0, bookingSummary.pricing.subtotal - bookingSummary.pricing.discount);
    }
  } catch (e) {
    // ignore parse errors
    console.warn('[BookingSummary] Failed to parse passed priceBreakdown', e);
  }

  const handleGoBack = () => {
    router.back();
  };

  const handleEdit = () => {
    router.back();
  };

  const handleProceedToPayment = () => {
    // Show payment method selection modal
    setShowPaymentModal(true);
  };

  const handlePaymentMethodSelect = async (paymentData) => {
    console.log("[BookingSummary] Payment method selected:", paymentData);
    setShowPaymentModal(false);
    setIsProcessing(true);

    try {
      // Get current user info
      const user = await authService.getUserData();

      // Helper function to convert date string to ISO format
      const parseDate = (dateStr) => {
        if (!dateStr) return new Date().toISOString();
        // Handle "DD-MM-YYYY" format
        if (typeof dateStr === "string" && dateStr.includes("-")) {
          const parts = dateStr.split("-");
          if (parts.length === 3) {
            const [day, month, year] = parts;
            return new Date(
              parseInt(year),
              parseInt(month) - 1,
              parseInt(day),
            ).toISOString();
          }
        }
        // Handle other formats
        const parsed = new Date(dateStr);
        return isNaN(parsed.getTime())
          ? new Date().toISOString()
          : parsed.toISOString();
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
      const displaySecurityDeposit = bookingSummary.pricing.securityDeposit || 0;
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
        // Also send the full breakdown for reference
        priceBreakdown: {
          rentalSubtotal: displayRentalSubtotal,
          serviceCharge: displayServiceCharge,
          securityDeposit: displaySecurityDeposit,
          hostTotal: displayHostTotal,
          guestFee: displayAppCharge,
          guestTotal: displayTotal,
        },
        bookedBy: user?._id || user?.id,
      };

      // Determine booking status based on payment method
      if (paymentData.reserveAndPayLater) {
        // Reserve and Pay Later - Create booking with RESERVED status
        bookingData.status = "RESERVED";

        const result = await bookingService.createBooking(bookingData);

        if (result.success) {
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
            },
          });
        } else {
          Alert.alert(
            "Booking Failed",
            result.message || "Failed to create reservation. Please try again.",
          );
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
            Alert.alert(
              "Error",
              "Please update your profile with an email address",
            );
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

          if (paymentResult.authorization_url) {
            // Open Paystack checkout
            const browserResult = await WebBrowser.openBrowserAsync(
              paymentResult.authorization_url,
              {
                dismissButtonStyle: "close",
                presentationStyle: "fullScreen",
              },
            );

            // Verify payment after browser closes
            const verifyResult = await paymentService.verifyPayment(
              paymentResult.reference,
            );

            if (verifyResult.status === "COMPLETED") {
              // Payment successful - create confirmed booking
              bookingData.status = "CONFIRMED";
              bookingData.paymentReference = paymentResult.reference;

              const result = await bookingService.createBooking(bookingData);

              if (result.success) {
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
                  },
                });
              } else {
                Alert.alert(
                  "Error",
                  "Booking creation failed after payment. Please contact support.",
                );
              }
            } else if (verifyResult.status === "CANCELED") {
              Alert.alert(
                "Payment Canceled",
                "Your payment was canceled. You can try again or choose a different payment method.",
              );
            } else {
              Alert.alert(
                "Payment Pending",
                "Your payment is being processed. Please check your bookings for updates.",
              );
            }
          } else {
            Alert.alert("Error", "Failed to initialize payment");
          }
        } catch (paystackError) {
          console.error("[BookingSummary] Paystack error:", paystackError);
          Alert.alert(
            "Payment Error",
            paystackError.message || "Failed to process payment",
          );
        }
      } else {
        // Wallet payment - Create booking with CONFIRMED status
        bookingData.status = "CONFIRMED";

        const result = await bookingService.createBooking(bookingData);

        if (result.success) {
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
            },
          });
        } else {
          Alert.alert(
            "Payment Failed",
            result.message || "Failed to process payment. Please try again.",
          );
        }
      }
    } catch (error) {
      console.error("[BookingSummary] Error processing payment:", error);
      Alert.alert(
        "Error",
        "An error occurred while processing your booking. Please try again.",
      );
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
      },
    });
  };

  // Generate a reference code for the booking
  const generateRefCode = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `LUN${timestamp}${random}`.toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
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
                  ₦{bookingSummary.pricing.rentalPrice.toLocaleString()} ×{" "}
                  {bookingSummary.pricing.numberOfUnits} {bookingSummary.pricing.periodLabel}
                </Text>
              </View>
              <Text style={styles.priceAmount}>
                ₦{bookingSummary.pricing.rentalSubtotal.toLocaleString()}
              </Text>
            </View>

            {/* Service Charge - Set by host */}
            <View style={styles.priceRow}>
              <View>
                <Text style={styles.priceLabel}>Service Charge</Text>
                <Text style={styles.priceSublabel}>(Set by host)</Text>
              </View>
              <Text style={styles.priceAmount}>
                ₦{bookingSummary.pricing.serviceCharge.toLocaleString()}
              </Text>
            </View>

            {/* Caution Fee */}
            <View style={styles.priceRow}>
              <View>
                <Text style={styles.priceLabel}>Caution Fee</Text>
                <Text style={styles.priceSublabel}>(Refundable)</Text>
              </View>
              <Text style={styles.priceAmount}>
                ₦{bookingSummary.pricing.securityDeposit.toLocaleString()}
              </Text>
            </View>

            {/* Subtotal Before App Charge */}
            <View style={[styles.priceRow, styles.subtotalRow]}>
              <Text style={styles.subtotalLabel}>Subtotal:</Text>
              <Text style={styles.subtotalAmount}>
                ₦
                {(
                  bookingSummary.pricing.rentalSubtotal +
                  bookingSummary.pricing.serviceCharge +
                  bookingSummary.pricing.securityDeposit
                ).toLocaleString()}
              </Text>
            </View>

            {/* App Charge */}
            <View style={[styles.priceRow, styles.priceRowBottom]}>
              <View>
                <Text style={styles.priceLabel}>App Charge + VAT</Text>
              </View>
              <Text style={styles.priceAmount}>
                ₦{bookingSummary.pricing.appCharge.toLocaleString()}
              </Text>
            </View>

            {/* Coupon Section */}
            <View style={styles.couponSection}>
              <Text style={styles.couponLabel}>Coupon</Text>
              <View style={styles.couponInputRow}>
                <TextInput
                  style={styles.couponInput}
                  placeholder="Enter coupon code"
                  placeholderTextColor="#999"
                  value={couponCode}
                  onChangeText={setCouponCode}
                  editable={true}
                />
                <Pressable
                  style={styles.couponButton}
                  onPress={handleApplyCoupon}
                >
                  <Text style={styles.couponButtonText}>Apply</Text>
                </Pressable>
              </View>
              <Text style={styles.couponOptional}>Optional</Text>
              {couponDiscount > 0 && (
                <Text style={styles.couponSuccess}>
                  Discount applied: ₦{couponDiscount.toLocaleString()}
                </Text>
              )}
            </View>

            {/* Total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalAmount}>
                ₦{bookingSummary.pricing.total.toLocaleString()}
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
      <View style={styles.buttonContainer}>
        <Pressable
          style={styles.proceedButton}
          onPress={handleProceedToPayment}
        >
          <Text style={styles.proceedButtonText}>Proceed to Payment</Text>
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
                If you need to modify your booking, please contact the property
                host directly through the messaging feature.
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
    borderColor: "#4a4a4a",
    backgroundColor: "#4a4a4a",
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
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
    height: 20,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
    backgroundColor: "#fff",
  },
  proceedButton: {
    backgroundColor: "#010135",
    paddingVertical: 14,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
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
