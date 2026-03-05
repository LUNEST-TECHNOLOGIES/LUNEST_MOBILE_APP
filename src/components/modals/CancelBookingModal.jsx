/**
 * Cancel Booking Modal
 * Bottom-sheet style modal for hosts to cancel a booking with a reason.
 */

import { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

// ── Info icon ──
const InfoIcon = ({ size = 18, color = "#010135" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.6} />
    <Path
      d="M12 16v-4M12 8h.01"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CANCEL_REASONS = [
  "Guest did not respond",
  "Property unavailable",
  "Maintenance or repair issues",
  "Guest violated terms",
  "Others",
];

const CancelBookingModal = ({
  visible = false,
  onClose,
  onConfirmCancel,
  isLoading = false,
}) => {
  const [selectedReason, setSelectedReason] = useState(null);
  const [guestNote, setGuestNote] = useState("");

  const handleConfirm = () => {
    if (!selectedReason) return;
    onConfirmCancel?.({
      reason: selectedReason,
      note: guestNote.trim(),
    });
  };

  const handleClose = () => {
    setSelectedReason(null);
    setGuestNote("");
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Tappable backdrop */}
        <Pressable style={styles.backdrop} onPress={handleClose} />

        {/* Sheet */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheetWrap}
          keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        >
          <View style={styles.sheet}>
            {/* ── Handle bar ── */}
            <View style={styles.handleBar} />

            {/* ── Header ── */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Cancel This Booking?</Text>
              <TouchableOpacity
                onPress={handleClose}
                activeOpacity={0.6}
                style={styles.closeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="#000"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* ── Explanation ── */}
              <View style={styles.descriptionBlock}>
                <Text style={styles.descTitle}>
                  You're about to cancel this booking.
                </Text>
                <Text style={styles.descSub}>
                  Please tell us why — your reason will be shared with the guest
                  to help them understand.
                </Text>
              </View>

              {/* ── Reason picker ── */}
              <View style={styles.reasonBlock}>
                <Text style={styles.reasonLabel}>Select a Reason:</Text>
                <View style={styles.reasonList}>
                  {CANCEL_REASONS.map((reason) => {
                    const active = selectedReason === reason;
                    return (
                      <Pressable
                        key={reason}
                        style={[
                          styles.reasonChip,
                          active && styles.reasonChipActive,
                        ]}
                        onPress={() => setSelectedReason(reason)}
                      >
                        <Text
                          style={[
                            styles.reasonChipText,
                            active && styles.reasonChipTextActive,
                          ]}
                        >
                          {reason}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* ── Guest note (after reasons) ── */}
              <View style={styles.noteBlock}>
                <Text style={styles.noteLabel}>Guest Note (Optional)</Text>
                <TextInput
                  style={styles.noteInput}
                  placeholder='e.g., "Apologies, the property has an emergency plumbing issue."'
                  placeholderTextColor="#7c7c7c"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={guestNote}
                  onChangeText={setGuestNote}
                />
              </View>

              {/* ── Warning notice (moved here) ── */}
              <View style={styles.warningRow}>
                <View style={styles.warningIconWrap}>
                  <InfoIcon size={18} color="#010135" />
                </View>
                <Text style={styles.warningText}>
                  Cancelling bookings may affect your host performance and
                  visibility on LUNEST. Only cancel when absolutely necessary.
                </Text>
              </View>
            </ScrollView>

            {/* ── Confirm button ── */}
            <Pressable
              style={({ pressed }) => [
                styles.confirmBtn,
                !selectedReason && styles.confirmBtnDisabled,
                pressed && selectedReason && { opacity: 0.85 },
              ]}
              onPress={handleConfirm}
              disabled={!selectedReason || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmBtnText}>Cancel Booking</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetWrap: {
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "android" ? 34 : 48,
    maxHeight: "90%",
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D9D9D9",
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },

  /* ── Warning row ── */
  warningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 24,
    backgroundColor: "rgba(1, 1, 53, 0.04)",
    borderRadius: 10,
    padding: 12,
  },
  warningIconWrap: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    color: "#010135",
    lineHeight: 17,
  },

  /* ── Description ── */
  descriptionBlock: {
    gap: 12,
    marginBottom: 24,
  },
  descTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  descSub: {
    fontSize: 14,
    fontWeight: "400",
    color: "#525252",
    lineHeight: 20,
  },

  /* ── Reason picker ── */
  reasonBlock: {
    gap: 14,
    marginBottom: 24,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
  },
  reasonList: {
    gap: 14,
    paddingHorizontal: 6,
  },
  reasonChip: {
    height: 42,
    borderRadius: 8,
    borderColor: "#888",
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  reasonChipActive: {
    borderColor: "#010135",
    backgroundColor: "rgba(1, 1, 53, 0.06)",
    borderWidth: 2,
  },
  reasonChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#292929",
    textAlign: "center",
  },
  reasonChipTextActive: {
    color: "#010135",
    fontWeight: "600",
  },

  /* ── Guest note ── */
  noteBlock: {
    gap: 10,
    marginBottom: 8,
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
  },
  noteInput: {
    borderWidth: 1,
    borderColor: "#7c7c7c",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#292929",
    minHeight: 78,
  },

  /* ── Confirm button ── */
  confirmBtn: {
    marginHorizontal: 24,
    borderRadius: 25,
    backgroundColor: "#010135",
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    // No extra margin, padding, or shadow
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});

export default CancelBookingModal;
