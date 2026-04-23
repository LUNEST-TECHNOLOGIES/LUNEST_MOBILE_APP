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
 * Form Input Component - Now uses TextInput for editable fields
 */
const FormInput = ({ value, onChangeText, placeholder, editable = true, keyboardType = 'default', style }) => (
  <View style={[styles.inputContainer, style]}>
    <TextInput
      style={[styles.textInput, !editable && styles.textInputDisabled]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#656565"
      editable={editable}
      keyboardType={keyboardType}
    />
  </View>
);

const PROPERTY_TYPES = [
  'Apartment / Flat',
  'Serviced Apartment',
  'Shortlet Apartment',
  'Guest House',
  'Duplex',
  'Hostel',
  'Bungalow',
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
  const [bvn, setBvn] = useState('');
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
  const [authorizationLetter, setAuthorizationLetter] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);

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
      
      // Fetch fresh profile from server to get gender
      const serverProfile = await authService.fetchProfile();
      const serverData = serverProfile?.data || {};

      setUserData({
        fullName: serverData?.fullName || authUser?.fullName || profileData?.name || '',
        email: serverData?.emailAddress || authUser?.email || profileData?.email || '',
        phone: serverData?.phoneNumber || profileData?.phone || '',
        location: serverData?.location || profileData?.location || '',
        nin: serverData?.nin || profileData?.nin || '',
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
    if (!userData.nin?.trim() || userData.nin.length < 11) {
      toastService.notify('Valid NIN (11 digits) is required', 'error');
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
        nin: userData.nin,
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
        authorizationLetter: authorizationLetter,
        bvn: bvn,
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

      // Refresh the host status context to update the UI on the profile screen
      if (typeof refreshHostStatus === 'function') {
        await refreshHostStatus();
      }

      // Important: Stop the submitting modal before showing success
      setIsSubmitting(false);
      
      // Show pending modal and navigate to pending screen ONLY after success
      setShowPendingModal(true);
      
      // Navigate to pending screen after a short delay for the user to see the success state/modal
      setTimeout(() => {
        setShowPendingModal(false);
        router.replace('/host-request-pending');
      }, 2500);

    } catch (error) {
      console.error('Error submitting form:', error);
      setIsSubmitting(false); // Ensure loading stops on unexpected error
      
      // Use toastService for better UI consistency
      const errorMessage = error.message || 'Failed to submit request. Please try again.';
      toastService.notify(errorMessage, 'error');
      
      // Falling back to Alert only for critical system failures
      if (error.status === 500) {
        Alert.alert('System Error', 'An unexpected server error occurred. Our team has been notified.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/profile');
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.closeButtonCircle}>
            <CloseIcon size={20} color="#000" />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Landlord Request Form</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center' }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Personal Information Section */}
        <View style={[styles.section, { width: containerWidth }]}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <Text style={styles.sectionSubtitle}>
            Your profile details have been pre-filled. You can edit them if needed.
          </Text>

          <View style={styles.formGroup}>
            <FormInput 
              value={userData.fullName} 
              onChangeText={(text) => setUserData(prev => ({ ...prev, fullName: text }))}
              placeholder="Full Name *" 
            />
            <FormInput 
              value={userData.email} 
              onChangeText={(text) => setUserData(prev => ({ ...prev, email: text }))}
              placeholder="Email Address *" 
              keyboardType="email-address"
            />
            <FormInput 
              value={userData.phone} 
              onChangeText={(text) => setUserData(prev => ({ ...prev, phone: text }))}
              placeholder="Phone Number *" 
              keyboardType="phone-pad"
            />
            <FormInput 
              value={userData.location} 
              onChangeText={(text) => setUserData(prev => ({ ...prev, location: text }))}
              placeholder="Your Location *" 
            />
            <FormInput 
              value={userData.nin} 
              onChangeText={(text) => setUserData(prev => ({ ...prev, nin: text }))}
              placeholder="NIN (11 digits) *" 
              keyboardType="numeric"
              maxLength={11}
            />

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

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={bvn}
                onChangeText={setBvn}
                placeholder="BVN"
                placeholderTextColor="#656565"
                keyboardType="numeric"
                maxLength={11}
              />
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
                      setSelectedPropertyTypes(prev => {
                        if (prev.includes(type)) {
                          // Remove if already selected
                          const newTypes = prev.filter(t => t !== type);
                          if (type === 'Other') {
                            setCustomPropertyType('');
                          }
                          return newTypes;
                        } else {
                          // Add if not selected
                          return [...prev, type];
                        }
                      });
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
              </View>

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
            By clicking <Text style={styles.termsBold}>&apos;SUBMIT&apos;</Text> i confirm that the information provided is accurate and i am legally allowed to list this property.
          </Text>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Submitting Modal */}
      <Modal
        visible={isSubmitting}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.submittingModalContent}>
            <ActivityIndicator size="large" color="#010135" />
            <Text style={styles.submittingText}>Submitting Application...</Text>
            <Text style={styles.submittingSubText}>Please wait while we process your request.</Text>
          </View>
        </View>
      </Modal>

      {/* Success/Pending Modal */}
      <Modal
        visible={showPendingModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={40} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>Application Submitted!</Text>
            <Text style={styles.successMessage}>
              Your request to become a host is being reviewed. We will notify you once it is approved.
            </Text>
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
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
    
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    
    color: '#000000',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    
    color: '#656565',
    marginBottom: 20,
    lineHeight: 20,
  },
  formGroup: {
    gap: 10,
  },
  inputContainer: {
    height: 44,
    backgroundColor: '#F6F6F6',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 14,
    fontWeight: '500',
    
    color: '#000000',
  },
  textInputDisabled: {
    color: '#656565',
  },
  inputText: {
    fontSize: 14,
    fontWeight: '500',
    
    color: '#000000',
  },
  inputTextDisabled: {
    color: '#656565',
  },
  textInput: {
    fontSize: 14,
    fontWeight: '500',
    
    color: '#000000',
  },
  genderContainer: {
    paddingVertical: 10,
  },
  genderLabel: {
    fontSize: 14,
    
    color: '#656565',
    marginBottom: 10,
  },
  genderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#888888',
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
    fontWeight: '500',
    
    color: '#000000',
  },
  propertyTypeContainer: {
    gap: 15,
  },
  propertyTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    
    color: '#000000',
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '500',
    
    color: '#454545',
  },
  selectedTypesText: {
    fontSize: 12,
    fontWeight: '400',
    
    color: '#010135',
    marginTop: 4,
    marginBottom: 8,
  },
  propertyTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  customPropertyInput: {
    marginTop: 5,
  },
  propertyChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#888888',
  },
  propertyChipSelected: {
    borderColor: '#010135',
    backgroundColor: '#E5EFFF',
  },
  propertyChipText: {
    fontSize: 12,
    fontWeight: '500',
    
    color: '#292929',
  },
  propertyChipTextSelected: {
    color: '#010135',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 12,
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
    fontWeight: '500',
    
    color: '#6371F1',
  },
  imagePreviewScroll: {
    marginTop: 10,
  },
  imagePreviewContainer: {
    marginRight: 10,
    position: 'relative',
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  submitSection: {
    gap: 20,
    marginBottom: 20,
  },
  termsText: {
    fontSize: 12,
    
    color: '#000000',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsBold: {
    fontWeight: '700',
    
  },
  submitButton: {
    height: 50,
    backgroundColor: '#010135',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    
    color: '#FFFFFF',
  },
  bottomSpacer: {
    height: 40,
  },
  toggleSubLabel: {
    fontSize: 12,
    color: '#656565',
    marginTop: 2,
  },
  authLetterPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authLetterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#010135',
  },
  roleContainer: {
    marginTop: 15,
    marginBottom: 10,
  },
  roleOptions: {
    gap: 10,
    marginTop: 12,
  },
  roleChip: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#F6F6F6',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  roleChipSelected: {
    backgroundColor: '#010135',
    borderColor: '#010135',
  },
  roleChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#656565',
  },
  roleChipTextSelected: {
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submittingModalContent: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    gap: 15,
    width: '80%',
  },
  submittingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#010135',
  },
  submittingSubText: {
    fontSize: 14,
    color: '#656565',
    textAlign: 'center',
  },
  successModalContent: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    borderRadius: 30,
    alignItems: 'center',
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#010135',
    marginBottom: 10,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#656565',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default LandlordRequestForm;
