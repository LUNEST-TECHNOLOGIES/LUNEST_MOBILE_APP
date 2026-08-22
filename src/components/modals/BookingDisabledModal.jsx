import React from "react";
import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * BookingDisabledModal
 * Modal displayed when a user attempts to book a property where instant booking
 * is temporarily disabled/restricted during host onboarding and beta preview.
 */
const BookingDisabledModal = ({
  visible,
  onClose,
  title = "Instant Bookings Opening Soon",
  subtitle = "Early Access Preview",
  message = "Instant bookings on LUNEST are temporarily reserved for early beta testers while we onboard verified hosts and certify properties.",
  buttonText = "Got it, Explore Stays",
  onAction,
}) => {
  if (!visible) return null;

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header Badges & Close Button */}
          <View style={styles.topRow}>
            <View style={styles.badgeContainer}>
              <Ionicons name="sparkles" size={12} color="#192DFF" style={{ marginRight: 4 }} />
              <Text style={styles.badgeText}>{subtitle}</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color="#64748B" />
            </Pressable>
          </View>

          {/* Hero Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="calendar-outline" size={32} color="#010135" />
          </View>

          {/* Title and Subtitle */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Value Props / Transparency Box */}
          <View style={styles.infoBox}>
            <View style={styles.infoItem}>
              <View style={styles.bulletIcon}>
                <Ionicons name="shield-checkmark" size={14} color="#16A34A" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoItemTitle}>Verified Properties</Text>
                <Text style={styles.infoItemDesc}>We are completing in-person physical inspections for maximum guest safety.</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.bulletIcon}>
                <Ionicons name="lock-closed" size={14} color="#192DFF" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoItemTitle}>Escrow Protection</Text>
                <Text style={styles.infoItemDesc}>Caution fees and payments are held securely until check-in confirmation.</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.bulletIcon}>
                <Ionicons name="notifications" size={14} color="#EAB308" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoItemTitle}>Public Launch Notification</Text>
                <Text style={styles.infoItemDesc}>You will be notified immediately as booking opens in your chosen area.</Text>
              </View>
            </View>
          </View>

          {/* Primary Action Button */}
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
            ]}
            onPress={handleAction}
          >
            <Text style={styles.primaryButtonText}>{buttonText}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(1, 1, 53, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    shadowColor: "#010135",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  topRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#192DFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#F0F4FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#010135",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 6,
  },
  infoBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  bulletIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 1,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoItemTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  infoItemDesc: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 15,
  },
  primaryButton: {
    backgroundColor: "#010135",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#010135",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default BookingDisabledModal;
