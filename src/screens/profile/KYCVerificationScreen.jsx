import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
  const [nin, setNin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  
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

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const profile = await authService.fetchProfile();
      if (profile.data?.kycStatus === "VERIFIED") {
        setIsVerified(true);
        setNin(profile.data.nin || "");
      }
    } catch (error) {
      console.error("Error checking verification status:", error);
    }
  };


  const handleVerify = async () => {
    if (!nin || nin.length !== 11) {
      showToast("Please enter a valid 11-digit NIN.", TOAST_TYPE.ERROR);
      return;
    }

    /* 
    // Selfie is now optional for testing
    if (!selfie) {
      showToast("Please take a selfie for facial matching.", TOAST_TYPE.ERROR);
      return;
    }
    */
    
    if (!consentChecked) {
      showToast("Please provide your consent to proceed.", TOAST_TYPE.WARNING);
      return;
    }

    try {
      const result = await kycService.verifyNIN(nin, null);

      if (result.status === "VERIFIED") {
        setIsVerified(true);
        
        // Sync verified name to local storage
        const currentUser = await getUserData();
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            verified: true,
            kycStatus: "VERIFIED",
            fullName: result.verifiedName || currentUser.fullName,
            nin: result.nin || nin
          };
          await setUserData(updatedUser);
          console.log("[KYC] Local user data updated with verified name:", updatedUser.fullName);
        }

        showToast(`Identity verified as ${result.verifiedName || "Success"}!`, TOAST_TYPE.SUCCESS);
        setTimeout(() => router.back(), 2500);
      }
    } catch (error) {
      const errorMsg = error.message || "Could not verify identity.";
      console.error("[KYC] Verification error:", errorMsg);
      
      if (errorMsg.includes("not found")) {
        showToast("NIN record not found. Please check the number and try again.", TOAST_TYPE.ERROR);
      } else if (errorMsg.includes("match")) {
        showToast("Facial match failed. Ensure your face is clear and well-lit.", TOAST_TYPE.ERROR);
      } else {
        showToast(errorMsg, TOAST_TYPE.ERROR);
      }
    } finally {
      setIsLoading(false);
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
          <Text style={styles.successTitle}>Identity Verified</Text>
          <Text style={styles.successSubtitle}>Your National Identity has been successfully verified.</Text>
          
          <View style={styles.verifiedInfoCard}>
            <Text style={styles.infoLabel}>Verified NIN</Text>
            <Text style={styles.infoValue}>{nin.replace(/(\d{4})\d+(\d{3})/, "$1****$2")}</Text>
          </View>

          <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
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
          <Text style={styles.title}>Verify your Identity</Text>
          <Text style={styles.subtitle}>
            We use Korapay to securely verify your NIN record based on official government databases.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>NIN (11 Digits)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your 11-digit NIN"
              keyboardType="number-pad"
              maxLength={11}
              value={nin}
              onChangeText={setNin}
              editable={!isLoading}
            />
          </View>


          <View style={styles.noteContainer}>
            <Text style={styles.noteTitle}>Important Note:</Text>
            <Text style={styles.noteText}>
              Your information is securely processed. We do not store your raw biometric data.
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
              I consent to the verification of my NIN with official government records via Korapay.
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.verifyButton, (!nin || !consentChecked || isLoading) && styles.disabledButton]}
            onPress={handleVerify}
            disabled={!nin || !consentChecked || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify Identity</Text>
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
});

export default KYCVerificationScreen;
