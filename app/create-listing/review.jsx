/**
 * Create Listing - Step 9: Review
 * Review all listing details before submission
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Check,
  Star,
  Video,
  X,
  AlertCircle
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Line, Rect } from "react-native-svg";
import ToastNotification from "../../src/components/common/ToastNotification";
import CancelConfirmationModal from "../../src/components/create-listing/CancelConfirmationModal";
import SubmitConfirmationModal from "../../src/components/create-listing/SubmitConfirmationModal";
import { useDraftListing } from "../../src/hooks/useDraftListing";
import authService from "../../src/services/authService";
import draftListingService from "../../src/services/draftListingService";
import { fetchHostData, getHostAvatarUrl } from "../../src/services/hostService";
import listingService from "../../src/services/listingService";
import toastService from "../../src/services/toastService";
// Use distinct name to avoid collision with local StarIcon component

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

// Summary Row Component
const SummaryRow = ({ label, value }) => {
  // Safely convert value to string to prevent "Text strings must be rendered within a Text component" error
  const safeValue =
    value === null || value === undefined
      ? "N/A"
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value || "");

  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{String(label || "")}</Text>
      <Text style={styles.summaryValue}>{String(safeValue)}</Text>
    </View>
  );
};

// Helper function to convert to sentence case
const toSentenceCase = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Helper function to format time from ISO string or time string
const formatTime = (timeString) => {
  if (!timeString) return "Not set";

  try {
    const date = new Date(timeString);
    if (!isNaN(date.getTime())) {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, "0");
      return `${displayHours}:${displayMinutes} ${ampm}`;
    }
  } catch (e) {
    // If ISO parsing fails, try to return the string as is
    return timeString;
  }

  return timeString;
};

// Safe JSON parse helper - defined outside component
const safeParseArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
};

// Amenities mapping from ID to label
const AMENITIES_MAP = {
  // Comfort & Living Essentials
  walk_in_closet: "Walk-In Closet",
  balcony: "Balcony",
  ac: "Air Conditioning (AC)",
  heating: "Heating System",
  washer: "Washer/Dryer",
  kitchen: "Full Kitchen",
  furnished: "Fully Furnished",
  // Security & Access
  security_24_7: "24/7 Security",
  cctv: "CCTV Surveillance",
  gated: "Gated Compound",
  electronic_lock: "Electronic Door Lock",
  intercom: "Intercom System",
  // Power & Utilities
  inverter: "Inverter",
  generator: "Generator",
  solar: "Solar Power",
  borehole: "Borehole Water",
  water_heater: "Water Heater",
  // Tech & Connectivity
  wifi: "WiFi",
  smart_tv: "Smart TV",
  cable: "Cable/Satellite TV",
  workspace: "Dedicated Workspace",
  // Lifestyle & Luxury
  pool: "Swimming Pool",
  gym: "Gym/Fitness Center",
  garden: "Garden/Lawn",
  rooftop: "Rooftop Access",
  parking: "Parking Space",
};

// Helper function to get amenity label from ID
const getAmenityLabel = (amenityId) => {
  return AMENITIES_MAP[amenityId] || amenityId;
};

// House Rules mapping (aligned with house-rules.jsx HOUSE_RULES)
const HOUSE_RULES_MAP = {
  no_smoking: "No Smoking",
  no_pets: "No Pets",
  no_parties: "No Parties or Events",
  quiet_hours: "Quiet Hours (10 PM - 8 AM)",
  no_unregistered: "No Unregistered Guests",
  no_shoes: "No Shoes Inside",
  no_cooking: "No Cooking",
  recycling: "Recycling Required",
};

// Helper function to convert house rule IDs to readable labels
const convertHouseRulesToLabels = (rules) => {
  if (!rules) return [];

  if (typeof rules === "object" && !Array.isArray(rules)) {
    // Handle object format: { no_smoking: true, no_pets: false, ... }
    return Object.entries(rules)
      .filter(([_, enabled]) => enabled)
      .map(([ruleId, _]) => {
        if (!ruleId || ruleId === null || ruleId === undefined) return null;
        const stringId = String(ruleId);
        return (
          HOUSE_RULES_MAP[stringId] ||
          stringId.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
        );
      })
      .filter(Boolean); // Remove null, undefined, empty values
  }

  if (typeof rules === "string") {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(rules);
      if (typeof parsed === "object") {
        return convertHouseRulesToLabels(parsed);
      }
      // If it's a plain string, return as is
      return [rules];
    } catch (e) {
      // If not JSON, treat as comma-separated string
      return rules
        .split(",")
        .map((rule) => rule.trim())
        .filter((rule) => rule);
    }
  }

  if (Array.isArray(rules)) {
    // Handle array of rule IDs
    return rules
      .map((ruleId) => {
        if (!ruleId || ruleId === null || ruleId === undefined) return null;
        const stringId = String(ruleId);
        return (
          HOUSE_RULES_MAP[stringId] ||
          stringId.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
        );
      })
      .filter(Boolean); // Remove null, undefined, empty values
  }

  return [];
};

// Review Component

const Review = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const draftId = params.draftId || null;
  const { draftData, saveDraftData } = useDraftListing();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Check if we're editing an existing listing
  // Robustly detect isEditing from draftId prefix if params are missing
  const isEditing = draftData?.isEditing || params.isEditing === "true" || (draftId && draftId.startsWith("edit_"));
  const editingListingId =
    draftData?.editingListingId || params.editingListingId || (draftId && draftId.startsWith("edit_") ? draftId.replace("edit_", "") : null);

  // Load and merge draft data with params
  const [mergedData, setMergedData] = useState({});
  const [hostStats, setHostStats] = useState({ rating: 0, reviews: 0, totalListings: 0, fullName: "", avatar: "" });
  const [isLoadingHost, setIsLoadingHost] = useState(false);
  const [showSaveAsNewModal, setShowSaveAsNewModal] = useState(false);
  const [isFallbackCreating, setIsFallbackCreating] = useState(false);
  
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
  
  // Capture params once at mount to avoid unstable reference issues
  const initialParamsRef = useRef(params);

  // Load and merge data whenever draftData or params change
  useEffect(() => {
    // If we have a draftId but draftData hasn't arrived yet, we wait.
    if (draftId && !draftData) return;

    // 1. Start with initial params as baseline
    const baseData = { ...initialParamsRef.current };
    
    // 2. Use draft data if available, otherwise fallback to base params
    const activeDraft = draftData || {};
    
    // 3. Resolve Media (Photos)
    // Priority: draftData.photos -> draftData.images -> baseData.photos -> baseData.images
    const draftPhotos = safeParseArray(activeDraft.photos || activeDraft.images);
    const paramPhotos = safeParseArray(baseData.photos || baseData.images);
    const finalPhotos = draftPhotos.length > 0 ? draftPhotos : paramPhotos;

    console.log('📂 [Review] Aggregating data for display:', {
      source: draftData ? 'local-cache' : 'nav-params',
      photosCount: finalPhotos.length,
      propertyTitle: activeDraft.propertyTitle || baseData.propertyTitle || 'Untitled'
    });

    setMergedData({
      ...baseData,
      ...activeDraft,
      photos: finalPhotos,
      images: finalPhotos,
      // Ensure specific fields have consistent fallbacks
      propertyTitle: activeDraft.propertyTitle || activeDraft.propertyName || baseData.propertyTitle || baseData.propertyName || "Untitled",
      intent: (activeDraft.intent || baseData.intent || "rent").toLowerCase(),
      houseRules: activeDraft.houseRules || baseData.houseRules || [],
      additionalRules: activeDraft.additionalRules || baseData.additionalRules || ""
    });
  }, [draftData, draftId]); // Re-run whenever draftData arrives or updates

  // Fetch host stats from backend
  useEffect(() => {
    const loadHostStats = async () => {
      try {
        setIsLoadingHost(true);
        const userData = await authService.getUserData();
        const hostId = userData?._id || userData?.id;
        
        if (hostId) {
          console.log("👤 [Review] Fetching stats for host:", hostId);
          const result = await fetchHostData(hostId);
          
          if (result.success && result.hostData) {
            console.log("✅ [Review] Host stats loaded:", result.hostData);
            setHostStats({
              rating: result.hostData.hostRating || 0,
              reviews: result.hostData.hostRatingCount || 0,
              totalListings: result.hostData.totalListings || 0, // Note: Backend might need to provide this or we count manually
              fullName: result.hostData.fullName || "Host",
              avatar: result.hostData.avatar
            });
            
            // If totalListings is not in profile, we might fetch it from fetchUserListings
            if (result.hostData.totalListings === undefined) {
              const listingsResult = await listingService.fetchUserListings();
              if (listingsResult.success) {
                setHostStats(prev => ({ ...prev, totalListings: listingsResult.listings.length }));
              }
            }
          }
        }
      } catch (error) {
        console.error("❌ [Review] Error loading host stats:", error);
      } finally {
        setIsLoadingHost(false);
      }
    };

    loadHostStats();
  }, []);

  // Parse merged data with improved photo handling for editing
  const photos = useMemo(() => {
    const mergedPhotos = safeParseArray(mergedData.photos);
    const mergedImages = safeParseArray(mergedData.images);

    // Use photos first, then fall back to images, ensuring we have the right data for editing
    const finalPhotos = mergedPhotos.length > 0 ? mergedPhotos : mergedImages;

    console.log("📸 [Review] Photos parsed:", {
      photosLength: mergedPhotos.length,
      imagesLength: mergedImages.length,
      finalLength: finalPhotos.length,
      isEditing,
    });

    return finalPhotos;
  }, [mergedData.photos, mergedData.images]); // Remove isEditing to prevent re-renders

  // Handle multiple videos gracefully
  const videos = useMemo(() => {
    let vids = [];
    
    // Use mergedData for videos since it contains the final merged values
    if (mergedData?.propertyVideos || mergedData?.videos || mergedData?.video) {
      const d_vids = mergedData.propertyVideos || mergedData.videos || mergedData.video;
      vids = Array.isArray(d_vids) ? d_vids : safeParseArray(d_vids);
    }

    return vids
      .map((v) => {
        if (typeof v === "string") return v;
        if (typeof v === "object" && v !== null) return v.url || v.uri || null;
        return null;
      })
      .filter(Boolean);
  }, [mergedData.propertyVideos, mergedData.videos, mergedData.video]); // Only depend on mergedData

  // Combine media for rendering
  const media = useMemo(() => {
    const vids = videos.map((v) => ({ uri: v, type: "video" }));
    const imgs = photos
      .map((p) => ({
        uri: typeof p === "string" ? p : p?.uri || p?.url,
        type: "image",
      }))
      .filter((p) => Boolean(p.uri));
    
    const allMedia = [...vids, ...imgs];
    console.log('🎬 [Review] Media processed:', {
      videos: vids.length,
      images: imgs.length,
      total: allMedia.length
    });
    
    return allMedia;
  }, [photos, videos]);

  const selectedAmenities = safeParseArray(mergedData.selectedAmenities);
  const customAmenities = safeParseArray(mergedData.customAmenities);
  const landmarks = safeParseArray(mergedData.landmarks);

  console.log('🛋️ [Review] Amenities data:', {
    selectedCount: selectedAmenities.length,
    customCount: customAmenities.length,
    selected: selectedAmenities,
    custom: customAmenities
  });
  
  console.log('💰 [Review] Pricing data:', {
    price: mergedData.price,
    period: mergedData.pricingPeriod,
    serviceCharge: mergedData.serviceCharge,
    securityDeposit: mergedData.securityDeposit,
    cleaningFee: mergedData.cleaningFee
  });
  
  console.log('📋 [Review] Rules data:', {
    houseRules: mergedData.houseRules,
    additionalRules: mergedData.additionalRules
  });

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

      // Ensure photos array is included in draft with proper fallbacks
      const photosToSave =
        photos.length > 0
          ? photos
          : safeParseArray(mergedData.photos).length > 0
            ? safeParseArray(mergedData.photos)
            : safeParseArray(mergedData.images);

      const draftToSave = {
        ...mergedData,
        photos: photosToSave,
        images: photosToSave, // Ensure both are set
        currentStep: 10,
        draftId: finalDraftId,
        isEditing: isEditing,
        editingListingId: editingListingId,
      };

      console.log(
        "📸 [Review] Saving draft with",
        draftToSave.photos?.length || 0,
        "photos",
      );

      await saveDraftData(draftToSave);

      setShowCancelModal(false);
      if (router.canDismiss()) router.dismissAll();
      router.replace("/(host-tabs)/listings?filter=drafts&showDraftSaved=true");
    } catch (error) {
      console.error("Error saving draft:", error);
      setShowCancelModal(false);
      if (router.canDismiss()) router.dismissAll();
      router.replace("/(host-tabs)/listings?filter=drafts&showDraftSaved=true");
    }
  };

  const handleCancelDismiss = () => {
    setShowCancelModal(false);
  };

  const handleBack = () => {
    // Navigate back to step 9 (terms-agreement) with draftId
    const finalDraftId = (draftData && draftData.draftId) || draftId;
    
    // OPTIMIZATION: Trigger save in background and navigate immediately
    saveDraftData({
      ...mergedData,
      currentStep: 9,
      draftId: finalDraftId,
    }, { background: true });

    router.push({
      pathname: "/create-listing/terms-agreement",
      params: finalDraftId ? { draftId: finalDraftId } : {},
    });
  };

  const handleSubmit = async () => {
    setShowSubmitModal(true);
  };

  const handleSubmitConfirmed = async () => {
    setShowSubmitModal(false);
    setIsSubmitting(true);
    console.log(
      "🚀 [Review] Submitting listing...",
      isEditing ? "(Edit mode)" : "(New listing)",
    );

    try {
      // Step 1: Handle images with better editing support
      let propertyImages = [];
      // Step 1.5: Handle Videos Upload - supports multiple
      let propertyVideos = [];
      if (videos && videos.length > 0) {
        const localVideos = videos.filter(
          (video) =>
            video &&
            !video.startsWith("http://") &&
            !video.startsWith("https://") &&
            !video.startsWith("blob:"),
        );
        const existingVideos = videos.filter(
          (video) =>
            video &&
            (video.startsWith("http://") ||
              video.startsWith("https://") ||
              video.startsWith("blob:")),
        );

        if (localVideos.length > 0) {
          console.log(
            `🎬 [Review] Uploading ${localVideos.length} local video(s)...`,
          );
          const uploadVideosResult =
            await listingService.uploadVideos(localVideos);

          if (uploadVideosResult.success && uploadVideosResult.videos) {
            propertyVideos = [...existingVideos, ...uploadVideosResult.videos];
            console.log(
              "✅ [Review] Video(s) uploaded successfully:",
              propertyVideos.length,
            );
          } else {
            console.error(
              "❌ [Review] Video upload failed:",
              uploadVideosResult,
            );
            toastService.showError(
              uploadVideosResult.message || "Failed to upload videos.",
            );
            setIsSubmitting(false);
            return;
          }
        } else {
          propertyVideos = existingVideos;
        }
      } else {
        if (isEditing) {
          propertyVideos = safeParseArray(mergedData.propertyVideos);
        }
      }
      if (photos && photos.length > 0) {
        // Check if photos are already server URLs (start with http/https)
        const hasLocalPhotos = photos.some(
          (photo) =>
            photo &&
            !photo.startsWith("http://") &&
            !photo.startsWith("https://"),
        );

        if (hasLocalPhotos) {
          // Separate local photos from already-uploaded URLs
          const localPhotos = photos.filter(
            (photo) =>
              photo &&
              !photo.startsWith("http://") &&
              !photo.startsWith("https://"),
          );
          const existingUrls = photos.filter(
            (photo) =>
              photo &&
              (photo.startsWith("http://") || photo.startsWith("https://")),
          );

          console.log(
            "📸 [Review] Processing images...",
            "Local photos:",
            localPhotos.length,
            "Existing URLs:",
            existingUrls.length,
            "Is editing:",
            isEditing,
          );

          if (localPhotos.length > 0) {
            const uploadResult = await listingService.uploadImages(localPhotos);

            if (uploadResult.success && uploadResult.images) {
              // Combine existing URLs with newly uploaded ones
              propertyImages = [...existingUrls, ...uploadResult.images];
              console.log(
                "✅ [Review] Images uploaded successfully:",
                propertyImages.length,
              );
            } else {
              console.log("⚠️ [Review] Image upload failed:", uploadResult);
              toastService.showError(
                uploadResult.message ||
                  "Failed to upload images. Please try again.",
              );
              setIsSubmitting(false);
              return;
            }
          }
        } else {
          // All photos are already URLs, use them directly
          console.log("📸 [Review] Using existing image URLs:", photos.length);
          propertyImages = photos;
        }
      } else {
        console.log(
          "⏭️ [Review] No photos to upload, proceeding with listing",
          isEditing ? "update" : "creation",
        );
        // In editing mode, try to preserve existing images if no new photos provided
        if (isEditing) {
          propertyImages =
            safeParseArray(mergedData.images).length > 0
              ? safeParseArray(mergedData.images)
              : [];
        }
      }

      // ...existing code...

      // Limit images to prevent backend rejection (max 20 URLs)
      if (propertyImages.length > 20) {
        console.warn(
          `[Review] Limiting images from ${propertyImages.length} to 20`,
        );
        propertyImages = propertyImages.slice(0, 20);
      }

      // Step 2: Build listing data with image URLs
      // Convert amenity IDs to labels for backend
      // Filter out 'custom_' IDs from selectedAmenities as they are handled by customAmenities array
      const amenityLabels = selectedAmenities
        .filter((id) => !String(id).startsWith("custom_"))
        .map((id) => getAmenityLabel(id));

      // Extract labels from custom amenities (handle both string and object formats)
      const customAmenityLabels = customAmenities
        .map((amenity) => {
          if (typeof amenity === "object" && amenity !== null) {
            // Priority: label -> name -> id (if no label/name)
            return (
              amenity.label ||
              amenity.name ||
              amenity.value ||
              String(amenity.id || "")
            );
          }
          return String(amenity || "");
        })
        .filter((label) => label.trim() !== "" && !label.startsWith("custom_"));

      const allAmenities = [...amenityLabels, ...customAmenityLabels];

      // Convert house rules (array or object) to string for backend display
      const houseRulesLabels = convertHouseRulesToLabels(mergedData.houseRules);
      const houseRulesString = houseRulesLabels.join(", ");


      // Helper to parse price strings that may contain commas
      const parsePrice = (priceStr) => {
        if (!priceStr) return 0;
        // Remove commas and any non-numeric characters except decimal point
        const cleanedPrice = String(priceStr)
          .replace(/,/g, "")
          .replace(/[^0-9.]/g, "");
        return parseFloat(cleanedPrice) || 0;
      };

      const listingData = {
        intent: mergedData.intent?.toUpperCase() || "RENT", // Convert to uppercase for backend
        propertyType: mergedData.propertyType,
        propertyName: mergedData.propertyName || mergedData.propertyTitle || mergedData.title,
        propertyTitle: mergedData.propertyTitle || mergedData.propertyName || mergedData.title,
        bedrooms: parseInt(mergedData.bedrooms) || 0,
        bathrooms: parseInt(mergedData.bathrooms) || 0,
        guests: parseInt(mergedData.guestCapacity || mergedData.guests) || 0,
        description:
          mergedData.propertyHighlight || mergedData.description || "",
        address: mergedData.address || "",
        city: mergedData.city || "",
        state: mergedData.state || "",
        country: mergedData.country || "Nigeria",
        postalCode: mergedData.postalCode || "",
        amenities: allAmenities,
        regulations: convertHouseRulesToLabels(mergedData.houseRules), // Add regulations array
        propertyImages: propertyImages, // Use uploaded image URLs instead of local photos
        propertyVideos: propertyVideos || [],
        price: parsePrice(mergedData.price),
        pricingPeriod: mergedData.pricingPeriod || "night",
        securityDeposit: parsePrice(mergedData.securityDeposit),
        serviceCharge: parsePrice(mergedData.serviceCharge),
        cleaningFee: parsePrice(mergedData.cleaningFee),
        instantBooking:
          mergedData.instantBooking === "true" ||
          mergedData.instantBooking === true,
        availableNow:
          mergedData.availableNow === "true" ||
          mergedData.availableNow === true,
        houseRules: houseRulesString, // Use converted string format
        additionalRules: mergedData.additionalRules || "",
        furnishing: mergedData.furnishing || "",
        titleType: mergedData.titleType || "",
        totalSquareFootage: mergedData.totalSquareFootage || "",
        usageType: mergedData.usageType || "",
        // ALIGN WITH BACKEND: Use propertyName and explicit bedrooms/bathrooms
        propertyName: mergedData.propertyTitle || mergedData.propertyName || "Listing",
        propertyTitle: mergedData.propertyTitle || mergedData.propertyName || "Listing",
        title: mergedData.propertyTitle || mergedData.propertyName || "Listing",
        bedrooms: parseInt(mergedData.bedrooms) || 0,
        bathrooms: parseInt(mergedData.bathrooms) || 0,
        acceptRefund: mergedData.acceptRefund !== false, // Explicitly pass the refund policy
        status: "PENDING",
      };

      // Add check-in/check-out times only if they were set
      if (mergedData.checkInTime) {
        listingData.checkInTime = mergedData.checkInTime;
      }
      if (mergedData.checkOutTime) {
        listingData.checkOutTime = mergedData.checkOutTime;
      }

      console.log("📊 [Review] Listing data prepared:", {
        ...listingData,
        propertyImages: `[${propertyImages.length} image URLs]`,
        isEditing: isEditing,
        editingListingId: editingListingId,
      });

      // Step 3: Create or Update listing with image URLs
      let result;
      if (isEditing && editingListingId) {
        console.log("📝 [Review] Updating existing listing:", editingListingId);
        result = await listingService.updateListing(
          editingListingId,
          listingData,
        );
      } else {
        console.log("🆕 [Review] Creating new listing");
        result = await listingService.createListing(listingData);
      }

      console.log("📥 [Review] API response:", result);

      if (result && (result.success || result._id || result.listing?._id)) {
        const listingId = result.listing?._id || result.listing?.id || result._id || result.listingId || editingListingId;

        // Clear the draft
        try {
          if (draftId) {
            await draftListingService.deleteDraft(draftId);
          }
        } catch (err) {
          console.log("Note: Could not delete draft:", err);
        }

        // Navigate to publish confirmation screen
        setTimeout(() => {
          router.dismissAll();
          router.push({
            pathname: "/create-listing/publish1",
            params: { listingId: listingId },
          });
        }, 500);
      } else {
        console.error("❌ [Review] Submission failed:", result?.message);
        
        // CUSTOM 404 HANDLING: Show specialized modal instead of silent fallback
        const detailString = JSON.stringify(result?.details || "").toLowerCase();
        const errorMessage = (result?.message || "").toLowerCase();
        const isNotFoundError = errorMessage.includes("not found") || 
                            detailString.includes("not found") || 
                            detailString.includes("notfounderror");
        
        if (isEditing && isNotFoundError) {
            console.warn("⚠️ [Review] Update failed with NotFound. Listing ID might be invalid or deleted.");
            setIsSubmitting(false);
            toastService.showWarning("Original listing record not found", 4000);
            setShowSaveAsNewModal(true);
            return;
        }

        toastService.showError(result?.message || "Something went wrong. Please try again.");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("❌ [Review] Unexpected error during submission:", error);
      toastService.showError("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Handles the actual fallback creation from the modal
  const handleSaveAsNewFallback = async () => {
    try {
      setIsFallbackCreating(true);
      console.log("🆕 [Review] Falling back to createListing via Modal");
      
      const listingData = generateListingData(mergedData);
      // Remove all ID fields to ensure a fresh create
      const { _id, id, listingId, ...newData } = listingData;
      
      const result = await listingService.createListing(newData);
      
      if (result.success) {
        toastService.showSuccess("Saved as new listing successfully!", 3000);
        setShowSaveAsNewModal(false);
        
        // Navigate to publish confirmation
        router.dismissAll();
        router.push({
          pathname: "/create-listing/publish1",
          params: { listingId: result.listing?._id || result._id || result.id },
        });
      } else {
        toastService.showError(result.message || "Failed to create new listing");
      }
    } catch (error) {
      console.error("❌ [Review] Fallback modal error:", error);
      toastService.showError("An unexpected error occurred during fallback saving.");
    } finally {
      setIsFallbackCreating(false);
    }
  };

  const formatPrice = (price) => {
    if (!price) return "₦0";
    return `₦${price}`;
  };

  // Show loading indicator if draft is selected but not yet loaded
  const isActuallyLoading = draftId && (!draftData || Object.keys(mergedData).length === 0);

  if (isActuallyLoading && !isSubmitting) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }]} edges={["top"]}>
        <ActivityIndicator size="large" color="#010135" />
        <Text style={{ marginTop: 16, fontSize: 16, fontWeight: "600", color: "#010135" }}>Loading listing details...</Text>
        <Text style={{ marginTop: 8, fontSize: 14, color: "#666666" }}>Preparing your review</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isEditing ? "Edit Listing" : "Create a Listing"}
        </Text>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <X size={24} color="#000000" />
        </Pressable>
      </View>

      {/* Progress Bar */}
      <ProgressBar currentStep={10} totalSteps={10} />

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.sectionTitle}>Review Your Listing</Text>
        <Text style={styles.sectionSubtitle}>
          Please review all the details below before submitting your listing
        </Text>

        {/* Property Title - Prominent */}
        {!!mergedData.propertyTitle && (
          <View style={styles.propertyTitleContainer}>
            <Text style={styles.propertyTitleLabel}>Property Title</Text>
            <Text style={styles.propertyTitleText}>
              {typeof mergedData.propertyTitle === "string"
                ? mergedData.propertyTitle
                : String(mergedData.propertyTitle || "")}
            </Text>
          </View>
        )}

        {/* Photos & Videos - First */}
        {media.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.subsectionTitle}>Media ({media.length})</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photoPreview}
            >
              {media.map((item, index) => {
                if (item.type === "video") {
                  return (
                    <View
                      key={`video-${index}`}
                      style={styles.videoPreviewWrapper}
                    >
                      <View
                        style={[styles.previewImage, styles.videoPlaceholder]}
                      >
                        <Video size={30} color="#010135" />
                        <Text style={styles.videoPlaceholderText}>Video</Text>
                      </View>
                    </View>
                  );
                }

                return (
                  <Image
                    key={`img-${index}`}
                    source={{ uri: item.uri }}
                    style={styles.previewImage}
                    onError={(error) => {
                      console.warn(
                        "[Review] Image failed to load:",
                        item.uri,
                        error,
                      );
                    }}
                  />
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Property Information */}
        <View style={styles.section}>
          <Text style={styles.subsectionTitle}>Property Information</Text>
          <SummaryRow
            label="Property Type"
            value={mergedData.propertyType || "N/A"}
          />
          <SummaryRow
            label="Listing Type"
            value={
              mergedData.intent === "rent"
                ? "For Rent"
                : mergedData.intent === "sale"
                  ? "For Sale"
                  : "N/A"
            }
          />
          <SummaryRow
            label="Furnishing"
            value={mergedData.furnishing || "N/A"}
          />
          <SummaryRow
            label="Title Type"
            value={mergedData.titleType || "N/A"}
          />

          {/* Conditional Fields based on Property Type */}
          {!(["office", "warehouse", "shop", "land", "co-working", "event-center", "shopping-plaza", "factory", "farm-land"].includes(mergedData.propertyType)) ? (
            <>
              <SummaryRow
                label="Bedrooms"
                value={String(mergedData.bedrooms || "0")}
              />
              <SummaryRow
                label="Bathrooms"
                value={String(mergedData.bathrooms || "0")}
              />
              {!!mergedData.guestCapacity && (
                <SummaryRow
                  label="Guest Capacity"
                  value={String(mergedData.guestCapacity || "0")}
                />
              )}
            </>
          ) : (
            <>
              {!!mergedData.totalSquareFootage && (
                <SummaryRow
                  label="Square Footage"
                  value={String(mergedData.totalSquareFootage)}
                />
              )}
              {!!mergedData.usageType && (
                <SummaryRow
                  label="Usage Type"
                  value={String(mergedData.usageType)}
                />
              )}
            </>
          )}

          {!!mergedData.propertyDescription && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.summaryLabel}>Description</Text>
              <Text style={styles.descriptionText}>
                {typeof mergedData.propertyDescription === "string"
                  ? mergedData.propertyDescription
                  : String(mergedData.propertyDescription || "")}
              </Text>
            </View>
          )}
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.subsectionTitle}>Location</Text>
          <SummaryRow label="Address" value={mergedData.address || "N/A"} />
          <SummaryRow label="City" value={mergedData.city || "N/A"} />
          <SummaryRow label="State" value={mergedData.state || "N/A"} />
          <SummaryRow label="Country" value={mergedData.country || "Nigeria"} />
          {!!mergedData.postalCode && (
            <SummaryRow
              label="Postal Code"
              value={String(mergedData.postalCode || "")}
            />
          )}
          {landmarks.length > 0 && landmarks[0] !== "" && (
            <View style={styles.landmarksContainer}>
              <Text style={styles.landmarksLabel}>Nearby Landmarks:</Text>
              {landmarks.map((landmark, index) => {
                const landmarkStr =
                  typeof landmark === "string"
                    ? landmark
                    : String(landmark || "");
                return landmarkStr.trim() ? (
                  <Text key={index} style={styles.landmarkItem}>
                    • {String(landmarkStr || "")}
                  </Text>
                ) : null;
              })}
            </View>
          )}
        </View>

        {/* Key Amenities */}
        {(selectedAmenities.length > 0 || customAmenities.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.subsectionTitle}>Key Amenities</Text>
            <View style={styles.amenitiesContainer}>
              {selectedAmenities.map((amenityId, index) => (
                <View key={`amenity-${index}`} style={styles.amenityItem}>
                  <Check size={16} color="#22C55E" />
                  <Text style={styles.amenityText}>
                    {String(getAmenityLabel(amenityId) || "")}
                  </Text>
                </View>
              ))}
              {customAmenities.map((amenity, index) => {
                // Handle both string and object formats
                const amenityLabel =
                  typeof amenity === "object" && amenity !== null
                    ? amenity.label || amenity.name || String(amenity.id || "")
                    : String(amenity || "");
                return (
                  <View key={`custom-${index}`} style={styles.amenityItem}>
                    <Check size={16} color="#22C55E" />
                    <Text style={styles.amenityText}>
                      {String(amenityLabel || "")}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.subsectionTitle}>Pricing</Text>
          <SummaryRow label="Price" value={`₦${mergedData.price || "0"}`} />
          {!!mergedData.pricingPeriod && (
            <SummaryRow
              label="Period"
              value={String(toSentenceCase(mergedData.pricingPeriod) || "")}
            />
          )}
          {!!mergedData.serviceCharge && (
            <SummaryRow
              label="Service Charge"
              value={`₦${String(mergedData.serviceCharge || "0")}`}
            />
          )}
          {!!mergedData.securityDeposit && (
            <SummaryRow
              label="Caution Fee"
              value={`₦${String(mergedData.securityDeposit || "0")}`}
            />
          )}
          {!!mergedData.cleaningFee && (
            <SummaryRow
              label="Cleaning Fee"
              value={`₦${String(mergedData.cleaningFee || "0")}`}
            />
          )}

          {/* Refund Policy Summary */}
          {mergedData.intent?.toLowerCase() !== "sale" && (
            <SummaryRow
              label="Refund Policy"
              value={mergedData.acceptRefund !== false ? "Standard (Refundable)" : "No Refund (Immediate Credit)"}
            />
          )}

          {/* New Description Section */}
          <View style={{ marginTop: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: "#F5F5F5" }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#000", marginBottom: 8 }}>
              Property Description
            </Text>
            <Text style={{ fontSize: 14, color: "#4B5563", lineHeight: 20 }}>
              {mergedData.propertyHighlight || mergedData.description || "No description provided."}
            </Text>
          </View>


          {/* Breakdown for Rentals */}
          {mergedData.intent?.toLowerCase() !== "sale" && mergedData.price && (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: "#EEE",
                marginTop: 8,
                paddingTop: 8,
              }}
            >
              <SummaryRow
                label="App Charge (3%)"
                value={`-₦${(() => {
                  const pNum =
                    parseFloat(
                      String(mergedData.price || "0").replace(/,/g, ""),
                    ) || 0;
                  const sDep =
                    parseFloat(
                      String(mergedData.securityDeposit || "0").replace(
                        /,/g,
                        "",
                      ),
                    ) || 0;
                  const sCh =
                    parseFloat(
                      String(mergedData.serviceCharge || "0").replace(/,/g, ""),
                    ) || 0;
                  const total = pNum + sDep + sCh;
                  return Math.round(total * 0.03).toLocaleString("en-NG");
                })()}`}
              />
              <SummaryRow
                label="VAT (7.5% of App Charge)"
                value={`-₦${(() => {
                  const pNum =
                    parseFloat(
                      String(mergedData.price || "0").replace(/,/g, ""),
                    ) || 0;
                  const sDep =
                    parseFloat(
                      String(mergedData.securityDeposit || "0").replace(
                        /,/g,
                        "",
                      ),
                    ) || 0;
                  const sCh =
                    parseFloat(
                      String(mergedData.serviceCharge || "0").replace(/,/g, ""),
                    ) || 0;
                  const total = pNum + sDep + sCh;
                  const charge = total * 0.03;
                  return Math.round(charge * 0.075).toLocaleString("en-NG");
                })()}`}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 4,
                }}
              >
                <Text
                  style={[
                    styles.summaryLabel,
                    { fontWeight: "700", color: "#000" },
                  ]}
                >
                  Estimated Net Earnings
                </Text>
                <Text
                  style={[
                    styles.summaryValue,
                    { fontWeight: "700", color: "#22C55E" },
                  ]}
                >
                  ₦
                  {(() => {
                    const pNum =
                      parseFloat(
                        String(mergedData.price || "0").replace(/,/g, ""),
                      ) || 0;
                    const sDep =
                      parseFloat(
                        String(mergedData.securityDeposit || "0").replace(
                          /,/g,
                          "",
                        ),
                      ) || 0;
                    const sCh =
                      parseFloat(
                        String(mergedData.serviceCharge || "0").replace(
                          /,/g,
                          "",
                        ),
                      ) || 0;
                    const total = pNum + sDep + sCh;
                    const charge = total * 0.03;
                    const vat = charge * 0.075;
                    return Math.round(total - charge - vat).toLocaleString(
                      "en-NG",
                    );
                  })()}
                </Text>
              </View>
            </View>
          )}
        </View>


        {/* Availability */}
        <View style={styles.section}>
          <Text style={styles.subsectionTitle}>Availability & Check-in</Text>
          <SummaryRow
            label="Available Now"
            value={
              mergedData.availableNow === true ||
              mergedData.availableNow === "true"
                ? "Yes"
                : "No"
            }
          />
          <SummaryRow
            label="Instant Booking"
            value={
              mergedData.instantBooking === true ||
              mergedData.instantBooking === "true"
                ? "Enabled"
                : "Disabled"
            }
          />
          {!!mergedData.checkInTime && (
            <SummaryRow
              label="Check-in Time"
              value={String(formatTime(mergedData.checkInTime) || "Not set")}
            />
          )}
          {!!mergedData.checkOutTime && (
            <SummaryRow
              label="Check-out Time"
              value={String(formatTime(mergedData.checkOutTime) || "Not set")}
            />
          )}
        </View>

        {/* House Rules & Regulations */}
        {!!(mergedData.houseRules || mergedData.additionalRules) && (
          <View style={styles.section}>
            <Text style={styles.subsectionTitle}>
              House Rules & Regulations
            </Text>

            {/* Standard House Rules */}
            {!!mergedData.houseRules && (
              <View style={styles.rulesContainer}>
                {convertHouseRulesToLabels(mergedData.houseRules)
                  .filter(Boolean) // Ensure no null/undefined values
                  .map((rule, index) => (
                    <View key={index} style={styles.ruleItem}>
                      <View style={styles.ruleDot} />
                      <Text style={styles.ruleText}>{String(rule || "")}</Text>
                    </View>
                  ))}
              </View>
            )}

            {/* Additional Rules */}
            {!!mergedData.additionalRules && (
              <View style={styles.additionalRulesContainer}>
                <Text style={styles.additionalRulesLabel}>
                  Additional Rules:
                </Text>
                <Text style={styles.additionalRulesText}>
                  {String(mergedData.additionalRules || "")}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Host Profile Info - REAL DATA */}
        <View style={styles.section}>
          <Text style={styles.subsectionTitle}>Host Information</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#F3F4F6", overflow: "hidden", marginRight: 12 }}>
              {hostStats.avatar ? (
                <Image source={{ uri: getHostAvatarUrl(hostStats.avatar) }} style={{ width: "100%", height: "100%" }} />
              ) : (
                <View style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 18, color: "#9CA3AF" }}>{hostStats.fullName?.charAt(0) || "H"}</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937" }}>{hostStats.fullName}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                <Star size={14} color="#FDB913" fill="#FDB913" />
                <Text style={{ fontSize: 13, color: "#4B5563", marginLeft: 4 }}>
                  {Number(hostStats.rating || 0).toFixed(1)} ({hostStats.reviews} reviews)
                </Text>
                <Text style={{ fontSize: 13, color: "#9CA3AF", marginHorizontal: 8 }}>•</Text>
                <Text style={{ fontSize: 13, color: "#4B5563" }}>
                  {hostStats.totalListings} Listings
                </Text>
              </View>
            </View>
          </View>
        </View>


        {/* Terms & Agreement */}
        <View style={styles.section}>
          <Text style={styles.subsectionTitle}>Terms & Agreement</Text>
          <View style={[
            styles.termsBanner, 
            !mergedData.termsAgreed && styles.termsBannerWarning
          ]}>
            <AlertCircle size={20} color={mergedData.termsAgreed ? "#16A34A" : "#DC2626"} />
            <Text style={[
              styles.termsBannerText,
              !mergedData.termsAgreed && styles.termsBannerTextWarning
            ]}>
              {mergedData.termsAgreed 
                ? "You have agreed to our Terms & Conditions" 
                : "You MUST agree to the terms to proceed"}
            </Text>
          </View>
          <SummaryRow
            label="Legal Consent"
            value={mergedData.termsAgreed ? "Yes" : "No"}
          />
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <Pressable
          style={styles.backButton}
          onPress={handleBack}
          disabled={isSubmitting}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Pressable
          style={[
            styles.submitButton,
            (isSubmitting || !mergedData.termsAgreed) && styles.submitButtonDisabled,
          ]}
          onPress={() => {
            if (!mergedData.termsAgreed) {
                toastService.showWarning("Please agree to the terms and conditions first.");
                return;
            }
            handleSubmit();
          }}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditing ? "Update Listing" : "Submit Listing"}
            </Text>
          )}
        </Pressable>
      </View>

      {/* Cancel Confirmation Modal */}
      <CancelConfirmationModal
        visible={showCancelModal}
        onConfirm={handleCancelConfirm}
        onDismiss={handleCancelDismiss}
      />

      {/* Submit Confirmation Modal */}
      <SubmitConfirmationModal
        visible={showSubmitModal}
        onConfirm={handleSubmitConfirmed}
        onDismiss={() => setShowSubmitModal(false)}
      />

      {/* Save As New Fallback Modal */}
      <Modal
          transparent
          visible={showSaveAsNewModal}
          animationType="fade"
          onRequestClose={() => !isFallbackCreating && setShowSaveAsNewModal(false)}
      >
          <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                  <View style={styles.modalIconContainer}>
                      <AlertCircle size={50} color="#F59E0B" strokeWidth={1.5} />
                  </View>
                  
                  <Text style={styles.modalTitle}>Listing Record Missing</Text>
                  <Text style={styles.modalMessage}>
                      We couldn't find the original listing record to update. Your listing might have been removed or moved. 
                      {"\n\n"}
                      Would you like to save this as a NEW listing instead?
                  </Text>
                  
                  <View style={styles.modalActionButtons}>
                      <TouchableOpacity 
                          style={[styles.modalButton, styles.cancelButton]}
                          onPress={() => setShowSaveAsNewModal(false)}
                          disabled={isFallbackCreating}
                      >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                          style={[styles.modalButton, styles.confirmButton]}
                          onPress={handleSaveAsNewFallback}
                          disabled={isFallbackCreating}
                      >
                          {isFallbackCreating ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                              <Text style={styles.confirmButtonText}>Save as New</Text>
                          )}
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>

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
    paddingBottom: 20,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",

    color: "#000000",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: "400",

    color: "#666666",
    lineHeight: 20,
    marginBottom: 20,
  },
  propertyTitleContainer: {
    backgroundColor: "#F0F7FF",
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#0E2F5D",
    marginBottom: 4,
  },
  propertyTitleLabel: {
    fontSize: 12,
    fontWeight: "600",

    color: "#666666",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  propertyTitleText: {
    fontSize: 22,
    fontWeight: "700",

    color: "#0E2F5D",
    lineHeight: 28,
  },
  section: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "700",

    color: "#000000",
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "500",

    color: "#666666",
    flex: 1,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",

    color: "#000000",
    flex: 1,
    textAlign: "right",
  },
  amenitiesList: {
    fontSize: 14,
    fontWeight: "400",

    color: "#292929",
    lineHeight: 20,
  },
  amenitiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  amenityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F0F7FF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E8F0",
    marginBottom: 4,
  },
  amenityText: {
    fontSize: 13,
    fontWeight: "500",

    color: "#292929",
  },
  descriptionContainer: {
    marginTop: 12,
    gap: 8,
  },
  descriptionText: {
    fontSize: 14,
    fontWeight: "400",

    color: "#666666",
    lineHeight: 20,
  },
  landmarksContainer: {
    marginTop: 8,
    gap: 6,
  },
  landmarksLabel: {
    fontSize: 14,
    fontWeight: "500",

    color: "#666666",
    marginBottom: 4,
  },
  landmarkItem: {
    fontSize: 16,
    fontWeight: "400",

    color: "#000000",
    paddingLeft: 8,
    lineHeight: 22,
  },
  photoPreview: {
    marginTop: 8,
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 12,
  },
  rulesContainer: {
    gap: 8,
    marginTop: 8,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  ruleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#010135",
  },
  ruleText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#292929",
    flex: 1,
    lineHeight: 20,
  },
  additionalRulesContainer: {
    marginTop: 12,
    gap: 8,
  },
  additionalRulesLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666666",
  },
  additionalRulesText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#292929",
    lineHeight: 20,
    fontStyle: "italic",
  },
  tosContainer: {
    gap: 25,
    marginTop: 25,
  },
  tosItem: {
    paddingHorizontal: 10,
    alignItems: "center",
  },
  tosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    gap: 20,
  },
  tosLabel: {
    fontSize: 14,
    fontWeight: "700",

    color: "#000000",
  },
  previewButton: {
    width: 69,
    borderRadius: 5,
    backgroundColor: "#6371F1",
    paddingVertical: 3,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  previewButtonText: {
    fontSize: 12,
    fontWeight: "500",

    color: "#FFFFFF",
  },
  agreementContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 15,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: "#888888",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },
  agreementText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",

    color: "#FD3131",
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
  submitButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#010135",
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#6B7280",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",

    color: "#FFFFFF",
  },
  termsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginBottom: 10,
  },
  termsBannerWarning: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  termsBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
    flex: 1,
  },
  termsBannerTextWarning: {
    color: '#DC2626',
  },
  videoPreviewWrapper: {
    width: 120,
    height: 120,
    marginRight: 12,
  },
  videoPlaceholder: {
    backgroundColor: "#F0F4FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderStyle: "dashed",
    gap: 8,
  },
  videoPlaceholderText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#010135",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  modalActionButtons: {
    width: "100%",
    gap: 12,
  },
  modalButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButton: {
    backgroundColor: "#6371F1",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4B5563",
  },
});

export default Review;
