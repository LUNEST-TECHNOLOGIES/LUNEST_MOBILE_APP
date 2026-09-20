import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";
import messageService from "../../services/messageService";
import { getUserData } from "../../services/userDataService";

const SearchIcon = ({ size = 18, color = "#9CA3AF" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const MessageIcon = ({ size = 60, color = "#CCCCCC" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const HostMessagesScreen = () => {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const user = await getUserData();
      if (user) {
        setCurrentUserId(user._id || user.id);
      }
      await loadConversations();
    } catch (err) {
      console.error("[HostMessagesScreen] Init error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      const data = await messageService.getConversations();
      setConversations(data || []);
    } catch (err) {
      console.error("[HostMessagesScreen] Error fetching conversations:", err);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, []);

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const guestName = (c.guest?.fullName || "").toLowerCase();
    const listingTitle = (
      c.listing?.propertyTitle ||
      c.listing?.propertyName ||
      c.listing?.title ||
      ""
    ).toLowerCase();
    const lastMsg = (c.lastMessage?.text || "").toLowerCase();
    return guestName.includes(q) || listingTitle.includes(q) || lastMsg.includes(q);
  });

  const renderConversationItem = ({ item }) => {
    const isGuest = (item.guest?._id || item.guest)?.toString() === currentUserId?.toString();
    const otherUser = isGuest ? item.host : item.guest;
    const otherName = otherUser?.fullName || "Guest";

    const listingTitle =
      item.listing?.propertyTitle ||
      item.listing?.propertyName ||
      item.listing?.title ||
      "Property";
    const listingImage =
      item.listing?.coverImage ||
      item.listing?.propertyImages?.[0] ||
      null;

    const unread = isGuest
      ? item.unreadCount?.guest || 0
      : item.unreadCount?.host || 0;

    const lastMsgTime = item.lastMessage?.sentAt || item.updatedAt;
    const formattedTime = lastMsgTime
      ? new Date(lastMsgTime).toLocaleDateString([], {
          month: "short",
          day: "numeric",
        })
      : "";

    return (
      <TouchableOpacity
        style={[styles.card, unread > 0 && styles.cardUnread]}
        activeOpacity={0.7}
        onPress={() => router.push(`/conversation?id=${item._id}`)}
      >
        {listingImage ? (
          <Image source={{ uri: listingImage }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailFallback]}>
            <Text style={styles.avatarInitial}>
              {otherName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={styles.name} numberOfLines={1}>
              {otherName}
            </Text>
            <Text style={styles.timeText}>{formattedTime}</Text>
          </View>

          <Text style={styles.propertyTitle} numberOfLines={1}>
            {listingTitle}
          </Text>

          <View style={styles.bottomRow}>
            <Text
              style={[
                styles.lastMessageText,
                unread > 0 && styles.lastMessageUnread,
              ]}
              numberOfLines={1}
            >
              {item.lastMessage?.text || "No messages yet"}
            </Text>

            {unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Guest Inquiries & Messages</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <SearchIcon size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search inquiries or guests..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color="#192DFF" />
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item._id}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#192DFF"]}
              tintColor="#192DFF"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MessageIcon size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No guest inquiries yet</Text>
              <Text style={styles.emptySubtext}>
                When guests inquire about your published properties or send messages regarding their bookings on LUNEST, they will appear here.
              </Text>
            </View>
          }
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#010135",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 90,
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 14,
  },
  cardUnread: {
    backgroundColor: "#F8FAFC",
  },
  thumbnail: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  thumbnailFallback: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: "700",
    color: "#192DFF",
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#010135",
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  propertyTitle: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 4,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessageText: {
    fontSize: 13,
    color: "#6B7280",
    flex: 1,
    marginRight: 10,
  },
  lastMessageUnread: {
    color: "#010135",
    fontWeight: "600",
  },
  unreadBadge: {
    backgroundColor: "#192DFF",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 70,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 19,
  },
});

export default HostMessagesScreen;
