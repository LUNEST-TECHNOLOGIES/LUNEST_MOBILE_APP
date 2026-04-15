import { Ionicons } from "@expo/vector-icons";
import {
    ActivityIndicator,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

/**
 * CautionActionModal - A specialized confirmation modal for Caution Fee actions.
 * Used for both releasing fees and confirming disputes.
 */
const CautionActionModal = ({
  visible,
  onClose,
  onConfirm,
  isLoading,
  type = "RELEASE", // "RELEASE" or "DISPUTE"
  amount,
  targetName = "the guest",
}) => {
  const isRelease = type === "RELEASE";
  
  const config = {
    title: isRelease ? "Release Caution Fee?" : "Submit Dispute?",
    message: isRelease 
      ? `Are you sure you want to release the caution fee of ₦${amount?.toLocaleString()} to ${targetName}? This action cannot be undone.`
      : `Are you sure you want to submit this caution fee dispute? Our team will review the details and make a final decision.`,
    icon: isRelease ? "checkmark-circle" : "alert-circle",
    iconBg: isRelease ? "#ECFDF5" : "#FEF2F2",
    iconColor: isRelease ? "#10B981" : "#EF4444",
    confirmLabel: isRelease ? "Yes, Release Fee" : "Yes, Submit Dispute",
    confirmBg: isRelease ? "#10B981" : "#EF4444",
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            disabled={isLoading}
          >
            <Ionicons name="close" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={[styles.iconContainer, { backgroundColor: config.iconBg }]}>
            <Ionicons name={config.icon} size={40} color={config.iconColor} />
          </View>

          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.message}>{config.message}</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelBtnText}>No, Go Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: config.confirmBg }]}
              onPress={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmBtnText}>{config.confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    right: 16,
    top: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});

export default CautionActionModal;
