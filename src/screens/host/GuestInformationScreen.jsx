import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Import services
import authService from '../../services/authService';
import bookingService from '../../services/bookingService';
import { resolveImageUrl } from '../../utils/imageUtils';

import ArrowLeftIcon from '../../assets/icons/bookings/arrow-left.svg';

const GuestInformationScreen = () => {
  const router = useRouter();
  const { guestId, guestName, guestAvatar: initialAvatar, isVerified } = useLocalSearchParams();
  const [guestAvatar, setGuestAvatar] = useState(initialAvatar);
  const [loading, setLoading] = useState(false);
  const [guestReviews, setGuestReviews] = useState([]);
  const [resolvedReviewImages, setResolvedReviewImages] = useState({});
  const [guestStats, setGuestStats] = useState({
    totalBookings: 0,
    averageRating: 0,
    joinedDate: '',
  });

  useEffect(() => {
    const resolveParamsAvatar = async () => {
      if (initialAvatar && initialAvatar !== 'null' && initialAvatar !== 'undefined' && !initialAvatar.startsWith('blob:')) {
        const resolved = await resolveImageUrl(initialAvatar);
        setGuestAvatar(resolved);
      }
    };
    resolveParamsAvatar();
  }, [initialAvatar]);

  useEffect(() => {
    const fetchData = async () => {
      if (!guestId) return;
      
      setLoading(true);
      try {
        // Fetch profile
        const profileResult = await authService.fetchUserById(guestId);
        if (profileResult.success) {
          const user = profileResult.user;
          setGuestStats({
            totalBookings: user.guestBookingCount || 0,
            averageRating: user.guestRating || 0,
            joinedDate: user.createdAt,
          });
          // Also update avatar from profile if available
          if (user.avatar) {
            const resolvedAvatar = await resolveImageUrl(user.avatar);
            setGuestAvatar(resolvedAvatar);
          }
        }

        // Fetch reviews
        const reviewsResult = await bookingService.fetchUserReviews(guestId, "GUEST");
        if (reviewsResult.success && reviewsResult.reviews) {
          setGuestReviews(reviewsResult.reviews);
          
          // Resolve all review image URLs
          const imageMap = {};
          for (const review of reviewsResult.reviews) {
            if (review.images && review.images.length > 0) {
              const resolvedImagesForReview = [];
              for (const img of review.images) {
                try {
                  // Check if image URL is valid
                  if (img && typeof img === 'string' && (img.startsWith('http') || img.startsWith('file'))) {
                    resolvedImagesForReview.push(img);
                  } else if (img) {
                    // Try to resolve relative paths
                    const resolved = await resolveImageUrl(img);
                    if (resolved) {
                      resolvedImagesForReview.push(resolved);
                    }
                  }
                } catch (imgError) {
                  console.warn("Error resolving review image:", img, imgError);
                  // Skip invalid images
                }
              }
              if (resolvedImagesForReview.length > 0) {
                imageMap[review._id || review.id] = resolvedImagesForReview;
              }
            }
          }
          setResolvedReviewImages(imageMap);
        }
      } catch (error) {
        console.error("Error fetching guest data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [guestId]);

  const handleGoBack = () => {
    router.back();
  };

  const formatJoinedTime = (createdAt) => {
    if (!createdAt) return "New";
    const created = new Date(createdAt);
    if (isNaN(created.getTime())) return "New";

    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    if (diffMs <= 0) return "New";

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return `${Math.max(1, diffDays)}d`;
    }
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks}w`;
    }

    const diffMonths = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
    if (diffMonths < 12) {
      return `${Math.max(1, diffMonths)} mo${diffMonths > 1 ? 's' : ''}`;
    }

    const yrs = Math.floor(diffMonths / 12);
    return `${yrs} yr${yrs > 1 ? 's' : ''}`;
  };

  const formatReviewerName = (reviewer) => {
    if (!reviewer) return "Host";
    const name = typeof reviewer === 'object' ? reviewer.fullName : reviewer;
    if (!name || name === "Host" || name === "Guest") return name;
    
    const parts = name.split(' ');
    if (parts.length > 1) {
      return `${parts[0]} ${parts[1][0]}.`;
    }
    return name;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeftIcon width={24} height={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Guest Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileSection}>
          {guestAvatar && guestAvatar !== 'null' && guestAvatar !== 'undefined' ? (
            <Image
              source={{ uri: guestAvatar }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={40} color="#9CA3AF" />
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.nameText}>{guestName || 'Guest'}</Text>
            <View style={[styles.kycBadge, { backgroundColor: isVerified === 'true' ? '#ECFDF5' : '#F9FAFB' }]}>
              <Ionicons
                name="shield-checkmark"
                size={14}
                color={isVerified === 'true' ? '#10B981' : '#9CA3AF'}
              />
              <Text style={[styles.kycText, { color: isVerified === 'true' ? '#10B981' : '#9CA3AF' }]}>
                {isVerified === 'true' ? 'Verified ID' : 'Unverified'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{guestStats.totalBookings}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={[styles.statItem, styles.statBorder]}>
            <Text style={styles.statValue}>
              {guestStats.averageRating > 0 ? guestStats.averageRating.toFixed(1) : '—'}
            </Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatJoinedTime(guestStats.joinedDate)}</Text>
            <Text style={styles.statLabel}>on LUNEST</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews from Hosts</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#6371F1" style={{ marginTop: 20 }} />
          ) : guestReviews.length > 0 ? (
            guestReviews.map((review, index) => (
              <View key={index} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    <Text style={styles.reviewerName}>{formatReviewerName(review.reviewer)}</Text>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={star <= review.rating ? "star" : "star-outline"}
                          size={12}
                          color={star <= review.rating ? "#FFB800" : "#D1D1D6"}
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewDate}>{new Date(review.reviewedAt).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.reviewText}>{review.feedback}</Text>
                
                {review.categories && (
                  <View style={styles.categoriesContainer}>
                    <View style={styles.categoryItem}>
                      <Text style={styles.categoryLabel}>Cleanliness</Text>
                      <View style={styles.categoryStars}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons 
                            key={s} 
                            name={s <= (review.categories.cleanliness || 0) ? "star" : "star-outline"} 
                            size={10} 
                            color={s <= (review.categories.cleanliness || 0) ? "#FFB800" : "#D1D1D6"} 
                          />
                        ))}
                      </View>
                    </View>
                    <View style={styles.categoryItem}>
                      <Text style={styles.categoryLabel}>Communication</Text>
                      <View style={styles.categoryStars}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons 
                            key={s} 
                            name={s <= (review.categories.communication || 0) ? "star" : "star-outline"} 
                            size={10} 
                            color={s <= (review.categories.communication || 0) ? "#FFB800" : "#D1D1D6"} 
                          />
                        ))}
                      </View>
                    </View>
                    <View style={styles.categoryItem}>
                      <Text style={styles.categoryLabel}>Rule Compliance</Text>
                      <View style={styles.categoryStars}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons 
                            key={s} 
                            name={s <= (review.categories.ruleCompliance || 0) ? "star" : "star-outline"} 
                            size={10} 
                            color={s <= (review.categories.ruleCompliance || 0) ? "#FFB800" : "#D1D1D6"} 
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                )}

                {resolvedReviewImages[review._id || review.id] && resolvedReviewImages[review._id || review.id].length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImagesContainer}>
                    {resolvedReviewImages[review._id || review.id].map((img, imgIndex) => (
                      <View key={imgIndex} style={{ marginRight: 8 }}>
                        <Image 
                          source={{ uri: img }} 
                          style={styles.reviewImage}
                          onError={(e) => console.warn(`Failed to load review image: ${img}`, e.nativeEvent.error)}
                        />
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbox-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No reviews yet for this guest.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    padding: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
  },
  avatarPlaceholder: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    marginLeft: 20,
    flex: 1,
  },
  nameText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  kycBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  kycText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 32,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E5E7EB',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flex: 1,
    gap: 4,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  reviewText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    fontWeight: '400',
  },
  reviewImagesContainer: {
    marginTop: 12,
    flexDirection: 'row',
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
  },
  categoriesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryStars: {
    flexDirection: 'row',
    gap: 2,
  },
});

export default GuestInformationScreen;
