import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from 'expo-file-system';
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import PhoneVerificationModal from "../../components/modals/PhoneVerificationModal";
import ToastNotification, { TOAST_TYPE } from "../../components/common/ToastNotification";
import authService from "../../services/authService";
import profileService from "../../services/profileService";

/**
 * Back Arrow Icon - Same style as booking confirmation
 */
const BackIcon = ({ size = 24, color = "black" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15.0003 20.67C14.8103 20.67 14.6203 20.6 14.4703 20.45L7.95027 13.93C6.89027 12.87 6.89027 11.13 7.95027 10.07L14.4703 3.55002C14.7603 3.26002 15.2403 3.26002 15.5303 3.55002C15.8203 3.84002 15.8203 4.32002 15.5303 4.61002L9.01027 11.13C8.53027 11.61 8.53027 12.39 9.01027 12.87L15.5303 19.39C15.8203 19.68 15.8203 20.16 15.5303 20.45C15.3803 20.59 15.1903 20.67 15.0003 20.67Z"
      fill={color}
    />
  </Svg>
);

/**
 * Camera Icon for photo upload
 */
const CameraIcon = ({ size = 24, color = "#FFFFFF" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={2} />
  </Svg>
);

/**
 * Profile Avatar Icon - Same style as bottom nav profile icon
 */
const ProfileAvatarIcon = ({ size = 137, color = "#192DFF" }) => (
  <Svg width={size} height={size} viewBox="0 0 30 30" fill="none">
    <Circle cx="15" cy="15" r="14" stroke={color} strokeWidth={1.5} />
    <Circle cx="15" cy="11" r="4.5" stroke={color} strokeWidth={1.5} />
    <Path
      d="M7 24.5C7 20.358 10.358 17 14.5 17H15.5C19.642 17 23 20.358 23 24.5"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </Svg>
);

/**
 * Verified Check Icon
 */
const VerifiedCheckIcon = ({ size = 18, color = "#4CAF50" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2L14.09 4.26L17 3.52L17.74 6.43L20.65 7.17L19.91 10.08L22.17 12L19.91 13.92L20.65 16.83L17.74 17.57L17 20.48L14.09 19.74L12 22L9.91 19.74L7 20.48L6.26 17.57L3.35 16.83L4.09 13.92L1.83 12L4.09 10.08L3.35 7.17L6.26 6.43L7 3.52L9.91 4.26L12 2Z"
      fill={color}
    />
    <Path
      d="M10 14.5L7.5 12L8.91 10.59L10 11.67L14.09 7.59L15.5 9L10 14.5Z"
      fill="white"
    />
  </Svg>
);

/**
 * Unverified Icon
 */
const UnverifiedIcon = ({ size = 18, color = "#EF6C00" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Path
      d="M12 8V12M12 16H12.01"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

/**
 * Success Checkmark Icon
 */
const SuccessCheckIcon = ({ size = 60 }) => (
  <Svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <Circle cx="30" cy="30" r="25" fill="#4CAF50" />
    <Path
      d="M26.25 38.75L17.5 30L20.0375 27.4625L26.25 33.6625L39.9625 19.95L42.5 22.5L26.25 38.75Z"
      fill="white"
    />
  </Svg>
);

/**
 * Close Icon
 */
const CloseIcon = ({ size = 24, color = "#292929" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6L18 18"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Personal Info Edit Screen
 * Displays user's personal and employment information with verification status
 */
const PersonalInfoEditScreen = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();

  // User data state
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phone: "",
    phoneVerified: false,
    gender: "",
    location: "",
    nin: "", // NIN / document number
    docTypeAbbrev: "NIN", // NIN, PASSPORT, DL, VOTER ID, etc.
    avatarUri: null,
    isVerified: false, // If true, name and NIN cannot be changed
    employment: {
      employerName: "",
      employerAddress: "",
      employerContact: "",
      cacVerified: false,
      businessIdVerified: false,
    },
  });

  // Calculate verification percentage based on filled fields
  const calculateVerificationPercent = () => {
    const fields = [
      { value: userData.name, weight: 15 },
      { value: userData.email, weight: 15 },
      { value: userData.phone, weight: 15 },
      { value: userData.gender, weight: 10 },
      { value: userData.location, weight: 10 },
      { value: userData.nin, weight: 15 },
      { value: userData.avatarUri, weight: 5 },
      { value: userData.employment.employerName, weight: 5 },
      { value: userData.employment.employerAddress, weight: 5 },
      { value: userData.employment.employerContact, weight: 5 },
    ];

    const totalWeight = fields.reduce((sum, f) => sum + f.weight, 0);
    const completedWeight = fields.reduce((sum, f) => {
      if (f.value && f.value !== "") return sum + f.weight;
      return sum;
    }, 0);

    return Math.round((completedWeight / totalWeight) * 100);
  };

  const verificationPercent = calculateVerificationPercent();

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPhoneVerificationModal, setShowPhoneVerificationModal] = useState(false);
  const [pendingPhoneUpdate, setPendingPhoneUpdate] = useState(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);

  // Edit modal states
  const [editField, setEditField] = useState({ key: "", label: "", isEmployment: false });
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState("");

  // Toast Notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState(TOAST_TYPE.SUCCESS);

  // PWA Install states
  const [showPwaInstall, setShowPwaInstall] = useState(false);
  const [isIosPwa, setIsIosPwa] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      return;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);

    if (isIosDevice) {
      setIsIosPwa(true);
      setShowPwaInstall(true);
    } else {
      const checkPrompt = () => {
        if (window.deferredPrompt) {
          setShowPwaInstall(true);
        }
      };

      checkPrompt();
      window.addEventListener("beforeinstallprompt", checkPrompt);
      return () => window.removeEventListener("beforeinstallprompt", checkPrompt);
    }
  }, []);

  const handlePwaInstall = () => {
    if (typeof window !== "undefined" && typeof window.triggerPwaInstallPrompt === "function") {
      window.triggerPwaInstallPrompt();
    }
  };

  const showToast = (message, type = TOAST_TYPE.SUCCESS) => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  // Load saved profile data on mount and whenever returning to screen
  useEffect(() => {
    loadProfileData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [])
  );


  const loadProfileData = async () => {
    try {
      setIsInitialLoading(true);

      // Get auth user data first (from login)
      const authData = await authService.getUserData();

      // Fetch fresh profile data from server (includes NIN from signup)
      const serverProfileResult = await authService.fetchProfile();

      // Get saved local profile data
      const savedProfile = await profileService.getProfileData();

      // Extract NIN, document type, phone, name, gender from server profile
      const serverNin =
        serverProfileResult?.data?.nin ||
        serverProfileResult?.data?.kycData?.documentNumber;
      const serverDocTypeAbbrev =
        serverProfileResult?.data?.kycData?.documentTypeAbbrev || "NIN";
      const serverPhone = serverProfileResult?.data?.phoneNumber;
      const serverName = serverProfileResult?.data?.fullName;
      const serverEmail = serverProfileResult?.data?.emailAddress;

      const decisionObj = serverProfileResult?.data?.kycData?.decision || {};
      const idVerObj = Array.isArray(decisionObj.id_verifications) && decisionObj.id_verifications.length > 0
        ? decisionObj.id_verifications[0]
        : {};
      const vDataObj = decisionObj.verification_data || idVerObj;
      const decisionGender = idVerObj.gender || idVerObj.sex || vDataObj.gender || vDataObj.sex;

      const serverGenderRaw = serverProfileResult?.data?.gender || decisionGender || authData?.gender || savedProfile?.gender;
      let serverGender = "";
      if (serverGenderRaw) {
        const g = String(serverGenderRaw).toUpperCase();
        if (g.startsWith("M")) serverGender = "Male";
        else if (g.startsWith("F")) serverGender = "Female";
        else serverGender = "Others";
      }

      const isServerVerified = serverProfileResult?.data?.verified === true ||
        serverProfileResult?.data?.kycStatus === 'VERIFIED' ||
        serverProfileResult?.data?.kycStatus === 'APPROVED' ||
        savedProfile?.verified === true ||
        savedProfile?.kycStatus === 'VERIFIED';

      const resolvedKycStatus = isServerVerified
        ? 'VERIFIED'
        : (serverProfileResult?.data?.kycStatus || savedProfile?.kycStatus || 'NONE');

      const resolvedRejectionReason = isServerVerified
        ? null
        : (serverProfileResult?.data?.kycRejectionReason || serverProfileResult?.data?.kycData?.rejectionReason || null);

      if (isServerVerified) {
        // Sync local storage to ensure stale rejection reason is purged
        profileService.updateProfile({
          verified: true,
          kycStatus: 'VERIFIED',
          kycRejectionReason: null,
        }).catch(err => console.warn('[PersonalInfoEdit] Error syncing profile storage:', err));
      }

      if (savedProfile) {
        setUserData((prev) => ({
          ...prev,
          ...savedProfile,
          name: serverName || (authData && authData.fullName) || savedProfile.name || prev.name,
          email: serverEmail || (authData && authData.email) || savedProfile.email || prev.email,
          gender: serverGender || (authData && authData.gender) || savedProfile.gender || prev.gender,
          nin: serverNin || (authData && authData.nin) || savedProfile.nin || prev.nin,
          docTypeAbbrev: serverDocTypeAbbrev || prev.docTypeAbbrev || "NIN",
          phone: serverPhone || (authData && authData.phoneNumber) || savedProfile.phone || prev.phone,
          avatarUri: (() => {
            const serverAvatar = serverProfileResult?.data?.avatar;
            if (serverAvatar) {
              if (serverAvatar.startsWith("/")) {
                return `${authService.baseURL.replace(/\/$/, "")}${serverAvatar}`;
              }
              return serverAvatar;
            }
            const savedAvatar = savedProfile.avatarUri;
            if (savedAvatar && (savedAvatar.startsWith("blob:") || savedAvatar.startsWith("data:"))) {
              return prev.avatarUri;
            }
            return savedAvatar || prev.avatarUri;
          })(),
          isVerified: isServerVerified,
          kycStatus: resolvedKycStatus,
          kycRejectionReason: resolvedRejectionReason,
          phoneVerified: !!serverProfileResult?.data?.phoneVerified || false,
        }));
      } else if (
        authData ||
        (serverProfileResult && serverProfileResult.data)
      ) {
        setUserData((prev) => ({
          ...prev,
          name: serverName || (authData && authData.fullName) || prev.name,
          email: serverEmail || (authData && authData.email) || prev.email,
          gender: serverGender || (authData && authData.gender) || prev.gender,
          nin: serverNin || (authData && authData.nin) || prev.nin,
          docTypeAbbrev: serverDocTypeAbbrev || prev.docTypeAbbrev || "NIN",
          phone: serverPhone || (authData && authData.phoneNumber) || prev.phone,
          avatarUri: (() => {
            const serverAvatar = serverProfileResult?.data?.avatar;
            if (serverAvatar) {
              if (serverAvatar.startsWith("/")) {
                return `${authService.baseURL.replace(/\/$/, "")}${serverAvatar}`;
              }
              return serverAvatar;
            }
            return prev.avatarUri;
          })(),
          isVerified: isServerVerified,
          kycStatus: resolvedKycStatus,
          kycRejectionReason: resolvedRejectionReason,
          phoneVerified: !!serverProfileResult?.data?.phoneVerified || false,
        }));
      }

    } catch (error) {
      console.error("Error loading profile data:", error);
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Save profile data to storage
  const saveProfileData = async (newData) => {
    try {
      await profileService.saveProfileData(newData);
    } catch (error) {
      console.error("Error saving profile data:", error);
    }
  };

  const handleBack = () => {
    router.back();
  };

  // Request permission and pick image
  const handlePhotoUpload = async () => {
    try {
      // On web, no permission needed; on mobile, request permission
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== "granted") {
          showToast("Photo library access is required to update your profile picture.", TOAST_TYPE.WARNING);
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Compress image
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Validate file type
        const validTypes = ['jpg', 'jpeg', 'png', 'webp', 'heic'];
        const extension = asset.uri.split('.').pop().toLowerCase();

        // Also check mimeType if available
        const isImage = asset.type === 'image' || (asset.mimeType && asset.mimeType.startsWith('image/'));

        if (!isImage && !validTypes.includes(extension)) {
          showToast("Please select a valid image file (JPG, PNG, etc).", TOAST_TYPE.ERROR);
          return;
        }

        setIsLoading(true);
        const tempUri = asset.uri;

        // Upload to server
        const uploadResult = await authService.uploadAvatar(tempUri);

        if (uploadResult.success) {
          // Construct full avatar URL if necessary
          // Check multiple possible response fields (avatar, avatarUrl, image, etc.)
          const responseData = uploadResult.data;
          let serverAvatarUri = responseData?.avatar || responseData?.avatarUrl || responseData?.image;

          if (serverAvatarUri && serverAvatarUri.startsWith("/")) {
            serverAvatarUri = `${authService.baseURL.replace(/\/$/, "")}${serverAvatarUri}`;
          }

          // If we got a real URL from server, use it. Otherwise, if we must fallback, 
          // we'll use the tempUri but mark it as something we need to refresh.
          const finalAvatarUri = serverAvatarUri || tempUri;

          setUserData((prev) => ({
            ...prev,
            avatarUri: finalAvatarUri,
          }));

          // Force a full profile reload from server to ensure we have the absolute state
          await loadProfileData();
          setIsLoading(false);

          showToast("Profile picture updated successfully.");
        } else {
          setIsLoading(false);
          showToast(uploadResult.message || "Upload failed", TOAST_TYPE.ERROR);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      setIsLoading(false);
      showToast("Failed to upload photo. Please try again.", TOAST_TYPE.ERROR);
    }
  };



  // Validate field based on type
  const validateField = (field, value) => {
    switch (field) {
      case "name":
      case "employerName":
        if (!value.trim()) return "Name is required";
        if (value.trim().length < 2)
          return "Name must be at least 2 characters";
        if (!/^[a-zA-Z\s.]+$/.test(value))
          return "Name can only contain letters";
        return "";
      case "email":
        if (!value.trim()) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return "Please enter a valid email";
        return "";
      case "phone":
      case "employerContact":
        if (!value.trim()) return "Phone number is required";
        if (!/^[0-9+\-\s()]{10,15}$/.test(value.replace(/\s/g, "")))
          return "Please enter a valid phone number";
        return "";
      case "location":
      case "employerAddress":
        if (!value.trim()) return "Address is required";
        return "";
      case "nin":
        if (!value.trim()) return "NIN is required";
        if (!/^[0-9]{11}$/.test(value.trim()))
          return "NIN must be exactly 11 digits";
        return "";
      default:
        return "";
    }
  };

  // Open edit modal
  const handleUpdate = (field, isEmployment = false) => {
    if ((field === "name" || field === "nin") && userData.isVerified) {
      showToast(`${field === 'nin' ? 'NIN' : 'Name'} cannot be changed for verified accounts.`, TOAST_TYPE.WARNING);
      return;
    }

    // Direct verification trigger since they already have a phone number but it's unverified!
    if (field === "phone" && userData.phone && !userData.phoneVerified) {
      setPendingPhoneUpdate(userData.phone);
      setShowPhoneVerificationModal(true);
      return;
    }

    const fieldLabels = {
      name: "Name",
      email: "Email",
      phone: "Phone Number",
      location: "Location",
      nin: "NIN (National Identification Number)",
      employerName: "Employer Name",
      employerAddress: "Employer Address",
      employerContact: "Employer Contact",
    };

    const currentValues = {
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      location: userData.location,
      nin: userData.nin,
      employerName: userData.employment.employerName,
      employerAddress: userData.employment.employerAddress,
      employerContact: userData.employment.employerContact,
    };

    setEditField({ key: field, label: fieldLabels[field], isEmployment });
    setEditValue(currentValues[field]);
    setEditError("");
    setShowEditModal(true);
  };

  // Save edited field
  const handleSaveEdit = async () => {
    const error = validateField(editField.key, editValue);
    if (error) {
      setEditError(error);
      return;
    }

    setIsLoading(true);

    try {
      let newUserData;

      if (editField.isEmployment) {
        // Update nested employment object
        newUserData = {
          ...userData,
          employment: {
            ...userData.employment,
            [editField.key]: editValue.trim(),
          },
        };
      } else {
        newUserData = {
          ...userData,
          [editField.key]: editValue.trim(),
        };
      }

      // For phone, trigger verification modal after saving to server
      if (editField.key === "phone") {
        const serverFieldName = "phoneNumber";
        const serverResult = await authService.updateProfile({
          [serverFieldName]: editValue.trim(),
        });

        if (!serverResult.success) {
          setIsLoading(false);
          showToast(serverResult.message || "Failed to save to server.", TOAST_TYPE.ERROR);
          return;
        }

        // Update local state
        setUserData(newUserData);
        await saveProfileData(newUserData);
        setIsLoading(false);
        setShowEditModal(false);

        // Show phone verification modal
        setPendingPhoneUpdate(editValue.trim());
        setShowPhoneVerificationModal(true);
        showToast("Phone updated - verification required");
        return;
      }

      // For NIN, also save to server
      if (editField.key === "nin") {
        const serverResult = await authService.updateProfile({
          nin: editValue.trim(),
        });

        if (!serverResult.success) {
          setIsLoading(false);
          showToast(serverResult.message || "Failed to update NIN.", TOAST_TYPE.ERROR);
          return;
        }
      }

      // Update local state
      setUserData(newUserData);

      // Save to persistent storage
      await saveProfileData(newUserData);

      setIsLoading(false);
      setShowEditModal(false);
      showToast(`${editField.label} updated successfully`);
    } catch (error) {
      console.error("Error saving edit:", error);
      setIsLoading(false);
      showToast("Failed to save changes. Please try again.", TOAST_TYPE.ERROR);
    }
  };

  // Get keyboard type for field
  const getKeyboardType = (field) => {
    switch (field) {
      case "email":
        return "email-address";
      case "phone":
      case "nin":
      case "employerContact":
        return "phone-pad"; // Numeric keyboard for phone/NIN
      default:
        return "default";
    }
  };

  /**
   * Info Row Component
   */
  const InfoRow = ({
    label,
    value,
    actionText,
    onAction,
    isVerified,
    showVerification,
    kycStatus,
    disabled,
    isEmpty,
    isComingSoon,
  }) => {
    // Check if the label itself is the value (for name, email, phone, location fields)
    const isEmptyField =
      isEmpty || (!value && !showVerification && (!label || label === ""));

    const renderLabelContent = () => {
      if (!label) return <Text style={styles.infoLabelEmpty}>Not set</Text>;

      if (label.includes(": ")) {
        const parts = label.split(": ");
        const title = parts[0] + ": ";
        const val = parts.slice(1).join(": ");
        return (
          <Text numberOfLines={2}>
            <Text style={styles.infoLabelTitle}>{title}</Text>
            <Text style={styles.infoLabelValue}>{val}</Text>
          </Text>
        );
      }

      return (
        <Text style={[styles.infoLabelTitle, isEmptyField && styles.infoLabelEmpty]}>
          {label}
        </Text>
      );
    };

    return (
      <View style={styles.infoRow}>
        <View style={styles.infoLabelContainer}>
          {renderLabelContent()}
          {isEmptyField && (
            <View style={styles.needsUpdateBadge}>
              <Text style={styles.needsUpdateText}>Needs update</Text>
            </View>
          )}
        </View>
        <View style={styles.rightContainer}>
          {isComingSoon ? (
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>COMING SOON</Text>
            </View>
          ) : showVerification ? (
            <View style={styles.verificationBadge}>
              {isVerified || kycStatus === 'VERIFIED' ? (
                <>
                  <VerifiedCheckIcon size={18} />
                  <Text style={[styles.verificationText, { color: "#4CAF50" }]}>
                    VERIFIED
                  </Text>
                </>
              ) : kycStatus === 'PENDING' || kycStatus === 'IN_REVIEW' ? (
                <>
                  <UnverifiedIcon size={18} color="#F59E0B" />
                  <Text style={[styles.verificationText, { color: "#F59E0B" }]}>
                    IN REVIEW
                  </Text>
                </>
              ) : kycStatus === 'REJECTED' || kycStatus === 'FAILED' ? (
                <>
                  <UnverifiedIcon size={18} color="#EF4444" />
                  <Text style={[styles.verificationText, { color: "#EF4444" }]}>
                    REJECTED
                  </Text>
                </>
              ) : (
                <>
                  <UnverifiedIcon size={18} color="#EF6C00" />
                  <Text style={[styles.verificationText, { color: "#EF6C00" }]}>
                    UNVERIFIED
                  </Text>
                </>
              )}
            </View>
          ) : value ? (
            <Text style={styles.infoValue}>{value}</Text>
          ) : null}
          {actionText && actionText !== "Verified" && (
            <TouchableOpacity onPress={onAction} disabled={disabled}>
              <Text
                style={[
                  styles.actionText,
                  disabled && styles.actionTextDisabled,
                  actionText === "Add NIN" && styles.actionTextOrange,
                  (actionText === "Resubmit" || actionText === "Re-try") && { color: "#EF4444", fontWeight: "700" },
                  (actionText === "In Review" || actionText === "Status") && { color: "#F59E0B", fontWeight: "700" },
                ]}
              >
                {actionText}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  /**
   * Section Card Component
   */
  const SectionCard = ({ title, children }) => (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <BackIcon size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Information</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isInitialLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#192DFF" />
          <Text style={{ marginTop: 12, color: '#656565', fontSize: 14 }}>Loading your profile...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={handlePhotoUpload}
              activeOpacity={0.8}
            >
              {userData.avatarUri && !(typeof userData.avatarUri === 'string' && userData.avatarUri.startsWith("blob:") && Platform.OS !== "web") ? (
                <Image
                  source={{ uri: userData.avatarUri }}
                  style={styles.avatar}
                  contentFit="cover"
                  cachePolicy="disk"
                  transition={200}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <ProfileAvatarIcon size={90} color="#192DFF" />
                </View>
              )}
              {/* Camera overlay */}
              <View style={styles.cameraOverlay}>
                <CameraIcon size={20} color="#FFFFFF" />
              </View>
              {isLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#192DFF" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.uploadHint}>Tap to change photo</Text>

            {/* Verification Progress */}
            <View style={styles.verificationProgress}>
              <Text style={styles.verificationLabel}>Verification</Text>
              <View style={styles.verificationBadgeOrange}>
                <Text style={styles.verificationPercentText}>
                  {verificationPercent}% Complete
                </Text>
              </View>
            </View>
          </View>

          {/* Personal Verification Section */}
          <SectionCard title="Personal verification">
            <InfoRow
              label={userData.name ? `Name: ${userData.name}` : "Name"}
              actionText=""
              onAction={null}
              disabled={true}
              isEmpty={!userData.name}
              showVerification={userData.isVerified}
              isVerified={userData.isVerified}
            />
            <InfoRow
              label={userData.email ? `Email: ${userData.email}` : "Email"}
              actionText={userData.email ? "" : "Update"}
              onAction={() => !userData.email && handleUpdate("email")}
              disabled={!!userData.email}
              isEmpty={!userData.email}
              showVerification={!!userData.email}
              isVerified={!!userData.email}
            />
            <InfoRow
              label={userData.phone ? `Phone: ${userData.phone}` : "Phone Number"}
              actionText={
                !userData.phone
                  ? "Add"
                  : !userData.phoneVerified
                    ? "Verify"
                    : "Update"
              }
              onAction={() => handleUpdate("phone")}
              isEmpty={!userData.phone}
              showVerification={!!userData.phone}
              isVerified={userData.phoneVerified}
            />
            <InfoRow
              label={userData.gender ? `Gender: ${userData.gender}` : "Gender: Not set"}
              actionText={!userData.isVerified && !userData.gender ? "Update" : ""}
              onAction={!userData.isVerified ? () => handleUpdate("gender") : null}
              isEmpty={!userData.gender}
              showVerification={userData.isVerified}
              isVerified={userData.isVerified}
              disabled={userData.isVerified}
            />
            <InfoRow
              label={userData.location || "Location"}
              actionText="Change"
              onAction={() => handleUpdate("location")}
              isEmpty={!userData.location}
            />
            <InfoRow
              label={
                userData.nin
                  ? `Identity ID: ${userData.nin.replace(/^(\d{3,4})\d+(\d{3})$/, "$1****$2")}`
                  : "Identity Verification / NIN"
              }
              actionText={
                userData.isVerified
                  ? ""
                  : userData.kycStatus === 'PENDING' || userData.kycStatus === 'IN_REVIEW'
                    ? "Status"
                    : userData.kycStatus === 'REJECTED'
                      ? "Resubmit"
                      : "Verify"
              }
              onAction={() => router.push("/profile/kyc-verification")}
              isEmpty={!userData.nin && !userData.isVerified && (userData.kycStatus === 'NONE' || !userData.kycStatus)}
              showVerification={true}
              isVerified={userData.isVerified}
              kycStatus={userData.kycStatus}
              disabled={userData.isVerified}
            />
          </SectionCard>

          {/* KYC Status Action Banners */}
          {userData.kycStatus === 'REJECTED' && (
            <TouchableOpacity
              style={styles.rejectionCard}
              onPress={() => router.push("/profile/kyc-verification")}
              activeOpacity={0.85}
            >
              <View style={styles.rejectionCardHeader}>
                <UnverifiedIcon size={20} color="#EF4444" />
                <Text style={styles.rejectionCardTitle}>Action Required: Verification Declined</Text>
              </View>
              <Text style={styles.rejectionCardBody}>
                {userData.kycRejectionReason || "Verification was declined by provider. Tap here to resubmit your identity document."}
              </Text>
              <Text style={styles.rejectionCardAction}>Tap to Resubmit →</Text>
            </TouchableOpacity>
          )}

          {(userData.kycStatus === 'PENDING' || userData.kycStatus === 'IN_REVIEW') && (
            <TouchableOpacity
              style={styles.inReviewCard}
              onPress={() => router.push("/profile/kyc-verification")}
              activeOpacity={0.85}
            >
              <View style={styles.inReviewCardHeader}>
                <UnverifiedIcon size={20} color="#F59E0B" />
                <Text style={styles.inReviewCardTitle}>Verification Under Review</Text>
              </View>
              <Text style={styles.inReviewCardBody}>
                Your identity verification is currently being reviewed. Tap to check your live status.
              </Text>
              <Text style={styles.inReviewCardAction}>Check Live Status →</Text>
            </TouchableOpacity>
          )}

          {/* Employment Information Section */}
          <SectionCard title="Employment information">
            <InfoRow
              label={
                userData.employment.employerName
                  ? `Employer: ${userData.employment.employerName}`
                  : "Employer Name"
              }
              actionText={userData.employment.employerName ? "Update" : "Add"}
              onAction={() => handleUpdate("employerName", true)}
              isEmpty={!userData.employment.employerName}
            />
            <InfoRow
              label={
                userData.employment.employerAddress
                  ? `Address: ${userData.employment.employerAddress}`
                  : "Employer Address"
              }
              actionText={userData.employment.employerAddress ? "Update" : "Add"}
              onAction={() => handleUpdate("employerAddress", true)}
              isEmpty={!userData.employment.employerAddress}
            />
            <InfoRow
              label={
                userData.employment.employerContact
                  ? `Contact: ${userData.employment.employerContact}`
                  : "Employer Contact"
              }
              actionText={userData.employment.employerContact ? "Update" : "Add"}
              onAction={() => handleUpdate("employerContact", true)}
              isEmpty={!userData.employment.employerContact}
            />
            {/* CAC and Business ID verification coming soon */}
            <InfoRow
              label="CAC verification"
              showVerification
              isVerified={userData.employment.cacVerified}
              isComingSoon={true}
            />
            <InfoRow
              label="Business ID"
              showVerification
              isVerified={userData.employment.businessIdVerified}
              isComingSoon={true}
            />
          </SectionCard>

          {/* PWA Install Shortcut Section */}
          {showPwaInstall && (
            <SectionCard title="Application settings">
              <InfoRow
                label="Add Lunest to Home Screen"
                actionText="Install"
                onAction={handlePwaInstall}
                isEmpty={false}
              />
            </SectionCard>
          )}

          {/* Bottom spacing */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>
                Update {editField?.label}
              </Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.closeButton}
              >
                <CloseIcon size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.editInputWrapper}>
              <TextInput
                style={[styles.editInput, editError && styles.editInputError]}
                value={editValue}
                onChangeText={(text) => {
                  setEditValue(text);
                  if (editError) setEditError("");
                }}
                placeholder={`Enter your ${editField?.label?.toLowerCase()}`}
                placeholderTextColor="#999"
                keyboardType={getKeyboardType(editField?.key)}
                autoCapitalize={
                  editField?.key === "email"
                    ? "none"
                    : editField?.key === "nin"
                      ? "none"
                      : "words"
                }
                maxLength={editField?.key === "nin" ? 11 : undefined}
                autoFocus
              />
              {editError ? (
                <Text style={styles.editErrorText}>{editError}</Text>
              ) : null}
            </View>

            <View style={styles.editModalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  isLoading && styles.saveButtonDisabled,
                ]}
                onPress={handleSaveEdit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Phone Verification Modal */}
      <PhoneVerificationModal
        visible={showPhoneVerificationModal}
        phone={pendingPhoneUpdate}
        onClose={() => {
          setShowPhoneVerificationModal(false);
          setPendingPhoneUpdate(null);
        }}
        onVerified={(verifiedData) => {
          console.log("[PersonalInfoEdit] Phone verified:", verifiedData);
          // Update local state with verified phone data
          setUserData((prev) => ({
            ...prev,
            phone: verifiedData.phone,
            phoneVerified: true,
          }));
          // Refresh profile data to get latest from server
          loadProfileData();
        }}
      />

      {/* Toast Notification */}
      <ToastNotification
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
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
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "500",

    color: "#000000",
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  avatarContainer: {
    marginBottom: 8,
    position: "relative",
  },
  avatar: {
    width: 137,
    height: 137,
    borderRadius: 69,
  },
  avatarPlaceholder: {
    width: 137,
    height: 137,
    borderRadius: 69,
    backgroundColor: "#E5EFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#192DFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 69,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadHint: {
    fontSize: 12,

    color: "#656565",
    marginBottom: 20,
  },
  verificationProgress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
  },
  verificationLabel: {
    fontSize: 14,
    fontWeight: "500",

    color: "#000000",
  },
  verificationBadgeOrange: {
    backgroundColor: "rgba(253, 174, 49, 0.3)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  verificationPercentText: {
    fontSize: 12,
    fontWeight: "500",

    color: "#EF6C00",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#BEBBB7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "500",

    color: "#000000",
    marginBottom: 20,
  },
  sectionContent: {
    gap: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 30,
  },
  infoLabelContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  infoLabelTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  infoLabelValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  infoLabelEmpty: {
    color: "#999999",
    fontStyle: "italic",
  },
  needsUpdateBadge: {
    backgroundColor: "rgba(239, 108, 0, 0.15)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  needsUpdateText: {
    fontSize: 10,
    fontWeight: "500",

    color: "#EF6C00",
  },
  infoValue: {
    fontSize: 12,
    fontWeight: "500",

    color: "#292929",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "500",

    color: "#292929",
    textDecorationLine: "underline",
  },
  actionTextDisabled: {
    color: "#999999",
    textDecorationLine: "none",
  },
  actionTextOrange: {
    color: "#EF6C00",
    fontWeight: "700",
  },
  rejectionCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  rejectionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  rejectionCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },
  rejectionCardBody: {
    fontSize: 12,
    color: "#991B1B",
    lineHeight: 18,
    marginBottom: 8,
  },
  rejectionCardAction: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
    textDecorationLine: "underline",
  },
  inReviewCard: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  inReviewCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  inReviewCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#D97706",
  },
  inReviewCardBody: {
    fontSize: 12,
    color: "#92400E",
    lineHeight: 18,
    marginBottom: 8,
  },
  inReviewCardAction: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D97706",
    textDecorationLine: "underline",
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  verificationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: "700",
  },
  comingSoonBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#666666",
    letterSpacing: 0.5,
  },
  bottomSpacer: {
    height: 40,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  editModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    maxWidth: 400,
  },
  editModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: "600",

    color: "#000000",
  },
  closeButton: {
    padding: 4,
  },
  editInputWrapper: {
    marginBottom: 24,
  },
  editInput: {
    height: 50,
    borderWidth: 1,
    borderColor: "#b0b0b0",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,

    color: "#000000",
    backgroundColor: "#F6F6F6",
  },
  editInputError: {
    borderColor: "#DC3545",
    borderWidth: 2,
  },
  editErrorText: {
    fontSize: 12,

    color: "#DC3545",
    marginTop: 8,
    marginLeft: 4,
  },
  editModalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#292929",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",

    color: "#292929",
  },
  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#192DFF",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#A0A0A0",
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "600",

    color: "#FFFFFF",
  },
  successModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    width: "70%",
    maxWidth: 280,
  },
  successText: {
    fontSize: 16,
    fontWeight: "600",

    color: "#000000",
    marginTop: 16,
    textAlign: "center",
  },
});

export default PersonalInfoEditScreen;
