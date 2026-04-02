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
 * CheckoutConfirmationModal
 * Reusable component for confirming checkout/completion of a booking
 * Used in: BookingConfirmationScreen (guest checkout), HostBookingDetailsScreen (if needed)
 */
const CheckoutConfirmationModal = ({
  visible,
  onClose,
  onConfirm,
  isLoading = false,
  title = "Confirm Check-out",
  description = "Are you sure you want to end your booking? This will officially mark your stay as completed.",
  warningText = "Please ensure you have packed all belongings and followed host's checkout instructions.",
  cancelLabel = "Cancel",
  confirmLabel = "Confirm Check-out",
}) => {
  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.checkoutModal}>
          <View style={styles.iconContainer}>
            <Ionicons name="log-out-outline" size={32} color="#6371F1" />
          </View>
          
          <Text style={styles.modalTitle}>{title}</Text>
          
          <Text style={styles.modalDescription}>{description}</Text>

          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={16} color="#EF4444" />
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
  checkoutModal: {
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
    backgroundColor: "#EEF2FF",
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
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    marginBottom: 24,
    alignItems: "center",
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: "#B91C1C",
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
    backgroundColor: "#6371F1",
    alignItems: "center",
  },
  confirmText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default CheckoutConfirmationModal;
