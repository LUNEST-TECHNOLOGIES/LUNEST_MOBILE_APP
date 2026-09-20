import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";
import messageService from "../../services/messageService";
import { getUserData } from "../../services/userDataService";

const BackIcon = ({ size = 24, color = "#010135" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 19L8 12L15 5"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const MoreIcon = ({ size = 22, color = "#010135" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="5" r="1.5" fill={color} />
    <Circle cx="12" cy="12" r="1.5" fill={color} />
    <Circle cx="12" cy="19" r="1.5" fill={color} />
  </Svg>
);

const SendIcon = ({ size = 20, color = "#FFFFFF" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ShieldIcon = ({ size = 16, color = "#192DFF" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const InfoIcon = ({ size = 16, color = "#666" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Path d="M12 16v-4M12 8h.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const REPORT_REASONS = [
  { key: "OFF_PLATFORM_PAYMENT", label: "Requested payment outside LUNEST" },
  { key: "CONTACT_SHARING", label: "Sharing external contact details" },
  { key: "HARASSMENT", label: "Inappropriate or abusive language" },
  { key: "SPAM", label: "Spam or promotional messaging" },
  { key: "SAFETY_CONCERN", label: "Safety or security concern" },
  { key: "OTHER", label: "Other terms violation" },
];

export default function ConversationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const conversationId = params.id || params.conversationId;

  const [currentUserId, setCurrentUserId] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);

  // Modals & Menu
  const [menuVisible, setMenuVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState("OFF_PLATFORM_PAYMENT");
  const [reportExplanation, setReportExplanation] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const flatListRef = useRef(null);

  useEffect(() => {
    initUser();
  }, []);

  useEffect(() => {
    if (conversationId && currentUserId) {
      loadConversation();
      loadMessages();
      const interval = setInterval(() => {
        loadMessages(true);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [conversationId, currentUserId]);

  const initUser = async () => {
    try {
      const user = await getUserData();
      if (user) {
        setCurrentUserId(user._id || user.id);
      }
    } catch (err) {
      console.error("[ConversationScreen] Error fetching user:", err);
    }
  };

  const loadConversation = async () => {
    try {
      const conv = await messageService.getConversation(conversationId);
      setConversation(conv);
    } catch (err) {
      console.error("[ConversationScreen] loadConversation error:", err);
    }
  };

  const loadMessages = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const msgs = await messageService.getMessages(conversationId);
      setMessages(msgs || []);
    } catch (err) {
      console.error("[ConversationScreen] loadMessages error:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || sending) return;

    const content = inputText.trim();
    setInputText("");
    setSending(true);

    const clientMessageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const optimisticMsg = {
      _id: clientMessageId,
      conversation: conversationId,
      sender: currentUserId,
      content,
      status: "DELIVERED",
      createdAt: new Date().toISOString(),
      optimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await messageService.sendMessage(conversationId, {
        content,
        clientMessageId,
      });

      const serverMsg = res?.message || res;
      setMessages((prev) =>
        prev.map((m) => (m._id === clientMessageId ? serverMsg : m))
      );

      if (serverMsg.status === "BLOCKED") {
        Alert.alert(
          "Message Screening Notice",
          `Your message was blocked: ${serverMsg.blockedReason || "It contained restricted contact or off-platform payment details"}. Please revise your message.`
        );
      }
    } catch (err) {
      Alert.alert("Send Error", err.message || "Failed to send message. Please try again.");
      setMessages((prev) => prev.filter((m) => m._id !== clientMessageId));
    } finally {
      setSending(false);
    }
  };

  const handleToggleMute = async () => {
    setMenuVisible(false);
    if (!conversation) return;
    const participant = conversation.participants?.find(
      (p) => (p.user?._id || p.user)?.toString() === currentUserId?.toString()
    );
    const newMuted = !(participant?.muted);

    try {
      await messageService.toggleMute(conversationId, newMuted);
      setConversation((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          (p.user?._id || p.user)?.toString() === currentUserId?.toString()
            ? { ...p, muted: newMuted }
            : p
        ),
      }));
      Alert.alert("Notifications", newMuted ? "Conversation muted" : "Conversation unmuted");
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to update mute setting");
    }
  };

  const handleBlockConfirm = async () => {
    setBlockModalVisible(false);
    try {
      await messageService.blockUser(conversationId, "Blocked by participant");
      await loadConversation();
      Alert.alert("Participant Blocked", "You have blocked this participant. Messages are restricted.");
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to block participant");
    }
  };

  const handleUnblock = async () => {
    try {
      await messageService.unblockUser(conversationId);
      await loadConversation();
      Alert.alert("Participant Unblocked", "You have unblocked this participant.");
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to unblock participant");
    }
  };

  const handleSubmitReport = async () => {
    if (!selectedReason) return;
    setSubmittingReport(true);
    try {
      await messageService.report(conversationId, {
        reason: selectedReason,
        explanation: reportExplanation,
      });
      setReportModalVisible(false);
      setReportExplanation("");
      Alert.alert(
        "Report Submitted",
        "Thank you. Your report has been submitted to the LUNEST Trust and Safety team for investigation."
      );
    } catch (err) {
      Alert.alert("Report Error", err.message || "Failed to submit report");
    } finally {
      setSubmittingReport(false);
    }
  };

  // Determine counterpart info
  const isGuest = (conversation?.guest?._id || conversation?.guest)?.toString() === currentUserId?.toString();
  const otherParty = isGuest ? conversation?.host : conversation?.guest;
  const otherName = otherParty?.fullName || (isGuest ? "Host" : "Guest");
  const otherAvatar = otherParty?.avatar;
  const listingTitle =
    conversation?.listing?.propertyTitle ||
    conversation?.listing?.propertyName ||
    conversation?.listing?.title ||
    "Property Enquiry";
  const listingImage =
    conversation?.listing?.coverImage ||
    conversation?.listing?.propertyImages?.[0] ||
    null;

  const isBlocked = conversation?.status === "BLOCKED" || !!conversation?.blockedBy;
  const blockedByMe = conversation?.blockedBy?.toString() === currentUserId?.toString();
  const participantMuted = conversation?.participants?.find(
    (p) => (p.user?._id || p.user)?.toString() === currentUserId?.toString()
  )?.muted;

  const renderMessageItem = ({ item }) => {
    const isMe = (item.sender?._id || item.sender)?.toString() === currentUserId?.toString();
    const isSupport = item.senderType === "SUPPORT" || item.isSupportMessage;
    const isBlockedMessage = item.status === "BLOCKED";
    const isPendingMessage = item.status === "PENDING_REVIEW";

    if (isSupport) {
      return (
        <View style={styles.supportMessageContainer}>
          <View style={styles.supportBadge}>
            <ShieldIcon size={14} color="#192DFF" />
            <Text style={styles.supportBadgeText}>LUNEST Support</Text>
          </View>
          <Text style={styles.supportMessageContent}>{item.content}</Text>
          <Text style={styles.supportTimeText}>
            {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.messageRowMe : styles.messageRowOther,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMe ? styles.bubbleMe : styles.bubbleOther,
            isBlockedMessage && styles.bubbleBlocked,
            isPendingMessage && styles.bubblePending,
          ]}
        >
          {isBlockedMessage && (
            <View style={styles.blockedAlertHeader}>
              <Text style={styles.blockedAlertTitle}>Message Blocked</Text>
              <Text style={styles.blockedAlertDesc}>
                {item.blockedReason || "Restricted contact info or off-platform payment terms detected."}
              </Text>
            </View>
          )}

          <Text
            style={[
              styles.messageText,
              isMe ? styles.messageTextMe : styles.messageTextOther,
              isBlockedMessage && styles.messageTextBlocked,
            ]}
          >
            {item.content}
          </Text>

          <View style={styles.messageFooter}>
            {isPendingMessage && (
              <Text style={styles.statusPendingBadge}>Reviewing...</Text>
            )}
            <Text
              style={[
                styles.timestampText,
                isMe ? styles.timestampMe : styles.timestampOther,
              ]}
            >
              {item.createdAt
                ? new Date(item.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <BackIcon size={24} color="#010135" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerDetails}
          activeOpacity={0.8}
          onPress={() => {
            const listId = conversation?.listing?._id || conversation?.listing;
            if (listId) {
              router.push(`/property-details?id=${listId}`);
            }
          }}
        >
          {listingImage ? (
            <Image source={{ uri: listingImage }} style={styles.headerThumb} />
          ) : (
            <View style={[styles.headerThumb, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {otherName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {otherName}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {listingTitle}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moreBtn}
          onPress={() => setMenuVisible(true)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MoreIcon size={22} color="#010135" />
        </TouchableOpacity>
      </View>

      {/* Safety Notice Banner */}
      <View style={styles.safetyBanner}>
        <InfoIcon size={16} color="#192DFF" />
        <Text style={styles.safetyBannerText}>
          Safety first: Keep conversations within LUNEST. Sharing external contact info, phone numbers, or off-platform payment details is strictly prohibited.
        </Text>
      </View>

      {/* Messages List */}
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#192DFF" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id || Math.random().toString()}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            onLayout={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Start the conversation</Text>
                <Text style={styles.emptySubtext}>
                  Inquire about availability, check-in instructions, or property amenities.
                </Text>
              </View>
            }
          />
        )}

        {/* Input Bar or Blocked Notice */}
        {isBlocked ? (
          <View style={styles.blockedBannerContainer}>
            <Text style={styles.blockedBannerText}>
              {blockedByMe
                ? "You have blocked this participant."
                : "This conversation is currently restricted."}
            </Text>
            {blockedByMe && (
              <TouchableOpacity
                style={styles.unblockBtn}
                onPress={handleUnblock}
              >
                <Text style={styles.unblockBtnText}>Unblock</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.inputBar}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="Type a message..."
                placeholderTextColor="#999"
                value={inputText}
                onChangeText={setInputText}
                maxLength={1000}
                multiline
              />
              <Text style={styles.charCounter}>
                {inputText.length}/1000
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!inputText.trim() || sending) && styles.sendBtnDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <SendIcon size={18} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* 3-Dots Action Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuDropdown}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleToggleMute}
            >
              <Text style={styles.menuItemText}>
                {participantMuted ? "Unmute Notifications" : "Mute Notifications"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setReportModalVisible(true);
              }}
            >
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                Report Conversation
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              onPress={() => {
                setMenuVisible(false);
                if (isBlocked && blockedByMe) {
                  handleUnblock();
                } else {
                  setBlockModalVisible(true);
                }
              }}
            >
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                {isBlocked && blockedByMe ? "Unblock Participant" : "Block Participant"}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Report to LUNEST Safety</Text>
            <Text style={styles.modalDesc}>
              Select the violation reason. Our trust and moderation team inspects reported conversations confidentially.
            </Text>

            {REPORT_REASONS.map((r) => (
              <TouchableOpacity
                key={r.key}
                style={[
                  styles.reasonOption,
                  selectedReason === r.key && styles.reasonOptionSelected,
                ]}
                onPress={() => setSelectedReason(r.key)}
              >
                <Text
                  style={[
                    styles.reasonText,
                    selectedReason === r.key && styles.reasonTextSelected,
                  ]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}

            <TextInput
              style={styles.explanationInput}
              placeholder="Additional details (optional)..."
              placeholderTextColor="#999"
              value={reportExplanation}
              onChangeText={setReportExplanation}
              multiline
              maxLength={500}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setReportModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSubmitReport}
                disabled={submittingReport}
              >
                {submittingReport ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Block Confirmation Modal */}
      <Modal
        visible={blockModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBlockModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Block Participant?</Text>
            <Text style={styles.modalDesc}>
              Blocking prevents this user from sending further messages in this thread. Please note that blocking does not cancel active bookings. Any ongoing reservations remain valid and can be managed with LUNEST Support.
            </Text>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setBlockModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: "#DC2626" }]}
                onPress={handleBlockConfirm}
              >
                <Text style={styles.modalSubmitText}>Confirm Block</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerDetails: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  headerThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    marginRight: 10,
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#192DFF15",
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: "700",
    color: "#192DFF",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#010135",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 1,
  },
  moreBtn: {
    padding: 6,
    marginLeft: 8,
  },
  safetyBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E7FF",
    gap: 8,
  },
  safetyBannerText: {
    flex: 1,
    fontSize: 11.5,
    color: "#3730A3",
    lineHeight: 16,
    fontWeight: "500",
  },
  keyboardContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  messageRowMe: {
    justifyContent: "flex-end",
  },
  messageRowOther: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleMe: {
    backgroundColor: "#010135",
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "#F3F4F6",
    borderBottomLeftRadius: 4,
  },
  bubbleBlocked: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  bubblePending: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  blockedAlertHeader: {
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
  },
  blockedAlertTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },
  blockedAlertDesc: {
    fontSize: 11,
    color: "#991B1B",
    marginTop: 2,
    lineHeight: 15,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextMe: {
    color: "#FFFFFF",
  },
  messageTextOther: {
    color: "#1F2937",
  },
  messageTextBlocked: {
    color: "#7F1D1D",
  },
  messageFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  timestampText: {
    fontSize: 10,
  },
  timestampMe: {
    color: "rgba(255, 255, 255, 0.65)",
  },
  timestampOther: {
    color: "#9CA3AF",
  },
  statusPendingBadge: {
    fontSize: 10,
    color: "#D97706",
    fontWeight: "600",
  },
  supportMessageContainer: {
    alignSelf: "center",
    backgroundColor: "#F0F5FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
    maxWidth: "90%",
  },
  supportBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  supportBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#192DFF",
  },
  supportMessageContent: {
    fontSize: 13,
    color: "#1E3A8A",
    lineHeight: 18,
  },
  supportTimeText: {
    fontSize: 10,
    color: "#6B7280",
    textAlign: "right",
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  emptySubtext: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 24,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#FFFFFF",
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
  },
  textInput: {
    fontSize: 14,
    color: "#111827",
    paddingTop: 0,
    paddingBottom: 4,
  },
  charCounter: {
    fontSize: 9,
    color: "#9CA3AF",
    textAlign: "right",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#192DFF",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#D1D5DB",
  },
  blockedBannerContainer: {
    padding: 16,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  blockedBannerText: {
    fontSize: 13,
    color: "#991B1B",
    fontWeight: "600",
    textAlign: "center",
  },
  unblockBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "#DC2626",
    borderRadius: 8,
  },
  unblockBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 60,
    paddingRight: 16,
  },
  menuDropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 6,
    minWidth: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  menuItemDanger: {
    color: "#DC2626",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#010135",
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 16,
  },
  reasonOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
  },
  reasonOptionSelected: {
    borderColor: "#192DFF",
    backgroundColor: "#EEF2FF",
  },
  reasonText: {
    fontSize: 13,
    color: "#374151",
  },
  reasonTextSelected: {
    color: "#192DFF",
    fontWeight: "600",
  },
  explanationInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    height: 70,
    textAlignVertical: "top",
    marginTop: 6,
    marginBottom: 16,
  },
  modalActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalCancelText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  modalSubmitBtn: {
    backgroundColor: "#192DFF",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalSubmitText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
