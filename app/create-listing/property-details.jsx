/**
 * Create Listing - Step 3: Property Details
 * Enter property title, furnishing, bedrooms, bathrooms, etc.
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import debounce from "lodash.debounce";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Dimensions,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import CancelConfirmationModal from "../../src/components/create-listing/CancelConfirmationModal";
import { useDraftListing } from "../../src/hooks/useDraftListing";
import draftListingService from "../../src/services/draftListingService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Close X Icon - with explicit dimensions for web
const CloseIcon = ({ size = 24, color = "#000000" }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    style={{ width: size, height: size, minWidth: size, minHeight: size }}
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

// Info Circle Icon
const InfoIcon = ({ size = 18, color = "#FD3131" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.5} />
    <Path
      d="M12 16V12M12 8H12.01"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </Svg>
);

// Plus/Minus Icons
const PlusIcon = ({ size = 20, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 5V19M5 12H19"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const MinusIcon = ({ size = 20, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 12H19"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Chevron Down Icon
const ChevronDownIcon = ({ size = 20, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 9L12 15L18 9"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Check Icon
const CheckIcon = ({ size = 20, color = "#23C16B" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17L4 12"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Check Circle Icon for Tips
const CheckCircleIcon = ({ size = 18, color = "#23C16B" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill={color} />
    <Path
      d="M8 12L11 15L16 9"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Title Type Options
const TITLE_TYPE_OPTIONS = [
  "C of O (Certificate of Occupancy)",
  "Governor's Consent",
  "Deed of Assignment",
  "Registered Survey",
  "R of O (Right of Occupancy)",
  "Land Receipt",
  "Family Receipt",
  "Others",
];

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

// Counter Component
const Counter = ({
  label,
  value,
  onIncrement,
  onDecrement,
  min = 0,
  max = 20,
}) => (
  <View style={styles.counterRow}>
    <Text style={styles.counterLabel}>{label}</Text>
    <View style={styles.counterControls}>
      <Pressable
        style={[
          styles.counterButton,
          value <= min && styles.counterButtonDisabled,
        ]}
        onPress={onDecrement}
        disabled={value <= min}
      >
        <MinusIcon size={16} color={value <= min ? "#CCCCCC" : "#000000"} />
      </Pressable>
      <View style={styles.counterValueContainer}>
        <Text style={styles.counterValue}>{value}</Text>
      </View>
      <Pressable
        style={[
          styles.counterButton,
          value >= max && styles.counterButtonDisabled,
        ]}
        onPress={onIncrement}
        disabled={value >= max}
      >
        <PlusIcon size={16} color={value >= max ? "#CCCCCC" : "#000000"} />
      </Pressable>
    </View>
  </View>
);

// Selection Chip Component
const SelectionChip = ({ label, selected, onPress }) => (
  <Pressable
    style={[styles.chip, selected && styles.chipSelected]}
    onPress={onPress}
  >
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
      {label}
    </Text>
  </Pressable>
);

const PropertyDetails = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const draftId = params.draftId || null;
  const { draftData, saveDraftData, isLoadingDraft, draftError } =
    useDraftListing();

  // Initialize from draft or params
  const [propertyTitle, setPropertyTitle] = useState("");
  const [furnishing, setFurnishing] = useState(null);
  const [bedrooms, setBedrooms] = useState(0);
  const [bathrooms, setBathrooms] = useState(0);
  const [guestCapacity, setGuestCapacity] = useState(0);
  const [titleType, setTitleType] = useState("");
  const [propertyHighlight, setPropertyHighlight] = useState("");
  const [showTitleTypeDropdown, setShowTitleTypeDropdown] = useState(false);
  const [showTipsOverlay, setShowTipsOverlay] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const MAX_HIGHLIGHT_LENGTH = 500;

  // Load draft data on mount
  const isInitialized = useRef(false);
  useEffect(() => {
    if (draftData && !isInitialized.current) {
      setPropertyTitle(draftData.propertyTitle || "");
      setFurnishing(draftData.furnishing || null);
      setBedrooms(draftData.bedrooms || 0);
      setBathrooms(draftData.bathrooms || 0);
      setGuestCapacity(draftData.guestCapacity || 0);
      setTitleType(draftData.titleType || "");
      setPropertyHighlight(draftData.propertyHighlight || "");
      isInitialized.current = true;
    }
  }, [draftData]);

  // Debounce the draft save to prevent input lag
  const debouncedSaveDraft = useCallback(
    debounce((data) => {
      saveDraftData(data);
    }, 1000),
    [saveDraftData]
  );

  // Auto-save function
  const updatePropertyDetails = (updates) => {
    const finalUpdates = {
      propertyTitle:
        updates.propertyTitle !== undefined
          ? updates.propertyTitle
          : propertyTitle,
      furnishing:
        updates.furnishing !== undefined ? updates.furnishing : furnishing,
      bedrooms: updates.bedrooms !== undefined ? updates.bedrooms : bedrooms,
      bathrooms:
        updates.bathrooms !== undefined ? updates.bathrooms : bathrooms,
      guestCapacity:
        updates.guestCapacity !== undefined
          ? updates.guestCapacity
          : guestCapacity,
      titleType:
        updates.titleType !== undefined ? updates.titleType : titleType,
      propertyHighlight:
        updates.propertyHighlight !== undefined
          ? updates.propertyHighlight
          : propertyHighlight,
      currentStep: 3,
    };

    if (updates.propertyTitle !== undefined)
      setPropertyTitle(updates.propertyTitle);
    if (updates.furnishing !== undefined) setFurnishing(updates.furnishing);
    if (updates.bedrooms !== undefined) setBedrooms(updates.bedrooms);
    if (updates.bathrooms !== undefined) setBathrooms(updates.bathrooms);
    if (updates.guestCapacity !== undefined)
      setGuestCapacity(updates.guestCapacity);
    if (updates.titleType !== undefined) setTitleType(updates.titleType);
    if (updates.propertyHighlight !== undefined)
      setPropertyHighlight(updates.propertyHighlight);

    debouncedSaveDraft(finalUpdates);
  };

  const handleClose = () => {
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    try {
      const finalDraftId =
        (draftData && draftData.draftId) ||
        draftId ||
        draftListingService.generateDraftId();

      await saveDraftData({
        propertyTitle,
        furnishing: furnishing || "",
        bedrooms,
        bathrooms,
        guestCapacity,
        titleType,
        propertyHighlight,
        currentStep: 3,
        draftId: finalDraftId,
      });

      setShowCancelModal(false);
      router.replace("/(host-tabs)/listings?filter=drafts&showDraftSaved=true");
    } catch (error) {
      console.error("Error saving draft:", error);
      setShowCancelModal(false);
      router.replace("/(host-tabs)/listings?filter=drafts&showDraftSaved=true");
    }
  };

  const handleCancelDismiss = () => {
    setShowCancelModal(false);
  };

  const handleBack = () => {
    const finalDraftId =
      (draftData && draftData.draftId) ||
      draftId ||
      draftListingService.generateDraftId();

    saveDraftData({
      propertyTitle,
      furnishing: furnishing || "",
      bedrooms,
      bathrooms,
      guestCapacity,
      titleType,
      propertyHighlight,
      currentStep: 3,
      draftId: finalDraftId,
    })
      .then(() => {
        router.replace({
          pathname: "/create-listing/intent",
          params: { draftId: finalDraftId },
        });
      })
      .catch(() => {
        router.replace({
          pathname: "/create-listing/intent",
          params: { draftId: finalDraftId },
        });
      });
  };

  const handleNext = () => {
    // Validate required fields
    if (!propertyTitle.trim()) {
      Alert.alert(
        "Property Title Required",
        "Please enter a title for your property.",
      );
      return;
    }
    if (!furnishing) {
      Alert.alert(
        "Furnishing Required",
        "Please select the furnishing status of your property.",
      );
      return;
    }
    if (!bedrooms || parseInt(bedrooms) < 1) {
      Alert.alert("Bedrooms Required", "Please enter the number of bedrooms.");
      return;
    }
    if (!bathrooms || parseInt(bathrooms) < 1) {
      Alert.alert(
        "Bathrooms Required",
        "Please enter the number of bathrooms.",
      );
      return;
    }
    if (!titleType) {
      Alert.alert(
        "Title Type Required",
        "Please select the title type for your property.",
      );
      return;
    }
    if (!propertyHighlight || propertyHighlight.trim().length < 10) {
      Alert.alert(
        "Description Required",
        "Please enter a description (at least 10 characters).",
      );
      return;
    }
    // Note: Guest capacity is optional

    const finalDraftId =
      (draftData && draftData.draftId) ||
      draftId ||
      draftListingService.generateDraftId();

    saveDraftData({
      propertyTitle,
      furnishing: furnishing || "",
      bedrooms,
      bathrooms,
      guestCapacity,
      titleType,
      propertyHighlight,
      currentStep: 3,
      draftId: finalDraftId,
    })
      .then(() => {
        router.push({
          pathname: "/create-listing/location",
          params: { draftId: finalDraftId },
        });
      })
      .catch(() => {
        router.push({
          pathname: "/create-listing/location",
          params: { draftId: finalDraftId },
        });
      });
  };

  // Validate form - guest capacity is optional
  const isValid =
    propertyTitle.trim().length > 0 &&
    furnishing &&
    bedrooms &&
    parseInt(bedrooms) >= 1 &&
    bathrooms &&
    parseInt(bathrooms) >= 1 &&
    titleType &&
    propertyHighlight &&
    propertyHighlight.trim().length >= 10;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create a Listing</Text>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <View style={styles.closeButtonBg} />
          <View style={{ zIndex: 5 }}>
            <CloseIcon size={14} color="#000000" />
          </View>
        </Pressable>
      </View>

      {/* Progress Bar */}
      <ProgressBar currentStep={3} totalSteps={10} />

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Section Header with Tips */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Property Details:</Text>
          <Pressable
            style={styles.tipsButton}
            onPress={() => setShowTipsOverlay(true)}
          >
            <View style={styles.tipsIconContainer}>
              <InfoIcon size={18} color="#FD3131" />
            </View>
            <Text style={styles.tipsText}>Tips</Text>
          </Pressable>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <Text style={styles.formLabel}>Fill in the details below:</Text>

          {/* Property Title */}
          <View style={styles.selectionSection}>
            <Text style={styles.selectionLabel}>Property Title:</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="E.g 2 Bedroom Apartment in Lekki"
                placeholderTextColor="#656565"
                value={propertyTitle}
                onChangeText={(text) => {
                  updatePropertyDetails({ propertyTitle: text });
                }}
              />
            </View>
          </View>
        </View>

        {/* Property Highlight */}
        <View style={styles.selectionSection}>
          <Text style={styles.selectionLabel}>
            Property Highlight:{" "}
            <Text style={styles.requiredText}>*Required</Text>
          </Text>
          <View style={styles.highlightSection}>
            <Text style={styles.highlightPrompt}>
              Tell guests why they will love your space in details;
            </Text>
            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                placeholder="Write a full description here..."
                placeholderTextColor="#7C7C7C"
                value={propertyHighlight}
                onChangeText={(text) => {
                  if (text.length <= MAX_HIGHLIGHT_LENGTH) {
                    updatePropertyDetails({ propertyHighlight: text });
                  }
                }}
                multiline
                textAlignVertical="top"
              />
            </View>
            <Text style={styles.charCount}>
              {propertyHighlight.length}/{MAX_HIGHLIGHT_LENGTH}
            </Text>
          </View>
        </View>

        {/* Furnishing */}
        <View style={styles.selectionSection}>
          <Text style={styles.selectionLabel}>
            Furnishing: <Text style={styles.requiredText}>*Required</Text>
          </Text>
          <View style={styles.chipsRow}>
            <SelectionChip
              label="Furnished"
              selected={furnishing === "furnished"}
              onPress={() => updatePropertyDetails({ furnishing: "furnished" })}
            />
            <SelectionChip
              label="Semi-Furnished"
              selected={furnishing === "semi-furnished"}
              onPress={() =>
                updatePropertyDetails({ furnishing: "semi-furnished" })
              }
            />
            <SelectionChip
              label="Unfurnished"
              selected={furnishing === "unfurnished"}
              onPress={() =>
                updatePropertyDetails({ furnishing: "unfurnished" })
              }
            />
          </View>
        </View>

        {/* Counters */}
        <Counter
          label="Bedrooms *"
          value={bedrooms}
          onIncrement={() => updatePropertyDetails({ bedrooms: bedrooms + 1 })}
          onDecrement={() =>
            updatePropertyDetails({ bedrooms: Math.max(0, bedrooms - 1) })
          }
          min={0}
        />
        <Counter
          label="Bathrooms *"
          value={bathrooms}
          onIncrement={() =>
            updatePropertyDetails({ bathrooms: bathrooms + 1 })
          }
          onDecrement={() =>
            updatePropertyDetails({ bathrooms: Math.max(0, bathrooms - 1) })
          }
          min={0}
        />
        <Counter
          label="Guest Capacity"
          value={guestCapacity}
          onIncrement={() =>
            updatePropertyDetails({ guestCapacity: guestCapacity + 1 })
          }
          onDecrement={() =>
            updatePropertyDetails({
              guestCapacity: Math.max(0, guestCapacity - 1),
            })
          }
          min={0}
        />

        {/* Title Type */}
        <View style={styles.selectionSection}>
          <Text style={styles.selectionLabel}>
            Title type: <Text style={styles.requiredText}>*Required</Text>
          </Text>
          <Pressable
            style={styles.dropdownButton}
            onPress={() => setShowTitleTypeDropdown(true)}
          >
            <Text
              style={[
                styles.dropdownButtonText,
                !titleType && styles.dropdownPlaceholder,
              ]}
            >
              {titleType || "Select title type"}
            </Text>
            <ChevronDownIcon size={20} color="#656565" />
          </Pressable>
        </View>
      </ScrollView>

      {/* Title Type Dropdown Overlay */}
      {showTitleTypeDropdown && (
        <Pressable
          style={styles.dropdownOverlay}
          onPress={() => setShowTitleTypeDropdown(false)}
        >
          <Pressable
            style={styles.dropdownModal}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Select Title Type</Text>
              <Pressable onPress={() => setShowTitleTypeDropdown(false)}>
                <CloseIcon size={20} color="#000000" />
              </Pressable>
            </View>
            <ScrollView
              style={styles.dropdownList}
              contentContainerStyle={styles.dropdownListContent}
              showsVerticalScrollIndicator={true}
              bounces={true}
            >
              {TITLE_TYPE_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.dropdownItem,
                    titleType === option && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    updatePropertyDetails({ titleType: option });
                    setShowTitleTypeDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      titleType === option && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                  {titleType === option && (
                    <CheckIcon size={20} color="#23C16B" />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      )}

      {/* Tips Overlay */}
      {showTipsOverlay && (
        <Pressable
          style={styles.tipsOverlay}
          onPress={() => setShowTipsOverlay(false)}
        >
          <Pressable
            style={styles.tipsModal}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.tipsModalHeader}>
              <Text style={styles.tipsModalTitle}>Property Details Tips?</Text>
              <Pressable
                style={styles.tipsCloseButton}
                onPress={() => setShowTipsOverlay(false)}
              >
                <CloseIcon size={14} color="#000000" />
              </Pressable>
            </View>
            <View style={styles.tipsContent}>
              <View style={styles.tipItem}>
                <View style={styles.tipCheckbox}>
                  <CheckCircleIcon size={18} color="#23C16B" />
                </View>
                <Text style={styles.tipText}>
                  Accurate info helps match the right guests
                </Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipCheckbox}>
                  <CheckCircleIcon size={18} color="#23C16B" />
                </View>
                <Text style={styles.tipText}>
                  Clear titles attract more views and bookings
                </Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipCheckbox}>
                  <CheckCircleIcon size={18} color="#23C16B" />
                </View>
                <Text style={styles.tipText}>
                  Detailed descriptions build guest confidence
                </Text>
              </View>
            </View>
          </Pressable>
        </Pressable>
      )}

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
    zIndex: 10,
  },
  closeButtonBg: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    zIndex: 1,
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
    paddingTop: 20,
    paddingBottom: 30,
    gap: 25,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",

    color: "#000000",
  },
  tipsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  tipsIconContainer: {
    width: 18,
    height: 18,
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  tipsText: {
    fontSize: 12,
    fontWeight: "500",

    color: "#FD3131",
  },
  formSection: {
    gap: 10,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "500",

    color: "#000000",
    marginBottom: 20,
  },
  inputContainer: {
    height: 44,
  },
  textInput: {
    flex: 1,
    height: 44,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#B0B0B0",
    backgroundColor: "#F6F6F6",
    paddingHorizontal: 18,
    fontSize: 12,

    color: "#000000",
  },
  selectionSection: {
    gap: 25,
  },
  selectionLabel: {
    fontSize: 14,
    fontWeight: "700",

    color: "#000000",
  },
  requiredText: {
    fontSize: 12,
    fontWeight: "400",
    color: "#FD3131",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#888888",
    justifyContent: "center",
    alignItems: "center",
  },
  chipSelected: {
    borderColor: "#010135",
    backgroundColor: "rgba(180, 206, 255, 0.3)",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",

    color: "#292929",
    textAlign: "center",
  },
  chipTextSelected: {
    color: "#010135",
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 34,
  },
  counterLabel: {
    fontSize: 14,
    fontWeight: "700",

    color: "#000000",
  },
  counterControls: {
    flexDirection: "row",
    alignItems: "center",
    width: 111,
    justifyContent: "space-between",
  },
  counterButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  counterButtonDisabled: {
    opacity: 0.5,
  },
  counterValueContainer: {
    padding: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  counterValue: {
    fontSize: 14,
    fontWeight: "700",

    color: "#000000",
    letterSpacing: 0.3,
  },
  highlightSection: {
    width: "100%",
  },
  highlightPrompt: {
    fontSize: 14,
    fontWeight: "500",

    color: "#000000",
    marginBottom: 16,
  },
  textAreaContainer: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#7C7C7C",
    height: 154,
    width: "100%",
  },
  textArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 14,

    color: "#000000",
  },
  charCount: {
    fontSize: 10,

    color: "#7C7C7C",
    textAlign: "right",
    marginTop: 8,
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
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C5C4C4",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  dropdownButtonText: {
    fontSize: 14,
    fontWeight: "400",

    color: "#000000",
  },
  dropdownPlaceholder: {
    color: "#656565",
  },
  dropdownOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
    zIndex: 1000,
    elevation: 1000,
  },
  dropdownModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: "600",

    color: "#000000",
  },
  dropdownList: {
    flexGrow: 0,
  },
  dropdownListContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  dropdownItemSelected: {
    backgroundColor: "#F8FFF8",
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: "400",

    color: "#000000",
  },
  dropdownItemTextSelected: {
    fontWeight: "600",
    color: "#23C16B",
  },
  tipsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
    zIndex: 1001,
    elevation: 1001,
  },
  tipsModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  tipsModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    position: "relative",
  },
  tipsModalTitle: {
    fontSize: 16,
    fontWeight: "700",

    color: "#000000",
    textAlign: "center",
  },
  tipsCloseButton: {
    position: "absolute",
    right: 20,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  tipsContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  tipCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  tipText: {
    fontSize: 14,
    fontWeight: "500",

    color: "#292929",
    flex: 1,
  },
});

export default PropertyDetails;
