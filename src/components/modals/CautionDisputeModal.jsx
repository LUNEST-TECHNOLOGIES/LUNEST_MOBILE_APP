/**
 * Caution Dispute Modal Component
 * Allows hosts/guests to raise a dispute for caution fee deductions
 */

import { Ionicons } from "@expo/vector-icons";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const CautionDisputeModal = ({
  visible,
  onClose,
  onSubmit,
  isLoading,
  reason,
  onReasonChange,
  title = "Raise Caution Fee Dispute",
  subtitle = "Provide clear details about the damages or issues. This will be reviewed by our compliance team within 24-48 hours.",
  placeholder = "Describe damage (e.g., Broken TV screen, stained rug...)",
  submitLabel = "Raise Dispute",
}) => {
  const handleSubmit = () => {
    if (reason.trim()) {
      onSubmit(reason);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalKeyboardAvoiding}
        >
          <View style={styles.disputeModalContent}>
            <View style={styles.modalHandle} />

            <TouchableOpacity
              style={styles.modalCloseIcon}
              onPress={onClose}
              hitSlop={15}
              disabled={isLoading}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>

            <View style={styles.modalHeaderIcon}>
              <View style={styles.warningIconContainer}>
                <Ionicons name="alert-circle" size={32} color="#EF4444" />
              </View>
            </View>

            <Text style={styles.modalTitle}>{title}</Text>
            <Text style={styles.modalSubtitle}>{subtitle}</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>REASON FOR DISPUTE</Text>
              <TextInput
                style={styles.disputeInput}
                placeholder={placeholder}
                multiline
                numberOfLines={5}
                value={reason}
                onChangeText={onReasonChange}
                placeholderTextColor="#9CA3AF"
                selectionColor="#6371F1"
                editable={!isLoading}
              />
              <Text style={styles.charCount}>
                {reason.length} characters
              </Text>
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={onClose}
                disabled={isLoading}
              >
                <Text style={styles.modalCancelBtnText}>Dismiss</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  (!reason.trim() || isLoading) && styles.disabledBtn,
                ]}
                onPress={handleSubmit}
                disabled={!reason.trim() || isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name="send"
                      size={16}
                      color="#fff"
                      style={{ marginRight: 6 }}
                    />
                    <Text 
                      style={styles.modalConfirmBtnText}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {submitLabel}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalKeyboardAvoiding: {
    width: "100%",
    justifyContent: "flex-end",
  },
  disputeModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    width: "100%",
    alignItems: "center",
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    marginBottom: 24,
    marginTop: -8,
  },
  modalCloseIcon: {
    position: "absolute",
    right: 20,
    top: 20,
    zIndex: 10,
  },
  modalHeaderIcon: {
    marginBottom: 16,
  },
  warningIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 8,
    letterSpacing: 1,
  },
  inputWrapper: {
    width: "100%",
    marginBottom: 32,
  },
  disputeInput: {
    borderWidth: 1.5,
    borderColor: "#F3F4F6",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    height: 120,
    textAlignVertical: "top",
    color: "#111827",
    fontSize: 15,
  },
  charCount: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "right",
    marginTop: 6,
    fontWeight: "500",
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  modalCancelBtnText: {
    color: "#4B5563",
    fontWeight: "700",
    fontSize: 15,
  },
  modalConfirmBtn: {
    flex: 2.2,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#EF4444",
    ...Platform.select({
      ios: {
        shadowColor: "#EF4444",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  modalConfirmBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  disabledBtn: {
    opacity: 0.5,
  },
});

export default CautionDisputeModal;
