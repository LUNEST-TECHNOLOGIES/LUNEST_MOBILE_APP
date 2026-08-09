import { useRouter, useLocalSearchParams } from "expo-router";
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
  View,
  Linking,
  RefreshControl,
  AppState
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import ToastNotification, { TOAST_TYPE } from "../../components/common/ToastNotification";
import authService from "../../services/authService";
import kycService from "../../services/kycService";
import profileService from "../../services/profileService";
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
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [verifiedName, setVerifiedName] = useState("");
  const [verifiedId, setVerifiedId] = useState("");
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeSessionUrl, setActiveSessionUrl] = useState("");
  const [isStatusChecking, setIsStatusChecking] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Method tab: 'DIDIT' = biometric scan (Didit), 'KORA' = NIN database check (Kora)
  const [activeTab, setActiveTab] = useState("DIDIT");
  const [ninInput, setNinInput] = useState("");
  const [ninError, setNinError] = useState("");

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
    const init = async () => {
      const loggedIn = await authService.isLoggedIn();
      if (!loggedIn) {
        console.warn("[KYC] User not logged in, redirecting to login");
        router.replace("/login");
        return;
      }

      // Always fetch fresh profile from server first to bust any stale local cache
      try {
        await authService.fetchProfile();
        console.log("[KYC] Fresh profile synced from server on screen open");
      } catch (e) {
        console.warn("[KYC] Could not sync profile on init:", e?.message);
      }
      
      const urlSessionId = params?.sessionId || params?.verificationSessionId;
      if (urlSessionId) {
        console.log("[KYC] Found redirect sessionId in URL params:", urlSessionId);
        setActiveSessionId(urlSessionId);
        await finalizeSession(urlSessionId, "Identity verified successfully!");
      } else {
        checkVerificationStatus();
      }
    };
    init();


    // Listen for app coming back to foreground (e.g. after completing Didit in system browser)
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        console.log("[KYC] App returned to active foreground state. Auto-syncing Didit verification status...");
        if (activeSessionId) {
          finalizeSession(activeSessionId, "Identity status updated.");
        } else {
          checkVerificationStatus();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [params?.sessionId, params?.verificationSessionId, activeSessionId]);

