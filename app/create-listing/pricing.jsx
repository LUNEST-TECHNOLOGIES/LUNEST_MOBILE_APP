/**
 * Create Listing - Step 7: Pricing
 * Set property price and payment details
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import CancelConfirmationModal from "../../src/components/create-listing/CancelConfirmationModal";
import { useDraftListing } from "../../src/hooks/useDraftListing";
import draftListingService from "../../src/services/draftListingService";

// Close X Icon - with explicit dimensions for web
const CloseIcon = ({ size = 24, color = "#000000" }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    style={{ width: size, height: size }}
  >
    <Path
      d="M18 6L6 18M6 6L18 18"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Progress Bar Component
const ProgressBar = ({ currentStep, totalSteps }) => {
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBars}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressSegment,
              index < currentStep
                ? styles.progressFilled
                : styles.progressEmpty,
            ]}
          />
        ))}
      </View>
      <Text style={styles.progressText}>
        {currentStep} of {totalSteps}
      </Text>
    </View>
  );
};

// Pricing Period Options
const PRICING_PERIODS = [
  { id: "night", label: "Per Night" },
  { id: "month", label: "Per Month" },
  { id: "year", label: "Per Year" },
];

const Pricing = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const intent = params.intent; // 'rent' or 'sale'
  const draftId = params.draftId || null;
  const { draftData, saveDraftData } = useDraftListing();

  // Initialize with empty/default values
  const [price, setPrice] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState(""); // Deselected by default - required
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [serviceCharge, setServiceCharge] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const hasInitialized = useRef(false);

  // Load draft data on mount and when draftData changes
  useEffect(() => {
    if (draftData && !hasInitialized.current) {
      console.log('✅ [Pricing] Initializing/Restoring from draft:', draftData.draftId);
      
      const priceValue = draftData.price !== undefined && draftData.price !== null ? String(draftData.price) : "";
      const securityValue = draftData.securityDeposit !== undefined && draftData.securityDeposit !== null ? String(draftData.securityDeposit) : "";
      const serviceValue = (draftData.serviceCharge || draftData.cleaningFee) !== undefined ? String(draftData.serviceCharge || draftData.cleaningFee || "") : "";
      const periodValue = draftData.pricingPeriod || "";

      if (priceValue) {
        if (intent === "sale") setSalePrice(formatPrice(priceValue));
        else setPrice(formatPrice(priceValue));
      }
      
      if (periodValue) setSelectedPeriod(periodValue);
      if (securityValue) setSecurityDeposit(formatPrice(securityValue));
      if (serviceValue) setServiceCharge(formatPrice(serviceValue));
      
      hasInitialized.current = true;
    }
  }, [draftData, intent]);


  // Auto-save function
  const updatePricing = (updates) => {
    const finalUpdates = {
      price: updates.price !== undefined ? updates.price : price,
      pricingPeriod:
        updates.pricingPeriod !== undefined
          ? updates.pricingPeriod
          : selectedPeriod,
      securityDeposit:
        updates.securityDeposit !== undefined
          ? updates.securityDeposit
          : securityDeposit,
      serviceCharge:
        updates.serviceCharge !== undefined
          ? updates.serviceCharge
          : serviceCharge,
      currentStep: 7,
    };

    if (updates.price !== undefined) {
      if (intent === "sale") {
        setSalePrice(updates.price);
      } else {
        setPrice(updates.price);
      }
    }
    if (updates.pricingPeriod !== undefined)
      setSelectedPeriod(updates.pricingPeriod);
    if (updates.securityDeposit !== undefined)
      setSecurityDeposit(updates.securityDeposit);
    if (updates.serviceCharge !== undefined)
      setServiceCharge(updates.serviceCharge);

    saveDraftData(finalUpdates);
  };

  const handleClose = () => {
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    // Save as draft before dismissing
    try {
      const finalDraftId =
        (draftData && draftData.draftId) ||
        draftId ||
        draftListingService.generateDraftId();

      await saveDraftData({
        ...draftData,
        price: intent === "sale" ? salePrice : price,
        pricingPeriod: selectedPeriod,
        securityDeposit,
        serviceCharge,
        currentStep: 7,
        draftId: finalDraftId,
      });

      setShowCancelModal(false);
      if (router.canDismiss()) router.dismissAll();
      router.replace("/(host-tabs)/listings?filter=drafts&showDraftSaved=true");
    } catch (error) {
      console.error("Error saving draft on close:", error);
      setShowCancelModal(false);
      if (router.canDismiss()) router.dismissAll();
      router.replace("/(host-tabs)/listings?filter=drafts&showDraftSaved=true");
    }
  };

  const handleCancelDismiss = () => {
    setShowCancelModal(false);
  };

  const handleBack = () => {
    // Navigate back with current params to preserve data
    const finalDraftId =
      (draftData && draftData.draftId) ||
      draftId ||
      draftListingService.generateDraftId();

    saveDraftData({
      ...draftData,
      price: intent === "sale" ? salePrice : price,
      pricingPeriod: selectedPeriod,
      securityDeposit,
      serviceCharge,
      currentStep: 7,
      draftId: finalDraftId,
    })
      .finally(() => {
        router.replace({
          pathname: "/create-listing/photos",
          params: { draftId: finalDraftId },
        });
      });
  };

  const handleNext = () => {
    // Validate price
    const priceValue = intent === "sale" ? salePrice : price;
    if (!priceValue) {
      Alert.alert("Price Required", "Please enter a price for your property.");
      return;
    }

    // Validate pricing period for rentals
    if (intent !== "sale" && !selectedPeriod) {
      Alert.alert(
        "Pricing Period Required",
        "Please select a pricing period (per night, month, or year).",
      );
      return;
    }

    const finalDraftId =
      (draftData && draftData.draftId) ||
      draftId ||
      draftListingService.generateDraftId();

    saveDraftData({
      price: priceValue,
      pricingPeriod: selectedPeriod,
      securityDeposit,
      serviceCharge,
      currentStep: 7,
      draftId: finalDraftId,
    })
      .then(() => {
        router.push({
          pathname: "/create-listing/availability",
          params: { draftId: finalDraftId },
        });
      })
      .catch(() => {
        router.push({
          pathname: "/create-listing/availability",
          params: { draftId: finalDraftId },
        });
      });
  };

  const formatPrice = (value) => {
    // Ensure value is a string before calling replace
    const strValue = value !== undefined && value !== null ? String(value) : "";
    const numericValue = strValue.replace(/[^0-9]/g, "");
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const handlePriceChange = (value, isSale = false) => {
    const formatted = formatPrice(value);
    if (isSale) {
      updatePricing({ price: formatted });
    } else {
      updatePricing({ price: formatted });
    }
  };

  const isValid =
    intent === "sale"
      ? salePrice.length > 0
      : price.length > 0 && selectedPeriod.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create a Listing</Text>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <View style={styles.closeButtonBg} />
          <CloseIcon size={14} color="#000000" />
        </Pressable>
      </View>

      {/* Progress Bar */}
      <ProgressBar currentStep={7} totalSteps={10} />

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.sectionTitle}>Set your pricing</Text>

        {intent === "sale" ? (
          // Sale Price
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Sale Price *</Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>₦</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0"
                placeholderTextColor="#999999"
                value={salePrice}
                onChangeText={(v) => handlePriceChange(v, false)}
                keyboardType="number-pad"
              />
            </View>
          </View>
        ) : (
          <>
            {/* Rental Price */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Rental Price *</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>₦</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0"
                  placeholderTextColor="#999999"
                  value={price}
                  onChangeText={(v) => handlePriceChange(v, false)}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Pricing Period */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Pricing Period *</Text>
              <View style={styles.periodOptions}>
                {PRICING_PERIODS.map((period) => (
                  <Pressable
                    key={period.id}
                    style={[
                      styles.periodOption,
                      selectedPeriod === period.id &&
                        styles.periodOptionSelected,
                    ]}
                    onPress={() => updatePricing({ pricingPeriod: period.id })}
                  >
                    <Text
                      style={[
                        styles.periodText,
                        selectedPeriod === period.id &&
                          styles.periodTextSelected,
                      ]}
                    >
                      {period.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Security Deposit */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Security Deposit/Caution Fee (Refundable)</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>₦</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0"
                  placeholderTextColor="#999999"
                  value={securityDeposit}
                  onChangeText={(v) =>
                    updatePricing({ securityDeposit: formatPrice(v) })
                  }
                  keyboardType="number-pad"
                />
              </View>
              {/* Refundability Notice */}
              <View style={styles.noticeContainer}>
                <Text style={styles.noticeText}>
                  💡 This deposit is fully refundable if no damages occur. It will be returned within 1-5 business days after checkout, subject to property inspection.
                </Text>
              </View>
            </View>

            {/* Service Charge */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Service Charge (Optional)</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>₦</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0"
                  placeholderTextColor="#999999"
                  value={serviceCharge}
                  onChangeText={(v) =>
                    updatePricing({ serviceCharge: formatPrice(v) })
                  }
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </>
        )}

        {/* Preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Price Preview</Text>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>
              {intent === "sale" ? "Sale Price" : `Price per ${selectedPeriod}`}
            </Text>
            <Text style={styles.previewValue}>
              ₦{intent === "sale" ? salePrice || "0" : price || "0"}
            </Text>
          </View>
          {intent !== "sale" && securityDeposit && (
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Security Deposit/Caution Fee</Text>
              <Text style={styles.previewValue}>₦{securityDeposit}</Text>
            </View>
          )}
          {intent !== "sale" && serviceCharge && (
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Service Charge</Text>
              <Text style={styles.previewValue}>₦{serviceCharge}</Text>
            </View>
          )}
          {/* App Charge & VAT breakdown */}
          {intent !== "sale" && price && (
            <>
              <View
                style={[
                  styles.previewRow,
                  {
                    borderTopWidth: 1,
                    borderTopColor: "#E5E5E5",
                    paddingTop: 10,
                    marginTop: 5,
                  },
                ]}
              >
                <Text style={styles.previewLabel}>App Charge (3%)</Text>
                <Text style={[styles.previewValue, { color: "#EF4444" }]}>
                  -₦
                  {(() => {
                    const priceStr = String(price || "0");
                    const priceNum = parseFloat(priceStr.replace(/,/g, "")) || 0;
                    const securityStr = String(securityDeposit || "0");
                    const securityNum = parseFloat(securityStr.replace(/,/g, "")) || 0;
                    const serviceStr = String(serviceCharge || "0");
                    const serviceNum = parseFloat(serviceStr.replace(/,/g, "")) || 0;
                    
                    const hostTotal = priceNum + securityNum + serviceNum;
                    const charge = hostTotal * 0.03;
                    
                    return Math.round(charge).toLocaleString("en-NG");
                  })()}
                </Text>
              </View>

              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>VAT on App Charge (7.5%)</Text>
                <Text style={[styles.previewValue, { color: "#EF4444" }]}>
                  -₦
                  {(() => {
                    const priceStr = String(price || "0");
                    const priceNum = parseFloat(priceStr.replace(/,/g, "")) || 0;
                    const securityStr = String(securityDeposit || "0");
                    const securityNum = parseFloat(securityStr.replace(/,/g, "")) || 0;
                    const serviceStr = String(serviceCharge || "0");
                    const serviceNum = parseFloat(serviceStr.replace(/,/g, "")) || 0;
                    
                    const hostTotal = priceNum + securityNum + serviceNum;
                    const charge = hostTotal * 0.03;
                    const vat = charge * 0.075;
                    
                    return Math.round(vat).toLocaleString("en-NG");
                  })()}
                </Text>
              </View>

              <View
                style={[
                  styles.previewRow,
                  {
                    borderTopWidth: 2,
                    borderTopColor: "#000",
                    paddingTop: 10,
                    marginTop: 5,
                  },
                ]}
              >
                <Text style={[styles.previewLabel, { fontWeight: "700" }]}>
                  Net Earnings
                </Text>
                <Text
                  style={[
                    styles.previewValue,
                    { fontWeight: "700", color: "#22C55E" },
                  ]}
                >
                  ₦
                  {(() => {
                    const priceStr = String(price || "0");
                    const priceNum = parseFloat(priceStr.replace(/,/g, "")) || 0;
                    const securityStr = String(securityDeposit || "0");
                    const securityNum = parseFloat(securityStr.replace(/,/g, "")) || 0;
                    const serviceStr = String(serviceCharge || "0");
                    const serviceNum = parseFloat(serviceStr.replace(/,/g, "")) || 0;
                    
                    const hostTotal = priceNum + securityNum + serviceNum;
                    const charge = hostTotal * 0.03;
                    const vat = charge * 0.075;
                    const earnings = hostTotal - charge - vat;
                    
                    return Math.round(earnings).toLocaleString("en-NG");
                  })()}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Pressable
          style={[styles.nextButton, !isValid && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!isValid}
        >
          <Text
            style={[
              styles.nextButtonText,
              !isValid && styles.nextButtonTextDisabled,
            ]}
          >
            Next
          </Text>
        </Pressable>
      </View>

      {/* Cancel Confirmation Modal */}
      <CancelConfirmationModal
        visible={showCancelModal}
        onCancel={handleCancelConfirm}
        onContinue={handleCancelDismiss}
        onClose={handleCancelDismiss}
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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: "relative",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "500",

    color: "#000000",
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    right: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonBg: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  progressBars: {
    flexDirection: "row",
    gap: 8,
    flex: 1,
    marginRight: 15,
  },
  progressSegment: {
    height: 5,
    flex: 1,
    borderRadius: 2,
  },
  progressFilled: {
    backgroundColor: "#0E2F5D",
  },
  progressEmpty: {
    backgroundColor: "#20A4FF",
  },
  progressText: {
    fontSize: 12,
    fontWeight: "700",

    color: "#000000",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
    gap: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",

    color: "#000000",
  },
  inputGroup: {
    gap: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",

    color: "#292929",
  },
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: "700",

    color: "#292929",
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",

    color: "#000000",
  },
  periodOptions: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  periodOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#FAFAFA",
  },
  periodOptionSelected: {
    borderColor: "#192DFF",
    backgroundColor: "#F0F4FF",
  },
  periodText: {
    fontSize: 14,
    fontWeight: "500",

    color: "#666666",
  },
  periodTextSelected: {
    color: "#192DFF",
    fontWeight: "600",
  },
  previewCard: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 10,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "600",

    color: "#000000",
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewLabel: {
    fontSize: 14,

    color: "#666666",
  },
  previewValue: {
    fontSize: 16,
    fontWeight: "600",

    color: "#000000",
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === "android" ? 30 : 20,
    gap: 20,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#010135",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700",

    color: "#000000",
  },
  nextButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#010135",
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "700",

    color: "#FFFFFF",
  },
  nextButtonTextDisabled: {
    color: "#999999",
  },
  noticeContainer: {
    backgroundColor: "#F0F9FF",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#192DFF",
  },
  noticeText: {
    fontSize: 12,
    color: "#4A5568",
    lineHeight: 16,
    flexWrap: 'wrap',
  },
});

export default Pricing;
