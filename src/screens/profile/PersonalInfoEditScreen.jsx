import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
    location: "",
    nin: "", // NIN value - once provided, considered verified
    avatarUri: null,
    isVerified: true, // If true, name cannot be changed
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
      { value: userData.location, weight: 10 },
      { value: userData.nin, weight: 15 },
      { value: userData.avatarUri, weight: 5 },
      { value: userData.employment.employerName, weight: 8 },
      { value: userData.employment.employerAddress, weight: 7 },
      { value: userData.employment.employerContact, weight: 5 },
      { value: userData.employment.cacVerified, weight: 3 },
      { value: userData.employment.businessIdVerified, weight: 2 },
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Load saved profile data on mount
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setIsInitialLoading(true);

      // Get auth user data first (from login)
      const authData = await authService.getUserData();

      // Fetch fresh profile data from server (includes NIN from signup)
      const serverProfileResult = await authService.fetchProfile();
      console.log("=== PERSONAL INFO LOAD DEBUG ===");
      console.log("Auth user data:", JSON.stringify(authData, null, 2));
      console.log(
        "Server profile data:",
        JSON.stringify(serverProfileResult, null, 2),
      );

      // Get saved local profile data
      const savedProfile = await profileService.getProfileData();
      console.log("Local profile data:", JSON.stringify(savedProfile, null, 2));

      // Extract NIN and phone from server (takes priority - from signup)
      const serverNin =
        serverProfileResult &&
        serverProfileResult.data &&
        serverProfileResult.data.nin;
      const serverPhone =
        serverProfileResult &&
        serverProfileResult.data &&
        serverProfileResult.data.phoneNumber;
      const serverName =
        serverProfileResult &&
        serverProfileResult.data &&
        serverProfileResult.data.fullName;
      const serverEmail =
        serverProfileResult &&
        serverProfileResult.data &&
        serverProfileResult.data.emailAddress;

      console.log("Server NIN:", serverNin);
      console.log("Server Phone:", serverPhone);

      if (savedProfile) {
        setUserData((prev) => ({
          ...prev,
          ...savedProfile,
          // Auth/Server data takes priority for name and email
          name:
            serverName ||
            (authData && authData.fullName) ||
            savedProfile.name ||
            prev.name,
          email:
            serverEmail ||
            (authData && authData.email) ||
            savedProfile.email ||
            prev.email,
          // Server NIN takes priority (from signup), then auth data, then local storage
          nin:
            serverNin ||
            (authData && authData.nin) ||
            savedProfile.nin ||
            prev.nin,
          // Server phone takes priority, then auth data, then local storage
          phone:
            serverPhone ||
            (authData && authData.phoneNumber) ||
            savedProfile.phone ||
            prev.phone,
          avatarUri: (() => {
            const serverAvatar = serverProfileResult?.data?.avatar;
            if (serverAvatar) {
               if (serverAvatar.startsWith("/")) {
                 return `${authService.baseURL.replace(/\/$/, "")}${serverAvatar}`;
               }
               return serverAvatar;
            }
            return savedProfile.avatarUri || prev.avatarUri;
          })(),
        }));
      } else if (
        authData ||
        (serverProfileResult && serverProfileResult.data)
      ) {
        // Initialize with auth/server data if no saved profile
        setUserData((prev) => ({
          ...prev,
          name: serverName || (authData && authData.fullName) || prev.name,
          email: serverEmail || (authData && authData.email) || prev.email,
          nin: serverNin || (authData && authData.nin) || prev.nin,
          phone:
            serverPhone || (authData && authData.phoneNumber) || prev.phone,
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
          Alert.alert(
            "Permission Required",
            "Please allow access to your photo library to upload a profile picture.",
            [{ text: "OK" }],
          );
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
           Alert.alert("Invalid File Type", "Please select a valid image file (JPG, PNG, etc).");
           return;
        }

        setIsLoading(true);
        const tempUri = asset.uri;

        // Upload to server
        const uploadResult = await authService.uploadAvatar(tempUri);

        if (uploadResult.success) {
          // Construct full avatar URL
          // The backend returns a relative path like /uploads/avatars/filename.jpg
          // We need to prepend the base URL
          const relativePath = uploadResult.data.avatarUrl;
          
          // Get base URL to construct full path
          // We can use a helper or just rely on what authService uses
          // Ideally, we should store just the relative path and have a component handle the base URL,
          // but for now, let's try to construct a full URL if we can, or just save what the server gave us.
          // Note: ProfileHeader handles display.
          
          // Let's rely on saving what the server gave us.
          // But to display immediately, we might need the full URL.
          
          // Actually, let's fetch the profile again to ensure we have the correct server-side URL
          const profileResult = await authService.fetchProfile();
          let serverAvatarUri = profileResult.data?.avatar; // The field is 'avatar' in user model

          if (serverAvatarUri && serverAvatarUri.startsWith('/')) {
              serverAvatarUri = `${authService.baseURL.replace(/\/$/, "")}${serverAvatarUri}`;
          }

          // Update local state with the new URI
          // If server returned a relative path, we might need to handle it in display components
          // But for now, let's just use what we have.
           
          const newUserData = {
            ...userData,
            avatarUri: serverAvatarUri || tempUri, // Fallback to temp if server fails to return it
          };
          
          setUserData(newUserData);

          // Save to persistent storage
          await saveProfileData(newUserData);

          setIsLoading(false);
          showSuccess("Profile photo updated");
        } else {
          setIsLoading(false);
          Alert.alert("Upload Failed", uploadResult.message);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      setIsLoading(false);
      Alert.alert("Error", "Failed to upload photo. Please try again.");
    }
  };

  // Show success modal
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
    setTimeout(() => {
      setShowSuccessModal(false);
    }, 2000);
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
    if (field === "name" && userData.isVerified) {
      Alert.alert(
        "Cannot Edit Name",
        "Your name cannot be changed because your account is verified. Please contact support if you need to update it.",
        [{ text: "OK" }],
      );
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

      // For phone and NIN, also save to server
      if (editField.key === "phone" || editField.key === "nin") {
        const serverFieldName =
          editField.key === "phone" ? "phoneNumber" : "nin";
        const serverResult = await authService.updateProfile({
          [serverFieldName]: editValue.trim(),
        });

        if (!serverResult.success) {
          setIsLoading(false);
          Alert.alert(
            "Error",
            serverResult.message ||
              "Failed to save to server. Please try again.",
          );
          return;
        }
      }

      // Update local state
      setUserData(newUserData);

      // Save to persistent storage
      await saveProfileData(newUserData);

      setIsLoading(false);
      setShowEditModal(false);
      showSuccess(`${editField.label} updated`);
    } catch (error) {
      console.error("Error saving edit:", error);
      setIsLoading(false);
      Alert.alert("Error", "Failed to save changes. Please try again.");
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
    disabled,
    isEmpty,
  }) => {
    // Check if the label itself is the value (for name, email, phone, location fields)
    const isEmptyField =
      isEmpty || (!value && !showVerification && (!label || label === ""));

    return (
      <View style={styles.infoRow}>
        <View style={styles.infoLabelContainer}>
          <Text
            style={[styles.infoLabel, isEmptyField && styles.infoLabelEmpty]}
          >
            {label || "Not set"}
          </Text>
          {isEmptyField && (
            <View style={styles.needsUpdateBadge}>
              <Text style={styles.needsUpdateText}>Needs update</Text>
            </View>
          )}
        </View>
        {showVerification ? (
          <View style={styles.verificationBadge}>
            {isVerified ? (
              <>
                <VerifiedCheckIcon size={18} />
                <Text style={[styles.verificationText, { color: "#4CAF50" }]}>
                  VERIFIED
                </Text>
              </>
            ) : (
              <>
                <UnverifiedIcon size={18} />
                <Text style={[styles.verificationText, { color: "#EF6C00" }]}>
                  UNVERIFIED
                </Text>
              </>
            )}
          </View>
        ) : value ? (
          <Text style={styles.infoValue}>{value}</Text>
        ) : null}
        {actionText && !showVerification && (
          <TouchableOpacity onPress={onAction} disabled={disabled}>
            <Text
              style={[
                styles.actionText,
                disabled && styles.actionTextDisabled,
                actionText === "Add NIN" && styles.actionTextOrange,
              ]}
            >
              {actionText}
            </Text>
          </TouchableOpacity>
        )}
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
            {userData.avatarUri ? (
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
            label={userData.name || "Name"}
            actionText={userData.isVerified ? "Verified" : "Update"}
            onAction={() => handleUpdate("name")}
            disabled={userData.isVerified}
            isEmpty={!userData.name}
          />
          <InfoRow
            label={userData.email || "Email"}
            actionText={userData.email ? "Verified" : "Update"}
            onAction={() => !userData.email && handleUpdate("email")}
            disabled={!!userData.email}
            isEmpty={!userData.email}
          />
          <InfoRow
            label={userData.phone || "Phone Number"}
            actionText="Update"
            onAction={() => handleUpdate("phone")}
            isEmpty={!userData.phone}
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
                ? `NIN: ${userData.nin.slice(0, 4)}****${userData.nin.slice(-3)}`
                : "NIN"
            }
            actionText={!userData.nin ? "Add NIN" : null}
            onAction={() => handleUpdate("nin")}
            isEmpty={!userData.nin}
            showVerification={!!userData.nin}
            isVerified={!!userData.nin}
          />
        </SectionCard>

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
          <InfoRow
            label="CAC verification"
            showVerification
            isVerified={userData.employment.cacVerified}
          />
          <InfoRow
            label="Business ID"
            showVerification
            isVerified={userData.employment.businessIdVerified}
          />
        </SectionCard>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

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

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <SuccessCheckIcon size={60} />
            <Text style={styles.successText}>{successMessage}</Text>
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
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",

    color: "#292929",
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
    fontWeight: "600",
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
