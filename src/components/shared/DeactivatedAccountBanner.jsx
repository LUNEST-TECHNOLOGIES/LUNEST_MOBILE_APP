/**
 * DeactivatedAccountBanner
 * Shows a persistent banner when user's account is deactivated
 * Displays restriction info and reactivation option
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAccountStatus } from "../../context/AccountStatusContext";
import Toast from "../common/Toast";

const DeactivatedAccountBanner = () => {
  const {
    isAccountActive,
    isLoading,
    deactivationReason,
    adminDeactivationReason,
    reactivateAccount,
  } = useAccountStatus();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success",
  });

  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  // Don't show banner if loading or account is active
  if (isLoading || isAccountActive) {
    return null;
  }

  const isAdminDeactivated = deactivationReason === "ADMIN_ACTION";

  const handleReactivate = async () => {
    console.log("[DeactivatedBanner] Reactivate button pressed");
    console.log(
      "[DeactivatedBanner] reactivateAccount function exists:",
      !!reactivateAccount,
    );

    setIsReactivating(true);
    try {
      const result = await reactivateAccount();
      console.log("[DeactivatedBanner] Reactivation result:", result);
      setIsReactivating(false);

      if (result.success) {
        setShowModal(false);
        showToast("Your account has been reactivated successfully!", "success");
      } else {
        showToast(result.message || "Failed to reactivate account", "error");
      }
    } catch (error) {
      console.error("[DeactivatedBanner] Reactivation error:", error);
      setIsReactivating(false);
      showToast("Something went wrong. Please try again.", "error");
    }
  };

  const handleLearnMore = () => {
    setShowModal(true);
  };

  return (
    <>
      {/* Toast Notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
        duration={3000}
      />

      {/* Compact Banner */}
      <View style={[styles.banner, isAdminDeactivated && styles.bannerAdmin]}>
        <View style={styles.bannerContent}>
          <View style={styles.bannerIcon}>
            <Ionicons
              name={isAdminDeactivated ? "ban" : "alert-circle"}
              size={20}
              color="#DC2626"
            />
          </View>
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>
              {isAdminDeactivated ? "Account Suspended" : "Account Deactivated"}
            </Text>
            <Text style={styles.bannerSubtitle}>
              {isAdminDeactivated
                ? "Contact support for assistance"
                : "Bookings & listings are restricted"}
            </Text>
          </View>
          <Pressable onPress={handleLearnMore} style={styles.learnMoreButton}>
            <Text style={styles.learnMoreText}>Learn More</Text>
          </Pressable>
        </View>
      </View>

      {/* Detailed Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.modalIconContainer,
                  isAdminDeactivated && styles.modalIconAdmin,
                ]}
              >
                <Ionicons
                  name={isAdminDeactivated ? "ban" : "alert-circle"}
                  size={40}
                  color="#DC2626"
                />
              </View>
              <Text style={styles.modalTitle}>
                {isAdminDeactivated
                  ? "Account Suspended"
                  : "Account Deactivated"}
              </Text>
              <Pressable
                onPress={() => setShowModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>

            {/* Admin Deactivation Notice */}
            {isAdminDeactivated && (
              <View style={styles.adminNoticeContainer}>
                <Ionicons name="shield" size={20} color="#DC2626" />
                <Text style={styles.adminNoticeText}>
                  This account was deactivated by a Lunest administrator. Only
                  an admin can reactivate your account.
                </Text>
              </View>
            )}

            {/* Admin Deactivation Reason */}
            {isAdminDeactivated && adminDeactivationReason && (
              <View style={styles.adminReasonContainer}>
                <Text style={styles.adminReasonLabel}>
                  Reason for suspension:
                </Text>
                <Text style={styles.adminReasonText}>
                  {adminDeactivationReason}
                </Text>
              </View>
            )}

            {/* Restrictions List */}
            <View style={styles.restrictionsList}>
              <Text style={styles.restrictionsTitle}>
                While your account is{" "}
                {isAdminDeactivated ? "suspended" : "deactivated"}:
              </Text>

              <View style={styles.restrictionItem}>
                <Ionicons name="close-circle" size={18} color="#DC2626" />
                <Text style={styles.restrictionText}>
                  You cannot make or manage bookings
                </Text>
              </View>

              <View style={styles.restrictionItem}>
                <Ionicons name="close-circle" size={18} color="#DC2626" />
                <Text style={styles.restrictionText}>
                  Your listings are paused and hidden
                </Text>
              </View>

              <View style={styles.restrictionItem}>
                <Ionicons name="close-circle" size={18} color="#DC2626" />
                <Text style={styles.restrictionText}>
                  You cannot send messages to hosts
                </Text>
              </View>

              <View style={styles.restrictionItem}>
                <Ionicons name="close-circle" size={18} color="#DC2626" />
                <Text style={styles.restrictionText}>
                  Payment features are disabled
                </Text>
              </View>

              <View style={styles.restrictionItem}>
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
                <Text style={styles.restrictionText}>
                  You can still browse properties
                </Text>
              </View>
            </View>

            {/* Reactivate Info */}
            <View
              style={[
                styles.reactivateInfo,
                isAdminDeactivated && styles.adminReactivateInfo,
              ]}
            >
              <Ionicons
                name="information-circle"
                size={20}
                color={isAdminDeactivated ? "#DC2626" : "#3B82F6"}
              />
              <Text
                style={[
                  styles.reactivateInfoText,
                  isAdminDeactivated && styles.adminInfoText,
                ]}
              >
                {isAdminDeactivated
                  ? "Only a Lunest administrator can reactivate your account. Please contact support at support@lunest.com for assistance."
                  : "You deactivated your account. Tap 'Reactivate Now' to restore full access to all features."}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={() => setShowModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.dismissButtonText}>Dismiss</Text>
              </TouchableOpacity>

              {!isAdminDeactivated && (
                <TouchableOpacity
                  style={[
                    styles.reactivateButton,
                    isReactivating && styles.reactivateButtonDisabled,
                  ]}
                  onPress={handleReactivate}
                  disabled={isReactivating}
                  activeOpacity={0.7}
                >
                  {isReactivating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.reactivateButtonText}>
                      Reactivate Now
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Banner styles
  banner: {
    backgroundColor: "#FEF2F2",
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
  },
  bannerAdmin: {
    backgroundColor: "#FEE2E2",
    borderBottomColor: "#F87171",
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bannerIcon: {
    marginRight: 10,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DC2626",
  },
  bannerSubtitle: {
    fontSize: 12,
    color: "#991B1B",
    marginTop: 1,
  },
  learnMoreButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#DC2626",
    borderRadius: 16,
  },
  learnMoreText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
  },
  modalIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalIconAdmin: {
    backgroundColor: "#FEE2E2",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  closeButton: {
    position: "absolute",
    top: 0,
    right: 0,
    padding: 4,
  },

  // Admin notice section
  adminNoticeContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  adminNoticeText: {
    fontSize: 13,
    color: "#991B1B",
    flex: 1,
    lineHeight: 18,
    fontWeight: "500",
  },

  // Admin reason section
  adminReasonContainer: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
  },
  adminReasonLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#991B1B",
    marginBottom: 4,
  },
  adminReasonText: {
    fontSize: 14,
    color: "#7F1D1D",
    fontWeight: "500",
  },

  // Restrictions list
  restrictionsList: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  restrictionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  restrictionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  restrictionText: {
    fontSize: 14,
    color: "#4B5563",
    flex: 1,
  },

  // Reactivate info
  reactivateInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  adminReactivateInfo: {
    backgroundColor: "#FEF2F2",
  },
  reactivateInfoText: {
    fontSize: 13,
    color: "#1E40AF",
    flex: 1,
    lineHeight: 18,
  },
  adminInfoText: {
    color: "#991B1B",
  },

  // Buttons
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  dismissButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 25,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  reactivateButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 25,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
  },
  reactivateButtonDisabled: {
    opacity: 0.6,
  },
  reactivateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});

export default DeactivatedAccountBanner;
