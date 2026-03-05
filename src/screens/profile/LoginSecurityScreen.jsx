/**
 * LoginSecurityScreen - Manage password and account deactivation
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
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import Toast from "../../components/common/Toast";
import { useAccountStatus } from "../../context/AccountStatusContext";

/**
 * Back Arrow Icon - Same style as personal information page
 */
const BackIcon = ({ size = 24, color = "black" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15.0003 20.67C14.8103 20.67 14.6203 20.6 14.4703 20.45L7.95027 13.93C6.89027 12.87 6.89027 11.13 7.95027 10.07L14.4703 3.55002C14.7603 3.26002 15.2403 3.26002 15.5303 3.55002C15.8203 3.84002 15.8203 4.32002 15.5303 4.61002L9.01027 11.13C8.53027 11.61 8.53027 12.39 9.01027 12.87L15.5303 19.39C15.8203 19.68 15.8203 20.16 15.5303 20.45C15.3803 20.59 15.1903 20.67 15.0003 20.67Z"
      fill={color}
    />
  </Svg>
);

const LoginSecurityScreen = () => {
  const router = useRouter();
  const {
    isAccountActive,
    isLoading,
    deactivationReason,
    adminDeactivationReason,
    reactivateAccount,
  } = useAccountStatus();
  const [isReactivating, setIsReactivating] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
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

  const isAdminDeactivated = deactivationReason === "ADMIN_ACTION";

  const handleReactivatePress = () => {
    setShowReactivateModal(true);
  };

  const handleReactivateAccount = async () => {
    console.log("[LoginSecurity] Reactivate button pressed");
    console.log(
      "[LoginSecurity] reactivateAccount exists:",
      !!reactivateAccount,
    );

    setIsReactivating(true);
    try {
      const result = await reactivateAccount();
      console.log("[LoginSecurity] Reactivation result:", result);
      setIsReactivating(false);

      if (result.success) {
        setShowReactivateModal(false);
        showToast("Your account has been reactivated successfully!", "success");
      } else {
        showToast(result.message || "Failed to reactivate account", "error");
      }
    } catch (error) {
      console.error("[LoginSecurity] Reactivation error:", error);
      setIsReactivating(false);
      showToast("Something went wrong. Please try again.", "error");
    }
  };

  const menuItems = [
    {
      id: "update-password",
      icon: "lock-closed-outline",
      title: "Update Password",
      subtitle: "Change your account password",
      color: "#000000",
      onPress: () => router.push("/update-password"),
    },
    isAccountActive
      ? {
          id: "deactivate-account",
          icon: "person-remove-outline",
          title: "Deactivate My Account",
          subtitle: "Temporarily disable your account",
          color: "#B70808",
          onPress: () => router.push("/deactivate-account"),
        }
      : {
          id: "reactivate-account",
          icon: "checkmark-circle-outline",
          title: "Reactivate My Account",
          subtitle: "Restore your account access",
          color: "#059669",
          onPress: handleReactivatePress,
        },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Toast Notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
        duration={3000}
      />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <BackIcon size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>Login & Security</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Account Status Banner (when deactivated) */}
      {!isLoading && !isAccountActive && (
        <View style={styles.statusBanner}>
          <Ionicons name="warning" size={20} color="#B45309" />
          <Text style={styles.statusBannerText}>
            Your account is currently deactivated
          </Text>
        </View>
      )}

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#010135" />
          </View>
        ) : (
          menuItems.map((item, index) => (
            <Pressable
              key={item.id}
              style={[
                styles.menuItem,
                index < menuItems.length - 1 && styles.menuItemBorder,
              ]}
              onPress={item.onPress}
              disabled={isReactivating && item.id === "reactivate-account"}
            >
              <View style={styles.menuItemLeft}>
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor:
                        item.color === "#B70808"
                          ? "#FDEAEA"
                          : item.color === "#059669"
                            ? "#D1FAE5"
                            : "#F0F3FF",
                    },
                  ]}
                >
                  {isReactivating && item.id === "reactivate-account" ? (
                    <ActivityIndicator size="small" color={item.color} />
                  ) : (
                    <Ionicons name={item.icon} size={22} color={item.color} />
                  )}
                </View>
                <View style={styles.menuItemText}>
                  <Text style={[styles.menuItemTitle, { color: item.color }]}>
                    {item.title}
                  </Text>
                  {item.subtitle && (
                    <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </Pressable>
          ))
        )}
      </View>

      {/* Reactivate Account Modal */}
      <Modal
        visible={showReactivateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReactivateModal(false)}
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
                onPress={() => setShowReactivateModal(false)}
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
                onPress={() => setShowReactivateModal(false)}
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
                  onPress={handleReactivateAccount}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  headerSpacer: {
    width: 32,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  statusBannerText: {
    fontSize: 14,
    color: "#B45309",
    fontWeight: "500",
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  menuContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#E7E7E7",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: "#666666",
    marginTop: 2,
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

export default LoginSecurityScreen;
