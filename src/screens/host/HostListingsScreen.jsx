import { useFocusEffect } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import ChecksDoubleIcon from "../../assets/icons/listing/checks-double-v.svg";
import InfoIcon from "../../assets/icons/listing/circle-info.svg";
import CloseIcon from "../../assets/icons/listing/close-x.svg";
import ArrowDownIcon from "../../assets/icons/listing/vuesax/linear/arrow-3.svg";
import PauseIcon from "../../assets/icons/listing/vuesax/linear/pause-circle.svg";
import RefreshIcon from "../../assets/icons/listing/vuesax/linear/refresh-2.svg";
import TrashIcon from "../../assets/icons/listing/vuesax/linear/trash-1.svg";
import CalendarIcon from "../../assets/icons/listing/vuesax/outline/calendar.svg";
import ChartIcon from "../../assets/icons/listing/vuesax/outline/chart-square.svg";
import ClockIcon from "../../assets/icons/listing/vuesax/outline/clock.svg";
import EditIcon from "../../assets/icons/listing/vuesax/outline/edit.svg";
import HomeIcon from "../../assets/icons/navbar/HomeIcon.svg";


import {
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Context
import { USER_MODES, useUserMode } from "../../context";

// Services
import Toast from "../../components/common/Toast";
import configService from "../../services/configService";
import draftListingService from "../../services/draftListingService";
import listingService from "../../services/listingService";
import * as ImageUtils from "../../utils/imageUtils";

// Icons
import { Plus, ChevronLeft } from "lucide-react-native";
import { HostListingSkeleton } from "../../components/skeletons";

// Status Badge configuration removed local SVG definitions here as we use Lucide now

// Filter tab options for Host Listings
const FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "booked", label: "Booked" },
  { id: "for_rent", label: "For Rent" },
  { id: "for_sale", label: "For Sale" },
  { id: "pending", label: "Pending" },
  { id: "expired", label: "Expired" },
  { id: "drafts", label: "Drafts" },
  { id: "promotion", label: "Promotions" },
];

// Listing status configs
const STATUS_CONFIG = {
  LIVE: { label: "LIVE", color: "#31EB3D", bgColor: "rgba(0, 0, 0, 0.6)" },
  AVAILABLE: { label: "LIVE", color: "#31EB3D", bgColor: "rgba(0, 0, 0, 0.6)" }, // Backend uses AVAILABLE, UI shows LIVE
  ACTIVE: { label: "LIVE", color: "#31EB3D", bgColor: "rgba(0, 0, 0, 0.6)" }, // Also handle ACTIVE status
  PENDING: {
    label: "PENDING",
    color: "#FDAE31",
    bgColor: "rgba(0, 0, 0, 0.6)",
  },
  DRAFT: { label: "DRAFT", color: "#6371F1", bgColor: "rgba(0, 0, 0, 0.6)" },
  UNLISTED: { label: "UNLISTED", color: "#94A3B8", bgColor: "rgba(0, 0, 0, 0.6)" },
  EXPIRED: {
    label: "EXPIRED",
    color: "#FFFFFF",
    bgColor: "rgba(0, 0, 0, 0.6)",
  },
  PAUSED: { label: "PAUSED", color: "#FD3131", bgColor: "rgba(0, 0, 0, 0.6)" },
  SUSPENDED: {
    label: "PAUSED",
    color: "#FD3131",
    bgColor: "rgba(0, 0, 0, 0.6)",
  },
  REJECTED: {
    label: "REJECTED",
    color: "#FD3131",
    bgColor: "rgba(0, 0, 0, 0.6)",
  },
  BOOKED: {
    label: "BOOKED",
    color: "#DB2777",
    bgColor: "rgba(0, 0, 0, 0.6)",
  },
};

// Amenities mapping (label to ID) - reverse of what's in review.jsx
const AMENITIES_LABEL_TO_ID = {
  "Walk-In Closet": "walk_in_closet",
  Balcony: "balcony",
  "Air Conditioning (AC)": "ac",
  "Heating System": "heating",
  "Washer/Dryer": "washer",
  "Full Kitchen": "kitchen",
  "Fully Furnished": "furnished",
  "24/7 Security": "security_24_7",
  "CCTV Surveillance": "cctv",
  "Gated Compound": "gated",
  "Electronic Door Lock": "electronic_lock",
  "Intercom System": "intercom",
  Inverter: "inverter",
  Generator: "generator",
  "Solar Power": "solar",
  "Borehole Water": "borehole",
  "Water Heater": "water_heater",
  WiFi: "wifi",
  "Smart TV": "smart_tv",
  "Cable/Satellite TV": "cable",
  "Dedicated Workspace": "workspace",
  "Swimming Pool": "pool",
  "Gym/Fitness Center": "gym",
  "Garden/Lawn": "garden",
  "Rooftop Access": "rooftop",
  "Parking Space": "parking",
};

// Helper function to convert amenity label to ID
const getAmenityId = (label) => {
  if (!label) return null;
  // First try exact match
  if (AMENITIES_LABEL_TO_ID[label]) {
    return AMENITIES_LABEL_TO_ID[label];
  }
  // Try lowercase matching
  const lowerLabel = label.toLowerCase();
  for (const [mapLabel, id] of Object.entries(AMENITIES_LABEL_TO_ID)) {
    if (mapLabel.toLowerCase() === lowerLabel) {
      return id;
    }
  }
  // If no match found, return the label as-is (might be a custom amenity)
  return label;
};

// Convert array of amenity labels to IDs
const convertAmenitiesToIds = (amenities) => {
  if (!Array.isArray(amenities)) return [];
  return amenities.map(getAmenityId).filter(Boolean);
};

// Icons
// Legacy icon definitions removed

// Demo property image removed as per requirement for strict data display
// const DEMO_PROPERTY_IMAGE = require("../../assets/images/prop_image.png");

/**
 * Status Badge Component
 */
