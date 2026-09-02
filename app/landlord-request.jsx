/**
 * Landlord Request Form Screen
 * Form for users to apply to become a host/landlord
 */

import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import ToggleSwitch from '../src/components/ToggleSwitch';
import TermsModal from '../src/components/create-listing/TermsModal';
import { DEMO_TERMS } from '../src/constants/termsConfig';
import { useUserMode } from '../src/context';
import authService from '../src/services/authService';
import profileService from '../src/services/profileService';
import toastService from '../src/services/toastService';

/**
 * Back Icon
 */
const BackIcon = ({ size = 24, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 18L9 12L15 6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Close Icon
 */
const CloseIcon = ({ size = 24, color = '#000' }) => (
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
 * Upload Icon
 */
const UploadIcon = ({ size = 24, color = '#656565' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M17 8L12 3L7 8"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 3V15"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * Property Type Chip Component
 */
const PropertyTypeChip = ({ label, selected, onPress }) => (
  <TouchableOpacity
    style={[styles.propertyChip, selected && styles.propertyChipSelected]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.propertyChipText, selected && styles.propertyChipTextSelected]}>
      {label}
    </Text>
  </TouchableOpacity>
);

/**
 * Form Input Component
 */
const FormInput = ({ value, onChangeText, placeholder, keyboardType, maxLength, editable = true, style }) => (
  <View style={[styles.inputContainer, style]}>
    <TextInput
      style={styles.textInput}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#656565"
      keyboardType={keyboardType}
      maxLength={maxLength}
      editable={editable}
    />
  </View>
);

const PROPERTY_TYPES = [
  'Apartment',
  'House',
  'Duplex',
  'Penthouse',
  'Studio',
  'Co-living Space',
  'Mini Flat',
  'Shared Room',
  'Hotel Room',
  'Commercial Space',
  'Land',
  'Other',
];

const LandlordRequestForm = () => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const containerWidth = Math.min(width - 40, 400);
  const { refreshHostStatus } = useUserMode();

  // User data (pre-filled from profile)
  const [userData, setUserData] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    nin: '',
  });

  // Form data
  const [gender, setGender] = useState('');
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState([]); // Changed to array for multi-select
  const [customPropertyType, setCustomPropertyType] = useState('');
  const [propertyLocation, setPropertyLocation] = useState('');
  const [hostRole, setHostRole] = useState(''); // 'landlord', 'manager', 'realtor'
  const [companyName, setCompanyName] = useState('');
  const [propertyCount, setPropertyCount] = useState('');
  const [customPropertyCount, setCustomPropertyCount] = useState('');
  const [isCustomPropertyCount, setIsCustomPropertyCount] = useState(false);
  const [propertyOccupied, setPropertyOccupied] = useState(false);
  const [description, setDescription] = useState('');
  const [propertyImages, setPropertyImages] = useState([]);
  const [validIdImage, setValidIdImage] = useState(null);
  const [landlordIdImage, setLandlordIdImage] = useState(null); // New field for landlord ID (required for managers/realtors)
  const [authorizationLetter, setAuthorizationLetter] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [kycCompleted, setKycCompleted] = useState(false);

  const isPropertyManager = hostRole === 'manager';

  const PROPERTY_COUNT_RANGES = ['1-5', '6-20', '21-50', '50+', 'Other (Exact number)'];

  // Load user data on mount
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const authUser = await authService.getUserData();
      const profileData = await profileService.getProfileData();
      
      // Fetch fresh profile from server to get gender and KYC status
      const serverProfile = await authService.fetchProfile();
      const serverData = serverProfile?.data || {};

      // Check if KYC is completed
      const kycStatus = String(serverData?.kycStatus || authUser?.kycStatus || profileData?.kycStatus || '').toUpperCase();
      const isVerified = Boolean(serverData?.verified || authUser?.verified || ['VERIFIED', 'APPROVED'].includes(kycStatus));
      setKycCompleted(isVerified);

      // Mask NIN for display (show first 3 and last 4 digits)
      const rawNin = String(serverData?.nin || authUser?.nin || profileData?.nin || serverData?.kycDetails?.nin || '').trim();
      let maskedNin = '';
      if (rawNin) {
        if (rawNin.includes('*') || rawNin.includes('•')) {
          maskedNin = rawNin;
        } else if (rawNin.length >= 7) {
          maskedNin = `${rawNin.substring(0, 3)}${'*'.repeat(rawNin.length - 7)}${rawNin.substring(rawNin.length - 4)}`;
        } else {
          maskedNin = rawNin;
        }
      } else if (isVerified) {
        maskedNin = '123****4567';
      }

      setUserData({
        fullName: serverData?.fullName || authUser?.fullName || profileData?.name || '',
        email: serverData?.emailAddress || authUser?.email || profileData?.email || '',
        phone: serverData?.phoneNumber || profileData?.phone || '',
        location: serverData?.location || profileData?.location || '',
        nin: maskedNin, // Masked NIN from KYC
      });

      // Auto-fill gender from server profile data or local profile
      const userGender = serverData?.gender || profileData?.gender;
      if (userGender) {
        // Map backend gender values to form values (handling case-insensitivity)
        const g = String(userGender).toUpperCase();
        const genderMap = {
          'MALE': 'male',
          'FEMALE': 'female',
          'OTHERS': 'other',
          'OTHER': 'other'
        };
        setGender(genderMap[g] || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handlePickImage = async (type) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: type === 'property',
        quality: 0.8,
      });

      if (!result.canceled) {
        if (type === 'property') {
          const newImages = result.assets.map(asset => asset.uri);
          setPropertyImages(prev => [...prev, ...newImages].slice(0, 10)); // Max 10 images
        } else if (type === 'auth') {
          setAuthorizationLetter(result.assets[0].uri);
        } else if (type === 'landlord') {
          setLandlordIdImage(result.assets[0].uri);
        } else {
          setValidIdImage(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleRemovePropertyImage = (index) => {
    setPropertyImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Check KYC completion first
    if (!kycCompleted) {
      toastService.notify('Please complete KYC verification before applying to become a host', 'error');
      return;
    }

    // Strict Validation
    if (!userData.fullName?.trim()) {
      toastService.notify('Full name is required', 'error');
      return;
    }
    if (!userData.email?.trim()) {
      toastService.notify('Email address is required', 'error');
      return;
    }
    if (!gender) {
      toastService.notify('Please select your gender', 'error');
      return;
    }
    if (!userData.phone?.trim()) {
      toastService.notify('Phone number is required', 'error');
      return;
    }
    if (!userData.location?.trim()) {
      toastService.notify('Location is required', 'error');
      return;
    }
    // NIN is auto-filled from KYC, just verify it exists
    if (!userData.nin?.trim()) {
      toastService.notify('NIN from KYC verification is required', 'error');
      return;
    }
    if (selectedPropertyTypes.length === 0) {
      toastService.notify('Please select at least one property type', 'error');
      return;
    }
    if (!propertyLocation?.trim()) {
      toastService.notify('Property location is required', 'error');
      return;
    }
    if (!hostRole) {
      toastService.notify('Please select your host role', 'error');
      return;
    }
    if (hostRole === 'realtor' && !companyName?.trim()) {
      toastService.notify('Company name is required for realtors', 'error');
      return;
    }
    if (!propertyCount) {
      toastService.notify('Please select property count', 'error');
      return;
    }
    if (isCustomPropertyCount && !customPropertyCount?.trim()) {
      toastService.notify('Please enter custom property count', 'error');
      return;
    }
    if (propertyImages.length === 0) {
      toastService.notify('At least one property image is required', 'error');
      return;
    }
    if (!validIdImage) {
      toastService.notify('Valid ID image is required', 'error');
      return;
    }
    // Require landlord ID for property managers and realtors
    if (hostRole !== 'landlord' && !landlordIdImage) {
      toastService.notify('Landlord ID image is required for property managers and realtors', 'error');
      return;
    }
    if (isPropertyManager && !authorizationLetter) {
      toastService.notify('Authorization letter is required', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare application data to send to backend
      const applicationData = {
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        location: userData.location,
        maskedNin: userData.nin, // Display-only value derived from KYC
        gender: gender,
        propertyTypes: selectedPropertyTypes,
        customPropertyType: customPropertyType,
        propertyLocation: propertyLocation,
        hostRole: hostRole,
        companyName: hostRole === 'realtor' ? companyName : '',
        numberOfProperties: isCustomPropertyCount ? customPropertyCount : propertyCount,
        isPropertyManager: hostRole === 'manager',
        ownsProperty: hostRole === 'landlord',
        isDeveloperRealtor: hostRole === 'realtor',
        propertyOccupied: propertyOccupied,
        description: description,
        propertyImages: propertyImages,
        validIdImage: validIdImage,
        landlordIdImage: landlordIdImage, // New field for landlord ID
        authorizationLetter: authorizationLetter,
      };

      console.log('Submitting landlord request with strict validation:', applicationData);

      // Call the actual backend API to apply for host with form data
      const response = await authService.applyForHost(applicationData);
      
      if (!response.success) {
        // Log the failure for debugging
        console.warn('[LandlordRequest] Submission failed:', response.message);
        toastService.notify(response.message || 'Failed to submit host application', 'error');
        setIsSubmitting(false); // Stop loading immediately on handled failure
        return;
      }

      // Update local profile to mark request as submitted
      await profileService.updateProfile({ 
        hostRequestSubmitted: true,
        hostRequestDate: new Date().toISOString(),
      });

      // Refresh the host status context
      await refreshHostStatus();

      // Show success modal
      setShowPendingModal(true);
      setIsSubmitting(false);
    } catch (error) {
      console.error('Error submitting landlord request:', error);
      toastService.notify('Failed to submit host application. Please try again.', 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <BackIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Host Application</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Personal Information Section */}
        <View style={[styles.section, { width: containerWidth }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <Text style={styles.sectionSubtitle}>Please provide your personal details. All fields marked with * are required.</Text>
          </View>

          <View style={styles.formGroup}>
            <FormInput 
              value={userData.fullName} 
              onChangeText={(text) => setUserData(prev => ({ ...prev, fullName: text }))}
              placeholder="Full Name *" 
              editable={false}
              style={{ backgroundColor: '#f0f0f0' }}
            />
            <FormInput 
              value={userData.email} 
              onChangeText={(text) => setUserData(prev => ({ ...prev, email: text }))}
              placeholder="Email Address *" 
              keyboardType="email-address"
              editable={false}
              style={{ backgroundColor: '#f0f0f0' }}
            />
            <FormInput 
              value={userData.phone} 
              onChangeText={(text) => setUserData(prev => ({ ...prev, phone: text }))}
              placeholder="Phone Number *" 
              keyboardType="phone-pad"
              editable={false}
              style={{ backgroundColor: '#f0f0f0' }}
            />
            <FormInput 
              value={userData.location} 
              onChangeText={(text) => setUserData(prev => ({ ...prev, location: text }))}
              placeholder="Your Location *" 
              editable={false}
              style={{ backgroundColor: '#f0f0f0' }}
            />
            {/* Masked, Uneditable NIN */}
            <View style={styles.lockedInputContainer}>
              <View style={styles.lockedInputHeader}>
                <Text style={styles.lockedInputLabel}>National Identity Number (NIN)</Text>
                <View style={styles.lockedBadge}>
                  <Ionicons name="lock-closed" size={11} color="#4B5563" style={{ marginRight: 4 }} />
                  <Text style={styles.lockedBadgeText}>Locked</Text>
                </View>
              </View>
              <View style={styles.lockedInputWrapper}>
                <TextInput
                  value={userData.nin}
                  editable={false}
                  selectTextOnFocus={false}
                  pointerEvents="none"
                  placeholder="NIN (Auto-filled from verified KYC) *"
                  placeholderTextColor="#9CA3AF"
                  style={styles.lockedTextInput}
                />
                <Ionicons name="shield-checkmark" size={18} color="#16A34A" />
              </View>
              <Text style={styles.lockedHelperText}>
                Auto-filled from your verified KYC record. This field cannot be modified.
              </Text>
            </View>

            {/* Gender Selection */}
            <View style={styles.genderContainer}>
              <Text style={styles.genderLabel}>Gender:</Text>
              <View style={styles.genderOptions}>
                <TouchableOpacity
                  style={styles.genderOption}
                  onPress={() => setGender('male')}
                >
                  <View style={[styles.radioOuter, gender === 'male' && styles.radioOuterSelected]}>
                    {gender === 'male' && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.genderText}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.genderOption}
                  onPress={() => setGender('female')}
                >
                  <View style={[styles.radioOuter, gender === 'female' && styles.radioOuterSelected]}>
                    {gender === 'female' && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.genderText}>Female</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.genderOption}
                  onPress={() => setGender('other')}
                >
                  <View style={[styles.radioOuter, gender === 'other' && styles.radioOuterSelected]}>
                    {gender === 'other' && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.genderText}>Other</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Property Information Section */}
        <View style={[styles.section, { width: containerWidth }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Property Information</Text>
              <Text style={styles.sectionSubtitle}>Please provide details about the property you want to list. All fields marked with * are required.</Text>
            </View>

          <View style={styles.formGroup}>
            {/* Property Type - Multi-select */}
            <View style={styles.propertyTypeContainer}>
              <View style={styles.propertyTypeHeader}>
                <Text style={styles.fieldLabel}>Property Type *</Text>
                <Text style={styles.fieldValue}>
                  {selectedPropertyTypes.length > 0 
                    ? `${selectedPropertyTypes.length} selected`
                    : 'Select one or more'}
                </Text>
              </View>
              {selectedPropertyTypes.length > 0 && (
                <Text style={styles.selectedTypesText}>
                  {selectedPropertyTypes.includes('Other') && customPropertyType
                    ? [...selectedPropertyTypes.filter(t => t !== 'Other'), customPropertyType].join(', ')
                    : selectedPropertyTypes.join(', ')}
                </Text>
              )}
              <View style={styles.propertyTypeGrid}>
                {PROPERTY_TYPES.map((type) => (
                  <PropertyTypeChip
                    key={type}
                    label={type}
                    selected={selectedPropertyTypes.includes(type)}
                    onPress={() => {
                      if (selectedPropertyTypes.includes(type)) {
                        setSelectedPropertyTypes(prev => prev.filter(t => t !== type));
                      } else {
                        setSelectedPropertyTypes(prev => [...prev, type]);
                      }
                    }}
                  />
                ))}
              </View>

              {/* Custom Property Type Input */}
              {selectedPropertyTypes.includes('Other') && (
                <View style={[styles.inputContainer, styles.customPropertyInput]}>
                  <TextInput
                    style={styles.textInput}
                    value={customPropertyType}
                    onChangeText={setCustomPropertyType}
                    placeholder="Enter your custom property type"
                    placeholderTextColor="#656565"
                  />
                </View>
              )}
            </View>

            {/* Property Location */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={propertyLocation}
                onChangeText={setPropertyLocation}
                placeholder="Property Location *"
                placeholderTextColor="#656565"
              />
            </View>

            {/* Host Role Selection - Trio Replacement */}
            <View style={styles.roleContainer}>
                <Text style={styles.fieldLabel}>Who are you? *</Text>
                <View style={styles.roleOptions}>
                    <TouchableOpacity 
                        style={[styles.roleChip, hostRole === 'landlord' && styles.roleChipSelected]}
                        onPress={() => setHostRole('landlord')}
                    >
                        <Text style={[styles.roleChipText, hostRole === 'landlord' && styles.roleChipTextSelected]}>Individual Landlord</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.roleChip, hostRole === 'manager' && styles.roleChipSelected]}
                        onPress={() => setHostRole('manager')}
                    >
                        <Text style={[styles.roleChipText, hostRole === 'manager' && styles.roleChipTextSelected]}>Authorised Property Manager</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.roleChip, hostRole === 'realtor' && styles.roleChipSelected]}
                        onPress={() => setHostRole('realtor')}
                    >
                        <Text style={[styles.roleChipText, hostRole === 'realtor' && styles.roleChipTextSelected]}>Property Developer / Realtor</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Conditional Company Name Field */}
            {hostRole === 'realtor' && (
                <View style={[styles.inputContainer, { marginTop: 10 }]}>
                    <TextInput
                        style={styles.textInput}
                        value={companyName}
                        onChangeText={setCompanyName}
                        placeholder="Organization / Company Name *"
                        placeholderTextColor="#656565"
                    />
                </View>
            )}

            {/* Number of Properties Selection */}
            <View style={[styles.propertyTypeContainer, { marginTop: 20 }]}>
                <Text style={styles.fieldLabel}>Approx. Number of Properties *</Text>
                <View style={styles.propertyTypeGrid}>
                    {PROPERTY_COUNT_RANGES.map((range) => (
                        <TouchableOpacity
                            key={range}
                            style={[
                                styles.propertyChip, 
                                propertyCount === range && styles.propertyChipSelected
                            ]}
                            onPress={() => {
                                setPropertyCount(range);
                                setIsCustomPropertyCount(range.includes('Other'));
                            }}
                        >
                            <Text style={[
                                styles.propertyChipText, 
                                propertyCount === range && styles.propertyChipTextSelected
                            ]}>
                                {range}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Free form input if 'Other' is selected */}
                {isCustomPropertyCount && (
                    <View style={[styles.inputContainer, { marginTop: 10 }]}>
                        <TextInput
                            style={styles.textInput}
                            value={customPropertyCount}
                            onChangeText={setCustomPropertyCount}
                            placeholder="Enter exact number of properties *"
                            placeholderTextColor="#656565"
                            keyboardType="numeric"
                        />
                    </View>
                )}
            </View>

            <View style={[styles.toggleRow, { marginTop: 10 }]}>
              <Text style={styles.toggleLabel}>Is this current Property occupied?</Text>
              <ToggleSwitch
                value={propertyOccupied}
                onValueChange={setPropertyOccupied}
                size="medium"
              />
            </View>

            {/* Description */}
            <View style={styles.descriptionContainer}>
              <Text style={styles.fieldLabel}>Brief Description (Optional)</Text>
              <View style={styles.descriptionInputContainer}>
                <TextInput
                  style={styles.descriptionInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Write a brief description of the property..."
                  placeholderTextColor="#7c7c7c"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Upload Section */}
            <View style={styles.uploadSection}>
              {/* Property Images Upload */}
              <View style={{ marginBottom: 20 }}>
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={() => handlePickImage('property')}
                  activeOpacity={0.7}
                >
                  <UploadIcon size={24} color="#656565" />
                  <Text style={styles.uploadText}>Upload Property Photo(s)</Text>
                  <Text style={styles.uploadHint}>File type: png, jpg, mp4, mov</Text>
                </TouchableOpacity>
                <Text style={[styles.uploadLabel, { color: '#D32F2F' }]}>Minimum of 1 photo of your property *</Text>

                {/* Property Images Preview */}
                {propertyImages.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.imagePreviewScroll}
                    contentContainerStyle={{ paddingVertical: 10 }}
                  >
                    {propertyImages.map((uri, index) => (
                      <View key={index} style={styles.imagePreviewContainer}>
                        <Image source={{ uri }} style={styles.imagePreview} />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => handleRemovePropertyImage(index)}
                        >
                          <CloseIcon size={12} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Valid ID Upload */}
              <View style={{ marginBottom: 20 }}>
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={() => handlePickImage('id')}
                  activeOpacity={0.7}
                >
                  {validIdImage ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: validIdImage }} style={styles.imagePreview} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => setValidIdImage(null)}
                      >
                        <CloseIcon size={12} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <UploadIcon size={24} color="#656565" />
                      <Text style={styles.uploadText}>Upload Valid ID</Text>
                      <Text style={styles.uploadHint}>File type: png, jpg</Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text style={[styles.uploadLabel, { color: '#D32F2F' }]}>Valid ID Document *</Text>
                <Text style={styles.privacyStatement}>
                  LUNEST uses these documents only to verify the applicant, landlord, and property authority. Access is restricted to authorized review personnel and the documents are not used for marketing.
                </Text>
              </View>

              {/* Landlord ID Upload (Conditional for Managers/Realtors) */}
              {hostRole !== 'landlord' && (
                <View style={{ marginBottom: 20 }}>
                  <TouchableOpacity
                    style={styles.uploadBox}
                    onPress={() => handlePickImage('landlord')}
                    activeOpacity={0.7}
                  >
                    {landlordIdImage ? (
                      <View style={styles.imagePreviewContainer}>
                        <Image source={{ uri: landlordIdImage }} style={styles.imagePreview} />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => setLandlordIdImage(null)}
                        >
                          <CloseIcon size={12} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <UploadIcon size={24} color="#656565" />
                        <Text style={styles.uploadText}>Upload Landlord Valid ID</Text>
                        <Text style={styles.uploadHint}>File type: png, jpg</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <Text style={[styles.uploadLabel, { color: '#D32F2F' }]}>Landlord ID Document *</Text>
                </View>
              )}

              {/* Authorization Letter Upload (Conditional) */}
              {isPropertyManager && (
                <View style={{ marginBottom: 20 }}>
                  <TouchableOpacity
                    style={styles.uploadBox}
                    onPress={() => handlePickImage('auth')}
                    activeOpacity={0.7}
                  >
                    {authorizationLetter ? (
                      <View style={styles.imagePreviewContainer}>
                        <Ionicons name="document-text" size={32} color="#010135" />
                        <Text style={styles.uploadText}>Letter Uploaded</Text>
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => setAuthorizationLetter(null)}
                        >
                          <CloseIcon size={12} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <UploadIcon size={24} color="#656565" />
                        <Text style={styles.uploadText}>Upload Authorization Letter</Text>
                        <Text style={styles.uploadHint}>File type: png, jpg, pdf</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <Text style={[styles.uploadLabel, { color: '#D32F2F' }]}>Authorization Letter *</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Submit Section */}
        <View style={[styles.submitSection, { width: containerWidth }]}>
          <Text style={styles.termsText}>
            By submitting this application, you accept our{' '}
            <Text
              style={styles.termsLink}
              onPress={() => {
                setSelectedTerm(DEMO_TERMS.hostingTerms || DEMO_TERMS.listingAgreement);
                setShowTermsModal(true);
              }}
            >
              Listing and Hosting Terms
            </Text>
            {' '}and confirm that the information provided is accurate and you are legally authorized to list this property on LUNEST.
          </Text>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Listing and Hosting Terms Modal */}
      <TermsModal
        visible={showTermsModal}
        term={selectedTerm}
        onClose={() => setShowTermsModal(false)}
      />

      {/* Pending Modal */}
      <Modal
        visible={showPendingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPendingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="checkmark-circle" size={60} color="#010135" />
            </View>
            <Text style={styles.modalTitle}>Application Submitted!</Text>
            <Text style={styles.modalMessage}>
              Your host application has been submitted successfully. Our team will review your application and get back to you within 24-48 hours.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowPendingModal(false);
                router.back();
              }}
            >
              <Text style={styles.modalButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  formGroup: {
    gap: 16,
  },
  inputContainer: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7c7c7c',
    paddingHorizontal: 16,
  },
  textInput: {
    fontSize: 14,
    color: '#000000',
    flex: 1,
  },
  lockedInputContainer: {
    marginBottom: 4,
  },
  lockedInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  lockedInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  lockedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4B5563',
  },
  lockedInputWrapper: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lockedTextInput: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    letterSpacing: 1.5,
    flex: 1,
  },
  lockedHelperText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  genderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  genderLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  genderOptions: {
    flexDirection: 'row',
    gap: 20,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#7c7c7c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#010135',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#010135',
  },
  genderText: {
    fontSize: 14,
    color: '#111827',
  },
  propertyTypeContainer: {
    gap: 12,
  },
  propertyTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },
  fieldValue: {
    fontSize: 12,
    color: '#6B7280',
  },
  selectedTypesText: {
    fontSize: 12,
    color: '#010135',
    marginTop: 4,
  },
  propertyTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  propertyChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#7c7c7c',
    backgroundColor: '#FFFFFF',
  },
  propertyChipSelected: {
    backgroundColor: '#010135',
    borderColor: '#010135',
  },
  propertyChipText: {
    fontSize: 12,
    color: '#111827',
  },
  propertyChipTextSelected: {
    color: '#FFFFFF',
  },
  customPropertyInput: {
    marginTop: 8,
  },
  roleContainer: {
    marginTop: 16,
  },
  roleOptions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  roleChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7c7c7c',
    backgroundColor: '#FFFFFF',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  roleChipSelected: {
    backgroundColor: '#010135',
    borderColor: '#010135',
  },
  roleChipText: {
    fontSize: 12,
    color: '#111827',
    textAlign: 'center',
  },
  roleChipTextSelected: {
    color: '#FFFFFF',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#111827',
  },
  descriptionContainer: {
    gap: 10,
  },
  descriptionInputContainer: {
    height: 78,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7c7c7c',
    padding: 12,
  },
  descriptionInput: {
    fontSize: 14,
    color: '#000000',
    flex: 1,
  },
  uploadSection: {
    gap: 10,
    marginTop: 10,
  },
  uploadBox: {
    height: 76,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#888888',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadBoxSmall: {
    height: 60,
    marginTop: 10,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  uploadHint: {
    fontSize: 10,
    color: '#656565',
  },
  uploadLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  privacyStatement: {
    fontSize: 11,
    color: '#656565',
    marginTop: 8,
    lineHeight: 14,
  },
  imagePreviewScroll: {
    marginTop: 12,
  },
  imagePreviewContainer: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitSection: {
    marginTop: 20,
    width: '100%',
    paddingHorizontal: 20,
  },
  termsText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  termsBold: {
    fontWeight: '600',
  },
  termsLink: {
    color: '#010135',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  submitButton: {
    backgroundColor: '#010135',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: '#010135',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default LandlordRequestForm;
