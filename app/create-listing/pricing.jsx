/**
 * Create Listing - Step 7: Pricing
 * Set property price and payment details
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import {
  X
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ToastNotification from "../../src/components/common/ToastNotification";
import CancelConfirmationModal from "../../src/components/create-listing/CancelConfirmationModal";
import { useDraftListing } from "../../src/hooks/useDraftListing";
import draftListingService from "../../src/services/draftListingService";
import toastService from "../../src/services/toastService";

// Icons migrated to Lucide

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
  const [acceptRefund, setAcceptRefund] = useState(null); // Force explicit selection
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Toast Notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("SUCCESS");

  // Subscribe to toast service
  useEffect(() => {
    const unsubscribe = toastService.subscribe(({ message, type }) => {
      setToastMessage(message);
      setToastType(type);
      setToastVisible(true);
    });
    return unsubscribe;
  }, []);
  const hasInitialized = useRef(false);

  // Load draft data on mount and when draftData changes
  useEffect(() => {
    if (draftData && !hasInitialized.current) {
      console.log('✅ [Pricing] Initializing/Restoring from draft:', draftData.draftId);
      
      const priceValue = draftData.price !== undefined && draftData.price !== null ? String(draftData.price) : "";
      const securityValue = draftData.securityDeposit !== undefined && draftData.securityDeposit !== null ? String(draftData.securityDeposit) : "";
      const serviceValue = draftData.serviceCharge !== undefined && draftData.serviceCharge !== null ? String(draftData.serviceCharge) : "";
      const periodValue = draftData.pricingPeriod || "";

      if (priceValue) {
        if (intent === "sale") setSalePrice(formatPrice(priceValue));
        else setPrice(formatPrice(priceValue));
      }
      
      if (periodValue) setSelectedPeriod(periodValue);
      if (securityValue) setSecurityDeposit(formatPrice(securityValue));
      if (serviceValue) setServiceCharge(formatPrice(serviceValue));
      if (draftData.acceptRefund !== undefined) setAcceptRefund(draftData.acceptRefund);
      
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
      acceptRefund:
        updates.acceptRefund !== undefined
          ? updates.acceptRefund
          : acceptRefund,
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
    if (updates.acceptRefund !== undefined)
      setAcceptRefund(updates.acceptRefund);

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
        acceptRefund: acceptRefund === null ? true : acceptRefund, // Default to true if not selected yet during save-on-close
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

  const handleBack = async () => {
    // Navigate back with current params to preserve data
    const finalDraftId =
      (draftData && draftData.draftId) ||
      draftId ||
      draftListingService.generateDraftId();

    // OPTIMIZATION: Trigger save in background and navigate immediately
    await saveDraftData({
      ...draftData,
      price: intent === "sale" ? salePrice : price,
      pricingPeriod: selectedPeriod,
      securityDeposit,
      serviceCharge,
      acceptRefund,
      currentStep: 7,
      draftId: finalDraftId,
    }, { background: true });

    router.replace({
      pathname: "/create-listing/photos",
      params: { draftId: finalDraftId },
    });
  };

  const handleNext = async () => {
    // Validate price
    const priceValue = intent === "sale" ? salePrice : price;
    if (!priceValue) {
      toastService.showError("Please enter a price for your property.");
      return;
    }

    // Validate pricing period for rentals
    if (intent !== "sale" && !selectedPeriod) {
      toastService.showError("Please select a pricing period (per night, month, or year).");
      return;
    }

    const finalDraftId =
      (draftData && draftData.draftId) ||
      draftId ||
      draftListingService.generateDraftId();

    // OPTIMIZATION: Trigger save in background and navigate immediately
    await saveDraftData({
      price: priceValue,
      pricingPeriod: selectedPeriod,
      securityDeposit,
      serviceCharge,
      acceptRefund,
      currentStep: 7,
      draftId: finalDraftId,
    }, { background: true });

    router.push({
      pathname: "/create-listing/availability",
      params: { draftId: finalDraftId },
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
    updatePricing({ price: formatted });
  };

  const isValid =
    intent === "sale"
      ? salePrice.length > 0
      : price.length > 0 && selectedPeriod.length > 0 && acceptRefund !== null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create a Listing</Text>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <X size={24} color="#000000" />
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

            {/* Accept Cancellation/Refund Policy */}
            <View style={styles.inputGroup}>
              <View style={styles.policyHeader}>
                <Text style={styles.inputLabel}>Cancellation & Refund Policy *</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {acceptRefund === null ? "Required" : acceptRefund ? "Standard" : "No Refund"}
                  </Text>
                </View>
              </View>

              <Text style={styles.policyIntroduction}>
                By default, Lunest supports a flexible cancellation and refund policy to ensure trust. However, you can choose to opt-out for this specific listing.
              </Text>
              
              <View style={styles.policyOptions}>
                <Pressable
                  style={[
                    styles.policyItem,
                    acceptRefund && styles.policyItemSelected
                  ]}
                  onPress={() => updatePricing({ acceptRefund: true })}
                >
                  <View style={[styles.radio, acceptRefund && styles.radioSelected]}>
                    {acceptRefund && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.policyContent}>
                    <Text style={[styles.policyTitle, acceptRefund && styles.policyTitleSelected]}>
                      Accept Standard Policy (Recommended)
                    </Text>
                    <Text style={styles.policyDescription}>
                      Allows guests to cancel per Lunest's standard refund timeline. Your earnings are safely held in escrow until the check-in date.
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  style={[
                    styles.policyItem,
                    !acceptRefund && styles.policyItemSelected
                  ]}
                  onPress={() => updatePricing({ acceptRefund: false })}
                >
                  <View style={[styles.radio, !acceptRefund && styles.radioSelected]}>
                    {!acceptRefund && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.policyContent}>
                    <Text style={[styles.policyTitle, !acceptRefund && styles.policyTitleSelected]}>
                      No Refund / 2-Hour Buffer Credit
                    </Text>
                    <Text style={styles.policyDescription}>
                      Earnings are credited to your available balance 2 hours after the check-in time or immediately after guests confirm check-in. Guests are not eligible for automatic refunds.
                    </Text>
                  </View>
                </Pressable>
              </View>

              {/* Policy Warning */}
              <View style={[styles.noticeContainer, !acceptRefund && { backgroundColor: '#FFF5F5', borderLeftColor: '#EF4444' }]}>
                <Text style={[styles.noticeText, !acceptRefund && { color: '#9B2C2C' }]}>
                  {acceptRefund 
                    ? "💡 Pro-Tip: Flexible policies often lead to 25% higher booking rates as guests feel more secure."
                    : "⚠️ Note: Host earnings will be credited immediately to your wallet. Guests will see this as a 'Non-Refundable' listing."}
                </Text>
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
    zIndex: 10,
  },
  closeButtonBg: {
    position: "absolute",
    width: 40,
    zIndex: 1,
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
    borderColor: "#010135",
    backgroundColor: "#F0F4FF",
  },
  periodText: {
    fontSize: 14,
    fontWeight: "500",

    color: "#666666",
  },
  periodTextSelected: {
    color: "#010135",
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
    paddingBottom: Platform.OS === "android" ? 48 : 20,
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
    borderLeftColor: "#010135",
  },
  noticeText: {
    fontSize: 12,
    color: "#4A5568",
    lineHeight: 16,
    flexWrap: 'wrap',
  },
  policyIntroduction: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  policyOptions: {
    gap: 12,
  },
  policyItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FAFAFA',
    gap: 12,
  },
  policyItemSelected: {
    borderColor: '#010135',
    backgroundColor: '#F0F4FF',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  radioSelected: {
    borderColor: '#010135',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#010135',
  },
  policyContent: {
    flex: 1,
  },
  policyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#292929',
    marginBottom: 4,
  },
  policyTitleSelected: {
    color: '#010135',
  },
  policyDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  badge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#010135',
    textTransform: 'uppercase',
  },
});

export default Pricing;
