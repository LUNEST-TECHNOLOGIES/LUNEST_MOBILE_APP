import { useRouter } from "expo-router";
import { ArrowRight, Lock, ShieldCheck, X, Zap } from "lucide-react-native";
import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProductTour } from "../../context/ProductTourContext";

/**
 * PostTourKycModal Component
 * Full-screen notice shown immediately after the tour concludes for unverified users.
 * Prompts user to complete their identity verification for the full LUNEST experience.
 */
export const PostTourKycModal = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { showPostTourKycModal, dismissKycModal, isForbiddenRoute } =
    useProductTour();

  if (!showPostTourKycModal || isForbiddenRoute) {
    return null;
  }

  const handleVerifyKyc = () => {
    dismissKycModal();
    router.push("/kyc-verification");
  };

  const handleClose = () => {
    dismissKycModal();
  };


  const isTablet = screenWidth >= 768;

  return (
    <Modal
      visible={showPostTourKycModal}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            isTablet && styles.modalContentTablet,
            {
              paddingTop: Math.max(insets.top, 24) + 12,
              paddingBottom: Math.max(insets.bottom, 20) + 12,
            },
          ]}
        >
          {/* Top Close Icon */}
          <View style={styles.topBar}>
            <View style={styles.topBadgeContainer}>
              <Text style={styles.topBadgeText}>ONE MORE STEP</Text>
            </View>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.buttonPressed,
              ]}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              accessibilityLabel="Close verification prompt"
              accessibilityRole="button"
            >
              <X size={20} color="#1F2937" strokeWidth={2.4} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Visual Icon Illustration */}
            <View style={styles.illustrationWrapper}>
              <View style={styles.outerGlowCircle}>
                <View style={styles.innerShieldCircle}>
                  <ShieldCheck size={48} color="#FFFFFF" strokeWidth={2.2} />
                </View>
              </View>
            </View>

            {/* Headline & Subtitle */}
            <Text style={styles.title}>Unlock the Full LUNEST Experience</Text>
            <Text style={styles.subtitle}>
              Verify your identity to enjoy seamless bookings, secure payments,
              and trusted stays across the entire LUNEST community.
            </Text>

            {/* Benefits Feature Cards */}
            <View style={styles.benefitsList}>
              <View style={styles.benefitCard}>
                <View style={[styles.benefitIconBox, { backgroundColor: "#EEF2FF" }]}>
                  <Zap size={22} color="#192DFF" strokeWidth={2.2} />
                </View>
                <View style={styles.benefitTextCol}>
                  <Text style={styles.benefitTitle}>Instant Reservations</Text>
                  <Text style={styles.benefitDesc}>
                    Book verified apartments and luxury homes immediately without delays.
                  </Text>
                </View>
              </View>

              <View style={styles.benefitCard}>
                <View style={[styles.benefitIconBox, { backgroundColor: "#ECFDF5" }]}>
                  <Lock size={22} color="#059669" strokeWidth={2.2} />
                </View>
                <View style={styles.benefitTextCol}>
                  <Text style={styles.benefitTitle}>Protected Payments</Text>
                  <Text style={styles.benefitDesc}>
                    Enjoy full LUNEST bank-grade security on transactions and caution deposits.
                  </Text>
                </View>
              </View>

              <View style={styles.benefitCard}>
                <View style={[styles.benefitIconBox, { backgroundColor: "#FFFBEB" }]}>
                  <ShieldCheck size={22} color="#D97706" strokeWidth={2.2} />
                </View>
                <View style={styles.benefitTextCol}>
                  <Text style={styles.benefitTitle}>Verified Member Trust</Text>
                  <Text style={styles.benefitDesc}>
                    Unlock a verified badge on your profile to build instant trust with hosts.
                  </Text>
                </View>
              </View>
            </View>

            {/* Micro reassurance notice */}
            <View style={styles.guaranteeBox}>
              <Text style={styles.guaranteeText}>
                🔒 Takes less than 2 minutes with automated BVN/NIN verification.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons Fixed at Bottom */}
          <View style={styles.actionsContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleVerifyKyc}
              accessibilityRole="button"
            >
              <ShieldCheck size={20} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.primaryButtonText}>Verify KYC</Text>
              <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.2} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleClose}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>I&apos;ll do this later</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 15, 30, 0.72)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    flex: 1,
    width: "100%",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  modalContentTablet: {
    maxWidth: 520,
    maxHeight: 760,
    borderRadius: 28,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  topBadgeContainer: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  topBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#192DFF",
    letterSpacing: 0.8,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  scrollBody: {
    flex: 1,
  },
  scrollBodyContent: {
    paddingVertical: 12,
    alignItems: "center",
  },
  illustrationWrapper: {
    marginVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  outerGlowCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "rgba(25, 45, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  innerShieldCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#192DFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#192DFF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  benefitsList: {
    width: "100%",
    gap: 12,
    marginBottom: 16,
  },
  benefitCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 14,
  },
  benefitIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitTextCol: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
  },
  guaranteeBox: {
    backgroundColor: "#F0FDF4",
    borderColor: "#DCFCE7",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: "100%",
    alignItems: "center",
  },
  guaranteeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#166534",
    textAlign: "center",
  },
  actionsContainer: {
    width: "100%",
    paddingTop: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#192DFF",
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#192DFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryButton: {
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
});

export default PostTourKycModal;
