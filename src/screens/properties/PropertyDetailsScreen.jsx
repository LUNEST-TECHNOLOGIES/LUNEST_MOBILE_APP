import { 
  ArrowLeft, 
  ArrowRight, 
  Share2, 
  ShieldCheck, 
  Star, 
  Clock, 
  Info, 
  Heart, 
  ChevronRight, 
  MapPin, 
  PlayCircle, 
  Video, 
  Navigation, 
  Phone, 
  MessageSquare, 
  Copy, 
  CheckCircle2, 
  X,
  ChevronLeft
} from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert, // Added Alert
  Linking, // Added Linking
  Modal,
  Platform,
  Pressable,
  RefreshControl, // Renamed to avoid conflict
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { MapView, Marker, PROVIDER_GOOGLE } from "../../components/MapViewWrapper";
import ImageViewerModal from "../../components/modals/ImageViewerModal";
import ReviewFeedbackModal from "../../components/modals/ReviewFeedbackModal";
import VerifiedInfoOverlay from "../../components/modals/VerifiedInfoOverlay";
import PropertyDetailsSkeleton from "../../components/skeletons/PropertyDetailsSkeleton";
import SkeletonPlaceholder from "../../components/skeletons/SkeletonPlaceholder";
import ToastNotification, { TOAST_TYPE } from "../../components/common/ToastNotification";
import { useProgressiveLoading } from "../../hooks/useDelayedLoading";
import authService from "../../services/authService";
import bookingService from "../../services/bookingService";
import bookmarkService from "../../services/bookmarkService";
import configService from "../../services/configService";
import { fetchHostData } from "../../services/hostService";
import listingService from "../../services/listingService";
import locationService from "../../services/locationService";
import profileService from "../../services/profileService";
import { getAmenityIcon } from "../../utils/amenityIcons";
import { formatCurrency } from "../../utils/currency";
import { resolveImageUrlSync } from "../../utils/imageUtils";
import ShieldTickIcon from "../../assets/icons/shield-tick.svg";
import StarIcon from "../../assets/icons/star.svg";
import ArrowLeftIcon from "../../assets/icons/arrow-left.svg";
import CircleInfo2Icon from "../../assets/icons/circle-info2.svg";

// House rules ID to label mapping (aligned with availability.jsx HOUSE_RULES)
const HOUSE_RULES_MAP = {
  no_smoking: "No Smoking",
  no_pets: "No Pets",
  no_parties: "No Parties",
  quiet_hours: "Quiet Hours",
  no_unregistered: "No Unregistered Guests",
  no_shoes: "No Shoes Inside",
  no_cooking: "No Cooking",
  recycling: "Recycling Required",
};

/**
 * Formats a string to Title Case.
 * Handles custom_ prefix, underscores, and extra whitespace.
 */
