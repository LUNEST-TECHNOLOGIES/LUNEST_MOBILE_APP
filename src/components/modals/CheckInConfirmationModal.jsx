import { Ionicons } from "@expo/vector-icons";
import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

/**
 * CheckInConfirmationModal
 * Reusable component for confirming manual check-in of a booking
 */
const CheckInConfirmationModal = ({
  visible,
  onClose,
  onConfirm,
  isLoading = false,
  title = "Confirm Check-in",
  description = "Are you already at the property and successfully checked in? By confirming, you verify your arrival and your stay officially begins.",
  warningText = "The host will be credited with their earnings once you confirm check-in. Only do this if you have physical access to the property.",
  cancelLabel = "Not Yet",
  confirmLabel = "Yes, I'm Checked-in",
}) => {
  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.checkInModal}>
          <View style={styles.iconContainer}>
            <Ionicons name="key-outline" size={32} color="#22C55E" />
          </View>
          
          <Text style={styles.modalTitle}>{title}</Text>
          
          <Text style={styles.modalDescription}>{description}</Text>

          <View style={styles.warningBox}>
            <Ionicons name="information-circle-outline" size={16} color="#15803D" />
            <Text style={styles.warningText}>{warningText}</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  checkInModal: {
    width: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  modalDescription: {
    fontSize: 15,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  warningBox: {
    flexDirection: "row",
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginBottom: 24,
    alignItems: "center",
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: "#15803D",
    lineHeight: 18,
    fontWeight: "500",
  },
  actionRow: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4B5563",
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#22C55E",
    alignItems: "center",
  },
  confirmText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default CheckInConfirmationModal;