const StatusBadge = ({ status }) => {
  const upperStatus = status ? status.toUpperCase() : "DRAFT";
  const config = STATUS_CONFIG[upperStatus] || STATUS_CONFIG[status] || STATUS_CONFIG.UNLISTED;
  // Normalize status for icon display (AVAILABLE/ACTIVE → LIVE)
  const normalizedStatus =
    upperStatus === "AVAILABLE" || upperStatus === "ACTIVE" ? "LIVE" : upperStatus;

  return (
    <View style={styles.statusBadge}>
      <View style={styles.statusBadgeContent}>
        {normalizedStatus === "LIVE" && (
          <ChecksDoubleIcon width={14} height={14} color={config.color} />
        )}
        {normalizedStatus === "PENDING" && <ClockIcon width={14} height={14} color={config.color} />}
        {normalizedStatus === "DRAFT" && <EditIcon width={14} height={14} color={config.color} />}
        {normalizedStatus === "UNLISTED" && <InfoIcon width={14} height={14} color={config.color} />}
        {normalizedStatus === "EXPIRED" && (
          <RefreshIcon width={14} height={14} color={config.color} />
        )}
        {(normalizedStatus === "PAUSED" ||
          normalizedStatus === "SUSPENDED") && (
          <PauseIcon width={14} height={14} color={config.color} />
        )}
        {normalizedStatus === "REJECTED" && <InfoIcon width={14} height={14} color={config.color} />}
        {normalizedStatus === "BOOKED" && (
          <ChecksDoubleIcon width={14} height={14} color="#DB2777" />
        )}
        <Text style={[styles.statusText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    </View>
  );
};

/**
 * Listing Card Component
 */
const ListingCard = ({
  listing,
  cardWidth,
  onEdit,
  onDelete,
  onPause,
  onView,
  onCalendar,
  onCardPress,
}) => {
  const router = useRouter();
  // Normalize status - AVAILABLE/ACTIVE are treated as LIVE
  const upperStatus = listing.status ? listing.status.toUpperCase() : "DRAFT";
  const normalizedStatus =
    upperStatus === "AVAILABLE" || upperStatus === "ACTIVE"
      ? "LIVE"
      : upperStatus;
  const isLive = normalizedStatus === "LIVE";
  const isPending = normalizedStatus === "PENDING";
  const isDraft = normalizedStatus === "DRAFT";
  const isUnlisted = normalizedStatus === "UNLISTED";
  const isExpired = normalizedStatus === "EXPIRED";
  const isPaused =
    normalizedStatus === "PAUSED" || normalizedStatus === "SUSPENDED";
  const isRejected = normalizedStatus === "REJECTED";
  const isBooked = normalizedStatus === "BOOKED";

  // Helper function to capitalize first letter
  const capitalizeFirst = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Helper function to capitalize each word
  const capitalizeWords = (str) => {
    if (!str) return "";
    return str
      .split(" ")
      .map((word) => capitalizeFirst(word))
      .join(" ");
  };

  // Format price with K/M suffixes for large numbers
  const formatPriceWithSuffix = (price) => {
    if (!price) return "0";
    const num = typeof price === "number" ? price : parseFloat(price);
    if (num >= 1000000) {
      const millions = num / 1000000;
      return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
    }
    if (num >= 1000) {
      const thousands = num / 1000;
      return thousands % 1 === 0 ? `${thousands}K` : `${thousands.toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  // Format pricing period for display
  const formatPricingPeriod = (period) => {
    if (!period) return "Night";
    const periodMap = {
      night: "Night",
      Night: "Night",
      week: "Week",
      Week: "Week",
      month: "Month",
      Month: "Month",
      year: "Year",
      Year: "Year",
      daily: "Night",
      Daily: "Night",
      weekly: "Week",
      Weekly: "Week",
      monthly: "Month",
      Monthly: "Month",
      yearly: "Year",
      Yearly: "Year",
    };
    return periodMap[period] || capitalizeFirst(period);
  };

  // Use uploaded cover image if available (draft or live), otherwise fallback to prop_image.png placeholder
  const getCoverImage = () => {
    let raw = listing?.image || listing?.coverImage || listing?.photos?.[0] || listing?.images?.[0] || listing?.propertyImages?.[0];
    if (typeof raw === "object" && raw) {
      raw = raw.url || raw.uri || raw.path || null;
    }
    if (typeof raw === "string" && raw.trim()) {
      return { uri: raw };
    }
    return require("../../assets/images/prop_image.png");
  };

  const imageSource = getCoverImage();

  const handleCardPress = () => {
    if (onCardPress) {
      onCardPress(listing);
    } else {
      // Navigate to preview screen
      try {
        const images =
          listing.photos && listing.photos.length > 0
            ? listing.photos
            : listing.images && listing.images.length > 0
              ? listing.images
              : listing.propertyImages && listing.propertyImages.length > 0
                ? listing.propertyImages
                : listing.image
                  ? [listing.image]
                  : [];

        router.push({
          pathname: "/listing-preview",
          params: {
            listingId: listing.id || "unknown",
            propertyName:
              listing.propertyName || listing.title || "Untitled Property",
            title: listing.title || listing.propertyName || "Untitled Property",
            propertyType: listing.propertyType || "Property",
            price: (listing.price || 0).toString(),
            location: listing.location || "No location",
            images: JSON.stringify(images),
            priceLabel: "₦",
            period: listing.priceUnit || listing.pricingPeriod || "Night",
            status: listing.status || "LIVE",
            isHost: "true",
            description: listing.description || "",
            bedrooms: (listing.bedrooms || 0).toString(),
            bathrooms: (listing.bathrooms || 0).toString(),
            guests: (listing.guests || 0).toString(),
            amenities: JSON.stringify(listing.amenities || []),
            regulations: JSON.stringify(listing.regulations || []),
            landmarks: JSON.stringify(listing.landmarks || []),
            rating: (listing.rating || 0).toString(),
            isVerified: (listing.isVerified || false).toString(),
            available: (listing.available !== false).toString(),
            // Additional fields for complete detail view
            houseRules: listing.houseRules || "",
            additionalRules: listing.additionalRules || "",
            features: JSON.stringify(listing.features || []),
            checkInTime: listing.checkInTime || "",
            checkOutTime: listing.checkOutTime || "",
            securityDeposit: (listing.securityDeposit || 0).toString(),
            serviceCharge: (listing.serviceCharge || 0).toString(),
            cleaningFee: (listing.cleaningFee || 0).toString(),
            instantBooking: (listing.instantBooking || false).toString(),
            address: listing.address || "",
            city: listing.city || "",
            state: listing.state || "",
            propertyVideos: JSON.stringify(listing.propertyVideos || []),
            video: listing.propertyVideos?.[0] || "",
          },
        });
      } catch (error) {
        console.error("Error navigating to preview:", error);
      }
    }
  };

  return (
    <Pressable
      style={[styles.listingCard, { width: cardWidth }]}
      onPress={handleCardPress}
    >
      {/* Property Image with Status Badge */}
      <View style={styles.imageContainer}>
        <ImageBackground
          source={imageSource}
          style={styles.propertyImage}
          imageStyle={styles.propertyImageStyle}
        />
        {/* Status Badge on image */}
        <View style={styles.statusBadgeWrapper}>
          <StatusBadge status={listing.status} />
        </View>
      </View>

      {/* Listing Details */}
      <View style={styles.listingDetails}>
        {/* Labels */}
        <View style={styles.labelsRow}>
          <View style={styles.labelBadge}>
            <Text style={styles.labelText}>
              {capitalizeWords(listing.listingType)}
            </Text>
          </View>
          <View style={styles.labelBadge}>
            <Text style={styles.labelText}>
              {formatPricingPeriod(listing.rentalType)}
            </Text>
          </View>
        </View>

        {/* Property Info */}
        <View style={styles.propertyInfoContainer}>
          <Text style={styles.propertyName} numberOfLines={1}>
            {capitalizeWords(listing.propertyName)}
          </Text>
          <View style={styles.propertyMeta}>
            <Text style={styles.propertyType}>
              {capitalizeFirst(listing.propertyType)} •
            </Text>
            <Text style={styles.propertyLocation} numberOfLines={2}>
              {capitalizeWords(listing.location)}
            </Text>
          </View>
        </View>

        {/* Property Details - Bedroom, Bathroom, Amenities */}
        <View style={styles.propertyDetailsRow}>
          {listing.bedrooms > 0 && (
            <View style={styles.detailItem}>
              <Text style={styles.detailText}>{listing.bedrooms} Bed</Text>
            </View>
          )}
          {listing.bathrooms > 0 && (
            <View style={styles.detailItem}>
              <Text style={styles.detailText}>{listing.bathrooms} Bath</Text>
            </View>
          )}
          {Array.isArray(listing.amenities) && listing.amenities.length > 0 && (
            <View style={styles.detailItem}>
              <Text style={styles.detailText}>
                {listing.amenities.slice(0, 1).map((amenity, index) => (
                  <Text key={index}>{amenity}</Text>
                ))}
              </Text>
            </View>
          )}
        </View>

        {/* Price */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            ₦{formatPriceWithSuffix(listing.price)}
          </Text>
          <Text style={styles.priceUnit}>
            per {formatPricingPeriod(listing.priceUnit)}
          </Text>
        </View>

        {/* Action Buttons at bottom of card */}
        <View style={styles.cardActionsRow}>
          {/* Live or Booked listings: edit, calendar, chart, pause, delete */}
          {(isLive || isBooked) && (
            <>
              <TouchableOpacity
                style={styles.cardActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
              >
                <EditIcon width={20} height={20} color="#6D6D6D" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onCalendar?.();
                }}
              >
                <CalendarIcon width={20} height={20} color="#6D6D6D" />
              </TouchableOpacity>
              <View style={[styles.cardActionButton, styles.disabledButton]}>
                <ChartIcon width={20} height={20} color="#6D6D6D" />
              </View>
              <TouchableOpacity
                style={styles.cardActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onPause?.();
                }}
              >
                <PauseIcon width={20} height={20} color="#6D6D6D" />
              </TouchableOpacity>
            </>
          )}

          {/* Pending listings: edit, calendar, delete */}
          {isPending && (
            <>
              <TouchableOpacity
                style={styles.cardActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
              >
                <EditIcon width={20} height={20} color="#6D6D6D" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onCalendar?.();
                }}
              >
                <CalendarIcon width={20} height={20} color="#6D6D6D" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
              >
                <TrashIcon width={20} height={20} color="#FD3131" />
              </TouchableOpacity>
            </>
          )}

          {/* Draft listings: edit, delete */}
          {isDraft && (
            <>
              <TouchableOpacity
                style={styles.cardActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
              >
                <EditIcon width={20} height={20} color="#6D6D6D" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
              >
                <TrashIcon width={20} height={20} color="#FD3131" />
              </TouchableOpacity>
            </>
          )}

          {/* Expired listings: refresh, delete */}
          {isExpired && (
            <>
              <TouchableOpacity
                style={styles.cardActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
              >
                <RefreshIcon width={20} height={20} color="#6D6D6D" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
              >
                <TrashIcon width={20} height={20} color="#FD3131" />
              </TouchableOpacity>
            </>
          )}

          {/* Paused listings: edit, play/resume, delete */}
          {isPaused && (
            <>
              <TouchableOpacity
                style={styles.cardActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
              >
                <EditIcon width={20} height={20} color="#6D6D6D" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onPause?.();
                }}
              >
                <RefreshIcon width={20} height={20} color="#6D6D6D" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
              >
                <TrashIcon width={20} height={20} color="#FD3131" />
              </TouchableOpacity>
            </>
          )}

          {/* Rejected listings: edit, delete */}
          {isRejected && (
            <>
              <TouchableOpacity
                style={styles.cardActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
              >
                <EditIcon width={20} height={20} color="#6D6D6D" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
              >
                <TrashIcon width={20} height={20} color="#FD3131" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
};

/**
 * Filter Tab Component
 */
const FilterTab = ({ tab, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.filterTab, isActive && styles.filterTabActive]}
    onPress={onPress}
  >
    <Text
      style={[styles.filterTabText, isActive && styles.filterTabTextActive]}
    >
      {tab.label}
    </Text>
    {isActive && <View style={styles.activeIndicator} />}
  </TouchableOpacity>
);

/**
 * Empty State Component
 */
const EmptyState = ({ onCreateListing }) => (
  <View style={styles.emptyContainer}>
    <HomeIcon width={80} height={80} color="#CCCCCC" />
    <Text style={styles.emptyTitle}>No Listings Yet</Text>
    <Text style={styles.emptySubtext}>
      Start earning by listing your property on Lunest
    </Text>
    <TouchableOpacity
      style={styles.createEmptyButton}
      onPress={onCreateListing}
    >
      <Text style={styles.createEmptyButtonText}>
        Create Your First Listing
      </Text>
    </TouchableOpacity>
  </View>
);

/**
 * Promotion Empty State Component
 */
const PromotionEmptyState = ({ onPromoteListing }) => (
  <View style={styles.emptyContainer}>
    <ChartIcon width={80} height={80} color="#CCCCCC" />
    <Text style={styles.emptyTitle}>No Promotions Yet</Text>
    <Text style={styles.emptySubtext}>
      Boost your listings to get more visibility and bookings
    </Text>
    <TouchableOpacity
      style={styles.createEmptyButton}
      onPress={onPromoteListing}
    >
      <Text style={styles.createEmptyButtonText}>Promote a Listing</Text>
    </TouchableOpacity>
  </View>
);

/**
 * Listing Tips Overlay
 */
const ListingTipsOverlay = ({ visible, onClose }) => {
  const tips = [
    "Keep your property details fresh and competitive.",
    "Use high-quality images (10+ recommended)",
    "Shortlets do better with daily/weekly pricing",
    "Activate virtual tour to attract 30% more views",
    "Listings with verified documents gets trust badges",
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalContentResponsive}>
            {/* Close Button */}
            <Pressable style={styles.modalCloseButton} onPress={onClose}>
              <CloseIcon width={24} height={24} color="#292929" />
            </Pressable>
            {/* Title */}
            <Text style={styles.modalTitle}>Listing Tips?</Text>
            {/* Tips List */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.tipsContainer}
              showsVerticalScrollIndicator={false}
            >
              {tips.map((tip, index) => (
                <View key={index} style={styles.tipItem}>
                  <View style={styles.tipIconContainer}>
                    <ChecksDoubleIcon width={18} height={18} color="#010135" />
                  </View>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </ScrollView>
            {/* Action Button (example, can be customized) */}
            <TouchableOpacity
              style={styles.modalActionButton}
              onPress={onClose}
              accessibilityRole="button"
              activeOpacity={0.8}
            >
              <Text style={styles.modalActionButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

/**
 * Host Listings Screen
 */
const HostListingsScreen = () => {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const cardWidth = (width - 40 - 15) / 2; // 2 columns with 20px padding each side and 15px gap

  const { currentMode, toggleMode } = useUserMode();
  const side = currentMode === USER_MODES.HOST ? "host" : "guest";

  const [selectedFilter, setSelectedFilter] = useState(params.filter || "all");
  const [showTipsModal, setShowTipsModal] = useState(false);
  
  const queryClient = useQueryClient();

  // TanStack Query for host listings
  const { 
    data: formattedListings = [], 
    isLoading: listingsLoading, 
    isRefetching: listingsRefetching,
    error: queryError,
    refetch: refetchListings 
  } = useQuery({
    queryKey: ['hostListings'],
    queryFn: async () => {
      console.log("🔄 [HostListings] Fetching via TanStack Query...");
      const baseURL = await configService.getBaseURL();
      const result = await listingService.fetchUserListings();
      
      if (!result.success) {
        throw new Error(result.message || "Failed to load listings");
      }

      const fetchedListings = result.listings || [];
      
      // Transform API data to match component format
      return fetchedListings.map((listing) => {
        // Convert property images to full URLs
        const processedImages = (listing.propertyImages || [])
          .map((img) => {
            const imagePath = typeof img === 'string' ? img : img?.url;
            return ImageUtils.resolveImageUrlSync(imagePath, baseURL);
          })
          .filter(Boolean);

        const propertyTitle = listing.propertyName || listing.propertyTitle || listing.title || "Untitled Property";
        
        const locationCity = listing.city || listing.propertyLocation?.city || listing.address?.city || null;
        const locationState = listing.state || listing.propertyLocation?.state || listing.address?.state || null;
        const fullAddress = listing.propertyLocation?.fullAddress || (typeof listing.address === 'string' ? listing.address : null);

        let displayLocation = "No location";
        if (fullAddress) {
          displayLocation = fullAddress.length > 50 ? (fullAddress.split(',')[0] || fullAddress.substring(0, 45) + "...") : fullAddress;
        } else if (locationCity && locationState) {
          displayLocation = `${locationCity}, ${locationState}`;
        } else if (locationCity || locationState || listing.location) {
          displayLocation = locationCity || locationState || listing.location;
        } else {
          displayLocation = "Nigeria";
        }

        return {
          id: listing._id,
          propertyName: propertyTitle,
          title: propertyTitle,
          propertyType: listing.propertyType || "Property",
          location: displayLocation,
          listingType: listing.intent === "SALE" ? "For Sale" : "For Rent",
          rentalType: listing.pricingPeriod || "Daily",
          price: listing.price || listing.propertyPrice?.price || 0,
          priceUnit: listing.pricingPeriod || "Night",
          pricingPeriod: listing.pricingPeriod || "night",
          status: listing.status ? listing.status.toUpperCase() : "PENDING",
          isDraft: listing.status === "DRAFT" || listing.isDraft === true,
          image: processedImages[0] || null,
          images: processedImages,
          description: listing.description || "",
          bedrooms: listing.bedrooms || 0,
          bathrooms: listing.bathrooms || 0,
          guests: listing.guests || 1,
          amenities: listing.amenities || [],
          regulations: listing.regulations || [],
          landmarks: listing.landmarks || [],
          createdAt: listing.createdAt,
          updatedAt: listing.updatedAt,
          houseRules: listing.houseRules || "",
          additionalRules: listing.additionalRules || "",
          features: listing.features || [],
          checkInTime: listing.checkInTime || "",
          checkOutTime: listing.checkOutTime || "",
          securityDeposit: listing.securityDeposit || 0,
          serviceCharge: listing.serviceCharge || 0,
          cleaningFee: listing.cleaningFee || 0,
          instantBooking: listing.instantBooking || false,
          address: listing.address || "",
          city: locationCity || "",
          state: locationState || "",
        };
      });
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Soft refresh whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("📍 [HostListings] Screen focused - triggering soft refresh...");
      refetchListings();
      // Optional: also reload drafts
      loadDrafts();
    }, [refetchListings])
  );

  const [draftListings, setDraftListings] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [listingToDelete, setListingToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [listingToEdit, setListingToEdit] = useState(null);
  const [editDraftLoading, setEditDraftLoading] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [listingToPause, setListingToPause] = useState(null);
  const [pauseLoading, setPauseLoading] = useState(false);

  // Pull to refresh
  const onRefresh = () => {
    loadDrafts();
    refetchListings();
  };

  // Handle filter param changes separately
  useEffect(() => {
    if (params.filter) {
      setSelectedFilter(params.filter);
    }
  }, [params.filter]);

  // Use toggleMode from context to switch side
  const handleSwitchSide = async () => {
    try {
      const success = await toggleMode();
      if (success) {
        // Navigate based on new mode
        const newMode =
          currentMode === USER_MODES.HOST ? USER_MODES.GUEST : USER_MODES.HOST;
        router.replace(
          newMode === USER_MODES.HOST ? "/(host-tabs)" : "/(tabs)",
        );
      }
    } catch (error) {
      console.error("Error switching side:", error);
      setToastMessage("Failed to switch mode");
      setShowToast(true);
    }
  };

  // Handle draft saved toast separately
  useEffect(() => {
    if (params.showDraftSaved === "true") {
      setToastMessage("Your listing has been saved as a draft");
      setShowToast(true);
    }
  }, [params.showDraftSaved]);

  const loadDrafts = async () => {
    try {
      setDraftListings([]); // Clear current drafts state to ensure we're not seeing stale data during fetch
      // Sync drafts from backend (solves cross-device drafts issue)
      const drafts = await draftListingService.mergeWithRemoteDrafts();
      // Ensure drafts is an array
      if (!Array.isArray(drafts)) {
        console.warn("Drafts is not an array:", drafts);
        setDraftListings([]);
        return;
      }
      // Filter out incomplete drafts (those with no meaningful data)
      const validDrafts = drafts.filter((draft) => {
        if (!draft || (!draft.draftId && !draft._id && !draft.id)) return false;
        
        const hasTitle = (draft.propertyName || draft.propertyTitle || draft.title) &&
                         draft.propertyTitle !== "Untitled Draft";
        const hasLocation = draft.city || draft.state || draft.address || draft.location;
        const hasPhotos = (draft.photos && (Array.isArray(draft.photos) ? draft.photos.length > 0 : true)) ||
                          (draft.propertyImages && (Array.isArray(draft.propertyImages) ? draft.propertyImages.length > 0 : true)) ||
                          (draft.images && (Array.isArray(draft.images) ? draft.images.length > 0 : true));
        const hasType = (draft.propertyType || draft.category || draft.subCategory || draft.propertyCategory) && draft.propertyType !== "Unknown";
        const hasPrice = Number(draft.price) > 0 || (draft.propertyPrice && Number(draft.propertyPrice.price) > 0);
        
        // Show all drafts unless explicitly empty
        return hasTitle || hasLocation || hasPhotos || hasType || hasPrice || !!draft._id || !!draft.draftId;
      });
      
      console.log(`📋 [HostListingsScreen] Filtered ${drafts.length - validDrafts.length} incomplete drafts`);
      
      // Convert drafts to listing format
      const formattedDrafts = validDrafts.map((draft) => {
        // Parse photos and get first one, handling edge cases
        let coverImage = null;
        let imagesList = [];

        const rawMedia = draft.photos || draft.propertyImages || draft.images;
        if (rawMedia) {
          try {
            const parsedPhotos = typeof rawMedia === "string" ? JSON.parse(rawMedia) : rawMedia;
            if (Array.isArray(parsedPhotos) && parsedPhotos.length > 0) {
              coverImage = parsedPhotos[0];
              imagesList = parsedPhotos;
            }
          } catch (e) {
            console.warn("Error parsing photos:", e);
          }
        }

        // Ensure draft has a valid ID
        const draftId =
          draft.draftId ||
          (draft._id ? String(draft._id) : `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

        // Enhanced location handling for drafts
          let draftLocation = "No location";
          if (draft.city && draft.state) {
            draftLocation = `${draft.city}, ${draft.state}`;
          } else if (draft.city) {
            draftLocation = draft.city;
          } else if (draft.state) {
            draftLocation = draft.state;
          } else if (draft.address && typeof draft.address === 'string') {
            // Handle full address for drafts
            const address = draft.address;
            if (address.length > 50) {
              const parts = address.split(',').map(p => p.trim()).filter(p => p);
              if (parts.length >= 2) {
                draftLocation = `${parts[0]}, ${parts[1]}`;
              } else {
                draftLocation = address.substring(0, 45) + "...";
              }
            } else {
              draftLocation = address;
            }
          } else if (draft.location) {
            draftLocation = draft.location;
          }

        return {
          id: draftId,
          propertyName: draft.propertyName || draft.propertyTitle || draft.title || "Untitled Draft",
          propertyType: draft.propertyType || draft.propertyCategory || draft.category || "Rental",
          location: draftLocation,
          listingType: (draft.intent || "").toLowerCase() === "sale" ? "For Sale" : "For Rent",
          rentalType: draft.pricingPeriod || "Daily",
          price: draft.price
            ? parseInt(String(draft.price).replace(/,/g, ""))
            : (draft.propertyPrice?.price || 0),
          priceUnit: draft.pricingPeriod || "Night",
          status: "DRAFT",
          image: coverImage || null,
          images: imagesList,
          isDraft: true,
          draftData: Object.keys(draft).length > 0 ? { ...draft, draftId } : null,
          createdAt: draft.createdAt || draft.timestamp || Date.now(),
          updatedAt:
            draft.updatedAt ||
            draft.lastModified ||
            draft.timestamp ||
            Date.now(),
          description: draft.description || draft.propertyDescription || "",
          bedrooms: draft.bedrooms || draft.bedroomCount || 0,
          bathrooms: draft.bathrooms || draft.bathroomCount || 0,
          guests: draft.guests || draft.guestCount || 0,
          amenities: draft.amenities || [],
          regulations: draft.houseRules || draft.regulations || [],
          landmarks: draft.landmarks || draft.nearbyLandmarks || [],
        };
      });

      // Sort drafts by newest first (descending)
      formattedDrafts.sort((a, b) => {
        const parseTime = (item) => {
          if (!item) return 0;
          const t = item.updatedAt || item.createdAt || item.timestamp;
          if (typeof t === "number") return t;
          const parsed = new Date(t).getTime();
          return isNaN(parsed) ? 0 : parsed;
        };
        return parseTime(b) - parseTime(a); // Descending order (newest first)
      });

      setDraftListings(formattedDrafts);
    } catch (error) {
      console.error("Error loading drafts:", error);
      setDraftListings([]); // Reset to empty on error
    }
  };

  // Initial load: fetch drafts on mount
  useEffect(() => {
    loadDrafts();
  }, []);

  // Combine regular listings with drafts - ensure both are arrays
  const safeListings = Array.isArray(formattedListings) ? formattedListings : [];
  const safeDraftListings = Array.isArray(draftListings) ? draftListings : [];

  // Deduplicate before merging to prevent identical React keys
  const allListingsMap = new Map();
  const seenIds = new Set(); // Track all IDs we've already added

  // We first populate with server-fetched listings (which include server drafts)
  safeListings.forEach((l) => {
    const id = l.id || l._id;
    if (id && !seenIds.has(id)) {
      allListingsMap.set(id, l);
      seenIds.add(id);
    }
  });

  // Then overlay our detailed local drafts, keyed by either Mongo ID or Draft ID
  safeDraftListings.forEach((d) => {
    const mongoId = d.draftData?._id || d._id;
    const draftId = d.id;
    
    // Skip if we've already seen this draft by any of its IDs
    if (draftId && seenIds.has(draftId)) return;
    if (mongoId && seenIds.has(mongoId)) {
      // Update existing entry with local draft data but keep same key
      allListingsMap.set(mongoId, d);
      seenIds.add(draftId);
      return;
    }
    
    // Otherwise, add as new entry
    const key = mongoId || draftId;
    if (key) {
      allListingsMap.set(key, d);
      seenIds.add(key);
      if (mongoId && draftId && mongoId !== draftId) {
        seenIds.add(mongoId);
        seenIds.add(draftId);
      }
    }
  });

  const allListings = Array.from(allListingsMap.values());

  // Filter listings based on selected tab - defensive check for allListings
  // Exclude REJECTED and SUSPENDED listings from displaying for the host
  let filteredListings = (allListings || []).filter((listing) => {

    switch (selectedFilter) {
      case "all":
        return true;
      case "booked":
        return listing.status === "BOOKED";
      case "for_rent":
        return (
          listing.listingType === "For Rent" &&
          (listing.status === "LIVE" ||
            listing.status === "ACTIVE" ||
            listing.status === "AVAILABLE" ||
            listing.status === "PENDING")
        );
      case "for_sale":
        return (
          listing.listingType === "For Sale" &&
          (listing.status === "LIVE" ||
            listing.status === "ACTIVE" ||
            listing.status === "AVAILABLE" ||
            listing.status === "PENDING")
        );
      case "pending":
        return listing.status === "PENDING";
      case "expired":
        return listing.status === "EXPIRED";
      case "drafts":
        return listing.status === "DRAFT";
      case "promotion":
        return listing.isPromoted;
      default:
        return true;
    }
  });

  // Apply sorting - default is newest to oldest so new listings appear at the top
  filteredListings = [...filteredListings].sort((a, b) => {
    const parseTime = (val) => {
      if (!val) return 0;
      const parsed = new Date(val).getTime();
      return isNaN(parsed) ? 0 : parsed;
    };
    const timeA = parseTime(a.updatedAt || a.createdAt || a.timestamp);
    const timeB = parseTime(b.updatedAt || b.createdAt || b.timestamp);

    // Apply time-based sorting (Newest to oldest by default)
    if (sortOrder === "newest") {
      return timeB - timeA; // Newest first
    } else {
      return timeA - timeB; // Oldest first
    }
  });

  const handleToggleSort = () => {
    setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"));
  };

  const handleCreateListing = () => {
    // Navigate to create listing screen
    router.push("/create-listing");
  };

  const handleEditListing = async (listing) => {
    try {
      console.log("🚀 [HostListingsScreen] handleEditListing START");
      console.log("📋 [HostListingsScreen] Listing object:", listing);

      if (!listing) {
        console.error("❌ [HostListingsScreen] Listing is undefined");
        setToastMessage("Error: Listing not found");
        setShowToast(true);
        return;
      }

      console.log("📊 [HostListingsScreen] Listing isDraft:", listing.isDraft);
      console.log(
        "📊 [HostListingsScreen] Has draftData:",
        !!listing.draftData,
      );

      if (listing.isDraft && listing.draftData && Object.keys(listing.draftData).length > 0) {
        const draft = listing.draftData;
        const currentStep = parseInt(draft.currentStep) || 1;
        const draftId = draft.draftId || listing.id;

        console.log("✅ [HostListingsScreen] Editing draft");
        console.log("📋 [HostListingsScreen] Draft ID:", draftId);
        console.log("📍 [HostListingsScreen] Current Step:", currentStep);

        // Navigate to the appropriate step based on draft progress
        let pathname = "/create-listing";
        if (currentStep >= 2) pathname = "/create-listing/intent";
        if (currentStep >= 3) pathname = "/create-listing/property-details";
        if (currentStep >= 4) pathname = "/create-listing/location";
        if (currentStep >= 5) pathname = "/create-listing/amenities";
        if (currentStep >= 6) pathname = "/create-listing/photos";
        if (currentStep >= 7) pathname = "/create-listing/pricing";
        if (currentStep >= 8) pathname = "/create-listing/availability";
        if (currentStep >= 9) pathname = "/create-listing/terms-agreement";
        if (currentStep >= 10) pathname = "/create-listing/review";

        console.log("🔗 [HostListingsScreen] Navigation pathname:", pathname);

        // Only pass draftId and currentStep - let each screen load full data from storage
        try {
          console.log("➡️ [HostListingsScreen] Pushing route...");
          router.push({
            pathname: pathname,
            params: {
              draftId: draftId,
              currentStep: currentStep.toString(),
            },
          });
          console.log("✅ [HostListingsScreen] Route pushed successfully");
        } catch (navError) {
          console.error("❌ [HostListingsScreen] Navigation error:", navError);
          setToastMessage("Error navigating to draft: " + navError.message);
          setShowToast(true);
        }
      } else if (listing.isDraft && (!listing.draftData || Object.keys(listing.draftData).length === 0)) {
        console.log("ℹ️ [HostListingsScreen] Draft data missing locally, re-hydrating from server...");
        // Re-hydrate the draft from server and navigate
        navigateToEditAsDraft(listing);
      } else if (!listing.isDraft) {
        // Published listing - show confirmation that edits require re-approval
        const status = listing.status
          ? listing.status.toUpperCase()
          : "PENDING";
        const isApproved =
          status === "LIVE" || status === "ACTIVE" || status === "AVAILABLE";

        if (isApproved) {
          // Show confirmation modal for approved listings
          setListingToEdit(listing);
          setShowEditConfirmModal(true);
        } else {
          // For pending/rejected listings, allow direct edit
          console.log(
            "ℹ️ [HostListingsScreen] Editing non-approved published listing",
          );
          navigateToEditListing(listing);
        }
      }
    } catch (error) {
      console.error("❌ [HostListingsScreen] handleEditListing ERROR");
      console.error("🔴 Error message:", error.message);
      console.error("🔴 Error stack:", error.stack);
      setToastMessage("Error editing listing: " + error.message);
      setShowToast(true);
    }
  };

  // Navigate to edit a published listing (pending/rejected - uses full edit flow)
  const navigateToEditListing = async (listing) => {
    console.log(
      "📝 [HostListingsScreen] Navigating to edit published listing:",
      listing.id,
    );

    try {
      // Fetch complete listing data from API to ensure all fields are retained
      console.log("📥 [HostListingsScreen] Fetching complete listing data...");
      const fetchResult = await listingService.fetchListingById(listing.id);

      let fullListing = listing; // Fallback to current data if fetch fails
      if (fetchResult.success && fetchResult.listing) {
        fullListing = fetchResult.listing;
        console.log("✅ [HostListingsScreen] Complete listing data fetched");
      } else {
        console.warn(
          "⚠️ [HostListingsScreen] Could not fetch complete listing, using partial data",
        );
      }

      // This ensures we update the existing record instead of creating a "clone"
      const editDraftId = listing.id;

      // Parse property images
      let photosList = [];
      if (
        fullListing.propertyImages &&
        Array.isArray(fullListing.propertyImages)
      ) {
        photosList = fullListing.propertyImages
          .map((img) => {
            if (typeof img === "string") return img;
            if (img && img.url) return img.url;
            return img;
          })
          .filter(Boolean);
      } else if (fullListing.images && Array.isArray(fullListing.images)) {
        photosList = fullListing.images
          .map((img) => {
            if (typeof img === "string") return img;
            if (img && img.url) return img.url;
            return img;
          })
          .filter(Boolean);
      }

      // Parse location and pricing data
      const locationData = fullListing.propertyLocation || {};
      const priceData = fullListing.propertyPrice || {};

      // Determine intent
      let intent = "rent";
      if (fullListing.intent) {
        intent = fullListing.intent.toLowerCase() === "sale" ? "sale" : "rent";
      } else if (fullListing.listingType) {
        intent = fullListing.listingType.toLowerCase().includes("sale")
          ? "sale"
          : "rent";
      }

      // Prepare draft data with all listing information
      const draftData = {
        draftId: editDraftId,
        editingListingId: listing.id,
        isEditing: true,
        currentStep: 1,
        // Property basic info
        propertyTitle:
          fullListing.propertyName ||
          fullListing.propertyTitle ||
          fullListing.title ||
          "",
        propertyType: fullListing.propertyType || "",
        propertyCategory: fullListing.propertyCategory || "rental",
        intent: intent,
        // Location
        address: fullListing.address || locationData.fullAddress || "",
        city: fullListing.city || "",
        state: fullListing.state || "",
        country: fullListing.country || "Nigeria",
        postalCode: fullListing.postalCode || "",
        latitude: fullListing.latitude || (locationData.coordinates && locationData.coordinates[0]) || 0,
        longitude: fullListing.longitude || (locationData.coordinates && locationData.coordinates[1]) || 0,
        propertyLocation: fullListing.propertyLocation || {
          coordinates: [
            fullListing.latitude || (locationData.coordinates && locationData.coordinates[0]) || 0,
            fullListing.longitude || (locationData.coordinates && locationData.coordinates[1]) || 0
          ],
          fullAddress: fullListing.address || locationData.fullAddress || ""
        },
        // Details
        description: fullListing.description || "",
        propertyHighlight: fullListing.description || "", // Alias for property-details screen
        propertyDescription: fullListing.description || "", // Additional alias
        rentalPurpose: fullListing.rentalPurpose || fullListing.purposeOfRent || fullListing.purpose || "",
        purposeOfRent: fullListing.purposeOfRent || fullListing.rentalPurpose || fullListing.purpose || "",
        sittingRooms: fullListing.sittingRooms || 0,
        lounges: fullListing.lounges || 0,
        workspaces: fullListing.workspaces || 0,
        roomSizes: Array.isArray(fullListing.roomSizes) ? fullListing.roomSizes : (typeof fullListing.roomSizes === 'string' ? fullListing.roomSizes.split(',').map(s => s.trim()).filter(Boolean) : []),
        totalSquareFootage: fullListing.totalSquareFootage || "",
        usageType: fullListing.usageType || "",
      const rawVideos = fullListing.propertyVideos || fullListing.videos || fullListing.video || [];
      const videosList = (Array.isArray(rawVideos) ? rawVideos : [rawVideos])
        .map((v) => (typeof v === "string" ? v : v?.url || v?.uri || ""))
        .filter(Boolean);

      const targetStep = parseInt(fullListing.currentStep || listing.currentStep) || 1;

      // Prepare draft data with all listing information
      const draftData = {
        draftId: editDraftId,
        editingListingId: listing.id,
        isEditing: true,
        currentStep: targetStep,
        propertyTitle:
          fullListing.propertyName ||
          fullListing.propertyTitle ||
          fullListing.title ||
          "",
        propertyName:
          fullListing.propertyName ||
          fullListing.propertyTitle ||
          fullListing.title ||
          "",
        propertyType: fullListing.propertyType || "",
        propertyCategory: fullListing.propertyCategory || "rental",
        intent: intent,
        // Location
        address: address,
        city: city,
        state: state,
        country: country,
        postalCode: fullListing.postalCode || "",
        // Details
        description: fullListing.description || "",
        propertyHighlight: fullListing.description || "",
        bedrooms: fullListing.bedrooms || 0,
        bathrooms: fullListing.bathrooms || 0,
        guests: fullListing.guests || 1,
        guestCapacity: fullListing.guests || 1,
        sittingRooms: fullListing.sittingRooms || 0,
        lounges: fullListing.lounges || 0,
        workspaces: fullListing.workspaces || 0,
        rentalPurpose: fullListing.rentalPurpose || fullListing.purposeOfRent || "",
        purposeOfRent: fullListing.rentalPurpose || fullListing.purposeOfRent || "",
        furnishing: fullListing.furnishing || "",
        titleType: fullListing.titleType || "",
        usageType: fullListing.usageType || "",
        totalSquareFootage: fullListing.totalSquareFootage || "",
        roomSizes: Array.isArray(fullListing.roomSizes) ? fullListing.roomSizes : [],
        termsAgreed: fullListing.termsAgreed !== undefined ? fullListing.termsAgreed : false,
        // Pricing
        price: fullListing.price || priceData.price || 0,
        pricingPeriod:
          fullListing.pricingPeriod || priceData.frequency || "night",
        securityDeposit: fullListing.cautionFee || fullListing.securityDeposit || priceData.cautionFee || priceData.securityDeposit || 0,
        cautionFee: fullListing.cautionFee || fullListing.securityDeposit || priceData.cautionFee || priceData.securityDeposit || 0,
        serviceCharge: fullListing.serviceCharge || priceData.serviceCharge || 0,
        cleaningFee: fullListing.cleaningFee || priceData.cleaningFee || 0,
        acceptRefund: fullListing.acceptRefund !== undefined ? fullListing.acceptRefund : true,
        // Media
        photos: photosList,
        images: photosList,
        propertyImages: photosList,
        videos: videosList,
        propertyVideos: videosList,
        video: videosList[0] || null,
        // Amenities and features
        amenities: convertAmenitiesToIds(fullListing.amenities || []),
        selectedAmenities: convertAmenitiesToIds(fullListing.amenities || []),
        features: fullListing.features || [],
        regulations: fullListing.regulations || [],
        houseRules: fullListing.houseRules || "",
        landmarks: Array.isArray(fullListing.landmarks) ? fullListing.landmarks : (typeof fullListing.landmarks === 'string' ? JSON.parse(fullListing.landmarks || '[]') : []),
        nearbyLandmarks: Array.isArray(fullListing.landmarks) ? fullListing.landmarks : (typeof fullListing.landmarks === 'string' ? JSON.parse(fullListing.landmarks || '[]') : []),
        // Property features
        // Rules and times
        additionalRules: fullListing.additionalRules || "",
        checkInTime: fullListing.checkInTime || "",
        checkOutTime: fullListing.checkOutTime || "",
        // Options
        instantBooking: fullListing.instantBooking || false,
        availableNow: fullListing.availableNow !== false,
        createdAt: Date.now(),
        timestamp: Date.now(),
      };

      console.log("📋 [HostListingsScreen] Draft data prepared:", {
        propertyTitle: draftData.propertyTitle,
        photos: draftData.photos.length,
        amenities: draftData.amenities.length,
        price: draftData.price,
        city: draftData.city,
      });

      // Save the draft data to storage
      await draftListingService.saveDraft(draftData);
      console.log("✅ [HostListingsScreen] Draft data saved for editing");

      const getStepPathname = (step) => {
        const s = parseInt(step) || 1;
        switch (s) {
          case 1: return "/create-listing";
          case 2: return "/create-listing/intent";
          case 3: return "/create-listing/property-details";
          case 4: return "/create-listing/location";
          case 5: return "/create-listing/amenities";
          case 6: return "/create-listing/photos";
          case 7: return "/create-listing/pricing";
          case 8: return "/create-listing/availability";
          case 9: return "/create-listing/terms-agreement";
          case 10: return "/create-listing/review";
          default: return "/create-listing";
        }
      };

      // Navigate to the exact last step of the draft
      router.push({
        pathname: getStepPathname(targetStep),
        params: {
          draftId: editDraftId,
          currentStep: targetStep.toString(),
          isEditing: "true",
          editingListingId: listing.id,
        },
      });
    } catch (error) {
      console.error(
        "❌ [HostListingsScreen] Error preparing listing for edit:",
        error,
      );
      setToastMessage("Error preparing listing for edit");
      setShowToast(true);
    }
  };

  // Confirm edit of approved listing (will convert to draft and require re-approval)
  const confirmEditListing = async () => {
    if (editDraftLoading || !listingToEdit) return; // Prevent multiple triggers and check if listing exists
    setEditDraftLoading(true);
    try {
      console.log(
        "📝 [HostListingsScreen] Converting listing to draft for editing:",
        listingToEdit.id,
      );
      console.log("📝 [HostListingsScreen] Listing details:", {
        id: listingToEdit.id,
        title: listingToEdit.propertyName || listingToEdit.title,
        status: listingToEdit.status,
      });

      // Convert listing to draft status first
      const result = await listingService.convertToDraft(listingToEdit.id);
      console.log("📝 [HostListingsScreen] Convert result:", result);

      if (result.success) {
        console.log("✅ [HostListingsScreen] Listing converted to draft");
        setToastMessage("Listing converted to draft. You can now edit it.");
        setShowToast(true);
        
        // Invalidate queries BEFORE navigating
        queryClient?.invalidateQueries({ queryKey: ['hostListings'] });

        // Navigate to edit listing as a draft (full edit flow)
        await navigateToEditAsDraft(listingToEdit);

        // Refresh listings to show updated status
        refetchListings();
      } else {
        console.error(
          "❌ [HostListingsScreen] Failed to convert listing to draft:",
          result.message || "Unknown error",
        );
        setToastMessage(result.message || "Failed to convert listing to draft");
        setShowToast(true);
      }
    } catch (error) {
      console.error(
        "❌ [HostListingsScreen] Error preparing listing for edit:",
        error,
      );
      setToastMessage("Error preparing listing for edit");
      setShowToast(true);
    } finally {
      setEditDraftLoading(false);
      setShowEditConfirmModal(false);
      setListingToEdit(null);
    }
  };

  // Navigate to edit listing as a draft (full edit flow)
  const navigateToEditAsDraft = async (listing) => {
    console.log(
      "📝 [HostListingsScreen] Navigating to edit listing as draft:",
      listing.id,
    );

    try {
      // First, fetch the complete listing data from the API to ensure we have all fields
      console.log("📥 [HostListingsScreen] Fetching complete listing data...");
      const fetchResult = await listingService.fetchListingById(listing.id);

      let fullListing = listing; // Fallback to current data if fetch fails
      if (fetchResult.success && fetchResult.listing) {
        fullListing = fetchResult.listing;
        console.log("✅ [HostListingsScreen] Complete listing data fetched");
      } else {
        console.warn(
          "⚠️ [HostListingsScreen] Could not fetch complete listing, using partial data",
        );
      }

      // This ensures we update the existing record instead of creating a "clone"
      const editDraftId = listing.id;

      // Parse property images - handle both string URLs and image objects
      let photosList = [];
      if (
        fullListing.propertyImages &&
        Array.isArray(fullListing.propertyImages)
      ) {
        photosList = fullListing.propertyImages
          .map((img) => {
            if (typeof img === "string") return img;
            if (img && img.url) return img.url;
            return img;
          })
          .filter(Boolean);
      } else if (fullListing.images && Array.isArray(fullListing.images)) {
        photosList = fullListing.images
          .map((img) => {
            if (typeof img === "string") return img;
            if (img && img.url) return img.url;
            return img;
          })
          .filter(Boolean);
      }

      // Parse location data
      const locationData = fullListing.propertyLocation || {};
      const address = fullListing.address || locationData.fullAddress || "";
      const city = fullListing.city || "";
      const state = fullListing.state || "";
      const country = fullListing.country || "Nigeria";

      // Parse pricing data
      const priceData = fullListing.propertyPrice || {};
      const price = fullListing.price || priceData.price || 0;
      const pricingPeriod =
        fullListing.pricingPeriod || priceData.frequency || "night";

      // Determine intent from listing data
      let intent = "rent";
      if (fullListing.intent) {
        intent = fullListing.intent.toLowerCase() === "sale" ? "sale" : "rent";
      } else if (fullListing.listingType) {
        intent = fullListing.listingType.toLowerCase().includes("sale")
          ? "sale"
          : "rent";
      }

      // Prepare draft data with all listing information
      const draftData = {
        draftId: editDraftId,
        editingListingId: listing.id,
        isEditing: true,
        currentStep: 1, // Start at first step since navigating to /create-listing
        // Property basic info
        propertyTitle:
          fullListing.propertyName ||
          fullListing.propertyTitle ||
          fullListing.title ||
          "",
        propertyType: fullListing.propertyType || "",
        propertyCategory: fullListing.propertyCategory || "rental",
        intent: intent,
        // Location
        address: address,
        city: city,
        state: state,
        country: country,
        postalCode: fullListing.postalCode || "",
        // Details
        description: fullListing.description || "",
        propertyHighlight: fullListing.description || "", // Alias for property-details screen
        propertyDescription: fullListing.description || "", // Additional alias
        bedrooms: fullListing.bedrooms || 0,
        bathrooms: fullListing.bathrooms || 0,
        guests: fullListing.guests || 1,
        guestCapacity: fullListing.guests || 1, // Alias for property-details screen
        bedroomCount: fullListing.bedrooms || 0,
        bathroomCount: fullListing.bathrooms || 0,
        guestCount: fullListing.guests || 1,
        // Pricing
        price: price,
        pricingPeriod: pricingPeriod,
        securityDeposit: fullListing.securityDeposit || priceData.securityDeposit || 0,
        serviceCharge: fullListing.serviceCharge || priceData.serviceCharge || 0,
        cleaningFee: fullListing.cleaningFee || priceData.cleaningFee || 0,
        // Photos
        photos: photosList,
        // Amenities and features - convert labels to IDs for the amenities screen
        amenities: convertAmenitiesToIds(fullListing.amenities || []),
        selectedAmenities: convertAmenitiesToIds(fullListing.amenities || []),
        features: fullListing.features || [],
        regulations: fullListing.regulations || [],
        houseRules: fullListing.houseRules || "",
        landmarks: fullListing.landmarks || [],
        nearbyLandmarks: fullListing.landmarks || [],
        // Property features
        furnishing: fullListing.furnishing || "",
        titleType: fullListing.titleType || "",
        // Rules and times
        additionalRules: fullListing.additionalRules || "",
        checkInTime: fullListing.checkInTime || "",
        checkOutTime: fullListing.checkOutTime || "",
        // Options
        instantBooking: fullListing.instantBooking || false,
        availableNow: fullListing.availableNow !== false,
        createdAt: Date.now(),
        timestamp: Date.now(),
      };

      console.log("📋 [HostListingsScreen] Draft data prepared:", {
        propertyTitle: draftData.propertyTitle,
        photos: draftData.photos.length,
        amenities: draftData.amenities.length,
        price: draftData.price,
        city: draftData.city,
      });

      // Save the draft data to storage
      await draftListingService.saveDraft(draftData);
      console.log("✅ [HostListingsScreen] Draft data saved for editing");

      // Navigate to the first step of create-listing flow
      router.push({
        pathname: "/create-listing",
        params: {
          draftId: editDraftId,
          isEditing: "true",
          editingListingId: listing.id,
        },
      });
    } catch (error) {
      console.error(
        "❌ [HostListingsScreen] Error preparing draft for edit:",
        error,
      );
      setToastMessage("Error preparing listing for edit");
      setShowToast(true);
    }
  };

  // Cancel edit confirmation
  const cancelEditListing = () => {
    setShowEditConfirmModal(false);
    setListingToEdit(null);
  };

  const handleDeleteListing = async (listing) => {
    // Prevent deletion of active/live listings
    if (listing.status === "LIVE" || listing.status === "ACTIVE") {
      setToastMessage(
        "Active listings cannot be deleted. Please pause the listing first.",
      );
      setShowToast(true);
      return;
    }

    // Show confirmation modal
    setListingToDelete(listing);
    setShowDeleteModal(true);
  };

  const confirmDeleteListing = async () => {
    if (!listingToDelete || deleteLoading) return;

    setDeleteLoading(true);
    const target = listingToDelete;
    
    try {
      if (target.isDraft) {
        await draftListingService.deleteDraft(target.id);
        setToastMessage("Draft deleted successfully");
        setShowToast(true);
        await loadDrafts(); // Refresh local drafts
        // We also invalidate server listings just in case it was a server-synced draft
        queryClient?.invalidateQueries({ queryKey: ['hostListings'] });
      } else {
        console.log("Delete published listing:", target.id);
        const result = await listingService.deleteListing(target.id);

        if (result && result.success) {
          await draftListingService.deleteDraftByListingId(target.id);
          setToastMessage("Listing deleted successfully");
          setShowToast(true);
          // Standard TanStack Query way: invalidate and refetch
          queryClient?.invalidateQueries({ queryKey: ['hostListings'] });
          await loadDrafts();
        } else if (result && result.message && /not\s*found/i.test(result.message)) {
          await draftListingService.deleteDraftByListingId(target.id);
          setToastMessage("Listing deleted");
          setShowToast(true);
          queryClient?.invalidateQueries({ queryKey: ['hostListings'] });
          await loadDrafts();
        } else {
          setToastMessage((result && result.message) || "Failed to delete listing");
          setShowToast(true);
        }
      }
    } catch (error) {
      console.error("Error deleting listing:", error);
      setToastMessage("Error deleting listing");
      setShowToast(true);
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
      setListingToDelete(null);
    }
  };

  const cancelDeleteListing = () => {
    setShowDeleteModal(false);
    setListingToDelete(null);
  };

  const handlePauseListing = (listing) => {
    setListingToPause(listing);
    setShowPauseModal(true);
  };

  const confirmPauseListing = async () => {
    if (!listingToPause || pauseLoading) return;
    setPauseLoading(true);

    const isPaused =
      listingToPause.status === "PAUSED" ||
      listingToPause.status === "SUSPENDED";
    const shouldPause = !isPaused;

    try {
      const result = await listingService.toggleListingAvailability(
        listingToPause.id,
        shouldPause,
      );

      if (result.success) {
        // Invalidate query to trigger refetch with updated status
        queryClient.invalidateQueries({ queryKey: ['hostListings'] });
        
        setToastMessage(
          shouldPause
            ? "Listing paused — property is now unavailable"
            : "Listing resumed — property is now available",
        );
        setShowToast(true);
      } else {
        setToastMessage(result.message || "Failed to update listing");
        setShowToast(true);
      }
    } catch (error) {
      console.error("Error toggling listing availability:", error);
      setToastMessage("Something went wrong. Please try again.");
      setShowToast(true);
    } finally {
      setPauseLoading(false);
      setShowPauseModal(false);
      setListingToPause(null);
    }
  };

  const cancelPauseListing = () => {
    setShowPauseModal(false);
    setListingToPause(null);
  };

  const handleViewStats = (listing) => {
    // View listing stats (to be implemented)
    console.log("View stats for listing:", listing.id);
  };

  const handleCalendar = (listing) => {
    console.log("Open calendar:", listing.id);
  };

  const handlePromoteListing = () => {
    // Navigate to promote listing screen
    console.log("Promote listing");
  };

  const showEmptyState = filteredListings.length === 0 && !listingsLoading;
  const isPromotionTab = selectedFilter === "promotion";

  // Show loading state
  if (listingsLoading && !listingsRefetching) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
          <Text style={styles.headerTitle}>Listings</Text>
          <TouchableOpacity
            style={styles.tipsButton}
            onPress={() => setShowTipsModal(true)}
          >
            <InfoIcon width={18} height={18} color="#FD3131" />
            <Text style={styles.tipsText}>Listing Tips?</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.listingsGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <HostListingSkeleton key={i} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(host-tabs)/")}
        >
          <ChevronLeft size={24} color="#000" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Listings</Text>
        <TouchableOpacity
          style={styles.tipsButton}
          onPress={() => setShowTipsModal(true)}
        >
          <InfoIcon width={18} height={18} color="#FD3131" />
          <Text style={styles.tipsText}>Listing Tips?</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScrollView}
        contentContainerStyle={styles.filterContainer}
      >
        {FILTER_TABS.map((tab) => (
          <FilterTab
            key={tab.id}
            tab={tab}
            isActive={selectedFilter === tab.id}
            onPress={() => setSelectedFilter(tab.id)}
          />
        ))}
      </ScrollView>

      {/* Sort By */}
      {!showEmptyState && (
        <TouchableOpacity style={styles.sortByButton} onPress={handleToggleSort}>
          <ArrowDownIcon 
            width={16} 
            height={16} 
            color="#000000" 
            style={[
              styles.sortIcon,
              sortOrder === "oldest" && styles.sortIconRotated,
            ]}
          />
          <Text style={styles.sortByText}>
            Sort by: {sortOrder === "newest" ? "Newest" : "Oldest"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={listingsRefetching}
            onRefresh={onRefresh}
            colors={["#010135"]}
            tintColor="#010135"
          />
        }
      >
        {showEmptyState ? (
          isPromotionTab ? (
            <PromotionEmptyState onPromoteListing={handlePromoteListing} />
          ) : (
            <EmptyState onCreateListing={handleCreateListing} />
          )
        ) : (
          <View style={styles.listingsGrid}>
            {filteredListings.map((listing) => (
              <ListingCard
                key={`${listing.status}_${listing.id}`}
                listing={listing}
                cardWidth={cardWidth}
                onEdit={() => handleEditListing(listing)}
                onDelete={() => handleDeleteListing(listing)}
                onPause={() => handlePauseListing(listing)}
                onView={() => handleViewStats(listing)}
                onCalendar={() => handleCalendar(listing)}
              />
            ))}
          </View>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Create New Listing FAB */}
      {!showEmptyState && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/create-listing")}
        >
          <Text style={styles.fabText}>Create Listing</Text>
          <View style={styles.fabIconContainer}>
            <Plus size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      )}

      {/* Listing Tips Modal */}
      <ListingTipsOverlay
        visible={showTipsModal}
        onClose={() => setShowTipsModal(false)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={cancelDeleteListing}
      >
        <Pressable
          style={styles.deleteModalOverlay}
          onPress={cancelDeleteListing}
        >
          <Pressable
            style={styles.deleteModalContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.deleteModalContent}>
              <Text style={styles.deleteModalTitle}>Delete Listing?</Text>
              <Text style={styles.deleteModalMessage}>
                {listingToDelete?.isDraft
                  ? "Are you sure you want to delete this draft? This action cannot be undone."
                  : "Are you sure you want to delete this listing? This action cannot be undone."}
              </Text>
              <View style={styles.deleteModalButtons}>
                <Pressable
                  style={styles.deleteModalCancelButton}
                  onPress={cancelDeleteListing}
                >
                  <Text style={styles.deleteModalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.deleteModalConfirmButton,
                    { backgroundColor: deleteLoading ? "#A0A0A0" : "#FD3131" },
                  ]}
                  onPress={deleteLoading ? undefined : confirmDeleteListing}
                  disabled={deleteLoading}
                >
                  <Text style={styles.deleteModalConfirmText}>
                    {deleteLoading ? "Deleting..." : "Delete"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Confirmation Modal - For approved listings that will be converted to draft */}
      <Modal
        visible={showEditConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={cancelEditListing}
      >
        <Pressable
          style={styles.deleteModalOverlay}
          onPress={cancelEditListing}
        >
          <Pressable
            style={styles.deleteModalContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.deleteModalContent}>
              <Text style={styles.deleteModalTitle}>Edit Listing?</Text>
              <Text style={styles.deleteModalMessage}>
                Your listing will be converted to a draft and taken offline
                while you make changes. After editing, you'll need to submit it
                for admin re-approval before it goes live again.
              </Text>
              <View style={styles.deleteModalButtons}>
                <Pressable
                  style={styles.deleteModalCancelButton}
                  onPress={cancelEditListing}
                >
                  <Text style={styles.deleteModalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.deleteModalConfirmButton,
                    {
                      backgroundColor: editDraftLoading ? "#A0A0A0" : "#010135",
                    },
                  ]}
                  onPress={editDraftLoading ? undefined : confirmEditListing}
                  disabled={editDraftLoading}
                >
                  <Text style={styles.deleteModalConfirmText}>
                    {editDraftLoading ? "Processing..." : "Edit as Draft"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Pause/Resume Confirmation Modal */}
      <Modal
        visible={showPauseModal}
        transparent
        animationType="fade"
        onRequestClose={cancelPauseListing}
      >
        <Pressable
          style={styles.deleteModalOverlay}
          onPress={cancelPauseListing}
        >
          <Pressable
            style={styles.deleteModalContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.deleteModalContent}>
              <Text style={styles.deleteModalTitle}>
                {listingToPause?.status === "PAUSED" ||
                listingToPause?.status === "SUSPENDED"
                  ? "Resume Listing?"
                  : "Pause Listing?"}
              </Text>
              <Text style={styles.deleteModalMessage}>
                {listingToPause?.status === "PAUSED" ||
                listingToPause?.status === "SUSPENDED"
                  ? "This will make your property available again. Guests will be able to find and book it."
                  : "This will make your property unavailable to guests. No one will be able to find or book this property while it is paused."}
              </Text>
              <View style={styles.deleteModalButtons}>
                <Pressable
                  style={styles.deleteModalCancelButton}
                  onPress={cancelPauseListing}
                >
                  <Text style={styles.deleteModalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.deleteModalConfirmButton,
                    {
                      backgroundColor: pauseLoading
                        ? "#A0A0A0"
                        : listingToPause?.status === "PAUSED" ||
                            listingToPause?.status === "SUSPENDED"
                          ? "#10B981"
                          : "#FD3131",
                    },
                  ]}
                  onPress={pauseLoading ? undefined : confirmPauseListing}
                  disabled={pauseLoading}
                >
                  <Text style={styles.deleteModalConfirmText}>
                    {pauseLoading
                      ? "Processing..."
                      : listingToPause?.status === "PAUSED" ||
                          listingToPause?.status === "SUSPENDED"
                        ? "Resume"
                        : "Pause"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Toast Notification */}
      <Toast
        visible={showToast}
        message={toastMessage}
        type="success"
        duration={3000}
        onHide={() => setShowToast(false)}
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "500",

    color: "#000000",
    textAlign: "center",
  },
  tipsButton: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  tipsText: {
    fontSize: 12,
    fontWeight: "500",

    color: "#FD3131",
  },
  filterScrollView: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  filterContainer: {
    paddingHorizontal: 20,
    gap: 28,
    alignItems: "center",
  },
  filterTab: {
    paddingVertical: 12,
    alignItems: "center",
    position: "relative",
  },
  filterTabActive: {
    borderBottomWidth: 0,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: "500",

    color: "#6D6D6D",
  },
  filterTabTextActive: {
    color: "#010135",
    fontWeight: "700",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#010135",
  },
  sortByButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 5,
  },
  sortIcon: {
    transform: [{ rotate: "0deg" }],
  },
  sortIconRotated: {
    transform: [{ rotate: "180deg" }],
  },
  sortByText: {
    fontSize: 12,
    fontWeight: "700",

    color: "#000000",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  listingsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 15,
  },
  bottomSpacer: {
    height: Platform.OS === "android" ? 180 : 120,
  },

  // Listing Card Styles
  listingCard: {
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    shadowColor: "#BEBBB",
    shadowOffset: { width: 0, height: 1.9 },
    shadowOpacity: 0.3,
    shadowRadius: 7.13,
    elevation: 7,
    overflow: "visible",
    marginBottom: 10,
  },
  imageContainer: {
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    overflow: "hidden",
  },
  propertyImage: {
    width: "100%",
    height: 164,
    backgroundColor: "#F5F5F5", // Clean neutral background for empty states
  },
  statusBadgeWrapper: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 1,
  },
  propertyImageStyle: {
    // No border radius needed here since imageContainer handles clipping
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    overflow: "hidden",
  },
  statusBadgeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  listingDetails: {
    padding: 10,
    gap: 10,
  },
  labelsRow: {
    flexDirection: "row",
    gap: 5,
  },
  labelBadge: {
    backgroundColor: "#E5EFFF",
    borderRadius: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  labelText: {
    fontSize: 8,
    fontWeight: "500",

    color: "#010135",
    textAlign: "center",
  },
  propertyInfoContainer: {
    gap: 5,
  },
  propertyName: {
    fontSize: 12,
    fontWeight: "500",

    color: "#000000",
  },
  propertyMeta: {
    flexDirection: "row",
    gap: 3,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  propertyType: {
    fontSize: 10,
    fontWeight: "500",

    color: "#000000",
  },
  propertyLocation: {
    fontSize: 10,
    color: "#000000",
    flex: 1,
    flexWrap: 'wrap',
  },
  propertyDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
    marginBottom: 4,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    fontSize: 9,
    color: "#666666",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  price: {
    fontSize: 12,
    fontWeight: "700",

    color: "#000000",
  },
  priceUnit: {
    fontSize: 8,

    color: "#292929",
  },
  cardActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 14,
    marginTop: 5,
  },
  cardActionButton: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },

  // Empty State Styles
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",

    color: "#292929",
    marginTop: 24,
  },
  emptySubtext: {
    fontSize: 14,

    color: "#656565",
    marginTop: 8,
    textAlign: "center",
  },
  createEmptyButton: {
    backgroundColor: "#010135",
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 32,
  },
  createEmptyButtonText: {
    fontSize: 14,
    fontWeight: "600",

    color: "#FFFFFF",
  },

  // FAB Styles
  fab: {
    position: "absolute",
    bottom: Platform.OS === "android" ? 135 : 115, // Adjusted for Android system nav
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#779EFF",
    borderRadius: 30,
    paddingVertical: 5,
    paddingLeft: 10,
    paddingRight: 5,
    gap: 10,
    zIndex: 999,
    ...Platform.select({
      ios: {
        shadowColor: "rgba(0, 0, 0, 0.25)",
        shadowOffset: { width: 1, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "1px 2px 4px rgba(0, 0, 0, 0.25)",
      },
    }),
  },
  fabText: {
    fontSize: 14,
    fontWeight: "600",

    color: "#000000",
  },
  fabIconContainer: {
    width: 33,
    height: 33,
    borderRadius: 20,
    backgroundColor: "#010135",
    alignItems: "center",
    justifyContent: "center",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSafeArea: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContentResponsive: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 23,
    paddingBottom: 24,
    minHeight: 256,
    maxHeight: "80%",
    width: "100%",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  modalActionButton: {
    marginTop: 20,
    backgroundColor: "#010135",
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  modalActionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalCloseButton: {
    position: "absolute",
    top: 21,
    right: 20,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",

    color: "#000000",
    textAlign: "center",
    marginBottom: 30,
  },
  tipsContainer: {
    gap: 15,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  tipIconContainer: {
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
    textAlign: "left",
    flex: 1,
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteModalContainer: {
    width: "85%",
    maxWidth: 400,
  },
  deleteModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    gap: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: "700",

    color: "#000000",
    textAlign: "center",
  },
  deleteModalMessage: {
    fontSize: 14,
    fontWeight: "500",

    color: "#6D6D6D",
    textAlign: "center",
    lineHeight: 20,
  },
  deleteModalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  deleteModalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteModalCancelText: {
    fontSize: 14,
    fontWeight: "600",

    color: "#6D6D6D",
  },
  deleteModalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#FD3131",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteModalConfirmText: {
    fontSize: 14,
    fontWeight: "600",

    color: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,

    color: "#666666",
    marginTop: 12,
  },
});

export default HostListingsScreen;
