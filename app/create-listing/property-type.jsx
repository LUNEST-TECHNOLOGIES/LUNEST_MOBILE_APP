/**
 * Create Listing - Step 2: Property Type
 * Select the type of property (Apartment, House, etc.)
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import CancelConfirmationModal from "../../src/components/create-listing/CancelConfirmationModal";
import { useDraftListing } from "../../src/hooks/useDraftListing";
import draftListingService from "../../src/services/draftListingService";

// Close X Icon
const CloseIcon = ({ size = 24, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6L18 18"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Property Type Icons - Aligned with CategorySlider categories
const ShortletIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 21H21M5 21V7L13 3V21M13 21V7L19 10V21M9 9V9.01M9 13V13.01M9 17V17.01"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const StandardFlatIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 21H21M5 21V7L13 3V21M13 21V7L19 10V21M9 9V9.01M9 13V13.01M9 17V17.01"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SelfContainIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 10.25V20C3 20.5523 3.44772 21 4 21H9V15C9 14.4477 9.44772 14 10 14H14C14.5523 14 15 14.4477 15 15V21H20C20.5523 21 21 20.5523 21 20V10.25M22 12L12.707 3.39C12.3166 3.01544 11.6834 3.01544 11.293 3.39L2 12"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PurchaseIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2 22H22M20 22V6L12 2L4 6V22M8 10H10M14 10H16M8 14H10M14 14H16M8 18H10M14 18H16"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LuxuryIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PrivateHomesIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 10.25V20C3 20.5523 3.44772 21 4 21H9V15C9 14.4477 9.44772 14 10 14H14C14.5523 14 15 14.4477 15 15V21H20C20.5523 21 21 20.5523 21 20V10.25M22 12L12.707 3.39C12.3166 3.01544 11.6834 3.01544 11.293 3.39L2 12"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const HotelIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 21H21M5 21V5C5 3.89543 5.89543 3 7 3H17C18.1046 3 19 3.89543 19 5V21M9 7H11M13 7H15M9 11H11M13 11H15M9 15H11M13 15H15"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const OfficeIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 21V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V21"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const DuplexIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3V21M3 21H21M5 21V10L8.5 7M19 21V10L15.5 7M12 7L8.5 10V21M12 7L15.5 10V21"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const BungalowIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 10.25V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V10.25M22 12L12.707 3.39C12.3166 3.01544 11.6834 3.01544 11.293 3.39L2 12M8 21V15C8 14.4477 8.44772 14 9 14H15C15.5523 14 16 14.4477 16 15V21"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const OtherIcon = ({ size = 32, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
      stroke={color}
      strokeWidth={1.5}
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

// Property types data - Aligned with CategorySlider categories
const PROPERTY_TYPES = [
  { id: "shortlet", label: "Shortlet", icon: ShortletIcon },
  { id: "standard-flat", label: "Standard Flat", icon: StandardFlatIcon },
  { id: "self-contain", label: "Self-Contain", icon: SelfContainIcon },
  { id: "purchase", label: "Purchase", icon: PurchaseIcon },
  { id: "luxury", label: "Luxury", icon: LuxuryIcon },
  { id: "private-homes", label: "Private Homes", icon: PrivateHomesIcon },
  { id: "hotel", label: "Hotel", icon: HotelIcon },
  { id: "office", label: "Office", icon: OfficeIcon },
  { id: "duplex", label: "Duplex", icon: DuplexIcon },
  { id: "bungalow", label: "Bungalow", icon: BungalowIcon },
  { id: "others", label: "Others", icon: OtherIcon },
];

// Property Type Option Component
const PropertyTypeOption = ({ type, selected, onPress }) => {
  const IconComponent = type.icon;
  return (
    <Pressable
      style={[styles.typeOption, selected && styles.typeOptionSelected]}
      onPress={onPress}
    >
      <IconComponent size={32} color={selected ? "#192DFF" : "#292929"} />
      <Text style={[styles.typeText, selected && styles.typeTextSelected]}>
        {type.label}
      </Text>
    </Pressable>
  );
};

const PropertyType = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { draftData, saveDraftData } = useDraftListing();
  const [selectedType, setSelectedType] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleClose = () => {
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    try {
      const finalDraftId =
        (draftData && draftData.draftId) ||
        draftListingService.generateDraftId();

      await saveDraftData({
        ...draftData,
        ...params,
        propertyType: selectedType,
        currentStep: 2,
        draftId: finalDraftId,
      });

      setShowCancelModal(false);
      router.dismissAll();
      router.replace("/(host-tabs)/listings?filter=drafts&showDraftSaved=true");
    } catch (error) {
      console.error("Error saving draft:", error);
      setShowCancelModal(false);
      router.dismissAll();
      router.replace("/(host-tabs)/listings?filter=drafts&showDraftSaved=true");
    }
  };

  const handleCancelDismiss = () => {
    setShowCancelModal(false);
  };

  const handleBack = () => {
    router.back();
  };

  const handleNext = () => {
    if (selectedType) {
      router.push({
        pathname: "/create-listing/property-details",
        params: { ...params, propertyType: selectedType },
      });
    }
  };

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
      <ProgressBar currentStep={2} totalSteps={10} />

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.sectionTitle}>What type of property is this?</Text>

        <View style={styles.typeGrid}>
          {PROPERTY_TYPES.map((type) => (
            <PropertyTypeOption
              key={type.id}
              type={type}
              selected={selectedType === type.id}
              onPress={() => setSelectedType(type.id)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Pressable
          style={[
            styles.nextButton,
            !selectedType && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!selectedType}
        >
          <Text
            style={[
              styles.nextButtonText,
              !selectedType && styles.nextButtonTextDisabled,
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
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
  },
  typeOption: {
    width: "47%",
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FAFAFA",
  },
  typeOptionSelected: {
    borderColor: "#192DFF",
    backgroundColor: "#F0F4FF",
  },
  typeText: {
    fontSize: 14,
    fontWeight: "500",

    color: "#292929",
    textAlign: "center",
  },
  typeTextSelected: {
    color: "#192DFF",
    fontWeight: "600",
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
});

export default PropertyType;
