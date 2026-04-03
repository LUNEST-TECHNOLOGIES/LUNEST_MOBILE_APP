import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Status color configurations
const STATUS_CONFIG = {
  LIVE: { label: "LIVE", color: "#31EB3D", bgColor: "#E8F5E9" },
  AVAILABLE: { label: "LIVE", color: "#31EB3D", bgColor: "#E8F5E9" },
  ACTIVE: { label: "LIVE", color: "#31EB3D", bgColor: "#E8F5E9" },
  PENDING: { label: "PENDING", color: "#FF9800", bgColor: "#FFF3E0" },
  DRAFT: { label: "DRAFT", color: "#6371F1", bgColor: "#E8EAF6" },
  EXPIRED: { label: "EXPIRED", color: "#9E9E9E", bgColor: "#F5F5F5" },
  PAUSED: { label: "PAUSED", color: "#FD3131", bgColor: "#FFEBEE" },
  SUSPENDED: { label: "SUSPENDED", color: "#FD3131", bgColor: "#FFEBEE" },
  REJECTED: { label: "REJECTED", color: "#FD3131", bgColor: "#FFEBEE" },
  UNAVAILABLE: { label: "UNAVAILABLE", color: "#9E9E9E", bgColor: "#F5F5F5" },
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const normalizedStatus = status ? status.toUpperCase() : "PENDING";
  const config = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.PENDING;

  return (
    <View
      style={[statusBadgeStyles.badge, { backgroundColor: config.bgColor }]}
    >
      <View
        style={[statusBadgeStyles.dot, { backgroundColor: config.color }]}
      />
      <Text style={[statusBadgeStyles.text, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
};

const statusBadgeStyles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});

// Helper function to safely parse JSON arrays - defined outside component to prevent recreation
const safeParseArray = (value, defaultValue = []) => {
  if (!value) return defaultValue;
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : defaultValue;
  } catch (e) {
    console.warn("Error parsing array:", e);
    return defaultValue;
  }
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
const convertRegulationsToLabels = (regulations) => {
  if (!regulations || !Array.isArray(regulations)) return [];

  return regulations
    .map((regulation) => {
      // Ensure we have a valid value
      if (regulation === null || regulation === undefined || regulation === 0 || regulation === "0") return null;

      const stringRegulation = String(regulation);

      // If regulation is already a readable string, return it
      if (typeof regulation === "string" && regulation.length > 5) {
        return regulation;
      }

      // If it's a rule ID, convert it
      if (HOUSE_RULES_MAP[stringRegulation]) {
        return HOUSE_RULES_MAP[stringRegulation];
      }

      // If it's a number or numeric string, try to map it (0,1,2 problem)
      if (typeof regulation === "number" || /^\d+$/.test(stringRegulation)) {
        // This handles the indices 1,2,3... (we skip 0 as handled above)
        const ruleIds = Object.keys(HOUSE_RULES_MAP);
        const index = parseInt(regulation);
        if (ruleIds[index]) {
          return HOUSE_RULES_MAP[ruleIds[index]];
        }
        // If it's just a number like 0 or 1 that didn't map, and it's not a valid rule, return null
        return null;
      }

      // Fallback: try to beautify the string
      return stringRegulation
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
    })
    .filter(Boolean); // Remove null, undefined, empty values
};

import configService from "../src/services/configService";
import listingService from "../src/services/listingService";

const ListingPreview = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetchedData, setFetchedData] = useState(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isHost = params.isHost === "true";

  // Fetch listing data from API if only listingId is provided
  useEffect(() => {
    const fetchListingData = async () => {
      // Only fetch if we have listingId but no title (indicating we need to fetch from API)
      if (params.listingId && !params.title && !params.propertyName) {
        setLoading(true);
        try {
          console.log(
            "📋 [ListingPreview] Fetching listing:",
            params.listingId,
          );
          const baseURL = await configService.getBaseURL();
          const result = await listingService.fetchListingById(
            params.listingId,
          );

          if (result.success && result.listing) {
            const listing = result.listing;

            // Convert image URLs
            const convertImageUrl = (image) => {
              if (!image) return null;
              if (typeof image === "object" && image.url) {
                if (image.url.startsWith("http")) return image.url;
                return `${baseURL}${image.url}`;
              }
              if (typeof image === "string") {
                if (image.startsWith("http")) return image;
                return `${baseURL}${image}`;
              }
              return null;
            };

            const processedImages = (listing.propertyImages || [])
              .map(convertImageUrl)
              .filter(Boolean);

            // Build location string
            const locationCity =
              listing.city || listing.propertyLocation?.city || null;
            const locationState =
              listing.state || listing.propertyLocation?.state || null;
            let displayLocation = "No location";
            if (listing.propertyLocation?.fullAddress) {
              displayLocation = listing.propertyLocation.fullAddress;
            } else if (locationCity && locationState) {
              displayLocation = `${locationCity}, ${locationState}`;
            } else if (locationCity) {
              displayLocation = locationCity;
            }

            setFetchedData({
              title:
                listing.propertyName ||
                listing.propertyTitle ||
                listing.title ||
                "Untitled Property",
              propertyType: listing.propertyType || "Property",
              location: displayLocation,
              price: listing.price || listing.propertyPrice?.price || 0,
              priceLabel: "₦",
              period: listing.pricingPeriod || "Night",
              available: listing.available !== false,
              description: listing.description || "",
              bedrooms: listing.bedrooms || 0,
              guests: listing.guests || 1,
              bathrooms: listing.bathrooms || 0,
              amenities: listing.amenities || [],
              regulations: convertRegulationsToLabels(
                listing.regulations || [],
              ),
              landmarks: listing.landmarks || [],
              features: listing.features || [],
              images: processedImages,
              status: listing.status ? listing.status.toUpperCase() : "PENDING",
              houseRules: listing.houseRules || "",
              additionalRules: listing.additionalRules || "",
              checkInTime: listing.checkInTime || "",
              checkOutTime: listing.checkOutTime || "",
              securityDeposit: listing.securityDeposit || 0,
              serviceCharge: listing.serviceCharge || 0,
              cleaningFee: listing.cleaningFee || 0,
              instantBooking: listing.instantBooking || false,
              address: listing.address || "",
              city: locationCity || "",
              state: locationState || "",
            });
            console.log(
              "✅ [ListingPreview] Fetched listing data successfully",
            );
          } else {
            console.warn(
              "⚠️ [ListingPreview] Failed to fetch listing:",
              result.message,
            );
          }
        } catch (error) {
          console.error("❌ [ListingPreview] Error fetching listing:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchListingData();
  }, [params.listingId]);

  const listingData = useMemo(() => {
    // Use fetched data if available
    if (fetchedData) {
      return fetchedData;
    }

    try {
      return {
        title: params.title || params.propertyName || "Untitled Property",
        propertyType: params.propertyType || "Property",
        location: params.location || "No location provided",
        price: params.price ? parseInt(params.price) : 0,
        priceLabel: params.priceLabel || "₦",
        period: params.period || "Night",
        available: params.available !== "false",
        description: params.description || "",
        bedrooms: params.bedrooms ? parseInt(params.bedrooms) : 0,
        guests: params.guests ? parseInt(params.guests) : 0,
        bathrooms: params.bathrooms ? parseInt(params.bathrooms) : 0,
        amenities: safeParseArray(params.amenities, []),
        regulations: convertRegulationsToLabels(
          safeParseArray(params.regulations, []),
        ),
        landmarks: safeParseArray(params.landmarks, []),
        features: safeParseArray(params.features, []),
        images: safeParseArray(params.images, []),
        status: params.status || "PENDING",
        // Additional fields
        houseRules: params.houseRules || "",
        additionalRules: params.additionalRules || "",
        checkInTime: params.checkInTime || "",
        checkOutTime: params.checkOutTime || "",
        securityDeposit: params.securityDeposit
          ? parseInt(params.securityDeposit)
          : 0,
        serviceCharge: params.serviceCharge
          ? parseInt(params.serviceCharge)
          : 0,
        cleaningFee: params.cleaningFee ? parseInt(params.cleaningFee) : 0,
        instantBooking: params.instantBooking === "true",
        address: params.address || "",
        city: params.city || "",
        state: params.state || "",
      };
    } catch (error) {
      console.error("Error parsing listing data:", error);
      return {
        title: "Untitled Property",
        propertyType: "Property",
        location: "No location provided",
        price: 0,
        priceLabel: "₦",
        period: "Night",
        available: true,
        description: "",
        bedrooms: 0,
        guests: 0,
        bathrooms: 0,
        amenities: [],
        regulations: [],
        landmarks: [],
        features: [],
        images: [],
        status: "PENDING",
        houseRules: "",
        additionalRules: "",
        checkInTime: "",
        checkOutTime: "",
        securityDeposit: 0,
        serviceCharge: 0,
        cleaningFee: 0,
        instantBooking: false,
        address: "",
        city: "",
        state: "",
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchedData, params.listingId, params.title, params.price]); // Stable dependencies

  const handleGoDashboard = () => {
    router.push("/(host-tabs)/");
  };

  const handleViewListings = () => {
    router.push("/(host-tabs)/listings");
  };

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {isHost ? "Your Listing" : "Property Details"}
            </Text>
          </View>
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#010135" />
          <Text style={styles.loadingText}>Loading listing...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {isHost ? "Your Listing" : "Property Details"}
          </Text>
          {isHost && <StatusBadge status={listingData.status} />}
        </View>
        <Pressable style={styles.closeButton} onPress={() => router.back()}>
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Carousel */}
        <View style={[styles.imageSection, { height: screenWidth * 0.75 }]}>
          {listingData.images &&
          listingData.images.length > 0 &&
          listingData.images.some((img) => img) ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(event) => {
                const index = Math.round(
                  event.nativeEvent.contentOffset.x / screenWidth,
                );
                setCurrentImageIndex(
                  Math.min(
                    index,
                    listingData.images.filter((img) => img).length - 1,
                  ),
                );
              }}
              scrollEventThrottle={16}
            >
              {listingData.images
                .filter((img) => img)
                .map((image, index) => {
                  // Skip local file:// URIs on web - not allowed to load local resources
                  if (
                    typeof image === "string" &&
                    image.startsWith("file://") &&
                    Platform.OS === "web"
                  ) {
                    console.warn(
                      "Skipping local file URI on web for image:",
                      image,
                    );
                    return null;
                  }

                  // Handle different image formats (URL string, object with url, or require())
                  const imageSource =
                    typeof image === "string"
                      ? { uri: image }
                      : image?.url
                        ? { uri: image.url }
                        : image;

                  return (
                    <Image
                      key={index}
                      style={[styles.image, { width: screenWidth }]}
                      source={imageSource}
                      resizeMode="cover"
                      defaultSource={require("../src/assets/images/prop_image.png")}
                      onError={(e) => {
                        console.warn(
                          "Image failed to load:",
                          image,
                          e.nativeEvent?.error,
                        );
                      }}
                    />
                  );
                })
                .filter(Boolean)}
            </ScrollView>
          ) : (
            <Image
              style={[styles.image, { width: screenWidth }]}
              source={require("../src/assets/images/prop_image.png")}
              resizeMode="cover"
            />
          )}

          {/* Image Counter */}
          {listingData.images &&
            listingData.images.filter((img) => img).length > 0 && (
              <View style={styles.imageCounter}>
                <Text style={styles.imageCounterText}>
                  {currentImageIndex + 1}/
                  {listingData.images.filter((img) => img).length}
                </Text>
              </View>
            )}
        </View>

        {/* Property Info Section */}
        <View style={styles.infoSection}>
          {/* Title and Location */}
          <View style={styles.titleBlock}>
            <Text style={styles.propertyTitle} numberOfLines={2}>
              {listingData.title}
            </Text>
            <Text style={styles.location}>{listingData.location}</Text>
          </View>

          {/* Price and Availability */}
          <View style={styles.priceBlock}>
            <View style={styles.priceInfo}>
              <Text style={styles.price}>
                {listingData.priceLabel}
                {listingData.price.toLocaleString()}
              </Text>
              <Text style={styles.priceUnit}>per {listingData.period}</Text>
            </View>
            {/* Show availability only for approved/live listings, otherwise show status */}
            {(() => {
              const status = listingData.status
                ? listingData.status.toUpperCase()
                : "PENDING";
              const isApproved =
                status === "LIVE" ||
                status === "ACTIVE" ||
                status === "AVAILABLE";

              if (isApproved) {
                return (
                  <View
                    style={[
                      styles.availabilityBadge,
                      listingData.available
                        ? styles.availableBadge
                        : styles.unavailableBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.availabilityText,
                        listingData.available
                          ? styles.availableText
                          : styles.unavailableText,
                      ]}
                    >
                      {listingData.available ? "Available" : "Unavailable"}
                    </Text>
                  </View>
                );
              } else {
                // Show status badge for non-approved listings
                const statusConfig =
                  STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
                return (
                  <View
                    style={[
                      styles.availabilityBadge,
                      { backgroundColor: statusConfig.bgColor },
                    ]}
                  >
                    <Text
                      style={[
                        styles.availabilityText,
                        { color: statusConfig.color },
                      ]}
                    >
                      {statusConfig.label}
                    </Text>
                  </View>
                );
              }
            })()}
          </View>

          {/* Property Details Grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Bedrooms</Text>
              <Text style={styles.detailValue}>{listingData.bedrooms}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Bathrooms</Text>
              <Text style={styles.detailValue}>{listingData.bathrooms}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Guests</Text>
              <Text style={styles.detailValue}>{listingData.guests}</Text>
            </View>
          </View>
        </View>

        {/* Description Section */}
        {listingData.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.sectionContent}>{listingData.description}</Text>
          </View>
        ) : null}

        {/* Check-in/Check-out Times Section */}
        {(listingData.checkInTime || listingData.checkOutTime) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Check-in / Check-out</Text>
            <View style={styles.timesContainer}>
              {listingData.checkInTime && (
                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>Check-in</Text>
                  <Text style={styles.timeValue}>
                    {listingData.checkInTime}
                  </Text>
                </View>
              )}
              {listingData.checkOutTime && (
                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>Check-out</Text>
                  <Text style={styles.timeValue}>
                    {listingData.checkOutTime}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Additional Fees Section */}
        {(listingData.securityDeposit > 0 || listingData.serviceCharge > 0 || listingData.cleaningFee > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Fees</Text>
            <View style={styles.feesContainer}>
              {listingData.securityDeposit > 0 && (
                <View style={styles.feeItem}>
                  <Text style={styles.feeLabel}>Caution Fee</Text>
                  <Text style={styles.feeValue}>
                    ₦{listingData.securityDeposit.toLocaleString()}
                  </Text>
                </View>
              )}
              {listingData.serviceCharge > 0 && (
                <View style={styles.feeItem}>
                  <Text style={styles.feeLabel}>Service Charge</Text>
                  <Text style={styles.feeValue}>
                    ₦{listingData.serviceCharge.toLocaleString()}
                  </Text>
                </View>
              )}
              {listingData.cleaningFee > 0 && (
                <View style={styles.feeItem}>
                  <Text style={styles.feeLabel}>Cleaning Fee</Text>
                  <Text style={styles.feeValue}>
                    ₦{listingData.cleaningFee.toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Amenities Section */}
        {listingData.amenities && listingData.amenities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What You Get</Text>
            <View style={styles.amenitiesContainer}>
              {listingData.amenities.map((amenity, index) => (
                <View key={index} style={styles.amenityItem}>
                  <View style={styles.amenityCheckmark}>
                    <Text style={styles.checkmark}>✓</Text>
                  </View>
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Features Section */}
        {listingData.features && listingData.features.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Features</Text>
            <View style={styles.listContainer}>
              {listingData.features.map((feature, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={styles.listDot} />
                  <Text style={styles.listText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Regulations Section */}
        {listingData.regulations && listingData.regulations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>House Rules</Text>
            <View style={styles.listContainer}>
              {listingData.regulations
                .filter(Boolean) // Ensure no null/undefined values
                .map((regulation, index) => (
                  <View key={index} style={styles.listItem}>
                    <View style={styles.listDot} />
                    <Text style={styles.listText}>
                      {String(regulation || "")}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Additional House Rules */}
        {(listingData.houseRules || (listingData.additionalRules && listingData.additionalRules !== "0")) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Information</Text>
            {listingData.houseRules ? (
              <Text style={styles.sectionContent}>
                {(() => {
                  let rules = listingData.houseRules;
                  if (typeof rules === "string" && (rules.startsWith("[") || rules.includes(","))) {
                    try {
                      rules = rules.startsWith("[") ? JSON.parse(rules) : rules.split(",").map(r => r.trim());
                    } catch (e) {
                      rules = rules.split(",").map(r => r.trim());
                    }
                  }
                  return Array.isArray(rules) 
                    ? convertRegulationsToLabels(rules).join(", ")
                    : String(rules || "");
                })()}
              </Text>
            ) : null}
            {listingData.additionalRules && listingData.additionalRules !== "0" ? (
              <Text style={[styles.sectionContent, { marginTop: 8 }]}>
                {String(listingData.additionalRules || "")}
              </Text>
            ) : null}
          </View>
        )}

        {/* Landmarks Section */}
        {listingData.landmarks && listingData.landmarks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nearby Landmarks</Text>
            <View style={styles.listContainer}>
              {listingData.landmarks.map((landmark, index) => (
                <View key={index} style={styles.listItem}>
                  <View style={styles.listDot} />
                  <Text style={styles.listText}>{String(landmark || "")}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bottom Spacer for buttons */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={styles.buttonContainer}>
        {isHost ? (
          <>
            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={() => router.back()}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Back
              </Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={() => router.push("/(host-tabs)/listings")}
            >
              <Text style={[styles.buttonText, styles.primaryButtonText]}>
                My Listings
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={() => router.back()}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                Back
              </Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={() => console.log("Book property")}
            >
              <Text style={[styles.buttonText, styles.primaryButtonText]}>
                Book Now
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Container and layout
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#292929",
    textAlign: "center",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 24,
    color: "#292929",
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Image section
  imageSection: {
    width: "100%",
    backgroundColor: "#F5F5F5",
    position: "relative",
    overflow: "hidden",
  },
  image: {
    height: "100%",
    backgroundColor: "#F0F0F0",
  },
  imageCounter: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  imageCounterText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },

  // Info section
  infoSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  titleBlock: {
    marginBottom: 16,
  },
  propertyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#292929",
    marginBottom: 8,
  },
  location: {
    fontSize: 14,
    color: "#656565",
  },

  // Price block
  priceBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  priceInfo: {
    flex: 1,
  },
  price: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1B1C4B",
    marginBottom: 4,
  },
  priceUnit: {
    fontSize: 14,
    color: "#656565",
  },
  availabilityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  availableBadge: {
    backgroundColor: "#E8F5E9",
  },
  unavailableBadge: {
    backgroundColor: "#FFEBEE",
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: "600",
  },
  availableText: {
    color: "#4CAF50",
  },
  unavailableText: {
    color: "#F44336",
  },

  // Details grid
  detailsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    marginTop: 8,
  },
  detailItem: {
    alignItems: "center",
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#656565",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#292929",
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#292929",
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 14,
    color: "#656565",
    lineHeight: 22,
  },

  // Amenities
  amenitiesContainer: {
    gap: 10,
  },
  amenityItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  amenityCheckmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#010135",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  amenityText: {
    fontSize: 14,
    color: "#292929",
    flex: 1,
  },

  // Lists
  listContainer: {
    gap: 12,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  listDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#292929",
    marginTop: 6,
  },
  listText: {
    fontSize: 14,
    color: "#292929",
    flex: 1,
  },

  // Times container (check-in/check-out)
  timesContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
  },
  timeItem: {
    alignItems: "center",
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: "#656565",
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#292929",
  },

  // Fees container
  feesContainer: {
    gap: 12,
  },
  feeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
  },
  feeLabel: {
    fontSize: 14,
    color: "#656565",
  },
  feeValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#292929",
  },

  // Bottom spacer
  bottomSpacer: {
    height: 20,
  },

  // Buttons container
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 24,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  primaryButton: {
    backgroundColor: "#010135",
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButtonText: {
    color: "#FFFFFF",
  },
  secondaryButtonText: {
    color: "#292929",
  },

  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: "#656565",
  },
});

export default ListingPreview;
