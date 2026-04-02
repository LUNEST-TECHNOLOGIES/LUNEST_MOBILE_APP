import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ArrowLeftIcon from "../../assets/icons/bookings/arrow-left.svg";
import ShieldTickIcon from "../../assets/icons/shield-tick.svg";
import StarIcon from "../../assets/icons/star.svg";
import bookingService from "../../services/bookingService";
import configService from "../../services/configService";
import { fetchHostData } from "../../services/hostService";
import listingService from "../../services/listingService";
import { smartFormatPrice } from "../../utils/formatters";
import { resolveImageUrlSync } from "../../utils/imageUtils";

const HostInformation = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const hostId = params?.hostId;
  const listingId = params?.listingId;

  // Mask guest name for privacy
  const maskGuestName = (fullName) => {
    if (!fullName) return "G***";
    const nameParts = fullName.split(" ");
    const firstName = nameParts[0];
    if (firstName.length <= 2) return firstName.charAt(0) + "***";
    return firstName.substring(0, 2) + "***";
  };

  // Format review date
  const formatReviewDate = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + " at " + d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Helper for image URL resolution
  const convertImageUrl = (image) => {
    if (!image) return null;
    const currentBaseURL = configService.getBaseURLSync() || baseURL;
    let path = typeof image === "object" ? (image.url || image.uri) : image;
    return resolveImageUrlSync(path, currentBaseURL);
  };

  // Parse review images robustly (handles JSON strings and arrays)
  const parseImages = (imagesData) => {
    if (!imagesData) return [];
    if (Array.isArray(imagesData)) return imagesData.filter(img => !!img);
    if (typeof imagesData === 'string' && imagesData.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(imagesData);
        return Array.isArray(parsed) ? parsed.filter(img => !!img) : [];
      } catch (e) {
        return [imagesData];
      }
    }
    if (typeof imagesData === 'string' && imagesData.length > 0) return [imagesData];
    return [];
  };

  const [activeTab, setActiveTab] = useState("about");
  const [hostData, setHostData] = useState(null);
  const [hostListings, setHostListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [baseURL, setBaseURL] = useState("");
  const [hostCurrentAvatar, setHostCurrentAvatar] = useState(null);
  const [hostReviews, setHostReviews] = useState([]);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const loadHostData = useCallback(async () => {
    try {
      setLoading(true);

      // Get base URL for image conversion
      const apiBaseURL = await configService.getBaseURL();
      setBaseURL(apiBaseURL);
      // If we have listingId, fetch the listing to get host info
      if (listingId) {
        const result = await listingService.fetchListingById(listingId);
        if (result?.success && result?.listing?.hostInfo) {
          const host = result.listing.hostInfo;
          setHostData(host);

          // Fetch complete host data using centralized service
          try {
            const hostResult = await fetchHostData(host._id);
            if (hostResult.success && hostResult.avatar) {
              setHostCurrentAvatar(hostResult.avatar);
              console.log(
                "[HostInformation] Host avatar fetched from profile:",
                hostResult.avatar,
              );
            } else if (hostResult.error) {
              console.warn(
                "[HostInformation] Could not fetch host data:",
                hostResult.error,
              );
            }
          } catch (hostError) {
            console.warn(
              "[HostInformation] Error fetching host data:",
              hostError,
            );
          }

          // Fetch host's listings
          const listingsResult = await listingService.fetchAllListings({
            host: host._id,
            status: { $in: ["AVAILABLE", "BOOKED", "SOLD"] },
          });
          if (
            listingsResult?.success &&
            Array.isArray(listingsResult.listings)
          ) {
            setHostListings(listingsResult.listings);
          }
        }
      }
      // If we have hostId but no listingId, fetch host data via their listings
      else if (hostId) {
        console.log("[HostInformation] Loading host data for hostId:", hostId);

        // Fetch any listing by this host to get their information
        const listingsResult = await listingService.fetchAllListings({
          host: hostId,
          status: { $in: ["AVAILABLE", "BOOKED", "SOLD"] },
        });

        if (
          listingsResult?.success &&
          Array.isArray(listingsResult.listings) &&
          listingsResult.listings.length > 0
        ) {
          // Store the host's listings for the listings tab
          setHostListings(listingsResult.listings);

          // Get host data from the first listing's host info
          const firstListing = listingsResult.listings[0];
          if (firstListing.hostInfo || firstListing.host) {
            const host = firstListing.hostInfo || firstListing.host;
            setHostData(host);

            // Fetch complete host data using centralized service
            try {
              const hostResult = await fetchHostData(host._id || hostId);
              if (hostResult.success && hostResult.avatar) {
                setHostCurrentAvatar(hostResult.avatar);
                console.log(
                  "[HostInformation] Host avatar fetched from profile:",
                  hostResult.avatar,
                );
              } else if (hostResult.error) {
                console.warn(
                  "[HostInformation] Could not fetch host data:",
                  hostResult.error,
                );
              }
            } catch (hostError) {
              console.warn(
                "[HostInformation] Error fetching host data:",
                hostError,
              );
            }
          } else {
            console.error("[HostInformation] No host info found in listings");
          }
        } else {
          console.error(
            "[HostInformation] No listings found for host:",
            hostId,
          );
        }
      }

      // Fetch host reviews
      const targetHostId = hostData?._id || hostId;
      if (targetHostId) {
        try {
          const reviewsResult = await bookingService.fetchUserReviews(targetHostId, "HOST");
          if (reviewsResult.success) {
            setHostReviews(reviewsResult.reviews);
            console.log("[HostInformation] Host reviews fetched:", reviewsResult.reviews.length);
          }
        } catch (reviewsError) {
          console.warn("[HostInformation] Error fetching host reviews:", reviewsError);
        }
      }
    } catch (error) {
      console.error("[HostInformation] Error loading host data:", error);
    } finally {
      setLoading(false);
    }
  }, [listingId, hostId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadHostData();
  }, [listingId, hostId, loadHostData]);



  const renderStars = (rating) => {
    const stars = [];
    const numRating = Number(rating) || 0;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons 
          key={i} 
          name={i <= numRating ? "star" : "star-outline"} 
          size={14} 
          color="#FFB800" 
        />
      );
    }
    return <View style={{ flexDirection: 'row', gap: 2 }}>{stars}</View>;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleGoBack}>
          <ArrowLeftIcon width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Host/Landlord Information</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#192DFF" />
          <Text style={styles.loadingText}>Loading host information...</Text>
        </View>
      ) : hostData ? (
        <>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hostDetailsSection}>
              {/* Profile Picture and Host Info - Side by Side */}
              <View style={styles.hostHeaderRow}>
                <Image
                  source={
                    hostCurrentAvatar && convertImageUrl(hostCurrentAvatar)
                      ? { uri: convertImageUrl(hostCurrentAvatar) }
                      : hostData.avatar && convertImageUrl(hostData.avatar)
                        ? { uri: convertImageUrl(hostData.avatar) }
                        : require("../../assets/images/prop_image.png")
                  }
                  style={styles.profileImage}
                  contentFit="cover"
                />
                <View style={styles.hostInfoContainer}>
                  <View style={styles.hostDetailsRow}>
                    <Text style={styles.hostedByText}>
                      Hosted by/Landlord {hostData.fullName}
                    </Text>
                    {hostData.verified && (
                      <Pressable style={styles.verifiedBadgeButton}>
                        <ShieldTickIcon width={16} height={16} />
                        <Text style={styles.verifiedButtonText}>VERIFIED</Text>
                      </Pressable>
                    )}
                  </View>
                  <Text style={styles.totalListingsText}>
                    Total listings: {hostListings.length}
                  </Text>
                  <View style={styles.ratingRow}>
                    <View style={styles.ratingWithIcon}>
                      <Text style={styles.ratingValue}>
                        {hostData.hostRating 
                          ? Number(hostData.hostRating).toFixed(1)
                          : hostReviews.length > 0 
                            ? (hostReviews.reduce((acc, curr) => acc + (Number(curr.rating) || 0), 0) / hostReviews.length).toFixed(1)
                            : "N/A"}
                      </Text>
                      <StarIcon width={16} height={16} />
                    </View>
                    <Text style={styles.reviewsLink}>{hostReviews.length} Reviews</Text>
                  </View>
                </View>
              </View>

            </View>

            <View style={styles.tabsContainer}>
              {["about", "reviews", "listings"].map((tab) => (
                <Pressable
                  key={tab}
                  style={[styles.tab, activeTab === tab && styles.activeTab]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === tab && styles.activeTabText,
                    ]}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {activeTab === "about" && (
              <View style={styles.tabContent}>
                <Text style={styles.sectionTitle}>
                  About {hostData.fullName}
                </Text>
                <Text style={styles.aboutText}>
                  {hostData.bio || "No bio available"}
                </Text>
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                  Response Information
                </Text>
                <View style={styles.responseInfo}>
                  <Text style={styles.responseLabel}>Response Time:</Text>
                  <Text style={styles.responseValue}>
                    {hostData.responseTime || "Within a few hours"}
                  </Text>
                </View>
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                  Contact Information
                </Text>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>Email:</Text>
                  <Text style={styles.contactValue}>
                    {hostData.emailAddress ? hostData.emailAddress.replace(/(.{2})(.*)(@.*)/, "$1***$3") : "Not provided"}
                  </Text>
                </View>
                {hostData.phoneNumber && (
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactLabel}>Phone:</Text>
                    <Text style={styles.contactValue}>
                      {hostData.phoneNumber.replace(/(\d{3})\d+(\d{4})/, "$1 *** $2")}
                    </Text>
                  </View>
                )}
                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                  Verified Information
                </Text>
                {[
                  "Identity",
                  "Email Address",
                  "Phone Number",
                  "Properties",
                ].map((item, i) => (
                  <View key={i} style={styles.verifiedItem}>
                    <Text style={styles.verifiedItemLabel}>{item}</Text>
                    <ShieldTickIcon width={20} height={20} />
                  </View>
                ))}
              </View>
            )}

            {activeTab === "reviews" && (
              <View style={styles.tabContent}>
                <Text style={styles.sectionTitle}>Guest Reviews ({hostReviews.length})</Text>
                {hostReviews.length > 0 ? (
                  hostReviews.map((review, i) => (
                    <View key={i} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <View style={styles.reviewerInfo}>
                          {review.reviewer?.avatar ? (
                            <Image 
                              source={{ uri: convertImageUrl(review.reviewer.avatar) }} 
                              style={styles.reviewerAvatar} 
                              cachePolicy="disk"
                            />
                          ) : (
                            <View style={styles.reviewerAvatarPlaceholder}>
                              <Text style={styles.reviewerInitial}>
                                {(review.reviewer?.fullName || review.bookedBy?.fullName || "G").charAt(0)}
                              </Text>
                            </View>
                          )}
                          <View>
                            <Text style={styles.reviewerName}>
                             {maskGuestName(review.reviewer?.fullName || review.bookedBy?.fullName || review.author?.fullName)}
                            </Text>
                            <Text style={styles.reviewDate}>
                              {formatReviewDate(review.reviewedAt || review.guestReview?.reviewedAt)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.reviewRating}>
                          {renderStars(review.rating || review.guestReview?.rating)}
                        </View>
                      </View>
                      <Text style={styles.reviewText}>
                        {review.feedback || review.guestReview?.feedback || "No feedback provided"}
                      </Text>
                      {(() => {
                        const allReviewImages = [
                          ...parseImages(review.images),
                          ...parseImages(review.guestReview?.images)
                        ];
                        if (allReviewImages.length === 0) return null;
                        
                        return (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                            {allReviewImages.map((img, imgIdx) => {
                              const imgUrl = convertImageUrl(img);
                              if (!imgUrl) return null;
                              return (
                                <Image 
                                  key={imgIdx} 
                                  source={{ uri: imgUrl }} 
                                  style={styles.reviewImageThumb} 
                                  contentFit="cover"
                                  cachePolicy="disk"
                                  transition={200}
                                />
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
            )}

            {activeTab === "listings" && (
              <View style={styles.tabContent}>
                <Text style={styles.sectionTitle}>Host/Landlord Listings</Text>
                {hostListings.length > 0 ? (
                  hostListings.map((listing, i) => {
                    const getRawImages = () => {
                      if (Array.isArray(listing.propertyImages) && listing.propertyImages.length > 0) return listing.propertyImages;
                      if (Array.isArray(listing.images) && listing.images.length > 0) return listing.images;
                      if (Array.isArray(listing.listingImages) && listing.listingImages.length > 0) return listing.listingImages;
                      if (listing.coverImage) return [listing.coverImage];
                      if (typeof listing.listingImages === 'string' && listing.listingImages) return [listing.listingImages];
                      if (typeof listing.images === 'string' && listing.images) return [listing.images];
                      return [];
                    };
                    
                    const rawImages = getRawImages();
                    const firstImage = rawImages[0];
                    const imgUrl = firstImage ? convertImageUrl(firstImage) : null;
                    
                    const listingImage = imgUrl ? { uri: imgUrl } : require("../../assets/images/prop_image.png");

                    return (
                      <Pressable
                        key={i}
                        style={styles.listingCard}
                        onPress={() =>
                          router.push({
                            pathname: "/property-details",
                            params: { listingId: listing._id },
                          })
                        }
                      >
                        <Image
                          source={listingImage}
                          style={styles.listingImage}
                          contentFit="cover"
                        />
                        <View style={styles.listingInfo}>
                          <Text style={styles.listingTitle}>
                            {listing.propertyName || "Untitled"}
                          </Text>
                          <Text style={styles.listingLocation}>
                            {(() => {
                            const city = listing.propertyLocation?.city || listing.city;
                            const state = listing.propertyLocation?.state || listing.state;
                            if (city && state) {
                              return `${city}, ${state}`;
                            } else if (city) {
                              return city;
                            } else if (state) {
                              return state;
                            } else {
                              return listing.location || listing.address || "Unknown Location";
                            }
                          })()}
                          </Text>
                          <Text style={styles.listingSpecs}>
                            {listing.bedrooms || 0} Bed {listing.bathrooms || 0}{" "}
                            Bath
                          </Text>
                          <View style={styles.priceRow}>
                            <Text style={styles.listingPrice}>
                              ₦{smartFormatPrice(listing.propertyPrice?.price || listing.price || "0", true)}
                            </Text>
                            <Text style={styles.listingPeriod}>
                              per {listing.pricingPeriod || listing.rentalPeriod || "Year"}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <StarIcon width={14} height={14} />
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#292929' }}>
                              {listing.averageRating ? Number(listing.averageRating).toFixed(1) : "New"}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })
                ) : (
                  <Text style={styles.noListingsText}>
                    No listings available
                  </Text>
                )}
              </View>
            )}
          </ScrollView>
        </>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load host information</Text>
        </View>
      )}

      <Pressable
        style={[styles.messageButton, { opacity: 0.5 }]}
        onPress={() => {
          // Message functionality is currently disabled
          console.log("Message host functionality is currently disabled");
        }}
        disabled={true}
      >
        <Text style={styles.messageButtonText}>Message Host</Text>
      </Pressable>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666666",
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
  coverSection: {
    position: "relative",
    marginBottom: 40,
  },
  coverPhoto: {
    width: "100%",
    height: 200,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#F5F5F5",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    marginRight: 16,
    alignSelf: "flex-start",
  },
  hostHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  hostInfoContainer: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  hostDetailsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  hostDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  hostedByText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000000",
  },
  verifiedBadgeButton: {
    backgroundColor: "transparent",
    borderRadius: 20,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  verifiedButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000000",
  },
  totalListingsText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#292929",
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ratingWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000000",
  },
  reviewsLink: {
    fontSize: 12,
    color: "#292929",
    textDecorationLine: "underline",
  },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  tabContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 13,
    color: "#292929",
    lineHeight: 20,
  },
  responseInfo: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7C7C7C",
    marginBottom: 4,
  },
  responseValue: {
    fontSize: 13,
    color: "#000000",
  },
  contactInfo: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  contactLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7C7C7C",
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 13,
    color: "#000000",
  },
  verifiedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  verifiedItemLabel: {
    fontSize: 13,
    color: "#292929",
  },
  editButton: {
    backgroundColor: "#192DFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  reviewCard: {
    backgroundColor: "#F6F6F6",
    padding: 12,
    borderRadius: 5,
    gap: 8,
    marginBottom: 12,
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
  listingCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 12,
  },
  listingImage: {
    width: 100,
    height: 120,
  },
  listingInfo: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: "center",
    gap: 4,
  },
  listingTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000000",
  },
  listingLocation: {
    fontSize: 11,
    color: "#7C7C7C",
  },
  listingSpecs: {
    fontSize: 10,
    color: "#292929",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 4,
  },
  listingPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000000",
  },
  listingPeriod: {
    fontSize: 10,
    color: "#7C7C7C",
  },
  noListingsText: {
    fontSize: 12,
    color: "#7C7C7C",
    textAlign: "center",
    paddingVertical: 20,
  },
  messageButton: {
    backgroundColor: "#010135",
    borderRadius: 25,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeButtonText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "600",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 14,
    color: "#192DFF",
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  editForm: {
    gap: 20,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#000000",
  },
  // Review styles
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  reviewerInfo: {
    flexDirection: "row",
    alignItems: "center",
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
  reviewerName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000000",
  },
  reviewDate: {
    fontSize: 10,
    color: "#999999",
  },
  reviewRating: {
    flexDirection: "row",
  },
  reviewImageThumb: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 8,
  },
});

export default HostInformation;
