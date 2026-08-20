import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ArrowLeftIcon from "../../assets/icons/arrow-left.svg";
import CircleInfo2Icon from "../../assets/icons/circle-info2.svg";
import DoneV2Icon from "../../assets/icons/done-v2.svg";
import EllipseAvatar from "../../assets/icons/Ellipse 10.svg";
import ShieldTickIcon from "../../assets/icons/shield-tick.svg";
import StarIcon from "../../assets/icons/star.svg";
import ImageViewerModal from "../../components/modals/ImageViewerModal";
import KycRequiredModal from "../../components/modals/KycRequiredModal";
import ReviewFeedbackModal from "../../components/modals/ReviewFeedbackModal";
import VerifiedInfoOverlay from "../../components/modals/VerifiedInfoOverlay";
import authService from "../../services/authService";
import bookingService from "../../services/bookingService";
import profileService from "../../services/profileService";
import { getUserData } from "../../services/userDataService";
import Skeleton from "../../components/common/Skeleton";
import configService from "../../services/configService";
import { getAmenityIcon } from "../../utils/amenityIcons";
import { fetchHostData } from "../../services/hostService";
import listingService from "../../services/listingService";
import { formatCurrency } from "../../utils/currency";
import { resolveImageUrlSync } from "../../utils/imageUtils";

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
      if (rules.includes(",")) {
        const splitRules = rules
          .split(",")
          .map((rule) => rule.trim())
          .filter((rule) => rule && rule !== "0");
        if (splitRules.every((rule) => /^\d+$/.test(rule))) {
          const ruleIds = Object.keys(HOUSE_RULES_MAP);
          return splitRules
            .map((indexStr) => {
              const index = parseInt(indexStr);
              if (ruleIds[index]) {
                return HOUSE_RULES_MAP[ruleIds[index]];
              }
              return null;
            })
            .filter(Boolean);
        }
        return splitRules.map(toTitleCase);
      }
      return rules === "0" ? [] : [toTitleCase(rules)];
    }
  }

  if (Array.isArray(rules)) {
    return rules
      .map((rule) => {
        if (rule === "0") return null;
        if (typeof rule === "string") return toTitleCase(rule);
        if (typeof rule === "object")
          return toTitleCase(rule.label || rule.name || rule.value);
        return null;
      })
      .filter(Boolean);
  }

  return [];
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MEDIA_ITEM_WIDTH = SCREEN_WIDTH - 32; // Full width minus padding
const MEDIA_ITEM_HEIGHT = 280;

const FullDetailsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const listingId = params?.listingId;
  const initialTab = params?.scrollToTab || "details";

  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showVerifiedInfo, setShowVerifiedInfo] = useState(false);
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [baseURL, setBaseURL] = useState("");

  const [imageErrors, setImageErrors] = useState({});

  // Helper for image URL resolution
  const convertImageUrl = (image) => {
    if (!image) return null;
    const path = typeof image === "object" ? image.url || image.uri : image;
    // Use the state-populated baseURL if available, otherwise fallback to sync
    const urlToUse = baseURL || configService.getBaseURLSync();
    return resolveImageUrlSync(path, urlToUse);
  };

  // Handle image loading error
  const handleImageError = (index, error) => {
    console.warn(`[FullDetailsScreen] Image ${index} failed:`, error?.error || 'Unknown error');
    setImageErrors((prev) => ({ ...prev, [index]: true }));
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
  const [reviewText, setReviewText] = useState("");
  const [hostCurrentAvatar, setHostCurrentAvatar] = useState(null);
  const [hostCurrentRating, setHostCurrentRating] = useState(null);
  const [hostTotalListings, setHostTotalListings] = useState(0);
  const [listingReviews, setListingReviews] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [isPostingReview, setIsPostingReview] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [userHasBooked, setUserHasBooked] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const imageScrollRef = useRef(null);
  const scrollViewRef = useRef(null);

  const loadListingData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const apiBaseURL = await configService.getBaseURL();
      setBaseURL(apiBaseURL);

      if (listingId) {
        console.log("[FullDetailsScreen] Fetching listing:", listingId);
        const result = await listingService.fetchListingById(listingId);
        console.log(
          "[FullDetailsScreen] Fetch result:",
          result?.success,
          result?.message,
        );

        if (result?.success && result?.listing) {
          const listingData = result.listing;
          setListing(listingData);

          // Fetch complete host data using centralized service
          try {
            const hostId = listingData.hostInfo?._id || listingData.host?._id;
            if (hostId) {
              const hostResult = await fetchHostData(hostId);
              if (hostResult.success && hostResult.avatar) {
                setHostCurrentAvatar(hostResult.avatar);
                console.log(
                  "[FullDetailsScreen] Host avatar fetched from profile:",
                  hostResult.avatar,
                );
              }
              if (hostResult.success && hostResult.hostData?.hostRating) {
                setHostCurrentRating(hostResult.hostData.hostRating);
              } else if (hostResult.error) {
                console.warn(
                  "[FullDetailsScreen] Could not fetch host data:",
                  hostResult.error,
                );
              }
            }
          } catch (hostError) {
            console.warn(
              "[FullDetailsScreen] Error fetching host data:",
              hostError,
            );
          }

          // Fetch host total listings count
          try {
            const hostId = listingData.hostInfo?._id || listingData.host?._id;
            if (hostId) {
              const listingsResult = await listingService.fetchAllListings({
                host: hostId,
                status: { $in: ["AVAILABLE", "BOOKED", "PENDING"] },
              });
              if (
                listingsResult?.success &&
                Array.isArray(listingsResult.listings)
              ) {
                setHostTotalListings(listingsResult.listings.length);
                console.log(
                  "[FullDetailsScreen] Host total listings:",
                  listingsResult.listings.length,
                );
              }
            }
          } catch (listingsError) {
            console.warn(
              "[FullDetailsScreen] Error fetching host listings:",
              listingsError,
            );
          }

          try {
            const reviewsResult =
              await bookingService.fetchListingReviews(listingId);
            if (reviewsResult.success) {
              setListingReviews(reviewsResult.reviews);
              console.log(
                "[FullDetailsScreen] Listing reviews fetched:",
                reviewsResult.reviews.length,
              );
            }
          } catch (reviewsError) {
            console.warn(
              "[FullDetailsScreen] Error fetching listing reviews:",
              reviewsError,
            );
          }
        } else {
          setError(result?.message || "Failed to load listing");
        }
      } else {
        setError("No listing ID provided");
      }
    } catch (err) {
      console.error("[FullDetailsScreen] Error loading listing:", err);
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    loadListingData();

    // Check if user is eligible to post a review
    const checkReviewEligibility = async () => {
      try {
        const myBookingsRes = await bookingService.fetchGuestBookings();
        if (myBookingsRes.success && myBookingsRes.bookings) {
          const completedUnreviewed = myBookingsRes.bookings.find(
            (b) =>
              (b.listing?._id === listingId || b.listing === listingId) &&
              b.status === "COMPLETED" &&
              (!b.guestReview ||
                !b.guestReview.rating ||
                b.guestReview.rating === 0),
          );
          setUserHasBooked(!!completedUnreviewed);
        }
      } catch (error) {
        console.warn(
          "[FullDetailsScreen] Error checking review eligibility:",
          error,
        );
      }
    };
    checkReviewEligibility();
  }, [listingId, loadListingData]);

  const handlePostReview = async (reviewData) => {
    if (!listingId) return;

    // Find the eligible booking ID
    let targetBookingId = null;
    try {
      const myBookingsRes = await bookingService.fetchGuestBookings();
      if (myBookingsRes.success && myBookingsRes.bookings) {
        const completedUnreviewed = myBookingsRes.bookings.find(
          (b) =>
            (b.listing?._id === listingId || b.listing === listingId) &&
            b.status === "COMPLETED" &&
            (!b.guestReview ||
              !b.guestReview.rating ||
              b.guestReview.rating === 0),
        );
        targetBookingId = completedUnreviewed?._id;
      }
    } catch (e) {
      console.warn("[FullDetailsScreen] Could not find booking for review:", e);
    }

    if (!targetBookingId) {
      console.warn("[FullDetailsScreen] No eligible booking found for review");
      return;
    }

    setIsPostingReview(true);
    try {
      let uploadedImageUrls = reviewData.images || [];

      // 1. Upload images if any
      if (reviewData.images && reviewData.images.length > 0) {
        console.log("[FullDetailsScreen] Uploading review images...");
        const uploadResult = await bookingService.uploadReviewImages(
          reviewData.images,
        );
        if (uploadResult.success && uploadResult.images) {
          uploadedImageUrls = uploadResult.images;
        } else {
          Alert.alert("Upload Failed", "Could not upload review images. Please try again.");
          setIsPostingReview(false);
          return;
        }
      }

      // 2. Submit review with uploaded URLs
      const result = await bookingService.submitReview(
        targetBookingId,
        reviewData.rating,
        reviewData.feedback,
        uploadedImageUrls,
      );

      if (result.success) {
        setShowReviewModal(false);
        setReviewText("");
        setUserHasBooked(false); // Can't review again
        // Refresh reviews
        const reviewsResult =
          await bookingService.fetchListingReviews(listingId);
        if (reviewsResult.success) {
          setListingReviews(reviewsResult.reviews);
        }
      }
    } catch (error) {
      console.error("[FullDetailsScreen] Posting review error:", error);
    } finally {
      setIsPostingReview(false);
    }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  const handleMessageHost = () => {
    // Message functionality is currently disabled
    // TODO: Enable when messaging feature is implemented
    console.log("Message host functionality is currently disabled");
  };

  // Get cover image from listing
  const getCoverImage = () => {
    if (listing?.images && listing.images.length > 0) {
      const firstImage = listing.images[0];
      if (typeof firstImage === "string") {
        return firstImage;
      } else if (firstImage?.url) {
        return firstImage.url;
      }
    }
    return null;
  };

  // Track last viewed listing for Home Explore screen re-ordering
  useEffect(() => {
    if (listing) {
      listingService.setLastViewedListing(listing);
    }
  }, [listing]);

  const handleBooking = async () => {
    try {
      let currentUser = (await getUserData()) || (await authService.getUserData()) || {};
      let profileData = (await profileService.getProfileData()) || {};

      let isKycVerified =
        currentUser?.verified === true ||
        currentUser?.kycStatus === "VERIFIED" ||
        currentUser?.kycStatus === "APPROVED" ||
        profileData?.verified === true ||
        profileData?.kycStatus === "VERIFIED" ||
        profileData?.kycStatus === "APPROVED";

      if (!isKycVerified) {
        try {
          const freshProfile = await authService.fetchProfile();
          const freshUser = freshProfile?.data || freshProfile?.body || freshProfile || {};
          if (freshUser && (freshUser.verified === true || freshUser.kycStatus === "VERIFIED" || freshUser.kycStatus === "APPROVED")) {
            isKycVerified = true;
          }
        } catch (err) {
          console.warn("[FullDetailsScreen] Live profile check error:", err);
        }
      }

      if (!isKycVerified) {
        setShowKycModal(true);
        return;
      }

      // Temporary Whitelist: Restrict booking pending host onboarding
      const userEmail = profileData?.email || profileData?.emailAddress || currentUser?.email || currentUser?.emailAddress;
      const ALLOWED_BOOKING_EMAILS = [
        "tayoakinnayajo@gmail.com",
        "tayoakinnayajo@gmail",
        "tayobabafemi@gmail.com",
        "techwithtayo@gmail.com",
        "rhodaalabi7@gmail.com",
        "adeboye.daniel17@gmail.com",
      ];
      const normalizedEmail = String(userEmail || "").trim().toLowerCase();
      const isAllowed = ALLOWED_BOOKING_EMAILS.some((allowed) => {
        const target = allowed.trim().toLowerCase();
        return normalizedEmail === target || normalizedEmail.startsWith(target);
      });

      if (!isAllowed) {
        Alert.alert(
          "Bookings Opening Soon",
          "Instant bookings are temporarily disabled while we onboard verified hosts. Please stay tuned!",
          [{ text: "OK" }]
        );
        return;
      }
    } catch (err) {
      console.warn("[FullDetailsScreen] Profile check error:", err);
    }

    router.push({
      pathname: "/select-booking-details",
      params: {
        listingId: listingId,
        propertyName: listing?.propertyName || "Property",
        price: listing?.price || 0,
        securityDeposit: listing?.securityDeposit || 0,
        location:
          listing?.location?.address || listing?.location?.city || "Nigeria",
        coverImage: getCoverImage(),
      },
    });
  };

  // Format price with currency and comma separators
  const formatPrice = (price) => {
    if (!price) return "₦0.00";
    const num = typeof price === "number" ? price : parseFloat(price);
    if (isNaN(num)) return "₦0.00";
    return formatCurrency(num);
  };

  // Format pricing period
  const formatPricingPeriod = (period) => {
    const periodMap = {
      night: "per Night",
      week: "per Week",
      month: "per Month",
      year: "per Year",
    };
    return periodMap[period?.toLowerCase()] || "per Night";
  };

  // Build location string from listing data (City, State, Country)
  const getLocationString = () => {
    if (!listing) return "Location not available";
    const city = (listing.city || listing.propertyLocation?.city || "").trim();
    const state = (listing.state || listing.propertyLocation?.state || "").trim();
    const country = (listing.country || listing.propertyLocation?.country || "Nigeria").trim();

    const parts = [];
    if (city) parts.push(city);
    if (state && !parts.some((p) => p.toLowerCase() === state.toLowerCase())) parts.push(state);
    if (country && !parts.some((p) => p.toLowerCase() === country.toLowerCase())) parts.push(country);

    if (parts.length > 0) return parts.join(", ");

    const fullAddress = (listing.propertyLocation?.fullAddress || listing.address || "").trim();
    if (fullAddress) {
      const addrParts = fullAddress.split(",").map((p) => p.trim()).filter(Boolean);
      if (addrParts.length > 1) return addrParts.slice(1).join(", ");
      return fullAddress;
    }
    return "Nigeria";
  };

  // Build images array from listing data
  const getPropertyImages = () => {
    if (!listing) return [];
    const images = listing.propertyImages || listing.images || [];
    return images
      .map((img) => {
        const url = convertImageUrl(img);
        return url ? { uri: url, type: "image" } : null;
      })
      .filter(Boolean);
  };

  // Build videos array from listing data
  const getPropertyVideos = () => {
    if (!listing) return [];
    const videos = listing.propertyVideos || listing.videos || [];
    return videos
      .map((vid) => {
        const url = convertImageUrl(vid);
        return url ? { uri: url, type: "video" } : null;
      })
      .filter(Boolean);
  };

  // Combine images and videos into media array
  const getPropertyMedia = () => {
    const images = getPropertyImages();
    const videos = getPropertyVideos();
    // Images first, then videos
    return [...images, ...videos];
  };

  // Build features from listing data
  const getFeatures = () => {
    if (!listing) return [];
    const features = [];
    if (listing.bedrooms)
      features.push({
        label: `${listing.bedrooms} Bedroom${listing.bedrooms > 1 ? "s" : ""}`,
      });
    if (listing.guests && listing.guests > 0)
      features.push({
        label: `${listing.guests} Guest${listing.guests > 1 ? "s" : ""}`,
      });
    if (listing.bathrooms)
      features.push({
        label: `${listing.bathrooms} Bathroom${listing.bathrooms > 1 ? "s" : ""}`,
      });

    // Add furnishing if available
    if (listing.furnishing) {
      features.push({
        label: toTitleCase(listing.furnishing),
      });
    }

    // Add some amenities as features if available
    if (listing.amenities && listing.amenities.length > 0) {
      listing.amenities.slice(0, 2).forEach((amenity) => {
        features.push({ label: formatAmenity(amenity) });
      });
    }
    return features;
  };

  // Property data derived from actual listing
  const propertyData = useMemo(
    () => ({
      id: listing?._id || listingId,
      title:
        listing?.propertyName || listing?.propertyTitle || "",
      location: getLocationString(),
      price: formatPrice(listing?.price || listing?.propertyPrice?.price),
      priceType: formatPricingPeriod(listing?.pricingPeriod),
      priceNote:
        listing?.securityDeposit > 0
          ? "Additional fees may apply"
          : "Contact host for additional fees",
      description: listing?.description || "No description available",
      propertyImages: getPropertyImages(),
      propertyMedia: getPropertyMedia(),
      features: getFeatures(),
      amenities: (listing?.amenities || []).map(formatAmenity),
      regulations: (() => {
        // Converted house rules and additional rules
        const houseRulesLabels = convertHouseRulesToLabels(listing?.houseRules);

        const additionalRulesArray = listing?.additionalRules
          ? typeof listing.additionalRules === "string"
            ? listing.additionalRules
                .split(",")
                .map((rule) => rule.trim())
                .filter((rule) => rule)
            : Array.isArray(listing.additionalRules)
              ? listing.additionalRules
                  .map((rule) => String(rule || "").trim())
                  .filter((rule) => rule)
              : [String(listing.additionalRules)]
          : [];

        return [...houseRulesLabels, ...additionalRulesArray].filter(
          (rule) => rule && rule.trim(),
        );
      })(),
      landmarks: listing?.landmarks || [],
      host: {
        name: listing?.hostInfo?.fullName || listing?.host?.fullName || "Host",
        totalListings: hostTotalListings || 0,
        rating: hostCurrentRating || listing?.hostInfo?.hostRating || null,
        isVerified: listing?.hostInfo?.hostApplicationStatus === "APPROVED",
        avatar: convertImageUrl(hostCurrentAvatar || listing?.hostInfo?.avatar || listing?.host?.avatar) || require("../../assets/images/no-image.png"),
      },
      averageRating: listing?.averageRating || 0,
      ratingCount: listing?.ratingCount || 0,
      rating: listing?.averageRating || null,
      isBooked: listing?.status === "BOOKED",
      reviews: listingReviews,
    }),
    [
      listing,
      listingId,
      hostTotalListings,
      hostCurrentRating,
      hostCurrentAvatar,
      listingReviews,
      getLocationString,
      getPropertyImages,
      getPropertyMedia,
      getFeatures,
      baseURL,
    ],
  );

  const renderWhatYouGetSection = () => {
    const features = propertyData.features;
    if (!features || features.length === 0) return null;

    return (
      <View style={styles.whatYouGetSection}>
        <Text style={styles.sectionTitle}>What you get</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.featuresScroll}
          contentContainerStyle={styles.whatYouGetContainer}
        >
          {features.map((feature, index) => {
            const IconComponent = getAmenityIcon(feature.label);
            return (
              <View key={index} style={styles.whatYouGetBox}>
                <IconComponent size={18} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.whatYouGetText}>{feature.label}</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const handleMediaScroll = useCallback((event) => {
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / MEDIA_ITEM_WIDTH);
    setCurrentImageIndex(index);
  }, []);

  // Handle image press to open full-screen viewer
  const handleImagePress = (index) => {
    setImageViewerIndex(index);
    setShowImageViewer(true);
  };

  // Get image URLs for the viewer (only images, not videos)
  const getImageUrlsForViewer = () => {
    const images = propertyData.propertyImages || [];
    return images
      .map((img) => {
        if (typeof img === "string") return img;
        if (img.uri) return img.uri;
        return null;
      })
      .filter(Boolean);
  };

  // Render each media item (image or video)
  const renderMediaItem = useCallback(
    ({ item, index }) => {
      const isActive = index === currentImageIndex;

      if (item.type === "video") {
        return <VideoPlayer uri={item.uri} isActive={isActive} />;
      }

      return (
        <Pressable
          style={styles.mediaItemContainer}
          onPress={() => handleImagePress(index)}
        >
          {imageErrors[index] ? (
            <View style={[StyleSheet.absoluteFillObject, styles.imageErrorContainer]}>
              <Ionicons name="image-outline" size={48} color="#CCC" />
              <Text style={styles.imageErrorText}>Image unavailable</Text>
            </View>
          ) : (
            <Image
              source={{ uri: item.uri }}
              style={[StyleSheet.absoluteFillObject]}
              contentFit="cover"
              onError={(error) => handleImageError(index, error)}
            />
          )}
        </Pressable>
      );
    },
    [currentImageIndex],
  );

  const renderMediaSlider = () => {
    const media =
      propertyData.propertyMedia && propertyData.propertyMedia.length > 0
        ? propertyData.propertyMedia
        : propertyData.propertyImages && propertyData.propertyImages.length > 0
          ? propertyData.propertyImages
          : [
              {
                uri: require("../../assets/images/no-image.png"),
                type: "image",
              },
            ];

    return (
      <View style={styles.mediaSliderSection}>
        <FlatList
          ref={imageScrollRef}
          data={media}
          renderItem={renderMediaItem}
          keyExtractor={(item, index) => `media-${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleMediaScroll}
          scrollEventThrottle={16}
          snapToInterval={MEDIA_ITEM_WIDTH}
          snapToAlignment="center"
          decelerationRate="fast"
          contentContainerStyle={styles.mediaSliderContent}
        />

        {/* Pagination Dots */}
        {media.length > 1 && (
          <View style={styles.paginationContainer}>
            {media.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === currentImageIndex && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        )}

        {/* Media Counter */}
        {media.length > 1 && (
          <View style={styles.mediaCounter}>
            <Text style={styles.mediaCounterText}>
              {currentImageIndex + 1}/{media.length}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Legacy function for backwards compatibility
  const renderImageCarousel = renderMediaSlider;

  const renderKeyAmenitiesSection = () => {
    if (!propertyData.amenities || propertyData.amenities.length === 0)
      return null;

    return (
      <View style={styles.keyAmenitiesSection}>
        <Text style={styles.sectionTitle}>Key Amenities</Text>
        <View style={styles.amenitiesContainer}>
          {propertyData.amenities.map((amenity, index) => (
            <View key={index} style={styles.amenityRow}>
              {(() => {
                const Icon = getAmenityIcon(amenity);
                return <Icon size={20} color="#010135" strokeWidth={2} />;
              })()}
              <Text style={styles.amenityText}>{amenity}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderRegulationsSection = () => {
    if (!propertyData.regulations || propertyData.regulations.length === 0)
      return null;

    return (
      <View style={styles.regulationsSection}>
        <Text style={styles.sectionTitle}>Regulations</Text>
        <View style={styles.regulationsContainer}>
          {propertyData.regulations.map((regulation, index) => (
            <View key={index} style={styles.regulationRow}>
              <Ionicons 
                name="checkmark-circle-outline" 
                size={16} 
                color="#010135" 
              />
              <Text style={styles.regulationText}>{regulation}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderLandmarkSection = () => {
    if (!propertyData.landmarks || propertyData.landmarks.length === 0)
      return null;

    return (
      <View style={styles.landmarkSection}>
        <Text style={styles.sectionTitle}>Landmarks</Text>
        <View style={styles.landmarkContainer}>
          {propertyData.landmarks.map((landmark, index) => (
            <View key={index} style={styles.landmarkRow}>
              <Ionicons 
                name="location-outline" 
                size={16} 
                color="#010135" 
              />
              <Text style={styles.landmarkText}>{landmark}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderHostSection = () => {
    // Get host avatar URL - prioritize fresh avatar from profile, fallback to listing
    const hostAvatarUrl = hostCurrentAvatar
      ? convertImageUrl(hostCurrentAvatar)
      : listing?.hostInfo?.avatar || listing?.host?.avatar
        ? convertImageUrl(listing.hostInfo?.avatar || listing.host?.avatar)
        : null;

    return (
      <Pressable style={styles.hostSection} onPress={handleMessageHost}>
        <View style={styles.hostContent}>
          {hostAvatarUrl ? (
            <Image
              source={{ uri: hostAvatarUrl }}
              style={styles.hostAvatarImage}
              contentFit="cover"
              cachePolicy="disk"
              transition={200}
            />
          ) : (
            <EllipseAvatar width={60} height={60} style={styles.hostAvatar} />
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
                  {propertyData.host.rating ? 
                    Number(propertyData.host.rating).toFixed(1) : 
                    "N/A"}
                </Text>
                <StarIcon width={14} height={14} fill="#FFD700" style={styles.ratingIcon} />
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
    );
  };

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

  const renderReviewsSection = () => {
    if (!propertyData.reviews || propertyData.reviews.length === 0) {
      return (
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>Guest Reviews</Text>
          <Text style={styles.noReviewsText}>No reviews yet</Text>
        </View>
      );
    }

    return (
      <View style={styles.reviewsSection}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={styles.sectionTitle}>
            Guest Reviews ({propertyData.reviews.length})
          </Text>
          {propertyData.averageRating > 0 && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={{ fontWeight: "700", fontSize: 16 }}>
                {propertyData.averageRating}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.reviewsContainer}>
          {(Array.isArray(propertyData.reviews) ? propertyData.reviews : [])
            .slice(0, 3)
            .map((review, index) => {
              const allReviewImages = [
                ...parseImages(review.images),
                ...parseImages(review.guestReview?.images)
              ];
              const reviewRating = review.rating || review.guestReview?.rating;
              
              return (
                <View key={index} style={styles.reviewCard}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    {renderStars(reviewRating)}
                    <Text style={styles.reviewAuthor}>
                      {review.reviewedAt || review.guestReview?.reviewedAt
                        ? new Date(review.reviewedAt || review.guestReview?.reviewedAt).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" },
                          )
                        : "Recently"}
                    </Text>
                  </View>
                  <Text style={styles.reviewText}>
                    &quot;{review.feedback && review.feedback.trim() ? review.feedback : (review.guestReview?.feedback && review.guestReview.feedback.trim() ? review.guestReview.feedback : `Rated ${reviewRating || 5} / 5 stars`)}&quot;
                  </Text>
                  {allReviewImages.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginTop: 8 }}
                    >
                      {allReviewImages.map((img, imgIdx) => {
                        const imgUrl = convertImageUrl(img) || require("../../assets/images/no-image.png");
                        return (
                          <Image
                            key={imgIdx}
                            source={typeof imgUrl === 'string' ? { uri: imgUrl } : imgUrl}
                            style={{
                              width: 60,
                              height: 60,
                              borderRadius: 6,
                              marginRight: 6,
                            }}
                          />
                        );
                      })}
                    </ScrollView>
                  )}
                  <Text style={styles.reviewAuthor}>
                    —{" "}
                    {maskGuestName(
                      review.reviewer?.fullName ||
                        review.author?.fullName ||
                        review.bookedBy?.fullName ||
                        "Anonymous",
                    )}
                  </Text>
                </View>
              );
            })}
        </View>
      </View>
    );
  };

  const renderSkeleton = () => {
    return (
      <View style={styles.skeletonContainer}>
        {/* Title & Location Skeleton */}
        <View style={styles.propertyInfoSection}>
          <Skeleton width="70%" height={24} style={{ marginBottom: 12 }} />
          <Skeleton width="40%" height={16} style={{ marginBottom: 16 }} />
          <Skeleton width="30%" height={24} style={{ marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
             <Skeleton width={100} height={28} borderRadius={6} />
             <Skeleton width={100} height={28} borderRadius={6} />
          </View>
        </View>

        {/* Tab Skeleton */}
        <View style={[styles.tabsContainer, { borderBottomWidth: 0 }]}>
          <Skeleton width="45%" height={40} borderRadius={0} />
          <Skeleton width="45%" height={40} borderRadius={0} />
        </View>

        {/* Media Slider Skeleton */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <Skeleton width="100%" height={280} borderRadius={16} />
        </View>

        {/* Description Skeleton */}
        <View style={styles.descriptionSection}>
          <Skeleton width="40%" height={20} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="60%" height={16} />
        </View>

        {/* Amenities Skeleton */}
        <View style={styles.keyAmenitiesSection}>
          <Skeleton width="50%" height={20} style={{ marginBottom: 16 }} />
          <View style={{ gap: 16 }}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Skeleton width={24} height={24} borderRadius={12} />
                <Skeleton width="40%" height={16} />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Header Area */}
      <View
        style={[
          styles.header,
          {
            paddingTop:
              Platform.OS === "android" ? insets.top + 10 : insets.top,
          },
        ]}
      >
        <Pressable style={styles.backButton} onPress={handleGoBack}>
          <ArrowLeftIcon width={24} height={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>Full Property Details</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        renderSkeleton()
      ) : listing ? (
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === "details" ? (
              <>
                {/* Property Info Section - Title, Location, Price, Price Note */}
                <View style={styles.propertyInfoSection}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title}>{propertyData.title}</Text>
                  </View>
                  <Text style={styles.location}>{propertyData.location}</Text>
                  <Text style={styles.price}>
                    {propertyData.price}{" "}
                    <Text style={styles.priceType}>
                      {propertyData.priceType}
                    </Text>
                  </Text>

                  {(listing.securityDeposit > 0 ||
                    listing.serviceCharge > 0) && (
                    <View style={styles.additionalFeesContainer}>
                      {listing.securityDeposit > 0 && (
                        <View style={styles.feeBadge}>
                          <Text style={styles.feeLabel}>Caution Fee: </Text>
                          <Text style={styles.feeValue}>
                            {formatPrice(listing.securityDeposit)}
                          </Text>
                        </View>
                      )}
                      {listing.serviceCharge > 0 && (
                        <View style={styles.feeBadge}>
                          <Text style={styles.feeLabel}>Service Charge: </Text>
                          <Text style={styles.feeValue}>
                            {formatPrice(listing.serviceCharge)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  <View style={styles.priceNoteContainer}>
                    <Text style={styles.priceNoteIcon}>ℹ️</Text>
                    <Text style={styles.priceNote}>
                      {propertyData.priceNote}
                    </Text>
                  </View>
                </View>

                {/* Tab Navigation INSIDE ScrollView so it scrolls with content */}
                <View style={styles.tabsContainer}>
                  {["details", "reviews"].map((tab) => (
                    <Pressable
                      key={tab}
                      style={[
                        styles.tab,
                        activeTab === tab && styles.activeTab,
                      ]}
                      onPress={() => setActiveTab(tab)}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          activeTab === tab && styles.activeTabText,
                        ]}
                      >
                        {tab === "details" ? "Details" : "Reviews"}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Image Carousel Section */}
                {renderImageCarousel()}

                {/* Description Section */}
                <View style={styles.descriptionSection}>
                  <Text style={styles.sectionTitle}>Description</Text>
                  <Text style={styles.descriptionText}>
                    {propertyData.description}
                  </Text>
                </View>

                {/* What You Get Section - Horizontal scrollable badges */}
                {renderWhatYouGetSection()}

                {/* Key Amenities Section */}
                {renderKeyAmenitiesSection()}

                {/* Regulations Section */}
                {renderRegulationsSection()}

                {/* Landmarks Section */}
                {renderLandmarkSection()}

                {/* Host Section */}
                {renderHostSection()}

                {/* Reviews Section snapshot */}
                {renderReviewsSection()}

                <View style={styles.bottomSpacer} />
              </>
            ) : (
              <>
                {/* Tab Navigation also in Reviews tab */}
                <View style={styles.tabsContainer}>
                  {["details", "reviews"].map((tab) => (
                    <Pressable
                      key={tab}
                      style={[
                        styles.tab,
                        activeTab === tab && styles.activeTab,
                      ]}
                      onPress={() => setActiveTab(tab)}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          activeTab === tab && styles.activeTabText,
                        ]}
                      >
                        {tab === "details" ? "Details" : "Reviews"}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Reviews Tab Content */}
                <View style={styles.reviewsContent}>
                  <Text style={styles.sectionTitle}>
                    Guest Reviews ({propertyData.reviews?.length || 0})
                  </Text>
                  <View style={styles.reviewsList}>
                    {propertyData.reviews && propertyData.reviews.length > 0 ? (
                      propertyData.reviews.map((review, index) => {
                        const allReviewImages = [
                          ...parseImages(review.images),
                          ...parseImages(review.guestReview?.images)
                        ];
                        const reviewFeedback = (review.feedback && review.feedback.trim()) || (review.guestReview?.feedback && review.guestReview.feedback.trim()) || review.text || `Rated ${reviewRating || 5} / 5 stars`;
                        const reviewerName = review.reviewer?.fullName || review.bookedBy?.fullName || "Anonymous";
                        const reviewDateStr = formatReviewDate(review.reviewedAt || review.guestReview?.reviewedAt);

                        return (
                          <View key={index} style={styles.reviewCardItem}>
                            <View>
                              <Text style={styles.reviewAuthor}>
                                {maskGuestName(reviewerName)}
                              </Text>
                              <Text style={styles.reviewDate}>
                                {reviewDateStr}
                              </Text>
                            </View>
                            <View style={{ marginBottom: 6 }}>
                              {renderStars(reviewRating)}
                            </View>
                            <Text style={styles.reviewTextTab}>
                              {reviewFeedback}
                            </Text>
                            {allReviewImages.length > 0 && (
                              <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={{ marginTop: 8 }}
                              >
                                {allReviewImages.map((img, imgIdx) => {
                                  const imgUrl = convertImageUrl(img) || require("../../assets/images/no-image.png");
                                  return (
                                    <Image
                                      key={imgIdx}
                                      source={typeof imgUrl === 'string' ? { uri: imgUrl } : imgUrl}
                                      style={{
                                        width: 70,
                                        height: 70,
                                        borderRadius: 8,
                                        marginRight: 8,
                                      }}
                                      contentFit="cover"
                                      cachePolicy="disk"
                                      transition={200}
                                    />
                                  );
                                })}
                              </ScrollView>
                            )}
                          </View>
                        );
                      })
                    ) : (
                      <Text style={styles.noReviewsText}>
                        No reviews yet. Be the first to leave a review!
                      </Text>
                    )}
                  </View>

                  {userHasBooked && (
                    <View style={styles.postReviewSection}>
                      <Text style={styles.sectionTitle}>
                        Your Experience Matters
                      </Text>
                      <Text style={styles.reviewHelpText}>
                        Help other guests by sharing your experience at this
                        property.
                      </Text>
                      <Pressable
                        style={styles.postReviewButtonLarge}
                        onPress={() => setShowReviewModal(true)}
                      >
                        <Text style={styles.postButtonText}>
                          Leave a Review
                        </Text>
                      </Pressable>
                    </View>
                  )}

                  <View style={styles.bottomSpacer} />
                </View>
              </>
            )}
          </ScrollView>

          {/* Book Button */}
          <View
            style={[
              styles.bookButtonContainer,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <Pressable
              style={[
                styles.bookButton,
                propertyData.isBooked && styles.bookButtonDisabled,
              ]}
              onPress={handleBooking}
              disabled={propertyData.isBooked}
            >
              <Text
                style={[
                  styles.bookButtonText,
                  propertyData.isBooked && styles.bookButtonTextDisabled,
                ]}
              >
                {propertyData.isBooked ? "Currently Booked" : "Book in style"}
              </Text>
            </Pressable>
          </View>

          {/* KYC Required Modal */}
          <KycRequiredModal
            visible={showKycModal}
            onClose={() => setShowKycModal(false)}
          />
        </View>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error || "Failed to load listing details"}
          </Text>
          <Pressable style={styles.retryButton} onPress={loadListingData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Modals */}
      <ReviewFeedbackModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSubmit={handlePostReview}
        isLoading={isPostingReview || isUploadingImages}
        guestName={propertyData.title}
        rating={reviewRating}
        isHost={false}
      />
      <ImageViewerModal
        visible={showImageViewer}
        images={getImageUrlsForViewer()}
        initialIndex={imageViewerIndex}
        onClose={() => setShowImageViewer(false)}
      />
      <VerifiedInfoOverlay
        visible={showVerifiedInfo}
        onClose={() => setShowVerifiedInfo(false)}
      />
    </View>
  );
};

// Video player component for the slider - defined outside to prevent infinite loops
const VideoPlayer = ({ uri, isActive }) => {
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
    <Pressable onPress={togglePlayPause} style={styles.mediaItemContainer}>
      <VideoView
        player={player}
        style={styles.videoPlayer}
        contentFit="cover"
        nativeControls={true}
        fullscreenOptions={{ autoEnterFullscreen: false }}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  skeletonContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#010135",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
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
  propertyInfoSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
    flex: 1,
  },
  location: {
    fontSize: 13,
    color: "#7C7C7C",
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#010135",
  },
  priceType: {
    fontSize: 12,
    fontWeight: "500",
    color: "#7C7C7C",
  },
  totalPrice: {
    fontSize: 16,
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
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F9F9F9",
    borderRadius: 6,
  },
  priceNoteIcon: {
    fontSize: 14,
  },
  priceNote: {
    fontSize: 11,
    color: "#292929",
    flex: 1,
  },
  descriptionSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 12,
    color: "#292929",
    lineHeight: 18,
  },
  whatYouGetSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  whatYouGetContainer: {
    flexDirection: "row",
    gap: 8,
  },
  featuresScroll: {
    marginTop: 8,
  },
  whatYouGetBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#010135",
    borderRadius: 20,
    justifyContent: "center",
  },
  whatYouGetText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  keyAmenitiesSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  amenitiesContainer: {
    gap: 12,
  },
  amenityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  amenityIcon: {
    fontSize: 16,
    color: "#010135",
    fontWeight: "bold",
    minWidth: 24,
  },
  amenityText: {
    fontSize: 12,
    color: "#292929",
    flex: 1,
  },
  regulationsSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  regulationsContainer: {
    gap: 12,
  },
  regulationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  regulationText: {
    fontSize: 12,
    color: "#292929",
    flex: 1,
  },
  landmarkSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  landmarkContainer: {
    gap: 12,
  },
  landmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  landmarkText: {
    fontSize: 12,
    color: "#292929",
    flex: 1,
  },
  hostSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
    backgroundColor: "#F6F6F6",
    gap: 12,
  },
  hostContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  hostAvatar: {
    width: 60,
    height: 60,
    marginTop: 2,
    borderRadius: 30,
    resizeMode: "cover",
  },
  hostAvatarImage: {
    width: 60,
    height: 60,
    marginTop: 2,
    borderRadius: 30,
  },
  hostInfo: {
    flex: 1,
    gap: 6,
  },
  hostedByLabel: {
    fontSize: 10,
    color: "#666",
    fontWeight: "500",
    marginBottom: 2,
  },
  hostName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
  },
  hostListings: {
    fontSize: 12,
    fontWeight: "500",
    color: "#292929",
  },
  hostRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
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
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000000",
  },
  ratingIcon: {
    fontSize: 14,
  },
  hostActions: {
    flexDirection: "column",
    gap: 10,
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  reviewsSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  reviewsContainer: {
    gap: 12,
  },
  noReviewsText: {
    fontSize: 14,
    color: "#999999",
    textAlign: "center",
    paddingVertical: 20,
  },
  reviewCard: {
    backgroundColor: "#F6F6F6",
    padding: 12,
    borderRadius: 6,
    gap: 8,
  },
  reviewText: {
    fontSize: 12,
    color: "#292929",
    lineHeight: 18,
    fontWeight: "500",
  },
  reviewAuthor: {
    fontSize: 11,
    color: "#7C7C7C",
  },
  bookButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
    backgroundColor: "#FFFFFF",
  },
  bookButton: {
    backgroundColor: "#010135",
    paddingVertical: 14,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  bookButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bookButtonTextDisabled: {
    color: "#9CA3AF",
  },
  bottomSpacer: {
    height: 20,
  },
  // New Media Slider Styles
  mediaSliderSection: {
    marginVertical: 16,
    position: "relative",
  },
  mediaSliderContent: {
    paddingHorizontal: 16,
  },
  mediaItemContainer: {
    width: MEDIA_ITEM_WIDTH,
    height: MEDIA_ITEM_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F0F0F0",
    position: "relative",
  },
  imageErrorContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  imageErrorText: {
    marginTop: 8,
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  videoPlayer: {
    width: "100%",
    height: "100%",
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  videoIndicator: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D1D5DB",
  },
  paginationDotActive: {
    backgroundColor: "#010135",
    width: 24,
  },
  mediaCounter: {
    position: "absolute",
    bottom: 20,
    right: 24,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  mediaCounterText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  // Legacy carousel styles (kept for backwards compatibility)
  imageCarouselSection: {
    marginVertical: 16,
    position: "relative",
  },
  imageScroller: {
    height: 300,
  },
  carouselImage: {
    width: 360,
    height: 300,
  },
  imageCounter: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  imageCounterText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  // Tab styles
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#010135",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7C7C7C",
  },
  activeTabText: {
    color: "#010135",
  },
  // Review styles
  reviewsContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  reviewsList: {
    marginBottom: 20,
  },
  reviewCardItem: {
    backgroundColor: "#F6F6F6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  reviewAuthorTab: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000000",
  },
  reviewDate: {
    fontSize: 11,
    color: "#999999",
  },
  reviewTextTab: {
    fontSize: 12,
    color: "#292929",
    lineHeight: 18,
  },
  postReviewSection: {
    gap: 12,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 13,
    color: "#000000",
    textAlignVertical: "top",
  },
  postButton: {
    backgroundColor: "#010135",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  postButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  reviewHelpText: {
    fontSize: 12,
    color: "#7C7C7C",
    marginBottom: 8,
  },
  postReviewButtonLarge: {
    backgroundColor: "#010135",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  reviewRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  hostRatingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#010135",
  },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  reviewerAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  reviewerInitial: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  reviewImageThumb: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 8,
  },
  reviewImagesScroll: {
    marginTop: 10,
  },
});

export default FullDetailsScreen;