const toTitleCase = (str) => {
  if (!str) return "";
  const cleaned = String(str)
    .replace(/^custom_/, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";

  return cleaned
    .split(" ")
    .map((word) => {
      if (!word) return "";
      // Keep purely numeric strings as they are
      if (/^\d+$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

/**
 * Masks a guest name for privacy.
 * "John Doe" -> "Jo***"
 * "Li" -> "L***"
 */
const maskGuestName = (fullName) => {
  if (!fullName) return "G***";
  const nameParts = fullName.split(" ");
  const firstName = nameParts[0];
  if (firstName.length <= 2) return firstName.charAt(0) + "***";
  return firstName.substring(0, 2) + "***";
};

/**
 * Formats a review timestamp to a friendly Date + Time string
 */
const formatReviewDate = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  const datePart = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${datePart} at ${timePart}`;
};

// Helper function to convert house rule IDs to readable labels
const convertHouseRulesToLabels = (rules) => {
  if (!rules || rules === "0" || rules === 0) return [];

  if (typeof rules === "object" && !Array.isArray(rules)) {
    // Handle object format: { no_smoking: true, no_pets: false, ... }
    return Object.entries(rules)
      .filter(([_, enabled]) => enabled)
      .map(([ruleId, _]) => {
        if (!ruleId || ruleId === null || ruleId === undefined) return null;
        const stringId = String(ruleId);
        return HOUSE_RULES_MAP[stringId] || toTitleCase(stringId);
      })
      .filter(Boolean);
  }

  if (typeof rules === "string") {
    // Check if it's a JSON string
    try {
      const parsed = JSON.parse(rules);
      if (typeof parsed === "object") {
        return convertHouseRulesToLabels(parsed);
      }
      if (Array.isArray(parsed)) {
        return convertHouseRulesToLabels(parsed);
      }
      // If it's a plain string, return as is (ignore "0")
      return rules === "0" ? [] : [rules];
    } catch {
      // Not JSON, check for comma-separated or newline-separated
      if (rules.includes(",")) {
        const splitRules = rules
          .split(",")
          .map((rule) => rule.trim())
          .filter((rule) => rule && rule !== "0");
        // Check if these are numeric indices (0,1,2,3...)
        if (splitRules.every((rule) => /^\d+$/.test(rule))) {
          const ruleIds = Object.keys(HOUSE_RULES_MAP);
          return splitRules
            .map((indexStr) => {
              const index = parseInt(indexStr);
              if (ruleIds[index]) {
                return HOUSE_RULES_MAP[ruleIds[index]];
              }
              return null; // Ignore invalid indices
            })
            .filter(Boolean);
        }
        return splitRules.map(toTitleCase);
      }
      return rules === "0"
        ? []
        : rules
            .split("\n")
            .map(toTitleCase)
            .filter((rule) => rule.trim() && rule !== "0");
    }
  }

  if (Array.isArray(rules)) {
    return rules
      .map((rule) => {
        // Handle null/undefined
        if (rule === null || rule === undefined) return null;

        const stringRule = String(rule);

        // If it's a number or numeric string (0,1,2,3...), map to rule by index
        if (typeof rule === "number" || /^\d+$/.test(stringRule)) {
          const ruleIds = Object.keys(HOUSE_RULES_MAP);
          const index = parseInt(rule);
          if (ruleIds[index]) {
            return HOUSE_RULES_MAP[ruleIds[index]];
          }
          return null; // Ignore "0" or invalid indices
        }

        // Try to map by rule ID
        if (HOUSE_RULES_MAP[stringRule]) {
          return HOUSE_RULES_MAP[stringRule];
        }

        // Fallback: Title Case the string
        return toTitleCase(stringRule);
      })
      .filter(Boolean);
  }

  return [String(rules)];
};

// Helper function to extract and format amenity value
const formatAmenity = (amenity) => {
  if (!amenity) return "";

  let text = "";
  if (typeof amenity === "object") {
    text =
      amenity.value || amenity.label || amenity.name || JSON.stringify(amenity);
  } else {
    text = String(amenity);
  }

  // Handle nested JSON strings
  if (text.trim().startsWith("{") && text.trim().endsWith("}")) {
    try {
      const parsed = JSON.parse(text);
      return formatAmenity(parsed);
    } catch (e) {}
  }

  return toTitleCase(text);
};

const PropertyDetailsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const listingId =
    typeof params.listingId === "string"
      ? params.listingId
      : Array.isArray(params.listingId)
        ? params.listingId[0]
        : null;
  const { width: screenWidth } = useWindowDimensions();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkId, setBookmarkId] = useState(null);
  const [isHeaderFixed, setIsHeaderFixed] = useState(false);
  const [showVerifiedInfo, setShowVerifiedInfo] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [viewerImages, setViewerImages] = useState([]); // Added viewerImages
  const [baseURL, setBaseURL] = useState("");
  const [imageErrors, setImageErrors] = useState({});
  const queryClient = useQueryClient();

  // Toast Notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState(TOAST_TYPE.SUCCESS);

  const showToast = (message, type = TOAST_TYPE.SUCCESS) => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  // ── Data Fetching (React Query) ──
  const {
    data: listing,
    isLoading: loading,
    isRefetching: refreshing,
    error: queryError,
    refetch: handleRefresh,
  } = useQuery({
    queryKey: ["listing", listingId],
    staleTime: 0, // Ensure we always fetch fresh data on navigation
    refetchOnMount: true,
    queryFn: async () => {
      console.log(`[PropertyDetailsScreen] Fetching listing: ${listingId}`);
      
      if (!listingId) {
        console.error("[PropertyDetailsScreen] No listingId provided!");
        throw new Error("No listing ID provided");
      }
      
      const result = await listingService.fetchListingById(listingId);
      console.log("[PropertyDetailsScreen] API Result:", {
        hasResult: !!result,
        success: result?.success,
        hasListing: !!result?.listing,
        hasBody: !!result?.body,
        hasId: !!result?._id,
        keys: result ? Object.keys(result) : [],
      });
      
      // The service returns the listing object directly or in .body
      if (result && result.success) {
        const listingData = result.listing || result.body;
        console.log("[PropertyDetailsScreen] Extracted listing data:", {
          id: listingData?._id || listingData?.id,
          hasPropertyImages: !!listingData?.propertyImages?.length,
          propertyImagesCount: listingData?.propertyImages?.length || 0,
          hasImages: !!listingData?.images?.length,
          imagesCount: listingData?.images?.length || 0,
        });
        // Invalidate recently-viewed and bookmarks queries to keep SavedScreen in sync
        queryClient.invalidateQueries({ queryKey: ["recently-viewed"] });
        queryClient.invalidateQueries({ queryKey: ["bookmarks"] });

        return listingData;
      }
      if (result && result._id) {
        console.log("[PropertyDetailsScreen] Using result directly as listing");
        return result;
      }
      
      console.error("[PropertyDetailsScreen] Failed to load listing:", result?.message);
      throw new Error(result?.message || "Failed to load listing");
    },
    enabled: !!listingId,
    staleTime: 0, // Always fetch fresh data
  });

  // Simplified error state
  const error = queryError ? queryError.message : null;

  // Helper function to convert image URLs to full URLs
  const convertImageUrl = (image) => {
    if (!image) return null;
    let path = typeof image === "object" ? image.url || image.uri : image;
    // Use the state-populated baseURL if available, otherwise fallback to sync
    const urlToUse = baseURL || configService.getBaseURLSync();
    
    // Debug logging for review images
    if (path && path.includes('/uploads/')) {
      console.log('[PropertyDetailsScreen] convertImageUrl:', {
        path: path?.substring(0, 50),
        baseURL: baseURL || 'null',
        fallbackUrl: configService.getBaseURLSync() || 'null',
        urlToUse: urlToUse || 'null',
      });
    }
    
    return resolveImageUrlSync(path, urlToUse);
  };

  // Parse review images robustly (handles JSON strings and arrays)
  const parseImages = (imagesData) => {
    if (!imagesData) return [];
    if (Array.isArray(imagesData)) return imagesData.filter((img) => !!img);
    if (typeof imagesData === "string" && imagesData.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(imagesData);
        return Array.isArray(parsed) ? parsed.filter((img) => !!img) : [];
      } catch (e) {
        return [imagesData];
      }
    }
    if (typeof imagesData === "string" && imagesData.length > 0)
      return [imagesData];
    return [];
  };

  const handleImageError = (index) => {
    setImageErrors((prev) => ({ ...prev, [index]: true }));
  };

  const [geocodedCoords, setGeocodedCoords] = useState(null);
  const [hostCurrentAvatar, setHostCurrentAvatar] = useState(null);
  const [hostCurrentRating, setHostCurrentRating] = useState(null);
  const [hostTotalListings, setHostTotalListings] = useState(1);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewImages, setReviewImages] = useState([]); // Added reviewImages
  const [isUploadingImages, setIsUploadingImages] = useState(false); // Added isUploadingImages
  const [userHasBooked, setUserHasBooked] = useState(false);
  const [isPostingReview, setIsPostingReview] = useState(false);
  const [listingReviews, setListingReviews] = useState([]);
  const [showMapModal, setShowMapModal] = useState(false);
  const imageScrollRef = useRef(null);
  const scrollViewRef = useRef(null);
  const insets = useSafeAreaInsets();

  // Get base URL for image conversion
  useEffect(() => {
    configService.getBaseURL().then(setBaseURL);
  }, []);


  useEffect(() => {
    if (!listingId || !listing) return;

    const fetchExtraData = async () => {
      try {
        // Fetch listing reviews
        const reviewsResult = await bookingService.fetchListingReviews(listingId);
        if (reviewsResult.success) {
          setListingReviews(reviewsResult.reviews);
        }

        // Fetch host avatar
        const hostId = listing.hostInfo?._id || listing.host?._id;
        if (hostId) {
          const hostResult = await fetchHostData(hostId);
          if (hostResult.success && hostResult.avatar) {
            setHostCurrentAvatar(hostResult.avatar);
          }
          if (hostResult.success && hostResult.hostData?.hostRating) {
            setHostCurrentRating(hostResult.hostData.hostRating);
          }

          // Fetch host listings count
          const listingsResult = await listingService.fetchAllListings({
            host: hostId,
            status: { $in: ["AVAILABLE", "BOOKED", "PENDING"] },
          });
          if (listingsResult?.success && Array.isArray(listingsResult.listings)) {
            setHostTotalListings(listingsResult.listings.length);
          }
        }
      } catch (err) {
        console.warn("[PropertyDetailsScreen] Error fetching extra data:", err);
      }
    };

    fetchExtraData();
  }, [listingId, listing]);

  // Check if current user has booked this property and status is COMPLETED and HAS NOT REVIEWED YET
  useEffect(() => {
    const checkBookingStatus = async () => {
      try {
        const currentUser = await authService.fetchProfile();
        if (currentUser && currentUser.success && currentUser.data?._id) {
          const myBookingsRes = await bookingService.fetchGuestBookings();
          if (myBookingsRes.success && myBookingsRes.bookings) {
            const completedBooking = myBookingsRes.bookings.find(
              (b) =>
                (b.listing?._id === listingId || b.listing === listingId) &&
                b.status === "COMPLETED"
            );
            setUserHasBooked(!!completedBooking);
          }
        }
      } catch (error) {
        console.log("[PropertyDetails] Error checking booking status:", error);
      }
    };

    if (listingId) {
      checkBookingStatus();
    }
  }, [listingId]);

  // Check if current property is bookmarked by the user
  useEffect(() => {
    const checkBookmarkStatus = async () => {
      if (!listingId) return;
      try {
        const result = await bookmarkService.isListingBookmarked(listingId);
        if (result) {
          setIsBookmarked(result.isBookmarked);
          setBookmarkId(result.bookmarkId);
        }
      } catch (err) {
        console.warn("[PropertyDetails] Error checking bookmark status:", err);
      }
    };

    checkBookmarkStatus();
  }, [listingId]);

  const pickReviewImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.7,
        selectionLimit: 5,
      });

      if (!result.canceled) {
        setReviewImages((prev) =>
          [...prev, ...result.assets.map((asset) => asset.uri)].slice(0, 5),
        );
      }
    } catch (error) {
      console.error("[PropertyDetails] Error picking images:", error);
      showToast("Failed to pick images", TOAST_TYPE.ERROR);
    }
  };

  const removeReviewImage = (index) => {
    setReviewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePostReview = async (reviewData) => {
    setIsPostingReview(true);
    try {
      let uploadedImageUrls = [];

      // 1. Upload images if any
      if (reviewData.images && reviewData.images.length > 0) {
        setIsUploadingImages(true);
        const uploadResult = await bookingService.uploadReviewImages(
          reviewData.images,
        );
        setIsUploadingImages(false);

        if (uploadResult.success && uploadResult.images) {
          // Filter out any invalid URLs that contain "undefined"
          uploadedImageUrls = uploadResult.images.filter(
            (url) => url && typeof url === "string" && !url.includes("undefined")
          );
          console.log("[PropertyDetailsScreen] Uploaded review images:", uploadedImageUrls);
        } else {
          showToast("Could not upload review images. Submission may continue without them.", TOAST_TYPE.WARNING);
        }
      }

      // 2. Find a COMPLETED booking for this listing to associate the review with
      const guestBookings = await bookingService.fetchGuestBookings({
        listing: listingId,
        status: ["COMPLETED", "CHECKED_OUT", "PAST"],
      });

      const activeBookingToReview =
        guestBookings.success &&
        guestBookings.bookings &&
        guestBookings.bookings[0];

      if (!activeBookingToReview) {
        showToast("No completed booking found to review.", TOAST_TYPE.ERROR);
        setIsPostingReview(false);
        return;
      }

      const bookingIdToReview = activeBookingToReview._id;

      // 3. Submit review
      const result = await bookingService.submitReview(
        bookingIdToReview,
        reviewData.rating,
        reviewData.feedback,
        uploadedImageUrls,
      );

      if (result.success) {
        showToast("Your review has been posted. Thank you!");
        setShowReviewModal(false);
        setReviewRating(0);
        setIsPostingReview(false);
        
        // Refresh listing data to show new rating/review
        queryClient.invalidateQueries(["listing", listingId]);
        queryClient.invalidateQueries(["listings"]); // Invalidate the home screen list
        handleRefresh(); // Force local refetch
      } else {
        showToast(result.message || "Failed to post review", TOAST_TYPE.ERROR);
        setIsPostingReview(false);
      }
    } catch (error) {
      console.error("Error posting review:", error);
      showToast("An error occurred while posting your review.", TOAST_TYPE.ERROR);
      setIsPostingReview(false);
    }
  };

  // Fetch listing data on mount
  // Removed manual loadListingData call - managed by useQuery

  // Geocode address if no coordinates available
  useEffect(() => {
    const geocodeListingAddress = async () => {
      if (!listing) return;

      // Check if we already have coordinates
      const hasCoordinates =
        (listing.propertyLocation?.latitude && listing.propertyLocation?.longitude) ||
        (listing.latitude && listing.longitude);

      if (hasCoordinates) {
        return; // Already have coordinates, no need to geocode
      }

      // Get address to geocode
      const address =
        listing.propertyLocation?.fullAddress ||
        listing.location ||
        (listing.city && listing.state ? `${listing.city}, ${listing.state}` : null);

      if (!address) {
        console.log("[PropertyDetailsScreen] No address available to geocode");
        return;
      }

      try {
        console.log("[PropertyDetailsScreen] Geocoding address:", address);
        
        // Add a safety timeout for the geocoding request
        const geocodePromise = locationService.getCoordinatesFromAddress(address);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Geocoding timeout")), 8000)
        );

        const coords = await Promise.race([geocodePromise, timeoutPromise]);
        
        if (coords && coords.latitude && coords.longitude) {
          console.log("[PropertyDetailsScreen] Geocoded coordinates:", coords);
          setGeocodedCoords(coords);
        } else {
          console.warn("[PropertyDetailsScreen] Geocoding returned no coordinates");
          // Set a flag or special value to indicate geocoding finished but failed
          setGeocodedCoords({ latitude: null, longitude: null, failed: true });
        }
      } catch (error) {
        console.warn("[PropertyDetailsScreen] Error geocoding address:", error.message);
        setGeocodedCoords({ latitude: null, longitude: null, failed: true });
      }
    };

    geocodeListingAddress();
  }, [listing]);

  const onRefresh = () => {
    handleRefresh();
  };

  const handleToggleBookmark = async () => {
    try {
      console.log("[PropertyDetailsScreen] Toggling bookmark:", {
        listingId,
        currentState: isBookmarked,
        bookmarkId,
      });

      const result = await bookmarkService.toggleBookmark(
        listingId,
        isBookmarked,
        bookmarkId,
      );

      if (result.success) {
        const newStatus = !isBookmarked;
        setIsBookmarked(newStatus);
        
        if (result.action === "added") {
          showToast("Added to your saved properties");
          // Fetch the new bookmark to get its ID
          const bookmarkStatus =
            await bookmarkService.isListingBookmarked(listingId);
          setBookmarkId(bookmarkStatus.bookmarkId);
        } else {
          showToast("Removed from saved properties", TOAST_TYPE.INFO);
          setBookmarkId(null);
        }
      }
    } catch (error) {
      console.error("[PropertyDetailsScreen] Error toggling bookmark:", error);
    }
  };

  // Helper function to format price with commas
  const formatPrice = (price) => {
    if (!price) return "₦0.00";
    const num = typeof price === "number" ? price : parseFloat(price);
    if (isNaN(num)) return "₦0.00";
    return formatCurrency(num);
  };

  // Transform API listing data (must handle null listing for useMemo safety)
  const propertyImages = useMemo(() => {
    if (!listing) {
      return [
        {
          uri: require("../../assets/images/no-image.png"),
          type: "image",
        },
      ];
    }
    
    // Robust image field detection
    const rawImages = listing.propertyImages || listing.images || listing.photos || (listing.image ? [listing.image] : []);
    
    const processedImages = Array.isArray(rawImages) 
      ? rawImages
          .map((img) => {
            try {
              if (!img) return null;
              const url = convertImageUrl(img);
              return url ? { uri: url, type: "image" } : null;
            } catch (err) {
              return null;
            }
          })
          .filter(Boolean)
      : [];
    
    return processedImages.length > 0 ? processedImages : [
      {
        uri: require("../../assets/images/no-image.png"),
        type: "image",
      },
    ];
  }, [listing, baseURL]); // Added baseURL to dependencies as it impacts resolution

  const propertyVideos = useMemo(() => {
    if (!listing) return [];
    return (listing?.propertyVideos || listing?.videos || [])
      .map((v) => {
        let url = typeof v === "string" ? v : v?.url;
        url = convertImageUrl(url);
        return url ? { uri: url, type: "video" } : null;
      })
      .filter(Boolean);
  }, [listing, baseURL]);

  const propertyMedia = useMemo(
    () => [...propertyImages, ...propertyVideos],
    [propertyImages, propertyVideos],
  );

  const propertyData = useMemo(() => {
    if (!listing) {
      return {
        id: listingId,
        title: "",
        images: [],
        amenities: [],
        features: [],
        regulations: [],
        landmarks: [],
        host: {
          name: "Host",
          avatar: hostCurrentAvatar,
          hostRating: hostCurrentRating || null,
          totalListings: hostTotalListings || 1,
          isVerified: false,
          userType: "HOST",
          email: "",
          phone: "",
          hostApplicationStatus: null,
        },
        latitude: null,
        longitude: null,
      };
    }
    return {
      id: listing._id || listing.id,
      _id: listing._id || listing.id,
      title: listing.propertyTitle || listing.propertyName || "",
      address: listing.address || listing.propertyLocation?.fullAddress || "",
      propertyType: listing.propertyType || "Apartment",
      location: (() => {
            const city = listing.city || listing.propertyLocation?.city;
            const state = listing.state || listing.propertyLocation?.state;
            if (city && state) {
              return `${city}, ${state}`;
            } else if (city) {
              return city;
            } else if (state) {
              return state;
            } else {
              return listing.location || listing.propertyLocation?.fullAddress || "Nigeria";
            }
          })(),
      images: propertyImages,
      available: listing.status === "ACTIVE" || listing.status === "AVAILABLE",
      isBooked: listing.status === "BOOKED",
      isPaused: listing.status === "PAUSED",
      isUnavailable: listing.status === "BOOKED" || listing.status === "PAUSED",
      status: listing.status,
      bookedUntil: listing.bookedUntil || listing.bookingExpiryDate,
      price: formatCurrency(listing.propertyPrice?.amount || listing.propertyPrice?.price || listing.price || 0),
      priceType: `per ${listing.pricingPeriod || "night"}`,
      rentalType: (() => {
        if (listing.intent === "SELL") return "For Sale";
        const period = listing.pricingPeriod || "night";
        const map = {
          night: "Daily Rental",
          day: "Daily Rental",
          week: "Weekly Rental",
          month: "Monthly Rental",
          year: "Annual Rental",
        };
        return map[period.toLowerCase()] || "Daily Rental";
      })(),
      priceNote: "Additional fees may apply",
      description: listing.description || listing.propertyHighlight || "",
      features: [
        {
          label: `${listing.bedrooms || 0} Bedroom${listing.bedrooms !== 1 ? "s" : ""}`,
          icon: "bed"
        },
        ...(listing.guests > 0 ? [
          {
            label: `${listing.guests} Guest${listing.guests !== 1 ? "s" : ""}`,
            icon: "people"
          },
        ] : []),
        {
          label: `${listing.bathrooms || 0} Bathroom${listing.bathrooms !== 1 ? "s" : ""}`,
          icon: "water"
        },
        ...(listing.furnishing
          ? [
              {
                label: String(listing.furnishing)
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase()),
                icon: "home"
              },
            ]
          : []),
        { 
          label: listing.instantBooking ? "Instant Booking" : "Contact Host",
          icon: "flash"
        },
      ],
      amenities: (Array.isArray(listing.amenities)
        ? listing.amenities
        : []
      ).map(formatAmenity),
      regulations: (() => {
        const houseRulesLabels = convertHouseRulesToLabels(listing.houseRules);
        const additionalRulesArray = listing.additionalRules
          ? typeof listing.additionalRules === "string"
            ? listing.additionalRules
                .split(/[,\n]/)
                .map((r) => r.trim())
                .filter(Boolean)
            : Array.isArray(listing.additionalRules)
              ? listing.additionalRules
                  .map((r) => String(r || "").trim())
                  .filter(Boolean)
              : [String(listing.additionalRules)]
          : [];

        const regulationsArray = Array.isArray(listing.regulations)
          ? listing.regulations
              .map((r) => String(r || "").trim())
              .filter(Boolean)
          : [];

        const allRules = [
          ...houseRulesLabels,
          ...additionalRulesArray,
          ...regulationsArray,
        ];
        return [...new Set(allRules)].filter((r) => r && r.trim());
      })(),
      latitude: (() => {
        const lat = listing.propertyLocation?.latitude || listing.latitude || geocodedCoords?.latitude;
        return lat != null ? Number(lat) : null;
      })(),
      longitude: (() => {
        const lon = listing.propertyLocation?.longitude || listing.longitude || geocodedCoords?.longitude;
        return lon != null ? Number(lon) : null;
      })(),
      landmarks: (() => {
        const lms = listing.landmarks || listing.propertyLandmarks;
        if (!lms) return [];
        if (Array.isArray(lms)) return lms.filter(Boolean);
        if (typeof lms === "string") {
          try {
            const parsed = JSON.parse(lms);
            return Array.isArray(parsed) ? parsed.filter(Boolean) : [lms];
          } catch (e) {
            return lms.split(",").map((l) => l.trim()).filter(Boolean);
          }
        }
        return [];
      })(),
      // Rating fields
      rating: listing.averageRating || null,
      ratingCount: listing.ratingCount || 0,
      checkInTime: listing.checkInTime || "Not specified",
      checkOutTime: listing.checkOutTime || "Not specified",
      host: {
        name: listing.host?.fullName || listing.hostInfo?.fullName || "Host",
        email: listing.host?.email || listing.hostInfo?.email || "",
        phone: listing.hostInfo?.phone || listing.host?.phone || "",
        avatar:
          hostCurrentAvatar || require("../../assets/images/prop_image.png"),
        hostRating: hostCurrentRating || null,
        totalListings: hostTotalListings || 1,
        rating: hostCurrentRating || null,
        isVerified:
          listing.hostInfo?.hostApplicationStatus === "APPROVED" || 
          listing.host?.hostApplicationStatus === "APPROVED" ||
          listing.user?.hostApplicationStatus === "APPROVED" ||
          listing.host?.isVerified || listing.hostInfo?.isVerified || listing.user?.verified || false,
        userType:
          listing.host?.userType || listing.hostInfo?.userType || listing.user?.userType || "HOST",
        id:
          listing.host?._id || listing.hostInfo?._id || listing.user?._id || listing.host?.id || "",
      },
      reviews: listingReviews,
    };
  }, [
    listing,
    propertyImages,
    propertyVideos,
    hostCurrentAvatar,
    hostCurrentRating,
    hostTotalListings,
    listingReviews,
    geocodedCoords,
  ]);

  // Progressive loading: handles first-load vs refresh transitions
  // Added skeletonDelay and ensure we don't show error while loading
  const { showSkeleton, isRefreshing, contentReady, isFirstLoad } = 
    useProgressiveLoading(listing, loading, { skeletonDelay: 400 });

  // Handle loading state - show skeleton only if we have NO data to show
  if (showSkeleton && !listing) {
    return (
      <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
        <PropertyDetailsSkeleton />
      </SafeAreaView>
    );
  }

  // Handle going back from error state
  const handleErrorGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  // Handle hard error state - ONLY if no listing content exists to show
  // AND we're not in initial loading phase (prevent "Listing not found" glitch)
  if ((error || !listing) && !loading && !refreshing && !isFirstLoad) {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom, backgroundColor: "#fff" }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error || "Listing not found"}</Text>
          <View style={styles.errorButtonsContainer}>
            <Pressable style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
            <Pressable style={styles.goBackButton} onPress={handleErrorGoBack}>
              <Text style={styles.goBackButtonText}>Go Back</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // Legacy formatting was moved to the top for React Hook compliance

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  const openMapLocation = (lat, lng, labelText) => {
    if (!lat || !lng) return;
    const label = encodeURIComponent(labelText || "Property Location");
    const iosUrl = `http://maps.apple.com/?q=${label}&ll=${lat},${lng}`;
    const androidUrl = `geo:${lat},${lng}?q=${lat},${lng}(${labelText || "Property Location"})`;
    const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    
    const url = Platform.select({ ios: iosUrl, android: androidUrl });
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        return Linking.openURL(url);
      }
      return Linking.openURL(fallbackUrl);
    }).catch(() => {
      Linking.openURL(fallbackUrl).catch(() => {
        Alert.alert("Error", "Unable to open maps application.");
      });
    });
  };

  const handleLocationPress = () => {
    if (!listing) return;

    const latitude =
      listing.propertyLocation?.latitude ||
      listing.latitude ||
      geocodedCoords?.latitude;
    const longitude =
      listing.propertyLocation?.longitude ||
      listing.longitude ||
      geocodedCoords?.longitude;

    // Only proceed if we have coordinates
    if (!latitude || !longitude) {
      Alert.alert("Location Not Available", "This property location is not available on the map.");
      return;
    }

    // Show action sheet for dual options
    Alert.alert(
      "View Location",
      "How would you like to view this location?",
      [
        {
          text: "View in App Map",
          onPress: () => setShowMapModal(true),
        },
        {
          text: "Open in Maps App",
          onPress: () => {
            const label = listing.propertyName || "Property Location";
            openMapLocation(latitude, longitude, label);
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this property: ${propertyData.title} - ${propertyData.location}`,
        title: propertyData.title,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleBooking = async () => {
    try {
      // 1. Fetch latest profile data to ensure we have up-to-date info
      const profileData = await profileService.getProfileData();

      // 2. Validate Email
      if (!profileData?.email || !profileData?.emailAddress) {
        Alert.alert(
          "Email Required",
          "Please update your email address in your profile to proceed with booking.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Update Profile",
              onPress: () => router.push("/personal-info-edit"),
            },
          ],
        );
        return;
      }

      // 3. Validate Phone Number (min length check)
      const userPhone = profileData?.phone || profileData?.phoneNumber;
      if (!userPhone || String(userPhone).trim().length < 7) {
        setShowPhoneModal(true);
        return;
      }

      // Get the cover image URL (first property image)
      const coverImageUrl = propertyImages?.[0]?.uri || "";

      // Pass listing data to booking screen
      router.push({
        pathname: "/select-booking-details",
        params: {
          listingId: propertyData.id,
          propertyName: propertyData.title,
          price: listing.propertyPrice?.price || listing.price || 0,
          pricingPeriod: listing.pricingPeriod || "night",
          regulations: JSON.stringify(propertyData.regulations),
          maxGuests: listing.guests || 10,
          bedrooms: listing.bedrooms || 0,
          bathrooms: listing.bathrooms || 0,
          location: propertyData.location,
          coverImage: coverImageUrl,
          securityDeposit: listing.securityDeposit || 0,
          serviceCharge:
            listing.serviceCharge !== undefined &&
            listing.serviceCharge !== null
              ? listing.serviceCharge
              : listing.cleaningFee || 0,
          petsFriendly: listing.petsFriendly !== false ? "true" : "false",
          childrenAllowed: listing.childrenAllowed !== false ? "true" : "false",
        },
      });
    } catch (e) {
      console.error("[PropertyDetailsScreen] Booking validation error:", e);
      Alert.alert(
        "Error",
        "Could not validate user profile. Please try again.",
      );
    }
  };
  const handleMessageHost = () => {
    // Message functionality is currently disabled
    // TODO: Enable when messaging feature is implemented
  };

  const handleHostPress = () => {
    // Navigate to host information page
    const hostId =
      listing?.host?._id || listing?.hostInfo?._id || listing?.host?.id;
    if (hostId) {
      router.push({
        pathname: "/host-information",
        params: {
          hostId: hostId,
          hostName: propertyData.host.name,
          hostEmail: propertyData.host.email,
          hostUserType: propertyData.host.userType,
          hostAvatar: listing?.hostInfo?.avatar || listing?.host?.avatar || "",
          isVerified: propertyData.host.isVerified,
        },
      });
    } else {
      console.warn("[PropertyDetails] No host ID available for navigation");
    }
  };

  const handleImageScroll = (event) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / screenWidth);
    setCurrentImageIndex(Math.min(index, propertyData.images.length - 1));
  };

  const handleMainScroll = (event) => {
    const scrollOffset = event.nativeEvent.contentOffset.y;
    setIsHeaderFixed(scrollOffset > 50);
  };

  const renderSkeleton = () => {
    return <PropertyDetailsSkeleton />;
  };

  // Get image URLs for the viewer (string URIs)
  const getImageUrlsForViewer = () => {
    return propertyData.images
      .map((img) => {
        if (typeof img === "string") return img;
        if (img.uri) return img.uri;
        return null;
      })
      .filter(Boolean);
  };

  const handleImagePress = (index, customImages = null) => {
    setViewerImages(customImages || propertyMedia);
    setImageViewerIndex(index);
    setShowImageViewer(true);
  };

  const renderImageCarousel = () => {
    return (
      <View style={styles.carouselContainer}>
        {/* Media Scroll View (Images + Videos) */}
        <ScrollView
          ref={imageScrollRef}
          horizontal
          pagingEnabled
          scrollEventThrottle={16}
          onScroll={handleImageScroll}
          showsHorizontalScrollIndicator={false}
          style={styles.imageScrollView}
        >
          {propertyMedia.map((media, index) => {
            if (!media) return null;
            if (media.type === "video") {
              return (
                <VideoPlayer
                  key={`video-${index}`}
                  uri={media.uri}
                  isActive={currentImageIndex === index}
                  screenWidth={screenWidth}
                />
              );
            }
            return (
              <Pressable
                key={`img-${index}`}
                onPress={() => handleImagePress(index)}
                activeOpacity={0.9}
                style={[styles.imageWrapper, { width: screenWidth }]}
              >
                {imageErrors[index] ? (
                  <SkeletonPlaceholder>
                    <View
                      style={{
                        width: screenWidth,
                        height: "100%",
                        backgroundColor: "#f3f4f6",
                      }}
                    />
                  </SkeletonPlaceholder>
                ) : (
                  <>
                    <Image
                      source={{ uri: media.uri }}
                      style={[
                        StyleSheet.absoluteFillObject,
                        { width: screenWidth, height: "100%" },
                      ]}
                      contentFit="cover"
                      transition={300}
                      onError={() => handleImageError(index)}
                    />
                    {/* Shimmer overlay while loading is implicitly handled by expo-image transition, 
                        but we can add a skeleton below it as a base */}
                    <View style={[StyleSheet.absoluteFillObject, { zIndex: -1 }]}>
                      <SkeletonPlaceholder>
                        <View style={{ width: screenWidth, height: "100%" }} />
                      </SkeletonPlaceholder>
                    </View>
                  </>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Media Counter - Now on LEFT */}
        <View style={styles.imageCounter}>
          <Text style={styles.counterText}>
            {currentImageIndex + 1}/{propertyMedia.length}
          </Text>
        </View>

        <View style={{ position: 'absolute', bottom: 20, right: 20 }}>
          <Pressable style={styles.virtualTourButton}>
            <ShieldTickIcon width={18} height={18} />
            <Text style={styles.virtualTourText}>Take Virtual tour</Text>
          </Pressable>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>COMING SOON</Text>
          </View>
        </View>
      </View>
    );
  };

  // ... (renderRegulationsSection, renderLandmarkSection omitted for brevity) ...

  const renderHostSection = () => {
    // Priority: Backend host profile avatar (PRIMARY) > Listing host avatar (fallback) > Default image
    let hostAvatarUrl = null;

    // PRIMARY: Use avatar from backend host profile (most up-to-date)
    if (hostCurrentAvatar) {
      hostAvatarUrl = convertImageUrl(hostCurrentAvatar);
    }
    // FALLBACK: Use listing's stored avatar
    else if (listing?.hostInfo?.avatar || listing?.host?.avatar) {
      hostAvatarUrl = convertImageUrl(
        listing.hostInfo?.avatar || listing.host?.avatar,
      );
    }

    return (
      <View style={styles.hostSectionContainer}>
        <Text style={styles.sectionTitle}>Meet your host/landlord</Text>
        <Pressable style={styles.hostSectionCard} onPress={handleHostPress}>
          <View style={styles.hostContent}>
            {hostAvatarUrl ? (
              <View style={styles.hostAvatarContainer}>
                <Image
                  source={{ uri: hostAvatarUrl }}
                  style={styles.hostAvatarImage}
                  contentFit="cover"
                  cachePolicy="disk"
                  transition={200}
                />
              </View>
            ) : (
                <View style={styles.hostAvatarContainer}>
                    <Image
                        source={require("../../assets/images/no-image.png")}
                        style={styles.hostAvatarImage}
                        contentFit="cover"
                    />
                </View>
            )}

            <View style={styles.hostInfo}>
              <Text style={styles.hostedByLabel}>Hosted by/Landlord:</Text>
              <Text style={styles.hostName}>{propertyData.host.name}</Text>
              <View style={styles.hostStatsRow}>
                <Text style={styles.hostListings}>
                  {propertyData.host.totalListings} Listings
                </Text>
                <View style={styles.hostStatDivider} />
                <View style={styles.hostRating}>
                  <Text style={styles.ratingText}>
                    {hostCurrentRating || propertyData.host.rating ? 
                      Number(hostCurrentRating || propertyData.host.rating).toFixed(1) : 
                      "N/A"}
                  </Text>
                  <StarIcon width={12} height={12} style={styles.ratingStar} />
                </View>
              </View>
            </View>

            <View style={styles.hostActions}>
              <View style={styles.badgeRow}>
                {propertyData.host.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <ShieldTickIcon width={18} height={18} />
                    <Text style={styles.verifiedText}>VERIFIED</Text>
                  </View>
                )}
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    setShowVerifiedInfo(true);
                  }}
                >
                  <CircleInfo2Icon width={18} height={18} color="#010135" />
                </Pressable>
              </View>
              <Pressable style={styles.messageButton} onPress={handleMessageHost}>
                <Text style={styles.messageButtonText}>Message</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </View>
    );
  };

  const renderRegulationsSection = () => {
    return (
      <View style={styles.regulationsSection}>
        <Text style={styles.sectionTitle}>Regulations</Text>
        <View style={styles.regulationsContainer}>
          {propertyData.regulations
            .filter(Boolean) // Remove any null/undefined values
            .map((regulation, index) => (
              <View key={index} style={styles.regulationRow}>
                <Ionicons 
                  name="checkmark-circle-outline" 
                  size={16} 
                  color="#010135" 
                />
                <Text style={styles.regulationText}>
                  {String(regulation || "")}
                </Text>
              </View>
            ))}
        </View>
      </View>
    );
  };

  const renderCancellationPolicySection = () => {
    const isNonRefundable = listing?.acceptRefund === false;
    
    return (
      <View style={styles.policySection}>
        <Text style={styles.sectionTitle}>Cancellation Policy</Text>
        <View style={[
          styles.policyContainer, 
          isNonRefundable ? styles.nonRefundableContainer : styles.refundableContainer
        ]}>
          <View style={styles.policyHeaderRow}>
            <Ionicons 
              name={isNonRefundable ? "alert-circle-outline" : "shield-checkmark-outline"} 
              size={20} 
              color={isNonRefundable ? "#FD3131" : "#10B981"} 
            />
            <Text style={[
              styles.policyTypeLabel,
              { color: isNonRefundable ? "#FD3131" : "#10B981" }
            ]}>
              {isNonRefundable ? "Non-Refundable Policy" : "Lunest Standard Policy"}
            </Text>
          </View>
          <Text style={styles.policyText}>
            {isNonRefundable 
              ? "Host Cancellation Policy: This property follows a Non-Refundable Policy. The host does not accept cancellations or refunds once the booking is confirmed."
              : "Guests can cancel according to our fair refund timeline. Cancellation eligibility and refund amounts are calculated based on the check-in date."
            }
          </Text>
        </View>
      </View>
    );
  };

  const renderLandmarkSection = () => {
    const landmarks = (propertyData.landmarks || []).filter(
      (l) => l && String(l).trim() !== "",
    );

    // We show the section if we have landmarks, OR if we have location info (to show the map)
    if (landmarks.length === 0 && !propertyData.latitude && !propertyData.longitude && !propertyData.location)
      return null;

    return (
      <View style={styles.landmarkSection}>
        {landmarks.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Landmark</Text>
            <View style={styles.landmarkContainer}>
              {landmarks.map((landmark, index) => (
                <View key={index} style={styles.landmarkRow}>
                  <Ionicons 
                    name="location-outline" 
                    size={16} 
                    color="#010135" 
                  />
                  <Text style={styles.landmarkText}>{String(landmark || "")}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.sectionTitle}>Location</Text>
        )}

        {/* Map Preview */}
        <View style={styles.mapPreviewContainer}>
          {propertyData.latitude != null && propertyData.longitude != null ? (
            <Pressable
              style={styles.mapContainer}
              onPress={() => {
                openMapLocation(
                  propertyData.latitude,
                  propertyData.longitude,
                  propertyData.title,
                );
              }}
            >
              <MapView
                key={`map-${propertyData.latitude}-${propertyData.longitude}`}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: Number(propertyData.latitude),
                  longitude: Number(propertyData.longitude),
                  latitudeDelta: 0.015,
                  longitudeDelta: 0.015,
                }}
                loadingEnabled={true}
                loadingIndicatorColor="#010135"
                scrollEnabled={true}
                zoomEnabled={true}
                pitchEnabled={false}
                rotateEnabled={false}
                cacheEnabled={true}
                showsUserLocation={false}
                showsMyLocationButton={false}
                showsPointsOfInterest={false}
                showsBuildings={false}
                showsTraffic={false}
                showsIndoors={false}
                showsCompass={false}
                showsScale={false}
                showsIndoorLevelPicker={false}
              >
                <Marker
                  key={`marker-${propertyData.latitude}-${propertyData.longitude}`}
                  coordinate={{
                    latitude: Number(propertyData.latitude),
                    longitude: Number(propertyData.longitude),
                  }}
                  title={propertyData.title}
                  description={propertyData.location}
                  pinColor="#010135"
                  onPress={() => {
                    // Handle pin click - open map with more details
                    handleLocationPress();
                  }}
                />
              </MapView>
              
              {/* Interactive Map Overlay */}
              <View style={styles.mapOverlay}>
                <View style={styles.mapOverlayContent}>
                  <Ionicons name="location" size={16} color="#010135" />
                  <Text style={styles.mapOverlayText}>Tap to view in maps</Text>
                </View>
              </View>

              {/* Zoom Controls */}
              <View style={styles.zoomControls}>
                <Pressable 
                  style={[styles.zoomButton, styles.zoomButtonTop]}
                  onPress={() => {
                    // Zoom in functionality would require map ref
                    console.log('Zoom in pressed');
                  }}
                >
                  <Ionicons name="add" size={16} color="#010135" />
                </Pressable>
                <Pressable 
                  style={[styles.zoomButton, styles.zoomButtonBottom]}
                  onPress={() => {
                    // Zoom out functionality would require map ref
                    console.log('Zoom out pressed');
                  }}
                >
                  <Ionicons name="remove" size={16} color="#010135" />
                </Pressable>
              </View>
            </Pressable>
          ) : (
            <View style={styles.mapPlaceholder}>
              <View style={styles.mapPlaceholderContent}>
                <Ionicons name="location-outline" size={40} color="#010135" />
                <Text style={styles.mapPlaceholderText}>
                  {(!propertyData.latitude && propertyData.location && !geocodedCoords?.failed) 
                    ? "Locating on map..." 
                    : "Map not available"}
                </Text>
                <Text style={styles.mapPlaceholderSubtext}>
                  {(!propertyData.latitude && propertyData.location && !geocodedCoords?.failed) 
                    ? "Getting precise coordinates for this location" 
                    : "Coordinates for this address could not be determined. Please contact host for exact location."}
                </Text>
                {(!propertyData.latitude && propertyData.location && !geocodedCoords?.failed) && (
                  <ActivityIndicator size="small" color="#010135" style={{ marginTop: 10 }} />
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };
  const renderReviewsSection = () => {
    const renderStars = (rating) => {
      const stars = [];
      const numRating = Number(rating) || 0;
      for (let i = 1; i <= 5; i++) {
        stars.push(
          <Ionicons
            key={i}
            name={i <= numRating ? "star" : "star-outline"}
            size={14}
            color="#FFD700"
          />,
        );
      }
      return <View style={{ flexDirection: "row", gap: 2 }}>{stars}</View>;
    };

    return (
      <View style={styles.reviewsSection}>
        <View style={styles.reviewsHeader}>
          <Text style={styles.sectionTitle}>
            Guest Reviews ({propertyData.reviews?.length || 0})
          </Text>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/full-details",
                params: {
                  listingId: listingId,
                  scrollToTab: "reviews",
                },
              })
            }
          >
            <ArrowRightIcon width={18} height={18} color="#010135" />
          </Pressable>
        </View>
        <View style={styles.reviewsContainer}>
          {!propertyData.reviews || propertyData.reviews.length === 0 ? (
            <Text style={styles.noReviewsText}>No reviews yet</Text>
          ) : (
            propertyData.reviews.slice(0, 2).map((review, index) => (
              <View key={index} style={styles.reviewCard}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  {renderStars(review.rating)}
                  <Text style={styles.reviewAuthor}>
                    {review.reviewedAt
                      ? new Date(review.reviewedAt).toLocaleDateString(
                          "en-US",
                          { month: "short", year: "numeric" },
                        )
                      : "Recently"}
                  </Text>
                </View>
                <Text style={styles.reviewText}>
                  &quot;
                  {review.feedback || review.text || "No feedback provided"}
                  &quot;
                </Text>
                {(() => {
                  const reviewImages = parseImages(review.images);
                  if (reviewImages.length === 0) return null;
                  return (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginTop: 6 }}
                    >
                      {reviewImages.map((img, imgIdx) => {
                        if (!img) return null;
                        const uri = convertImageUrl(img);
                        if (!uri) return null;
                        return (
                          <Image
                            key={imgIdx}
                            source={{ uri }}
                            style={{
                              width: 50,
                              height: 50,
                              borderRadius: 6,
                              marginRight: 6,
                            }}
                          />
                        );
                      })}
                    </ScrollView>
                  );
                })()}
                <Text style={styles.reviewAuthor}>
                  — {review.reviewer?.fullName || review.author?.fullName || "Anonymous"}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.mainContainer} edges={["top"]}>
      {/* Stable Header - Background opacity controlled by isHeaderFixed */}
      <View
        style={[
          styles.headerFixed,
          {
            paddingTop: Math.max(insets.top, 10),
            height: 60 + Math.max(insets.top, 10),
            backgroundColor: isHeaderFixed ? "#010135" : "transparent",
            borderBottomColor: isHeaderFixed
              ? "rgba(255,255,255,0.1)"
              : "transparent",
            elevation: isHeaderFixed ? 4 : 0,
          },
        ]}
      >
        <Pressable
          style={[styles.backButton, !isHeaderFixed && styles.backCircle]}
          onPress={handleGoBack}
        >
          <ArrowLeftIcon width={24} height={24} color={isHeaderFixed ? "#FFFFFF" : "#000"} />
        </Pressable>

        {isHeaderFixed && (
          <Text style={styles.headerTitle}>Property Details</Text>
        )}

        <TouchableOpacity
          onPress={handleToggleBookmark}
          style={styles.headerIconButton}
        >
          <Heart 
            size={22} 
            color={isBookmarked ? "#FF5A5F" : "#FFFFFF"} 
            fill={isBookmarked ? "#FF5A5F" : "transparent"}
            strokeWidth={1.5} 
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        renderSkeleton()
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          onScroll={handleMainScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#010135"
            />
          }
        >
          {/* Image Carousel */}
          <View style={styles.carouselWrapper}>{renderImageCarousel()}</View>

          {/* Property Info */}
          <View style={styles.propertyInfoSection}>
            {/* Title and Share */}
            <View style={styles.titleRow}>
              <Text style={styles.title}>{propertyData.title}</Text>
              <TouchableOpacity
                onPress={handleShare}
                style={styles.headerIconButton}
              >
                <Share2 size={22} color="#000" strokeWidth={1.5} />
              </TouchableOpacity>
            </View>

            {/* Location - Clickable */}
            <Pressable
              onPress={handleLocationPress}
              style={({ pressed }) => [
                styles.locationPressable,
                pressed && styles.locationPressed,
              ]}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
              >
                <View style={styles.locationIconContainer}>
                  <MapPin size={14} color="#010135" />
                </View>
                <Text
                  style={styles.location}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {propertyData.location}
                </Text>
              </View>
            </Pressable>

            {/* Availability */}
            <View
              style={[
                styles.availabilityRow,
                propertyData.isUnavailable && styles.bookedAvailabilityRow,
              ]}
            >
              <Clock
                size={16}
                color={propertyData.isUnavailable ? "#FF3B30" : "#010135"}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.availabilityText,
                  propertyData.isUnavailable && styles.bookedAvailabilityText,
                ]}
              >
                {propertyData.status === "BOOKED" &&
                propertyData.bookedUntil
                  ? `Currently booked till ${new Date(propertyData.bookedUntil).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}`
                  : propertyData.status === "BOOKED"
                    ? "Currently Booked"
                    : propertyData.isPaused
                      ? "Currently Unavailable"
                      : propertyData.available
                        ? "Available"
                        : "Unavailable"}
              </Text>
            </View>

            {/* Price Section */}
            <View style={styles.priceSection}>
              <View style={styles.priceRow}>
                <Text style={styles.price}>{propertyData.price}</Text>
                <Text style={styles.priceType}>{propertyData.priceType}</Text>
              </View>
              <Text style={styles.rentalType}>{propertyData.rentalType}</Text>

              {/* Caution fee and service charge removed as per user request (visible in full details) */}
            </View>

            {/* Price Note */}
            <View style={styles.priceNoteContainer}>
              <Info size={16} color="#656565" strokeWidth={2} />
            <Text style={styles.priceNote}>{propertyData.priceNote}</Text>
          </View>

          {/* Full Details */}
          <Pressable
            style={styles.fullDetailsButton}
            onPress={() =>
              router.push({
                pathname: "/full-details",
                params: { listingId: listingId },
              })
            }
          >
            <Text style={styles.fullDetailsText}>Full details</Text>
            <ArrowRight size={18} color="#010135" />
          </Pressable>
        </View>

        {/* Description Section */}
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{propertyData.description}</Text>
        </View>

        {/* What You Get Section */}
        <View style={styles.whatYouGetSection}>
          <Text style={styles.sectionTitle}>What you get</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.featuresScroll}
            contentContainerStyle={styles.whatYouGetContainer}
          >
            {propertyData.features.map((feature, index) => {
              const Icon = getAmenityIcon(feature.label);
              return (
                <View key={index} style={styles.whatYouGetBox}>
                  <Icon 
                    size={18} 
                    color="#FFFFFF" 
                    strokeWidth={2}
                  />
                  <Text style={styles.whatYouGetText}>{feature.label}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Key Amenities Section */}
        <View style={styles.keyAmenitiesSection}>
          <Text style={styles.sectionTitle}>Key Amenities</Text>
          <View style={styles.amenitiesGrid}>
            {propertyData.amenities.map((amenity, index) => (
              <View key={index} style={styles.amenityGridItem}>
                <View style={styles.amenityIconContainer}>
                   {React.createElement(getAmenityIcon(amenity), {
                     size: 20,
                     color: "#010135",
                     strokeWidth: 2
                   })}
                </View>
                <Text style={styles.amenityGridText}>
                  {amenity.replace(/^custom_/, "").replace(/_/g, " ")}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Landmark/Location Section */}
        {renderLandmarkSection()}

        <View style={{ height: 20 }} />

        {/* Regulations and Policy */}
        {renderRegulationsSection()}
        {renderCancellationPolicySection()}

        {/* Host Section */}
        {renderHostSection()}

        {/* Reviews Section with Posting Logic */}
        <View style={styles.reviewsSection}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Guest Reviews</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>
                {listing?.averageRating || "0.0"} ({listing?.ratingCount || 0})
              </Text>
            </View>
          </View>

          {/* Reviews List */}
          <View style={styles.reviewsContainer}>
            {listingReviews && listingReviews.length > 0 ? (
              listingReviews.map((review, index) => (
                <View key={review.id || index || `review-${index}`} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      {review.reviewer?.avatar &&
                      convertImageUrl(review.reviewer.avatar) ? (
                        <Image
                          source={{
                            uri: convertImageUrl(review.reviewer.avatar),
                          }}
                          style={styles.reviewerAvatar}
                          defaultSource={undefined}
                          onError={() => {}}
                        />
                      ) : (
                        <View style={styles.reviewerAvatarPlaceholder}>
                          <Text style={styles.reviewerInitial}>
                            {review.reviewer?.fullName?.charAt(0) || "G"}
                          </Text>
                        </View>
                      )}
                      <View>
                        <Text style={styles.reviewAuthor}>
                          {maskGuestName(review.reviewer?.fullName)}
                        </Text>
                        <Text style={styles.reviewDate}>
                          {formatReviewDate(review.reviewedAt)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.reviewRatingRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={star <= review.rating ? "star" : "star-outline"}
                          size={12}
                          color="#FFD700"
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewText}>{review.feedback}</Text>

                  {/* Review Images */}
                  {(() => {
                    const reviewImages = [
                        ...parseImages(review.images),
                        ...parseImages(review.guestReview?.images)
                    ];
                    if (reviewImages.length === 0) return null;
                    return (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.reviewImagesScroll}
                      >
                        {reviewImages.map((img, imgIdx) => {
                          const resolvedImg = convertImageUrl(img) || require("../../assets/images/no-image.png");
                          return (
                            <TouchableOpacity
                              key={imgIdx}
                              onPress={() => {
                                const viewerImages = reviewImages.map((url) =>
                                  convertImageUrl(url)
                                ).filter(Boolean);
                                handleImagePress(imgIdx, viewerImages);
                              }}
                            >
                              <Image
                                source={typeof resolvedImg === 'string' ? { uri: resolvedImg } : resolvedImg}
                                style={styles.reviewImageThumb}
                                contentFit="cover"
                                cachePolicy="disk"
                                transition={200}
                              />
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    );
                  })()}
                </View>
              ))
            ) : (
              <Text style={styles.noReviewsText}>No reviews yet</Text>
            )}
          </View>

          {/* Post Review Section - Only for verified past guests */}
          {userHasBooked && (
            <View style={styles.postReviewSection}>
              <Text style={styles.subSectionTitle}>Rate Your Stay</Text>
              <Text style={styles.reviewHelpText}>
                Help the community by sharing your experience.
              </Text>

              <Pressable
                style={[
                  styles.postButton,
                  (isPostingReview || isUploadingImages) &&
                    styles.postButtonDisabled,
                ]}
                onPress={() => setShowReviewModal(true)}
                disabled={isPostingReview || isUploadingImages}
              >
                <Text style={styles.postButtonText}>Leave a Review</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
      )}

      {/* Fixed Book Button */}
      <View style={[styles.bookButtonContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable
          style={[
            styles.bookButton,
            propertyData.isUnavailable && styles.bookButtonDisabled,
          ]}
          disabled={propertyData.isUnavailable}
          onPress={() => {
            if (propertyData.isUnavailable) return;
            router.push({
              pathname: "/select-booking-details",
              params: {
                listingId: listingId,
                propertyName: propertyData.title,
                price: listing.propertyPrice?.price || listing.price || 0,
                pricingPeriod: listing.pricingPeriod || "night",
                regulations: JSON.stringify(propertyData.regulations),
                maxGuests: listing.guests || 10,
                bedrooms: listing.bedrooms || 0,
                bathrooms: listing.bathrooms || 0,
                location: propertyData.location,
                coverImage: propertyData.images[0]?.uri || "",
                securityDeposit: listing.securityDeposit || 0,
                serviceCharge: listing.serviceCharge || 0,
                petsFriendly: listing.petsFriendly ? "true" : "false",
                childrenAllowed: listing.childrenAllowed ? "true" : "false",
                hostId: listing.hostInfo?._id || listing.host?._id || "",
              },
            });
          }}
        >
          <Text
            style={[
              styles.bookButtonText,
              propertyData.isUnavailable && styles.bookButtonTextDisabled,
            ]}
          >
            {propertyData.isBooked
              ? "Currently Booked"
              : propertyData.isPaused
                ? "Currently Unavailable"
                : "Book in style"}
          </Text>
        </Pressable>
      </View>

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

      {/* Verified Info Overlay Modal */}
      <VerifiedInfoOverlay
        visible={showVerifiedInfo}
        onClose={() => setShowVerifiedInfo(false)}
      />

      {/* Map Modal */}
      <Modal
        visible={showMapModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMapModal(false)}
      >
        <SafeAreaView style={[styles.mapModalContainer, { paddingBottom: insets.bottom }]} edges={["bottom"]}>
          {/* Map Modal Header */}
          <View style={styles.mapModalHeader}>
            <Pressable
              onPress={() => setShowMapModal(false)}
              style={({ pressed }) => [styles.mapModalCloseButton, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="chevron-down" size={28} color="#010135" />
            </Pressable>
            <Text style={styles.mapModalTitle}
              numberOfLines={1}
            >
              {listing?.propertyName || "Property Location"}
            </Text>
            <Pressable
              onPress={() => {
                const latitude =
                  listing.propertyLocation?.latitude ||
                  listing.latitude ||
                  geocodedCoords?.latitude;
                const longitude =
                  listing.propertyLocation?.longitude ||
                  listing.longitude ||
                  geocodedCoords?.longitude;
                if (latitude && longitude) {
                  const label = listing.propertyName || "Property Location";
                  openMapLocation(latitude, longitude, label);
                }
              }}
              style={({ pressed }) => [styles.mapModalOpenButton, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="open-outline" size={20} color="#FFFFFF" />
              <Text style={styles.mapModalOpenText}>Open</Text>
            </Pressable>
          </View>

          {/* Map Container */}
          <View style={styles.mapModalMapContainer}>
            {geocodedCoords && MapView ? (
              <MapView
                key={`modal-map-${geocodedCoords.latitude}-${geocodedCoords.longitude}`}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: geocodedCoords.latitude,
                  longitude: geocodedCoords.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                loadingEnabled={true}
                loadingIndicatorColor="#010135"
                scrollEnabled={true}
                zoomEnabled={true}
                pitchEnabled={true}
                rotateEnabled={true}
              >
                <Marker
                  coordinate={{
                    latitude: geocodedCoords.latitude,
                    longitude: geocodedCoords.longitude,
                  }}
                  title={listing?.propertyName || "Property Location"}
                  description={propertyData.location || ""}
                  pinColor="#010135"
                  onPress={() => {
                    // Handle pin click - show location details or open in maps
                    const label = listing?.propertyName || "Property Location";
                    openMapLocation(geocodedCoords.latitude, geocodedCoords.longitude, label);
                  }}
                />
              </MapView>
            ) : (
              <View style={styles.mapLoadingContainer}>
                <ActivityIndicator size="large" color="#010135" />
                <Text style={styles.mapLoadingText}>Loading map...</Text>
              </View>
            )}
          </View>

          {/* Location Details */}
          <View style={styles.mapModalDetails}>
            <View style={styles.mapModalDetailRow}>
              <Ionicons name="location" size={20} color="#010135" />
              <View style={styles.mapModalDetailText}>
                <Text style={styles.mapModalDetailLabel}>Address</Text>
                <Text style={styles.mapModalDetailValue} numberOfLines={2}>
                  {propertyData.location}
                </Text>
              </View>
            </View>
            {propertyData.latitude && propertyData.longitude && (
              <View style={styles.mapModalDetailRow}>
                <Ionicons name="navigate" size={20} color="#010135" />
                <View style={styles.mapModalDetailText}>
                  <Text style={styles.mapModalDetailLabel}>Coordinates</Text>
                  <Text style={styles.mapModalDetailValue}>
                    {propertyData.latitude.toFixed(4)}, {propertyData.longitude.toFixed(4)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Image Viewer Modal */}
      <ImageViewerModal
        visible={showImageViewer}
        images={viewerImages} // Use viewerImages state
        initialIndex={imageViewerIndex}
        onClose={() => setShowImageViewer(false)}
      />
      <ReviewFeedbackModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSubmit={handlePostReview}
        isLoading={isPostingReview || isUploadingImages}
        guestName={listing?.host?.fullName || "Host"}
        rating={reviewRating}
        isHost={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#444",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 20,
  },
  errorButtonsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  retryButton: {
    backgroundColor: "#010135",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  goBackButton: {
    backgroundColor: "#ccc",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  goBackButtonText: {
    color: "#333",
    fontWeight: "600",
  },
  mainContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerFixed: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#010135",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  backButton: {
    padding: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  saveButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  carouselWrapper: {
    position: "relative",
  },
  carouselContainer: {
    height: 300,
    marginBottom: 20,
  },
  mediaItemContainer: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  videoPlayer: {
    width: "100%",
    height: "100%",
  },
  playButtonOverlay: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
    zIndex: 2,
  },
  imageScrollView: {
    width: "100%",
    height: "100%",
  },
  imageWrapper: {
    height: "100%",
  },
  propertyImage: {
    width: "100%",
    height: "100%",
  },
  imageCounter: {
    position: "absolute",
    bottom: 20,
    left: 20, // Moved to LEFT
    backgroundColor: "rgba(0,0,0,0.7)", // Darker background
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  counterText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  virtualTourButton: {
    backgroundColor: "rgba(255,255,255,0.9)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  hostContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  hostAvatar: {
    marginRight: 12,
  },
  hostInfo: {
    flex: 1,
    gap: 2,
  },
  hostedByLabel: {
    fontSize: 10,
    color: "#666",
    fontWeight: "500",
  },
  hostName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#010135",
  },
  hostListings: {
    fontSize: 10,
    color: "#666",
  },
  hostStatsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  hostStatDivider: {
    width: 1,
    height: 10,
    backgroundColor: "#ccc",
    marginHorizontal: 8,
  },
  hostRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  hostActions: {
    alignItems: "flex-end",
    gap: 12,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#010135",
  },
  messageButton: {
    backgroundColor: "#010135",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 4, // Reduced border radius
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  messageButtonText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#EFEFEF",
    textAlign: "left",
  },
  virtualTourText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#010135",
  },
  comingSoonBadge: {
    backgroundColor: "#010135",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    position: 'absolute',
    top: -6,
    right: 4,
    zIndex: 5,
  },
  comingSoonText: {
    fontSize: 7,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  overlayBackButton: {
    position: "absolute",
    top: Platform.OS === "android" ? 50 : 40, // More space for Android
    left: 20,
    zIndex: 10,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  favoriteContainer: {
    position: "absolute",
    top: Platform.OS === "android" ? 50 : 40, // More space for Android
    right: 20,
    zIndex: 10,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  propertyInfoSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#010135",
    flex: 1,
    marginRight: 10,
  },
  location: {
    fontSize: 14,
    color: "#666",
    textDecorationLine: "underline",
    textDecorationColor: "#010135",
    textDecorationStyle: "solid",
    flex: 1,
    minWidth: 0,
    lineHeight: 20,
  },
  locationIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 20,
    height: 20,
    marginTop: 0,
  },
  locationPressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 24,
    borderRadius: 6,
    minWidth: 0,
  },
  locationPressed: {
    backgroundColor: "rgba(25, 45, 255, 0.05)",
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  mapModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    backgroundColor: "#FFFFFF",
  },
  mapModalCloseButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  mapModalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#010135",
    marginHorizontal: 12,
  },
  mapModalOpenButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#010135",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  mapModalOpenText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  mapModalMapContainer: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  mapLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    gap: 12,
  },
  mapLoadingText: {
    fontSize: 14,
    color: "#666666",
    fontWeight: "500",
  },
  mapModalDetails: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    // backgroundColor: "#FAFAFA",
    gap: 16,
  },
  mapModalDetailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  mapModalDetailText: {
    flex: 1,
    gap: 4,
  },
  mapModalDetailLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#999999",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  mapModalDetailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#010135",
    lineHeight: 20,
  },
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
    backgroundColor: "rgba(92, 184, 92, 0.1)", // Light green by default
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  bookedAvailabilityRow: {
    backgroundColor: "rgba(255, 59, 48, 0.1)", // Light red background for booked
  },
  availabilityText: {
    fontSize: 14,
    color: "#5CB85C",
    fontWeight: "600",
  },
  bookedAvailabilityText: {
    color: "#FF3B30",
  },
  priceSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  price: {
    fontSize: 24,
    fontWeight: "700",
    color: "#010135",
  },
  priceType: {
    fontSize: 14,
    color: "#666",
  },
  rentalType: {
    fontSize: 10,
    fontWeight: "600",
    color: "#010135",
  },
  additionalFeesContainer: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  feeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F2FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  feeLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  feeValue: {
    fontSize: 12,
    color: "#010135",
    fontWeight: "700",
  },
  priceNoteContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  priceNote: {
    fontSize: 12,
    color: "#3B4BFB",
  },
  fullDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
  },
  fullDetailsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#010135",
  },
  descriptionSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#010135",
    marginBottom: 12,
  },
  policySection: {
    paddingHorizontal: 20,
    marginTop: 32,
    marginBottom: 12,
  },
  policyContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  refundableContainer: {
    backgroundColor: "rgba(16, 185, 129, 0.05)",
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  nonRefundableContainer: {
    backgroundColor: "rgba(253, 49, 49, 0.05)",
    borderColor: "rgba(253, 49, 49, 0.2)",
  },
  policyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  policyTypeLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  policyText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#4B5563",
  },
  descriptionText: {
    fontSize: 14,
    color: "#444",
    lineHeight: 22,
  },
  whatYouGetSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  whatYouGetContainer: {
    flexDirection: "row",
    gap: 12,
  },
  featuresScroll: {
    marginTop: 8,
  },
  whatYouGetBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#010135",
    borderRadius: 16,
    justifyContent: "center",
  },
  whatYouGetText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  keyAmenitiesSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 12,
  },
  amenityGridItem: {
    width: "48%", // 2 columns minus gap
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  amenityIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  amenityGridText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
  },
  regulationsSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  landmarkSection: {
    padding: 20,
    marginTop: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  regulationsContainer: {
    gap: 8,
  },
  regulationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  landmarkText: {
    fontSize: 14,
    color: "#444",
  },
  mapPreviewContainer: {
    height: 200,
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  map: {
    flex: 1,
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
  },
  mapPlaceholderContent: {
    alignItems: "center",
    gap: 8,
  },
  mapPlaceholderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  hostSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    backgroundColor: "#F6F6F6",
  },
  hostContentContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  hostAvatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  hostAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#fff",
  },
  hostSectionContainer: {
    padding: 20,
    backgroundColor: "#fff",
  },
  hostSectionCard: {
    backgroundColor: "#F9F9F9",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 8,
  },
  hostVerifiedBadge: {
    // Removed unused style as badge is now in name row
    display: "none",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  hostInfoColumn: {
    flex: 1,
  },
  hostNameLarge: {
    fontSize: 16,
    fontWeight: "700",
    color: "#010135",
    marginBottom: 4,
  },
  hostStatText: {
    fontSize: 12,
    color: "#444",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingStar: {
    marginBottom: 2,
  },
  hostActionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIconButton: {
    padding: 4,
  },
  messageHostIcon: {
    padding: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#010135",
  },
  ratingIcon: {
    color: "#FFD700",
  },
  reviewsSection: {
    padding: 20,
  },
  reviewsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  reviewsContainer: {
    gap: 16,
  },
  reviewCard: {
    padding: 16,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
  },
  reviewText: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
    marginBottom: 8,
    fontStyle: "italic",
  },
  reviewAuthor: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  bottomSpacer: {
    height: 100,
  },
  bookButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  bookButton: {
    backgroundColor: "#010135",
    paddingVertical: 14,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  featuresContainer: {
    flexDirection: "row",
    gap: 12,
    paddingLeft: 4, // Add some padding for shadow
  },
  featureBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  featureLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#010135",
  },
  // Review System Styles
  subSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#010135",
    marginBottom: 4,
  },
  reviewHelpText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  reviewerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  reviewerAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#010135",
    justifyContent: "center",
    alignItems: "center",
  },
  reviewerInitial: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  reviewDate: {
    fontSize: 10,
    color: "#999",
  },
  reviewRatingRow: {
    flexDirection: "row",
    gap: 2,
  },
  reviewImagesScroll: {
    marginTop: 10,
  },
  reviewImageThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: "#f0f0f0",
  },
  buttonLoaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  noReviewsText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginVertical: 20,
    fontStyle: "italic",
  },
  videoIndicator: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mapContainer: {
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 10,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapOverlayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mapOverlayText: {
    fontSize: 10,
    color: '#010135',
    fontWeight: '500',
  },
  zoomControls: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  zoomButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonTop: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  zoomButtonBottom: {
    borderBottomWidth: 0,
  },
});

// Video player component for the slider - defined outside to prevent infinite loops
const VideoPlayer = ({ uri, isActive, screenWidth }) => {
  const player = useVideoPlayer(uri, (player) => {
    player.loop = true;
    player.pause();
  });
  const [showPlayButton, setShowPlayButton] = useState(true);

  const togglePlayPause = () => {
    if (player.playing) {
      player.pause();
      setShowPlayButton(true);
    } else {
      player.play();
      setShowPlayButton(false);
    }
  };

  // Pause video when not active in view
  useEffect(() => {
    if (!isActive) {
      player.pause();
      setShowPlayButton(true);
    }
  }, [isActive, player]);

  return (
    <Pressable
      onPress={togglePlayPause}
      style={[styles.mediaItemContainer, { width: screenWidth }]}
    >
      <VideoView
        player={player}
        style={styles.videoPlayer}
        contentFit="cover"
        nativeControls={true}
        fullscreenOptions={{ enabled: true }}
      />
      {showPlayButton && (
        <View style={styles.playButtonOverlay}>
          <Ionicons
            name="play-circle"
            size={64}
            color="rgba(255,255,255,0.9)"
          />
        </View>
      )}
      <View style={styles.videoIndicator}>
        <Ionicons name="videocam" size={16} color="#FFF" />
      </View>
    </Pressable>
  );
};

export default PropertyDetailsScreen;
