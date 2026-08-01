import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import ToastNotification, { TOAST_TYPE } from "../../components/common/ToastNotification";
import authService from "../../services/authService";
import kycService from "../../services/kycService";
import { getUserData, setUserData } from "../../services/userDataService";

const BackIcon = ({ size = 24, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 18L9 12L15 6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CameraIcon = ({ size = 32, color = "#010135" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth="2" />
  </Svg>
);

const KYCVerificationScreen = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  
  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastConfig, setToastConfig] = useState({
    type: TOAST_TYPE.SUCCESS,
    message: "",
  });

  const showToast = (message, type = TOAST_TYPE.SUCCESS) => {
    setToastConfig({ message, type });
    setToastVisible(true);
  };

  const getErrorMessage = (error, fallbackMessage) => {
    if (error?.message) {
      return error.message;
    }

    if (typeof error === "string" && error.trim()) {
      return error;
    }

    if (error?.response?.data?.message) {
      return error.response.data.message;
    }

    if (error?.response?.data?.error) {
      return error.response.data.error;
    }

    return fallbackMessage;
  };

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const profile = await authService.fetchProfile();
      if (profile.data?.kycStatus === "VERIFIED") {
        setIsVerified(true);
      }
    } catch (error) {
      console.error("Error checking verification status:", error);
    }
  };

  const [rejectionReason, setRejectionReason] = useState(null);

  const launchDiditSession = async (response) => {
    const sessionUrl = response?.url || response?.session_url;
    const sessionToken = response?.session_token || response?.sessionToken;
    const sessionId = response?.sessionId || response?.session_id;

    if (Platform.OS !== "web" && sessionToken) {
      try {
        const { DiditSdk } = require("@didit-protocol/sdk-react-native");
        if (DiditSdk && typeof DiditSdk.startVerification === "function") {
          await DiditSdk.startVerification(sessionToken);
        } else if (sessionUrl) {
          await WebBrowser.openBrowserAsync(sessionUrl);
        }
      } catch (sdkError) {
        console.warn("[KYC] DiditSdk native module unavailable. Falling back to browser:", sdkError);
        if (sessionUrl) {
          await WebBrowser.openBrowserAsync(sessionUrl);
        }
      }
    } else if (sessionUrl) {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.open(sessionUrl, "_blank");
      } else {
        await WebBrowser.openBrowserAsync(sessionUrl);
      }
    } else if (response?.verified || response?.kycStatus === "VERIFIED") {
      setIsVerified(true);
      return { verified: true };
    } else {
      throw new Error("Failed to generate verification session. Please try again.");
    }

    return { sessionId };
  };

  const finalizeSession = async (sessionId, successMessage) => {
    if (!sessionId) {
      return;
    }

    const statusResult = await kycService.getDiditSessionStatus(sessionId);

    if (statusResult?.verified || statusResult?.kycStatus === "VERIFIED") {
      setIsVerified(true);
      const currentUser = await getUserData();
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          verified: true,
          kycStatus: "VERIFIED",
          fullName: statusResult?.user?.fullName || currentUser.fullName,
        };
        await setUserData(updatedUser);
      }
      showToast(successMessage || "Identity verified successfully!", TOAST_TYPE.SUCCESS);
      return;
    }

    if (statusResult?.kycStatus === "REJECTED") {
      const reason = statusResult?.kycRejectionReason || "Verification was declined by provider.";
      setRejectionReason(reason);
      showToast(reason, TOAST_TYPE.ERROR);
      return;
    }

    showToast("Verification in progress or pending final review.", TOAST_TYPE.INFO);
  };

  const handleHostedScan = async () => {
    if (!consentChecked) {
      showToast("Please check the consent box to proceed.", TOAST_TYPE.WARNING);
      return;
    }

    try {
      setIsLoading(true);
      setLoadingMessage("Starting hosted Didit verification...");
      setRejectionReason(null);
      showToast("Starting Identity Verification...", TOAST_TYPE.INFO);

      const response = await kycService.createDiditSession();
      const { sessionId } = await launchDiditSession(response);
      await finalizeSession(sessionId, "Identity verified successfully!");
    } catch (error) {
      const errorMsg = getErrorMessage(error, "Could not verify identity.");
      console.error("[KYC] Verification error:", errorMsg);
      showToast(errorMsg, TOAST_TYPE.ERROR);
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  if (isVerified) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>KYC Verified</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Svg width={80} height={80} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="12" r="10" fill="#4CAF50" />
              <Path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <Text style={styles.successTitle}>Identity Verified! 🎉</Text>
          <Text style={styles.successSubtitle}>Your identity has been verified. Your full name and verified government ID have been synced to your account profile.</Text>

          <View style={{ width: "100%", gap: 12, marginTop: 24 }}>
            <TouchableOpacity style={styles.doneButton} onPress={() => router.replace("/(tabs)")}>
              <Text style={styles.doneButtonText}>Explore Properties (Home)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.doneButton, { backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" }]} 
              onPress={() => router.push("/profile/personal-info-edit")}
            >
              <Text style={[styles.doneButtonText, { color: "#1F2937" }]}>Back to Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (rejectionReason) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verification Status</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: "#FEF2F2" }]}>
            <Svg width={80} height={80} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="12" r="10" fill="#EF4444" />
              <Path d="M12 8V12M12 16H12.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
          <Text style={styles.successTitle}>Verification Needs Attention ⚠️</Text>
          <Text style={[styles.successSubtitle, { color: "#DC2626" }]}>{rejectionReason}</Text>

          <View style={{ width: "100%", gap: 12, marginTop: 24 }}>
            <TouchableOpacity style={styles.doneButton} onPress={() => setRejectionReason(null)}>
              <Text style={styles.doneButtonText}>Try Verification Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.doneButton, { backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" }]} 
              onPress={() => router.push("/profile/personal-info-edit")}
            >
              <Text style={[styles.doneButtonText, { color: "#1F2937" }]}>Back to Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Identity Verification</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Verify Your Identity</Text>
          <Text style={styles.subtitle}>
            Complete identity verification with the hosted Didit scan flow.
          </Text>

          <View style={styles.noteContainer}>
            <Text style={styles.noteTitle}>Hosted Didit scan:</Text>
            <Text style={styles.noteText}>
              Use the hosted Didit flow to scan your document and complete liveness verification.
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.consentContainer} 
            onPress={() => setConsentChecked(!consentChecked)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, consentChecked && styles.checkboxChecked]}>
              {consentChecked && (
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              )}
            </View>
            <Text style={styles.consentText}>
              I consent to the processing of my government ID document and facial verification via Didit.
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.verifyButton, (!consentChecked || isLoading) && styles.disabledButton]}
            onPress={handleHostedScan}
            disabled={!consentChecked || isLoading}
          >
            {isLoading ? (
              <View style={{ alignItems: "center" }}>
                <ActivityIndicator color="white" />
                {!!loadingMessage && <Text style={styles.verifyButtonSubtext}>{loadingMessage}</Text>}
              </View>
            ) : (
              <Text style={styles.verifyButtonText}>Start Hosted Scan</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      
      <ToastNotification
        visible={toastVisible}
        type={toastConfig.type}
        message={toastConfig.message}
        onHide={() => setToastVisible(false)}
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#008751" />
            <Text style={styles.loadingTitle}>{loadingMessage || "Starting Identity Verification..."}</Text>
            <Text style={styles.loadingSubtext}>Connecting to secure provider portal. Please complete the Didit flow in the browser or native SDK.</Text>
          </View>
        </View>
      )}
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
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#010135",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#010135",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
    marginBottom: 24,
  },
  tabContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    backgroundColor: "#F9F9F9",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  tabButtonActive: {
    backgroundColor: "#010135",
    borderColor: "#010135",
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4B5563",
    textAlign: "center",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#010135",
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#010135",
    backgroundColor: "#F9F9F9",
  },
  selfieSection: {
    marginBottom: 32,
  },
  hint: {
    fontSize: 13,
    color: "#888888",
    marginBottom: 16,
  },
  selfiePlaceholder: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#010135",
    borderStyle: "dashed",
    overflow: "hidden",
    backgroundColor: "#F0F2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderContent: {
    alignItems: "center",
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 14,
    color: "#010135",
    fontWeight: "500",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  noteContainer: {
    backgroundColor: "#FFF9E6",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FFC107",
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#856404",
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    color: "#856404",
    lineHeight: 18,
  },
  consentContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    backgroundColor: "#F0F2FF",
    padding: 16,
    borderRadius: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#010135",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#010135",
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    color: "#010135",
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },
  verifyButton: {
    height: 56,
    backgroundColor: "#010135",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#CCCCCC",
  },
  verifyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  verifyButtonSubtext: {
    marginTop: 4,
    color: "rgba(255,255,255,0.82)",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#010135",
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  verifiedInfoCard: {
    width: "100%",
    backgroundColor: "#F5F7FF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 40,
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#010135",
  },
  doneButton: {
    width: "100%",
    height: 56,
    backgroundColor: "#010135",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  doneButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    zIndex: 999,
  },
  loadingCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#010135",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  loadingSubtext: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
});

export default KYCVerificationScreen;
