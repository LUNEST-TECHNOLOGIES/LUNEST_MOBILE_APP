import React from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

/**
 * KycRequiredModal
 * Modal displayed when an unverified user attempts to book a property.
 * Directs user to the KYC verification screen via 'Verify KYC' CTA.
 */
const KycRequiredModal = ({
  visible,
  onClose,
  title = "Identity Verification Required",
  message = "To maintain security and trust on LUNEST, please complete your identity verification before booking a property.",
  buttonText = "Verify KYC",
  onVerify,
}) => {
  const router = useRouter();

  const handleVerify = () => {
    if (onClose) onClose();
    if (onVerify) {
      onVerify();
    } else {
      router.push("/profile/kyc-verification");
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={32} color="#010135" />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <Pressable style={styles.primaryButton} onPress={handleVerify}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.primaryButtonText}>{buttonText}</Text>
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F0F4FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#010135",
    textAlign: "center",
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: "#010135",
    borderRadius: 14,
    paddingVertical: 14,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    paddingVertical: 10,
    width: "100%",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "500",
  },
});

export default KycRequiredModal;