const maskIdNumber = (idStr) => {
  if (!idStr) return "";
  const cleaned = String(idStr).trim();
  if (cleaned.length <= 4) return "****";
  const startLen = Math.min(4, Math.floor(cleaned.length / 3));
  const endLen = Math.min(3, Math.floor(cleaned.length / 3));
  const start = cleaned.substring(0, startLen);
  const end = cleaned.substring(cleaned.length - endLen);
  return `${start}****${end}`;
};

  const checkVerificationStatus = async () => {
    try {
      // Trigger real-time Didit decision sync with backend first
      const syncRes = await kycService.syncDiditStatus();
      const syncUser = syncRes?.user || syncRes?.data || syncRes;
      if (syncUser?.verified === true || syncUser?.kycStatus === "VERIFIED" || syncUser?.kycStatus === "APPROVED") {
        setIsVerified(true);
        setRejectionReason(null);
        setVerifiedName(syncUser.fullName || "");
        const rawNin = syncUser.nin || syncUser.kycData?.documentNumber || syncUser.idNumber || "";
        const masked = maskIdNumber(rawNin);
        setVerifiedId(masked || "ID Verified");
        showToast("Identity verified successfully!", TOAST_TYPE.SUCCESS);
        return;
      }

      const profile = await authService.fetchProfile();
      const userBody = profile.data || {};
      const isVerifiedStatus = userBody.kycStatus === "VERIFIED" || userBody.verified === true || userBody.kycStatus === "APPROVED";

      if (isVerifiedStatus) {
        setIsVerified(true);
        setRejectionReason(null);
        setVerifiedName(userBody.fullName || "");
        
        // Mask the NIN/document number
        const rawNin = userBody.nin || userBody.kycData?.documentNumber || userBody.idNumber || "";
        const masked = maskIdNumber(rawNin);
        setVerifiedId(masked || "ID Verified");
      } else if (userBody.kycData?.sessionId) {
        setActiveSessionId(userBody.kycData.sessionId);
        setActiveSessionUrl(userBody.kycData.sessionUrl || "");
        setConsentChecked(true); // Pre-approve consent since they have a session
      }

    } catch (error) {
      console.error("Error checking verification status:", error);
    }
  };


  const handleBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)");
      }
    } catch (e) {
      router.replace("/(tabs)");
    }
  };

  const [rejectionReason, setRejectionReason] = useState(null);

  /** Handle Kora NIN verification (instant — no browser redirect) */
  const handleKoraVerify = async () => {
    setNinError("");
    const cleanNin = ninInput.trim();
    if (!cleanNin) {
      setNinError("Please enter your NIN.");
      return;
    }
    if (!/^[0-9]{11}$/.test(cleanNin) && !/^[a-zA-Z0-9]{16}$/.test(cleanNin)) {
      setNinError("NIN must be 11 digits or 16-character Virtual NIN (vNIN).");
      return;
    }

    if (!consentChecked) {
      showToast("Please check the consent box to proceed.", TOAST_TYPE.WARNING);
      return;
    }

    try {
      setIsLoading(true);
      setLoadingMessage("Verifying your NIN with Kora...");
      setRejectionReason(null);
      showToast("Verifying NIN...", TOAST_TYPE.INFO);

      const result = await kycService.koraVerifyNIN(cleanNin);

      if (result?.verified || result?.kycStatus === "VERIFIED" || result?.status === "VERIFIED" || result?.success === true) {




        setIsVerified(true);
        setRejectionReason(null);
        const nameToUse = result?.verifiedName || result?.fullName || "";

        setVerifiedName(nameToUse);
        const rawNin = result?.nin || cleanNin;
        const masked = maskIdNumber(rawNin);
        setVerifiedId(masked);

        // Sync to local storage & profileService
        const currentUser = await getUserData();
        if (currentUser) {
          await setUserData({
            ...currentUser,
            verified: true,
            kycStatus: "VERIFIED",
            fullName: nameToUse || currentUser.fullName,
            nin: cleanNin,
          });
        }

        await profileService.updateProfile({
          verified: true,
          kycStatus: "VERIFIED",
          idNumber: cleanNin,
          nin: cleanNin,
          fullName: nameToUse || currentUser?.fullName,
        });

        await authService.fetchProfile();

        showToast("Identity verified successfully!", TOAST_TYPE.SUCCESS);
      } else {
        showToast(result?.message || "NIN verification failed. Please try again.", TOAST_TYPE.ERROR);
      }
    } catch (error) {
      const errorMsg = getErrorMessage(error, "NIN verification failed. Please check your NIN and try again.");
      console.error("[KYC] Kora verify error:", errorMsg);
      showToast(errorMsg, TOAST_TYPE.ERROR);
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const launchDiditSession = async (response) => {
    const sessionUrl = response?.url || response?.session_url;
    const sessionToken = response?.session_token || response?.sessionToken;
    const sessionId = response?.sessionId || response?.session_id;

    if (!sessionUrl) {
      if (response?.verified || response?.kycStatus === "VERIFIED") {
        setIsVerified(true);
        return { verified: true };
      }
      throw new Error("Failed to generate verification session. Please try again.");
    }

    console.log("[KYC] Opening Didit verification session. URL:", sessionUrl);

    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        // Redirect current window directly to prevent mobile browser pop-up blockers
        window.location.href = sessionUrl;
      }
    } else {
      // Try to open with DiditSdk first if sessionToken exists
      if (sessionToken) {
        try {
          const { DiditSdk } = require("@didit-protocol/sdk-react-native");
          if (DiditSdk && typeof DiditSdk.startVerification === "function") {
            console.log("[KYC] Launching Didit SDK verification...");
            await DiditSdk.startVerification(sessionToken);
            return { sessionId, sessionUrl };
          }
        } catch (sdkError) {
          console.warn("[KYC] DiditSdk unavailable, falling back to default browser:", sdkError);
        }
      }

      // Fallback: Open in default system browser (Chrome/Safari) to ensure full WebRTC camera access
      console.log("[KYC] Opening session URL in system default browser for WebRTC camera support");
      await Linking.openURL(sessionUrl);
    }

    return { sessionId, sessionUrl };
  };

  const finalizeSession = async (sessionId, successMessage) => {
    if (!sessionId) {
      return;
    }

    try {
      setIsStatusChecking(true);
      const statusResult = await kycService.getDiditSessionStatus(sessionId);

      console.log("[KYC] finalizeSession raw statusResult:", JSON.stringify(statusResult));

      const isUrlApproved = String(params?.status || "").toUpperCase().includes("APPROV") || String(params?.status || "").toUpperCase().includes("VERIF");
      const isVerified = statusResult?.verified === true || statusResult?.kycStatus === "VERIFIED" || statusResult?.kycStatus === "APPROVED" || isUrlApproved;


      if (isVerified) {
        setIsVerified(true);
        setRejectionReason(null);
        setActiveSessionId(null); // Clear active session ID on success
        const nameToUse = statusResult?.user?.fullName || statusResult?.fullName || "";
        setVerifiedName(nameToUse);
        const rawNin = statusResult?.user?.nin || statusResult?.nin || statusResult?.user?.kycData?.documentNumber || "";
        const masked = maskIdNumber(rawNin);
        setVerifiedId(masked || "ID Verified");

        const currentUser = await getUserData();
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            verified: true,
            kycStatus: "VERIFIED",
            fullName: nameToUse || currentUser.fullName,
            nin: rawNin || currentUser.nin,
          };
          await setUserData(updatedUser);
        }

        // Sync profile data across app screens via profileService (ID number & KYC status focus)
        await profileService.updateProfile({
          verified: true,
          kycStatus: "VERIFIED",
          idNumber: rawNin,
          nin: rawNin,
          fullName: nameToUse || currentUser?.fullName,
        });

        // Refetch latest profile from server to guarantee full sync
        await authService.fetchProfile();

        showToast(successMessage || "Identity verified successfully!", TOAST_TYPE.SUCCESS);
        return;
      }

      // Check for rejection/declined status
      const resolvedKycStatus = statusResult?.kycStatus || statusResult?.status || "";
      const isRejected = resolvedKycStatus === "REJECTED" || resolvedKycStatus === "DECLINED" || resolvedKycStatus === "FAILED";
      if (isRejected) {
        const reason =
          statusResult?.kycRejectionReason ||
          statusResult?.user?.kycRejectionReason ||
          statusResult?.sync?.kycRejectionReason ||
          "Verification was declined by provider.";
        setRejectionReason(reason);
        showToast(reason, TOAST_TYPE.ERROR);
        return;
      }

      // Handle session not started/completed yet
      const rawStatus = statusResult?.status || statusResult?.rawStatus || "";
      if (rawStatus === "Not Started" || rawStatus === "Not_Started") {
        showToast("Verification was not completed. Please try again.", TOAST_TYPE.WARNING);
        return;
      }

      showToast("Verification in progress or pending final review.", TOAST_TYPE.INFO);
    } catch (err) {
      console.error("[KYC] Error verifying status:", err);
      showToast("Verification is in progress. Please refresh in a moment.", TOAST_TYPE.INFO);
    } finally {
      setIsStatusChecking(false);
    }
  };


  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      if (activeSessionId) {
        await finalizeSession(activeSessionId, "Identity status updated.");
      } else {
        await checkVerificationStatus();
      }
    } catch (error) {
      console.error("[KYC] Refresh error:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleHostedScan = async () => {
    if (!consentChecked && !activeSessionId) {
      showToast("Please check the consent box to proceed.", TOAST_TYPE.WARNING);
      return;
    }

    try {
      setIsLoading(true);
      setLoadingMessage("Starting hosted Didit verification...");
      setRejectionReason(null);
      showToast("Starting Identity Verification...", TOAST_TYPE.INFO);

      // Resolve platform and origin for redirect handling
      let callbackUrl = undefined;
      const baseURL = authService.baseURL;
      
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const origin = window.location.origin;
        callbackUrl = `${baseURL}/v1/kyc/didit/webhook?platform=pwa&origin=${encodeURIComponent(origin)}`;
      } else {
        callbackUrl = `${baseURL}/v1/kyc/didit/webhook?platform=native`;
      }



      const response = await kycService.createDiditSession(callbackUrl);
      
      // If backend returns that the user is already verified
      if (response?.verified || response?.kycStatus === "VERIFIED" || response?.status === "VERIFIED") {
        setIsVerified(true);
        setActiveSessionId(null);
        setVerifiedName(response?.verifiedName || response?.fullName || "");
        const rawNin = response?.nin || "";
        if (rawNin) {
          const masked = rawNin.replace(/^(\d{3,4})\d+(\d{3})$/, "$1****$2");
          setVerifiedId(masked);
        }
        showToast("Identity verified successfully!", TOAST_TYPE.SUCCESS);
        return;
      }

      const { sessionId, sessionUrl } = await launchDiditSession(response);
      
      if (sessionId) {
        setActiveSessionId(sessionId);
        if (sessionUrl) setActiveSessionUrl(sessionUrl);
        
        if (Platform.OS !== "web") {
          showToast("Opened verification in Chrome/Safari. Return here and tap 'Check Status' once done.", TOAST_TYPE.INFO);
        } else {
          await finalizeSession(sessionId, "Identity verified successfully!");
        }
      }
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
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
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

          {/* Masked identity display */}
          <View style={styles.verifiedInfoCard}>
            {!!verifiedName && (
              <View style={{ width: "100%", marginBottom: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#6B7280", letterSpacing: 1, marginBottom: 4 }}>VERIFIED NAME</Text>
                <Text style={styles.infoValue}>{verifiedName}</Text>
              </View>
            )}
            <View style={{ width: "100%", borderTopWidth: !!verifiedName ? 1 : 0, borderTopColor: "#E5E7EB", paddingTop: !!verifiedName ? 12 : 0 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#6B7280", letterSpacing: 1, marginBottom: 4 }}>GOVERNMENT IDENTITY ID</Text>
              <Text style={styles.infoValue}>{verifiedId || "ID Verified"}</Text>
            </View>
          </View>

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
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
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
            <TouchableOpacity 
              style={styles.doneButton} 
              onPress={() => {
                setRejectionReason(null);
                setActiveSessionId(null);
                setActiveSessionUrl(null);
              }}
            >
              <Text style={styles.doneButtonText}>Try Verification Again</Text>
            </TouchableOpacity>

            
            <TouchableOpacity 
              style={[styles.doneButton, { backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" }]} 
              onPress={() => {
                try {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace("/(tabs)/profile");
                  }
                } catch (e) {
                  router.replace("/(tabs)/profile");
                }
              }}
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
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Identity Verification</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={["#008751"]}
              tintColor="#008751"
            />
          }
        >
          <Text style={styles.title}>Verify Your Identity</Text>
          <Text style={styles.subtitle}>
            Choose a verification method below. Both options are secure and accepted.
          </Text>

          {/* Method Tab Selector */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              id="tab-didit"
              style={[styles.tabButton, activeTab === "DIDIT" && styles.tabButtonActive]}
              onPress={() => {
                setActiveTab("DIDIT");
                setNinError("");
              }}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabButtonText, activeTab === "DIDIT" && styles.tabButtonTextActive]}>
                📷 Document Scan
              </Text>
              <Text style={[styles.tabSubText, activeTab === "DIDIT" && styles.tabSubTextActive]}>
                Didit · Biometric
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              id="tab-kora"
              style={[styles.tabButton, activeTab === "KORA" && styles.tabButtonActive]}
              onPress={() => {
                setActiveTab("KORA");
                setNinError("");
              }}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabButtonText, activeTab === "KORA" && styles.tabButtonTextActive]}>
                🔢 NIN Lookup
              </Text>
              <Text style={[styles.tabSubText, activeTab === "KORA" && styles.tabSubTextActive]}>
                Kora · Database
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── DIDIT TAB ── */}
          {activeTab === "DIDIT" && (
            <View style={styles.diditNoteContainer}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Circle cx="12" cy="12" r="10" fill="#EEF2FF" stroke="#010135" strokeWidth="2" />
                  <Path d="M12 16V12M12 8H12.01" stroke="#010135" strokeWidth="2.5" strokeLinecap="round" />
                </Svg>
                <Text style={styles.diditNoteTitle}>Identity Verification Scan</Text>
              </View>
              <Text style={styles.diditNoteText}>
                Scan your valid government ID document and complete a liveness check to verify your identity instantly.
              </Text>
            </View>
          )}

          {/* ── KORA TAB ── */}
          {activeTab === "KORA" && (
            <View>
              <View style={styles.koraNoteContainer}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Circle cx="12" cy="12" r="10" fill="#ECFDF5" stroke="#008751" strokeWidth="2" />
                    <Path d="M12 16V12M12 8H12.01" stroke="#008751" strokeWidth="2.5" strokeLinecap="round" />
                  </Svg>
                  <Text style={styles.koraNoteTitle}>Government NIN Lookup</Text>
                </View>
                <Text style={styles.koraNoteText}>
                  Enter your 11-digit NIN or 16-character Virtual NIN (vNIN). Kora will verify your identity directly against the official database.
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>National Identification Number (NIN / vNIN)</Text>
                <TextInput
                  id="kora-nin-input"
                  style={[
                    styles.input,
                    ninError ? { borderColor: "#EF4444" } : null,
                  ]}
                  placeholder="Enter 11-digit NIN or 16-character vNIN"
                  placeholderTextColor="#9CA3AF"
                  value={ninInput}
                  onChangeText={(text) => {
                    setNinInput(text.trim().toUpperCase());
                    if (ninError) setNinError("");
                  }}
                  autoCapitalize="characters"
                  maxLength={16}
                  returnKeyType="done"
                />
                {!!ninError && (
                  <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>{ninError}</Text>
                )}
                <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 6, lineHeight: 16 }}>
                  Supports 11-digit raw NIN or 16-character Virtual NIN (vNIN). (Test Mode vNIN: KO111111111111IL)
                </Text>

              </View>
            </View>
          )}


          {/* Consent checkbox — shown for both tabs */}
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
              {activeTab === "KORA"
                ? "I consent to the secure processing of my NIN for identity verification purposes."
                : "I consent to the secure processing of my government ID document and facial liveness verification."}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.footer}>
          {/* ── DIDIT footer buttons ── */}
          {activeTab === "DIDIT" && (
            activeSessionId ? (
              <View style={{ gap: 12 }}>
                <TouchableOpacity
                  id="btn-check-status"
                  style={styles.verifyButton}
                  onPress={() => finalizeSession(activeSessionId, "Identity verified successfully!")}
                  disabled={isStatusChecking}
                >
                  {isStatusChecking ? (
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <ActivityIndicator color="white" />
                      <Text style={styles.verifyButtonText}>Checking status...</Text>
                    </View>
                  ) : (
                    <Text style={styles.verifyButtonText}>Check Status / Refresh</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  id="btn-restart-didit"
                  style={[styles.verifyButton, { backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" }]}
                  onPress={handleHostedScan}
                  disabled={isLoading}
                >
                  <Text style={[styles.verifyButtonText, { color: "#1F2937" }]}>Restart Verification</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                id="btn-start-didit"
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
                  <Text style={styles.verifyButtonText}>Start Document Scan</Text>
                )}
              </TouchableOpacity>
            )
          )}

          {/* ── KORA footer button ── */}
          {activeTab === "KORA" && (
            <TouchableOpacity
              id="btn-kora-verify"
              style={[
                styles.verifyButton,
                { backgroundColor: "#008751" },
                (!consentChecked || isLoading) && styles.disabledButton,
              ]}
              onPress={handleKoraVerify}
              disabled={!consentChecked || isLoading}
            >
              {isLoading ? (
                <View style={{ alignItems: "center" }}>
                  <ActivityIndicator color="white" />
                  {!!loadingMessage && <Text style={styles.verifyButtonSubtext}>{loadingMessage}</Text>}
                </View>
              ) : (
                <Text style={styles.verifyButtonText}>Verify NIN with Kora</Text>
              )}
            </TouchableOpacity>
          )}

          <Text style={styles.poweredByText}>
            {activeTab === "KORA" ? "Powered by Kora Identity" : "Powered by Didit"}
          </Text>
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
            <Text style={styles.loadingSubtext}>Connecting to secure provider portal. Please complete the verification scan in your browser.</Text>
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
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
    textAlign: "center",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
  },
  tabSubText: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
    textAlign: "center",
  },
  tabSubTextActive: {
    color: "rgba(255,255,255,0.75)",
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
  diditNoteContainer: {
    backgroundColor: "#F4F6FF",
    padding: 16,
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#010135",
    marginBottom: 8,
  },
  diditNoteTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#010135",
    letterSpacing: -0.2,
  },
  diditNoteText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 20,
  },
  koraNoteContainer: {
    backgroundColor: "#F0FDF4",
    padding: 16,
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#008751",
    marginBottom: 16,
  },
  koraNoteTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#065F46",
    letterSpacing: -0.2,
  },
  koraNoteText: {
    fontSize: 13,
    color: "#047857",
    lineHeight: 20,
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
  poweredByText: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 18,
    marginBottom: 4,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
});

export default KYCVerificationScreen;
