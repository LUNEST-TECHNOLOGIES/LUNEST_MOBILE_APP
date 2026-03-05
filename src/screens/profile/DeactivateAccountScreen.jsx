/**
 * DeactivateAccountScreen - Account deactivation confirmation modal/screen
 * Allows users to deactivate their account with confirmation
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
 * Back Arrow Icon - Same style as other profile screens
 */
const BackIcon = ({ size = 24, color = "black" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15.0003 20.67C14.8103 20.67 14.6203 20.6 14.4703 20.45L7.95027 13.93C6.89027 12.87 6.89027 11.13 7.95027 10.07L14.4703 3.55002C14.7603 3.26002 15.2403 3.26002 15.5303 3.55002C15.8203 3.84002 15.8203 4.32002 15.5303 4.61002L9.01027 11.13C8.53027 11.61 8.53027 12.39 9.01027 12.87L15.5303 19.39C15.8203 19.68 15.8203 20.16 15.5303 20.45C15.3803 20.59 15.1903 20.67 15.0003 20.67Z"
      fill={color}
    />
  </Svg>
);

const DeactivateAccountScreen = () => {
  const router = useRouter();
  const { deactivateAccount } = useAccountStatus();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
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

  const handleDeactivatePress = () => {
    console.log("[DeactivateScreen] Opening confirmation modal");
    setShowConfirmModal(true);
  };

  const handleConfirmDeactivate = async () => {
    console.log("[DeactivateScreen] Final deactivate button pressed");
    console.log(
      "[DeactivateScreen] deactivateAccount function exists:",
      !!deactivateAccount,
    );

    if (!deactivateAccount) {
      showToast("Unable to deactivate. Please try again later.", "error");
      return;
    }

    setIsDeactivating(true);
    try {
      console.log("[DeactivateScreen] Calling deactivateAccount...");
      const result = await deactivateAccount();
      console.log("[DeactivateScreen] Result:", result);

      setIsDeactivating(false);

      if (result.success) {
        // Close modal immediately
        setShowConfirmModal(false);
        // Show success toast
        showToast(
          "Your account has been deactivated. You can reactivate anytime from Login & Security settings.",
          "success",
        );
        // Navigate back after a short delay
        setTimeout(() => {
          router.back();
        }, 2000);
      } else {
        showToast(result.message || "Failed to deactivate account", "error");
      }
    } catch (error) {
      console.error("[DeactivateScreen] Error:", error);
      setIsDeactivating(false);
      showToast("Something went wrong. Please try again.", "error");
    }
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
  };

  const handleGoBack = () => {
    router.back();
  };

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
        <Pressable onPress={handleGoBack} style={styles.backButton}>
          <BackIcon size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>Deactivate Account</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.warningIconContainer}>
          <Ionicons name="warning-outline" size={60} color="#B70808" />
        </View>

        <Text style={styles.warningTitle}>
          Are you sure you want to deactivate your account?
        </Text>

        <Text style={styles.warningDescription}>
          Your listings (if any) will be paused, and you won't be able to make
          or manage bookings until you reactivate. You can reactivate your
          account anytime from Login & Security settings.
        </Text>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <Pressable
            style={styles.deactivateButton}
            onPress={handleDeactivatePress}
          >
            <Text style={styles.deactivateButtonText}>Yes, Deactivate</Text>
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={handleGoBack}>
            <Text style={styles.cancelButtonText}>No, Cancel</Text>
          </Pressable>
        </View>
      </View>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons
              name="alert-circle-outline"
              size={50}
              color="#B70808"
              style={styles.modalIcon}
            />

            <Text style={styles.modalTitle}>Final Confirmation</Text>

            <Text style={styles.modalDescription}>
              Your account will be deactivated and you won't be able to make
              bookings or manage listings until reactivated. Are you sure?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={handleCancel}
                disabled={isDeactivating}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Go Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalConfirmButton,
                  isDeactivating && styles.modalButtonDisabled,
                ]}
                onPress={handleConfirmDeactivate}
                disabled={isDeactivating}
                activeOpacity={0.7}
              >
                {isDeactivating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Deactivate</Text>
                )}
              </TouchableOpacity>
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
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#010135",
    fontFamily: "Aeonik TRIAL",
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  warningIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#010135",
    textAlign: "center",
    marginBottom: 16,
    fontFamily: "Aeonik Pro",
  },
  warningDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 40,
    fontFamily: "Aeonik Pro",
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
    justifyContent: "center",
  },
  deactivateButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#B70808",
    backgroundColor: "transparent",
  },
  deactivateButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#B70808",
    fontFamily: "Aeonik TRIAL",
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    backgroundColor: "#010135",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    fontFamily: "Aeonik TRIAL",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#010135",
    marginBottom: 12,
    fontFamily: "Aeonik TRIAL",
  },
  modalDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    fontFamily: "Aeonik Pro",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelButton: {
    backgroundColor: "#F5F5F5",
  },
  modalConfirmButton: {
    backgroundColor: "#B70808",
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    fontFamily: "Aeonik TRIAL",
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    fontFamily: "Aeonik TRIAL",
  },
});

export default DeactivateAccountScreen;
