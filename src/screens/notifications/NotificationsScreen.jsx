/**
 * NotificationsScreen
 * Displays notifications for either Guest or Host based on the current context
 * Enhanced with Figma design - supports dynamic admin-generated notifications
 */

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ArrowLeftIcon from "../../assets/icons/bookings/arrow-left.svg";
import configService from "../../services/configService";
import notificationService from "../../services/notificationService";
import { resolveImageUrlSync } from "../../utils/imageUtils";

// Filter tabs configuration
const FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "bookings", label: "Bookings" },
  { id: "reviews", label: "Reviews" },
  { id: "listings", label: "Listings" },
  { id: "system", label: "System" },
];

// Notification type to filter category mapping
const TYPE_TO_FILTER = {
  booking_request: "bookings",
  booking_confirmed: "bookings",
  booking_cancelled: "bookings",
  booking_completed: "bookings",
  payment: "bookings",
  review: "reviews",
  listing_approved: "listings",
  listing_rejected: "listings",
  new_listing: "listings",
  host_application: "system",
  message: "system",
  admin_announcement: "system",
  default: "system",
};

// Default image for notification types
// Default image for notification types
const DEFAULT_IMAGE = require("../../../assets/images/icon.png"); // Using app icon as fallback since prop_image is missing

// Default images for different notification types
const DEFAULT_IMAGES = {
  booking_confirmed: DEFAULT_IMAGE,
  booking_request: DEFAULT_IMAGE,
  booking_cancelled: DEFAULT_IMAGE,
  booking_completed: DEFAULT_IMAGE,
  payment: DEFAULT_IMAGE,
  review: DEFAULT_IMAGE,
  listing_approved: DEFAULT_IMAGE,
  listing_rejected: DEFAULT_IMAGE,
  new_listing: DEFAULT_IMAGE,
  host_application: DEFAULT_IMAGE,
  message: DEFAULT_IMAGE,
  admin_announcement: DEFAULT_IMAGE,
  default: DEFAULT_IMAGE,
};

// Sample notifications for demo purposes
const SAMPLE_NOTIFICATIONS = [
  {
    _id: "sample-1",
    type: "booking_confirmed",
    message:
      "Your booking at Modern Apartment in Victoria Island has been confirmed!",
    actionMessage: "Check-in: Jan 15, 2026",
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    payload: JSON.stringify({
      listingId: "sample-listing-1",
      bookingId: "sample-booking-1",
      propertyName: "Modern Apartment",
    }),
  },
  {
    _id: "sample-2",
    type: "new_listing",
    message: "New luxury apartment available in your area",
    actionMessage: "3BR Apartment in Lekki - ₦45,000/night",
    read: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    payload: JSON.stringify({
      listingId: "sample-listing-2",
      propertyName: "3BR Apartment in Lekki",
    }),
  },
  {
    _id: "sample-3",
    type: "admin_announcement",
    message:
      "Welcome to Lunest! Complete your profile to get the best experience",
    actionMessage: "Tap to update your profile",
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    payload: JSON.stringify({}),
  },
];

// Sample host notifications
const SAMPLE_HOST_NOTIFICATIONS = [
  {
    _id: "host-sample-1",
    type: "booking_request",
    message: "New booking request for your property",
    actionMessage: "Guest wants to book for 3 nights in February",
    read: false,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    payload: JSON.stringify({
      listingId: "host-listing-1",
      bookingId: "host-booking-1",
      propertyName: "Your Property",
    }),
  },
  {
    _id: "host-sample-2",
    type: "listing_approved",
    message: "Your listing 'Cozy Studio Apartment' has been approved!",
    actionMessage: "Your property is now live and accepting bookings",
    read: false,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    payload: JSON.stringify({
      listingId: "host-listing-2",
      propertyName: "Cozy Studio Apartment",
    }),
  },
];

const NotificationsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  // Get userType from params - defaults to 'GUEST' if not specified
  const userType = params?.userType || "GUEST";

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    const getBaseUrl = async () => {
      const url = await configService.getBaseURL();
      setBaseUrl(url);
    };
    getBaseUrl();
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [userType]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      // Fetch real notifications from backend
      const result = await notificationService.fetchUserNotifications(userType);
      let notifications = result.data || result.notifications || [];

      // If no real notifications from API, use sample data as fallback
      if (notifications.length === 0) {
        console.log("No real notifications found, using sample data");
        notifications =
          userType === "HOST"
            ? SAMPLE_HOST_NOTIFICATIONS
            : SAMPLE_NOTIFICATIONS;
      } else {
        console.log(
          `Fetched ${notifications.length} real notifications for ${userType}`,
        );
      }

      setNotifications(notifications);
    } catch (error) {
      console.error("[NotificationsScreen] Error:", error);
      // On error, show sample notifications
      const sampleNotifs =
        userType === "HOST" ? SAMPLE_HOST_NOTIFICATIONS : SAMPLE_NOTIFICATIONS;
      setNotifications(sampleNotifs);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filter notifications based on active filter
  const filteredNotifications = useMemo(() => {
    if (activeFilter === "all") return notifications;

    return notifications.filter((notif) => {
      const category = TYPE_TO_FILTER[notif.type] || TYPE_TO_FILTER.default;
      return category === activeFilter;
    });
  }, [notifications, activeFilter]);

  // Group notifications by time period
  const groupedNotifications = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groups = {
      newThisWeek: [],
      earlier: [],
    };

    filteredNotifications.forEach((notif) => {
      // Validate date before grouping
      const notifDate = new Date(notif.createdAt);

      // Check for invalid date - treat as recent if invalid
      if (isNaN(notifDate.getTime())) {
        console.warn(
          "[NotificationsScreen] Invalid date for notification:",
          notif._id,
          notif.createdAt,
        );
        groups.newThisWeek.push(notif); // Put invalid dates in recent
        return;
      }

      if (notifDate >= oneWeekAgo) {
        groups.newThisWeek.push(notif);
      } else {
        groups.earlier.push(notif);
      }
    });

    return groups;
  }, [filteredNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [userType]);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(userType === "HOST" ? "/(host-tabs)" : "/(tabs)");
    }
  };

  const handleMarkAllRead = async () => {
    const success = await notificationService.markAllAsRead(userType);
    if (success) {
      // Update all notifications to read
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const handleNotificationPress = async (notification) => {
    // Mark as read
    if (!notification.read) {
      await notificationService.markAsRead(notification._id);
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notification._id ? { ...n, read: true } : n,
        ),
      );
    }

    // Navigate based on notification type and user type
    if (notification.payload) {
      try {
        const payload =
          typeof notification.payload === "string"
            ? JSON.parse(notification.payload)
            : notification.payload;

        // For host users with booking/listing notifications
        if (
          userType === "HOST" &&
          (notification.type.includes("booking") ||
            notification.type.includes("listing"))
        ) {
          if (payload.bookingId) {
            // Navigate to host bookings tab with specific booking highlighted
            router.push({
              pathname: "/(host-tabs)/bookings",
              params: {
                bookingId: payload.bookingId,
                highlightBooking: "true",
                hostMode: "true",
              },
            });
          } else if (payload.listingId) {
            // Navigate to host listings tab with specific listing highlighted
            router.push({
              pathname: "/(host-tabs)/listings",
              params: {
                listingId: payload.listingId,
                highlightListing: "true",
              },
            });
          }
        } else {
          // Regular navigation for guests
          if (payload.bookingId) {
            // Navigate to guest bookings tab with specific booking highlighted
            router.push({
              pathname: "/(tabs)/bookings",
              params: {
                bookingId: payload.bookingId,
                highlightBooking: "true",
              },
            });
          } else if (payload.listingId) {
            // Navigate to property details
            router.push({
              pathname: "/property-details",
              params: { listingId: payload.listingId },
            });
          }
        }
      } catch (e) {
        console.log("[NotificationsScreen] Could not parse payload:", e);
      }
    }
  };

  // Get notification image - from payload (propertyImage) or default based on type
  const getNotificationImage = (notification) => {
    // Check if notification has an image URL in payload
    if (notification.payload) {
      try {
        const payload =
          typeof notification.payload === "string"
            ? JSON.parse(notification.payload)
            : notification.payload;

        // Check for property image first (from booking or listing)
        if (payload.propertyImage && typeof payload.propertyImage === 'string' && payload.propertyImage.trim() !== '') {
          return { uri: resolveImageUrlSync(payload.propertyImage, baseUrl) };
        }
        // Fallback to imageUrl if provided
        if (payload.imageUrl && typeof payload.imageUrl === 'string' && payload.imageUrl.trim() !== '') {
          return { uri: resolveImageUrlSync(payload.imageUrl, baseUrl) };
        }
        // Check for listingImage
        if (payload.listingImage && typeof payload.listingImage === 'string' && payload.listingImage.trim() !== '') {
          return { uri: resolveImageUrlSync(payload.listingImage, baseUrl) };
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    // Return default image based on type
    const defaultImg = DEFAULT_IMAGES[notification.type] || DEFAULT_IMAGES.default;
    return defaultImg || DEFAULT_IMAGE;
  };

  // Get notification title based on type
  const getNotificationTitle = (notification) => {
    const titleMap = {
      booking_confirmed: "Booking Confirmed",
      booking_request: "New Booking Request",
      booking_cancelled: "Booking Cancelled",
      booking_completed: "Stay Completed",
      review: "New Review",
      new_listing: "New Space Available",
      listing_approved: "Listing Approved",
      listing_rejected: "Listing Rejected",
      payment: "Payment Update",
      admin_announcement: "Announcement",
      message: "New Message",
    };
    return notification.title || titleMap[notification.type] || "Notification";
  };

  const renderFilterTabs = () => (
    <View style={styles.tabsContainer}>
      {FILTER_TABS.map((tab) => {
        const isActive = activeFilter === tab.id;
        const tabCount =
          tab.id === "all"
            ? notifications.filter((n) => !n.read).length
            : notifications.filter((n) => {
                const category =
                  TYPE_TO_FILTER[n.type] || TYPE_TO_FILTER.default;
                return category === tab.id && !n.read;
              }).length;

        return (
          <Pressable
            key={tab.id}
            style={styles.tabItem}
            onPress={() => setActiveFilter(tab.id)}
          >
            <View style={styles.tabLabelContainer}>
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {tab.label}
              </Text>
              {tabCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{tabCount}</Text>
                </View>
              )}
            </View>
            {isActive && <View style={styles.activeIndicator} />}
          </Pressable>
        );
      })}
    </View>
  );

  const renderNotificationItem = ({ item }) => {
    const iconName = notificationService.getNotificationIcon(item.type);
    const timeAgo = notificationService.formatNotificationTime(item.createdAt);
    const notificationImage = getNotificationImage(item);
    const notificationTitle = getNotificationTitle(item);

    return (
      <Pressable
        style={[
          styles.notificationItem,
          !item.read && styles.unreadNotification,
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        {/* Notification Image */}
        <View style={styles.notificationImageContainer}>
          <Image
            source={notificationImage}
            style={styles.notificationImage}
            resizeMode="cover"
          />
          {/* Icon overlay */}
          <View
            style={[styles.iconOverlay, !item.read && styles.iconOverlayUnread]}
          >
            <Ionicons
              name={iconName}
              size={14}
              color={!item.read ? "#FFFFFF" : "#6B7280"}
            />
          </View>
        </View>

        {/* Notification Content */}
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text
              style={[
                styles.notificationTitle,
                !item.read && styles.unreadTitle,
              ]}
              numberOfLines={1}
            >
              {notificationTitle}
            </Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          <Text
            style={[
              styles.notificationMessage,
              !item.read && styles.unreadMessage,
            ]}
            numberOfLines={2}
          >
            {item.message}
          </Text>
          {item.actionMessage && (
            <Text style={styles.actionMessage} numberOfLines={1}>
              {item.actionMessage}
            </Text>
          )}
          <Text style={styles.timeText}>{timeAgo}</Text>
        </View>
      </Pressable>
    );
  };

  const renderSectionHeader = (title) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const renderNotificationsList = () => {
    const sections = [];

    if (groupedNotifications.newThisWeek.length > 0) {
      sections.push(
        <View key="new-this-week">
          {renderSectionHeader("New this week")}
          {groupedNotifications.newThisWeek.map((item) => (
            <View key={item._id}>{renderNotificationItem({ item })}</View>
          ))}
        </View>,
      );
    }

    if (groupedNotifications.earlier.length > 0) {
      sections.push(
        <View key="earlier">
          {renderSectionHeader("Earlier")}
          {groupedNotifications.earlier.map((item) => (
            <View key={item._id}>{renderNotificationItem({ item })}</View>
          ))}
        </View>,
      );
    }

    return sections;
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="notifications-off-outline" size={48} color="#9CA3AF" />
      </View>
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptySubtitle}>
        {activeFilter !== "all"
          ? `No ${activeFilter} notifications yet`
          : userType === "HOST"
            ? "You'll see booking requests and updates here"
            : "You'll see booking confirmations and updates here"}
      </Text>
    </View>
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleGoBack}>
          <ArrowLeftIcon width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {userType === "HOST" ? "Host Notifications" : "Notifications"}
        </Text>
        {unreadCount > 0 ? (
          <Pressable onPress={handleMarkAllRead} style={styles.markAllButton}>
            <Ionicons name="checkmark-done" size={18} color="#192DFF" />
            <Text style={styles.markAllText}>Read all</Text>
          </Pressable>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {/* Filter Tabs */}
      {renderFilterTabs()}

      {/* Notifications List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#192DFF" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : filteredNotifications.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={[{ key: "content" }]}
          keyExtractor={(item) => item.key}
          renderItem={() => <View>{renderNotificationsList()}</View>}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#192DFF"]}
              tintColor="#192DFF"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    height: 56,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    fontFamily: "Sora",
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  markAllText: {
    fontSize: 14,
    color: "#192DFF",
    fontWeight: "500",
  },
  // Filter tabs - matching BookingsHeader style
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  tabItem: {
    alignItems: "center",
    minWidth: 50,
  },
  tabLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6D6D6D",
  },
  activeTabText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#192DFF",
  },
  tabBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#192DFF",
    marginTop: 7,
  },
  // Section headers
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    fontFamily: "Sora",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  listContainer: {
    paddingBottom: 20,
  },
  // Notification item
  notificationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  unreadNotification: {
    backgroundColor: "#F0F3FF",
  },
  notificationImageContainer: {
    position: "relative",
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: "hidden",
  },
  notificationImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  iconOverlay: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  iconOverlayUnread: {
    backgroundColor: "#192DFF",
  },
  notificationContent: {
    flex: 1,
    justifyContent: "center",
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    flex: 1,
  },
  unreadTitle: {
    fontWeight: "600",
    color: "#111827",
  },
  notificationMessage: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginTop: 2,
  },
  unreadMessage: {
    fontWeight: "500",
    color: "#111827",
  },
  actionMessage: {
    fontSize: 13,
    color: "#192DFF",
    marginTop: 4,
    fontWeight: "500",
  },
  timeText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#192DFF",
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});

export default NotificationsScreen;
