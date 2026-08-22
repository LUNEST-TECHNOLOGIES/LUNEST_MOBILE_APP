import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import ArrowLeftIcon from "../../assets/icons/bookings/arrow-left.svg";
import CalendarIcon from "../../assets/icons/vuesax/outline/calendar.svg";
import profileService from "../../services/profileService";
import UnifiedDatePicker from "../../components/common/UnifiedDatePicker";
import ToastNotification, { TOAST_TYPE } from "../../components/common/ToastNotification";

// Utility Helper Functions
const formatDate = (date) => {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const monthsBetween = (start, end) => {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  if (e.getDate() < s.getDate()) months -= 1;
  return months;
};

const yearsBetween = (start, end) => {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  let years = e.getFullYear() - s.getFullYear();
  if (e.getMonth() < s.getMonth() || (e.getMonth() === s.getMonth() && e.getDate() < s.getDate())) {
    years -= 1;
  }
  return years;
};

const SelectBookingDetailsScreen = () => {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  // Get property info from params
  const listingId = params.listingId;
  const propertyName = params.propertyName || "Property";
  const propertyPrice = params.price;
  const propertyLocation = params.location;
  const propertyCoverImage = params.coverImage;
  const propertySecurityDeposit = params.securityDeposit;
  const propertyServiceCharge = params.serviceCharge;
  const pricingPeriod = params.pricingPeriod || "night";
  const hostId = params.hostId || "";

  const [listingData, setListingData] = React.useState(null);

  // Fetch listing data as a safety net if any key parameter is missing
  React.useEffect(() => {
    if (listingId) {
      import("../../services/listingService").then(({ default: listingService }) => {
        listingService.fetchListingById(listingId).then(res => {
          if (res?.success && res?.listing) {
            setListingData(res.listing);
          }
        }).catch(err => console.warn("[SelectBookingDetails] Error fetching listing:", err));
      });
    }
  }, [listingId]);

  const activePrice = Number(propertyPrice || listingData?.propertyPrice?.price || listingData?.price || 0);
  const activeSecurityDeposit = Number(
    propertySecurityDeposit !== undefined && propertySecurityDeposit !== null && propertySecurityDeposit !== ''
      ? propertySecurityDeposit
      : (listingData?.cautionFee ?? listingData?.securityDeposit ?? 0)
  );
  const activeServiceCharge = Number(
    propertyServiceCharge !== undefined && propertyServiceCharge !== null && propertyServiceCharge !== ''
      ? propertyServiceCharge
      : (listingData?.serviceCharge ?? listingData?.cleaningFee ?? 0)
  );
  const rawCover = propertyCoverImage || listingData?.propertyImages?.[0] || listingData?.images?.[0];
  const activeCoverImage = typeof rawCover === 'string' ? rawCover : (rawCover?.url || rawCover?.uri || '');
  const activeHostId = hostId || listingData?.host?._id || listingData?.host?.id || listingData?.hostInfo?._id || "";

  const [pets, setPets] = React.useState(null);
  const [showBookingTypeDropdown, setShowBookingTypeDropdown] =
    React.useState(false);
  const [selectedBookingType, setSelectedBookingType] = React.useState(null);
  const [adults, setAdults] = React.useState(0);
  const [children, setChildren] = React.useState(0);
  const [checkInDate, setCheckInDate] = React.useState(null);
  const [checkOutDate, setCheckOutDate] = React.useState(null);
  const [showDatePicker, setShowDatePicker] = React.useState(null);
  const [notes, setNotes] = React.useState("");
  const [showPhoneModal, setShowPhoneModal] = React.useState(false);
  const [toastVisible, setToastVisible] = React.useState(false);
  const [toastConfig, setToastConfig] = React.useState({
    type: TOAST_TYPE.SUCCESS,
    message: "",
  });

  const showToast = (message, type = TOAST_TYPE.SUCCESS) => {
    setToastConfig({ message, type });
    setToastVisible(true);
  };

  // Price breakdown state derived from selections
  const calculateBreakdown = () => {
    const priceNum = activePrice || 0;
    const depositNum = activeSecurityDeposit || 0;
    const serviceChargeNum = activeServiceCharge || 0;
    let durationCount = 1;
    const period = pricingPeriod.toLowerCase();

    if (checkInDate && checkOutDate) {
      if (period === "night") {
        const start = new Date(checkInDate);
        const end = new Date(checkOutDate);
        const diffMs = Math.max(0, end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0));
        durationCount = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      } else if (period === "month") {
        durationCount = Math.max(1, monthsBetween(checkInDate, checkOutDate));
      } else if (period === "year") {
        durationCount = Math.max(1, yearsBetween(checkInDate, checkOutDate));
      }
    }

    const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

    const baseAmount = round2(priceNum * durationCount);
    
    // For yearly rentals, service charge scales with duration
    const isYearly = period === "year";
    const effectiveServiceCharge = round2(isYearly ? (serviceChargeNum * durationCount) : serviceChargeNum);
    const effectiveDeposit = round2(depositNum); // Caution Fee does NOT scale with duration

    // Guest Subtotal = Rent + Scaled Service Charge + Security Deposit
    const guestSubtotal = round2(baseAmount + effectiveServiceCharge + effectiveDeposit);

    // Guest Fee is 5% of full guest base
    const guestFee = guestSubtotal > 0 ? round2((guestSubtotal * 5) / 100) : 0;

    // VAT is 7.5% of the Guest Fee
    const vat = guestFee > 0 ? round2((guestFee * 7.5) / 100) : 0;

    // Total App Charge = guestFee + vat
    const appCharge = round2(guestFee + vat);

    // Final Total = guestSubtotal + appCharge
    const total = round2(guestSubtotal + appCharge);

    return {
      durationCount,
      baseAmount,
      serviceCharge: effectiveServiceCharge,
      guestFee,
      vat,
      appCharge,
      deposit: effectiveDeposit,
      total,
    };
  };

  const breakdown = calculateBreakdown();

  const formatCurrency = (v) => {
    return `₦${Number(v || 0).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Dynamic booking types based on pricing period
  const getBookingTypes = () => {
    switch (pricingPeriod.toLowerCase()) {
      case "night":
        return [{ label: "Daily/Weekly", value: "Daily/Weekly" }];
      case "month":
        return [{ label: "Monthly", value: "Monthly" }];
      case "year":
        return [{ label: "Annually", value: "Annually" }];
      default:
        return [{ label: "Daily/Weekly", value: "Daily/Weekly" }];
    }
  };

  const bookingTypes = getBookingTypes();

  // Auto-select the booking type if only one option
  React.useEffect(() => {
    if (bookingTypes.length === 1 && !selectedBookingType) {
      setSelectedBookingType(bookingTypes[0].value);
    }
  }, [bookingTypes, selectedBookingType]);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Fallback for web if there's no navigation history
      router.push("/");
    }
  };

  const handleSelectBookingType = (type) => {
    setSelectedBookingType(type);
    setShowBookingTypeDropdown(false);

    // Show alert for annual bookings
    if (pricingPeriod.toLowerCase() === "year" && type === "Annually") {
      Alert.alert(
        "Annual Booking",
        "This listing is charged annually. You will be billed for the full year upon booking.",
        [{ text: "OK" }],
      );
    }
  };

  const isBookingAvailable = () => {
    const hasGuests = adults > 0 || children > 0;
    const hasDates = checkInDate && checkOutDate;
    const hasBookingType = selectedBookingType !== null;
    return hasGuests && hasDates && hasBookingType;
  };

  const handleContinueBooking = async () => {
    // Re-verify phone number before proceeding
    try {
      const profileData = await profileService.getProfileData();
      const userPhone = profileData?.phone || profileData?.phoneNumber;

      if (!userPhone || String(userPhone).trim().length < 7) {
        setShowPhoneModal(true);
        return;
      }
    } catch (e) {
      console.warn("[SelectBookingDetails] Profile check failed:", e);
    }

    if (isBookingAvailable()) {
      const validation = validateBookingPeriod();
      if (!validation.valid) {
        if (Platform.OS === 'web') {
          showToast(validation.message, TOAST_TYPE.ERROR);
        } else {
          Alert.alert("Invalid booking period", validation.message);
        }
        return;
      }
      router.push({
        pathname: "/booking-summary",
        params: {
          listingId: listingId,
          propertyName: propertyName,
          price: activePrice,
          securityDeposit: activeSecurityDeposit,
          serviceCharge: activeServiceCharge,
          priceBreakdown: JSON.stringify(breakdown),
          location: propertyLocation,
          coverImage: activeCoverImage,
          adults: adults,
          children: children,
          pets: pets,
          bookingType: selectedBookingType,
          checkInDate: checkInDate ? formatDate(checkInDate) : null,
          checkOutDate: checkOutDate ? formatDate(checkOutDate) : null,
          notes: notes,
          pricingPeriod: pricingPeriod,
          hostId: activeHostId,
        },
      });
    }
  };


  const validateBookingPeriod = () => {
    if (!checkInDate || !checkOutDate)
      return {
        valid: false,
        message: "Please select check-in and check-out dates.",
      };

    const period = pricingPeriod.toLowerCase();
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);

    if (period === "night") {
      const diffDays = Math.ceil(
        (end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0)) /
          (1000 * 60 * 60 * 24),
      );
      if (diffDays <= 0)
        return {
          valid: false,
          message: "Minimum booking is 1 night. Check-out date must be after check-in date.",
        };
      return { valid: true };
    }

    if (period === "month") {
      const months = monthsBetween(checkInDate, checkOutDate);
      if (months < 1)
        return {
          valid: false,
          message:
            "This listing is charged monthly. Minimum booking is 1 month.",
        };
      return { valid: true };
    }

    if (period === "year") {
      const years = yearsBetween(checkInDate, checkOutDate);
      
      // Strict yearly validation: Must be exactly N years (same day/month)
      const expectedEnd = new Date(start);
      expectedEnd.setFullYear(start.getFullYear() + years);
      
      // We allow a small tolerance of 1 day for leap years or checkout time logic
      const actualEnd = new Date(end);
      actualEnd.setHours(0,0,0,0);
      expectedEnd.setHours(0,0,0,0);
      
      const isExactYear = actualEnd.getTime() === expectedEnd.getTime();

      if (years < 1)
        return {
          valid: false,
          message: "This listing is charged annually. Minimum booking is 1 year.",
        };
        
      if (!isExactYear) {
        return {
          valid: false,
          message: `Yearly rentals must be in exact 1-year increments (e.g., 1 year, 2 years). Please adjust your check-out date to ${formatDate(expectedEnd)}.`,
        };
      }
      
      return { valid: true };
    }

    return { valid: true };
  };

  const onDatePickerChange = (selectedDate) => {
    if (selectedDate) {
      if (showDatePicker === "checkin") {
        setCheckInDate(selectedDate);
      } else if (showDatePicker === "checkout") {
        setCheckOutDate(selectedDate);
      }
    }
    setShowDatePicker(null);
  };

  // Date handlers removed in favor of UnifiedDatePicker

  return (
    <SafeAreaView style={styles.requestFormScreen2} edges={["top"]}>
      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={handleGoBack}>
              <ArrowLeftIcon width={24} height={24} />
            </Pressable>
            <Text style={styles.headerTitle}>Select Booking Details</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              {/* Property Preview Section */}
              <View style={styles.propertyPreviewSection}>
                {propertyCoverImage ? (
                  <Image
                    source={{ uri: propertyCoverImage }}
                    style={styles.propertyThumbnail}
                  />
                ) : (
                  <View
                    style={[
                      styles.propertyThumbnail,
                      styles.propertyThumbnailPlaceholder,
                    ]}
                  >
                    <Text style={styles.placeholderIcon}>🏠</Text>
                  </View>
                )}
                <View style={styles.propertyPreviewText}>
                  <Text style={styles.previewPropertyName} numberOfLines={1}>
                    {propertyName}
                  </Text>
                </View>
              </View>
              {/* Number of Guests Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Number of Guests</Text>
                <View style={styles.guestContainer}>
                  <View style={styles.guestRow}>
                    <Text style={styles.guestLabel}>Adults</Text>
                    <View style={styles.counterContainer}>
                      <Pressable
                        style={styles.counterButton}
                        onPress={() => setAdults(Math.max(0, adults - 1))}
                      >
                        <Text style={styles.counterButtonText}>−</Text>
                      </Pressable>
                      <Text style={styles.counterValue}>{adults}</Text>
                      <Pressable
                        style={styles.counterButton}
                        onPress={() => setAdults(adults + 1)}
                      >
                        <Text style={styles.counterButtonText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.guestRow}>
                    <Text style={styles.guestLabel}>Children</Text>
                    <View style={styles.counterContainer}>
                      <Pressable
                        style={styles.counterButton}
                        onPress={() => setChildren(Math.max(0, children - 1))}
                      >
                        <Text style={styles.counterButtonText}>−</Text>
                      </Pressable>
                      <Text style={styles.counterValue}>{children}</Text>
                      <Pressable
                        style={styles.counterButton}
                        onPress={() => setChildren(children + 1)}
                      >
                        <Text style={styles.counterButtonText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.guestRow}>
                    <Text style={styles.guestLabel}>Pets</Text>
                    <View style={styles.radioContainer}>
                      <Pressable
                        style={[
                          styles.radioItem,
                          pets === "yes" && styles.radioActive,
                        ]}
                        onPress={() => setPets("yes")}
                      >
                        <View
                          style={[
                            styles.radio,
                            pets === "yes" && styles.radioChecked,
                          ]}
                        >
                          {pets === "yes" && <View style={styles.radioDot} />}
                        </View>
                        <Text style={styles.radioText}>Yes I have</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.radioItem,
                          pets === "no" && styles.radioActive,
                        ]}
                        onPress={() => setPets("no")}
                      >
                        <View
                          style={[
                            styles.radio,
                            pets === "no" && styles.radioChecked,
                          ]}
                        >
                          {pets === "no" && <View style={styles.radioDot} />}
                        </View>
                        <Text style={styles.radioText}>No I Don't have</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>

              {/* Select Booking Type Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Booking type</Text>
                <Pressable
                  style={styles.dropdownField}
                  onPress={() => setShowBookingTypeDropdown(true)}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      !selectedBookingType && styles.placeholderText,
                    ]}
                  >
                    {selectedBookingType || "Select Booking type"}
                  </Text>
                  <Text style={styles.dropdownIcon}>⊙</Text>
                </Pressable>
                {pricingPeriod.toLowerCase() === "year" && (
                  <Text style={[styles.placeholderText, { marginTop: 8 }]}>
                    This listing is charged annually; bookings are billed per
                    year.
                  </Text>
                )}
                {pricingPeriod.toLowerCase() === "month" && (
                  <Text style={[styles.placeholderText, { marginTop: 8 }]}>
                    This listing is charged monthly; bookings are billed per
                    month.
                  </Text>
                )}
                {pricingPeriod.toLowerCase() === "night" && (
                  <Text style={[styles.placeholderText, { marginTop: 8 }]}>
                    This listing is charged per night; select check-in and
                    check-out dates.
                  </Text>
                )}
              </View>

              {/* Price breakdown */}
              <View style={[styles.section, styles.breakdownSection]}>
                <Text style={styles.sectionTitle}>Price Breakdown</Text>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>
                    Rental ({pricingPeriod})
                  </Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(propertyPrice)}
                    {pricingPeriod ? ` / ${pricingPeriod}` : ""}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>
                    {pricingPeriod.toLowerCase() === "night" ? "Nights" : 
                     pricingPeriod.toLowerCase() === "month" ? "Months" : "Years"}
                  </Text>
                  <Text style={styles.breakdownValue}>
                    {breakdown.durationCount}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Base Amount</Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(breakdown.baseAmount)}
                  </Text>
                </View>

                {/* Service Charge (Host Fee) */}
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Service Charge</Text>
                  <Text style={styles.breakdownValue}>
                    {breakdown.serviceCharge > 0
                      ? formatCurrency(breakdown.serviceCharge)
                      : "Nil"}
                  </Text>
                </View>

                {/* Caution Fee (Refundable) */}
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>
                    Caution fee (Refundable)
                  </Text>
                  <Text style={styles.breakdownValue}>
                    {breakdown.deposit > 0
                      ? formatCurrency(breakdown.deposit)
                      : "Nil"}
                  </Text>
                </View>

                {/* App Charge */}
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>App Charge (5%)</Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(breakdown.guestFee)}
                  </Text>
                </View>

                {/* VAT (7.5% of App Charge) */}
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>VAT (7.5% of App Charge)</Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(breakdown.vat)}
                  </Text>
                </View>

                <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
                  <Text style={styles.breakdownTotalLabel}>Total</Text>
                  <Text style={styles.breakdownTotalValue}>
                    {formatCurrency(breakdown.total)}
                  </Text>
                </View>
              </View>

              {/* Date Picker Section */}
              <View style={styles.section}>
                <View style={styles.datePickerHeader}>
                  <Text style={styles.sectionTitle}>Date picker</Text>
                  <CalendarIcon width={20} height={20} />
                </View>
                <View style={styles.dateContainer}>
                  <View style={styles.dateFieldWrapper}>
                    <Text style={styles.dateFieldLabel}>Check in</Text>
                    <Pressable
                      style={styles.dateField}
                      onPress={() => setShowDatePicker("checkin")}
                    >
                      <Text
                        style={[
                          styles.dateLabel,
                          !checkInDate && styles.placeholderText,
                        ]}
                      >
                        {checkInDate ? formatDate(checkInDate) : "Select date"}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.dateFieldWrapper}>
                    <Text style={styles.dateFieldLabel}>Check out</Text>
                    <Pressable
                      style={styles.dateField}
                      onPress={() => setShowDatePicker("checkout")}
                    >
                      <Text
                        style={[
                          styles.dateLabel,
                          !checkOutDate && styles.placeholderText,
                        ]}
                      >
                        {checkOutDate ? formatDate(checkOutDate) : "Select date"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Additional Notes Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Additional notes</Text>
                <TextInput
                  style={styles.notesField}
                  placeholder="Add any special requests or notes..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Toast Notification for Web/Mobile */}
        <ToastNotification
          visible={toastVisible}
          type={toastConfig.type}
          message={toastConfig.message}
          onHide={() => setToastVisible(false)}
        />

        <View
          style={[
            styles.buttonContainer,
            { paddingBottom: Math.max(insets.bottom, 20) }
          ]}
        >
          <Pressable
            style={[
              styles.buttonStyle2,
              !isBookingAvailable() && styles.buttonDisabled,
            ]}
            onPress={handleContinueBooking}
            disabled={!isBookingAvailable()}
          >
            <Text
              style={[
                styles.button,
                styles.text3Typo,
                !isBookingAvailable() && styles.buttonTextDisabled,
              ]}
            >
              Continue to Booking
            </Text>
          </Pressable>
        </View>

        <Modal
          visible={showBookingTypeDropdown}
          transparent
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setShowBookingTypeDropdown(false)}
            />
            <View style={[styles.overlayContainer, { width: screenWidth }]}>
              <View style={styles.overlayHeader}>
                <Text style={styles.overlayTitle}>Select a Booking Type:</Text>
                <Pressable
                  onPress={() => setShowBookingTypeDropdown(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeIcon}>✕</Text>
                </Pressable>
              </View>
              <View style={styles.selectionOfBookingType}>
                {bookingTypes.map((type) => (
                  <Pressable
                    key={type.value}
                    style={[
                      styles.bookingOption,
                      selectedBookingType === type.value &&
                        styles.bookingOptionSelected,
                    ]}
                    onPress={() => handleSelectBookingType(type.value)}
                  >
                    <Text
                      style={[
                        styles.bookingOptionText,
                        selectedBookingType === type.value &&
                          styles.bookingOptionTextSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        {/* Unified Date Picker for all platforms */}
        <UnifiedDatePicker
          visible={showDatePicker !== null}
          value={showDatePicker === "checkin" ? checkInDate : checkOutDate}
          onClose={() => setShowDatePicker(null)}
          onChange={onDatePickerChange}
          title={showDatePicker === "checkin" ? "Select Check-in Date" : "Select Check-out Date"}
          minimumDate={new Date()}
        />
        
        {/* Phone Number Required Modal */}
        <Modal
          visible={showPhoneModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPhoneModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.4)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                padding: 28,
                width: "80%",
                alignItems: "center",
                elevation: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: "#010135",
                  marginBottom: 12,
                }}
              >
                Phone Number Required
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: "#444",
                  textAlign: "center",
                  marginBottom: 24,
                }}
              >
                Please update your phone number in your profile before booking.
                This is required for your booking to proceed.
              </Text>
              <Pressable
                style={{
                  backgroundColor: "#010135",
                  borderRadius: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 32,
                  marginBottom: 8,
                }}
                onPress={() => {
                  setShowPhoneModal(false);
                  router.push("/personal-info-edit");
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "600",
                    fontSize: 16,
                  }}
                >
                  Update Phone Number
                </Text>
              </Pressable>
              <Pressable onPress={() => setShowPhoneModal(false)}>
                <Text
                  style={{
                    color: "#010135",
                    fontWeight: "500",
                    fontSize: 15,
                    marginTop: 8,
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        
        {/* Toast Notification for Web/Mobile Parity */}
        <ToastNotification
          visible={toastVisible}
          message={toastConfig.message}
          type={toastConfig.type}
          onHide={() => setToastVisible(false)}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  requestFormScreen2: {
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
    fontWeight: "500",
    color: "#000000",
    textAlign: "center",
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  iosDatePickerContainer: {
    flex: 1,
    backgroundColor: "#F9F9F9",
    justifyContent: "flex-end",
  },
  iosDatePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  cancelButton: {
    fontSize: 14,
    color: "#7C7C7C",
    fontWeight: "500",
  },
  doneButton: {
    fontSize: 14,
    color: "#010135",
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 120, // Extra space for fixed button
    gap: 20,
  },
  section: {
    borderWidth: 1,
    borderColor: "#bdbdbd",
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#fff",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
    marginBottom: 12,
  },
  guestContainer: {
    gap: 16,
  },
  guestRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  guestLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#000",
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
  },
  counterButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#bdbdbd",
    justifyContent: "center",
    alignItems: "center",
  },
  counterButtonText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
  },
  counterValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
    minWidth: 30,
    textAlign: "center",
  },
  radioContainer: {
    flexDirection: "row",
    gap: 16,
  },
  radioItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  radioActive: {
    backgroundColor: "rgba(1, 1, 53, 0.05)",
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#bdbdbd",
    justifyContent: "center",
    alignItems: "center",
  },
  radioChecked: {
    borderColor: "#010135",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#010135",
  },
  radioText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#000",
  },
  dropdownField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bdbdbd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  dropdownText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#7c7c7c",
  },
  dropdownIcon: {
    fontSize: 16,
    color: "#7C7C7C",
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  calendarIcon: {
    fontSize: 20,
  },
  dateContainer: {
    flexDirection: "row",
    gap: 12,
  },
  dateFieldWrapper: {
    flex: 1,
  },
  dateFieldLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#7C7C7C",
    marginBottom: 4,
  },
  dateField: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#bdbdbd",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#000",
  },
  placeholderText: {
    color: "#999",
  },
  notesField: {
    height: 100,
    borderWidth: 1,
    borderColor: "#bdbdbd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    fontSize: 12,
    color: "#000",
    textAlignVertical: "top",
  },
  buttonContainer: {
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
  buttonStyle2: {
    borderRadius: 25,
    backgroundColor: "#010135",
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  button: {
    lineHeight: 16,
    color: "#fff",
    fontWeight: "700",
    textAlign: "left",
    fontSize: 16,
  },
  buttonDisabled: {
    backgroundColor: "#CCCCCC",
    opacity: 0.6,
  },
  buttonTextDisabled: {
    color: "#999999",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
  },
  overlayContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  overlayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  overlayTitle: {
    fontSize: 14,

    fontWeight: "500",
    color: "#000",
    textAlign: "left",
  },
  closeButton: {
    padding: 8,
  },
  closeIcon: {
    fontSize: 24,
    color: "#000",
    fontWeight: "300",
  },
  selectionOfBookingType: {
    gap: 12,
  },
  bookingOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E8EAFF",
  },
  bookingOptionSelected: {
    backgroundColor: "#E8EAFF",
    borderColor: "#010135",
  },
  bookingOptionText: {
    fontSize: 16,

    fontWeight: "500",
    color: "#7C7C7C",
    textAlign: "left",
  },
  bookingOptionTextSelected: {
    color: "#010135",
    fontWeight: "700",
  },
  datePickerContent: {
    paddingVertical: 20,
  },
  dateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  dateOption: {
    width: "22%",
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bdbdbd",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  dateOptionSelected: {
    backgroundColor: "#010135",
    borderColor: "#010135",
  },
  dateOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  dateOptionTextSelected: {
    color: "#fff",
  },
  breakdownSection: {
    marginTop: 8,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  breakdownLabel: {
    fontSize: 13,
    color: "#444",
  },
  breakdownValue: {
    fontSize: 13,
    color: "#000",
    fontWeight: "600",
  },
  breakdownTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 8,
    paddingTop: 8,
  },
  breakdownTotalLabel: {
    fontSize: 15,
    color: "#010135",
    fontWeight: "700",
  },
  breakdownTotalValue: {
    fontSize: 15,
    color: "#010135",
    fontWeight: "700",
  },
  // Host Rules Styles
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3CD",
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 6,
    marginBottom: 12,
    gap: 10,
  },
  warningIcon: {
    fontSize: 20,
  },
  warningText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#FF9800",
    flex: 1,
  },
  rulesSummaryCard: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  rulesSummaryTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#010135",
    marginBottom: 10,
  },
  rulesGrid: {
    gap: 8,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    gap: 10,
  },
  ruleAllowed: {
    backgroundColor: "#E8F5E9",
    borderLeftWidth: 3,
    borderLeftColor: "#4CAF50",
  },
  ruleNotAllowed: {
    backgroundColor: "#FFEBEE",
    borderLeftWidth: 3,
    borderLeftColor: "#F44336",
  },
  ruleIcon: {
    fontSize: 14,
    fontWeight: "bold",
  },
  ruleText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#333",
    flex: 1,
  },
  radioDisabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: "#BDBDBD",
  },
});

export default SelectBookingDetailsScreen;
