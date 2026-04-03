/**
 * Create Listing - Step 8: Availability
 * Set property availability and booking settings
 */

import { format } from "date-fns";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Button from '../../src/components/Button';
import CancelConfirmationModal from '../../src/components/create-listing/CancelConfirmationModal';
import {
  baseStyles,
  footerStyles,
  headerStyles,
  infoBoxStyles,
  progressStyles,
  scrollStyles,
  textStyles,
  toggleStyles
} from '../../src/constants/styles';
import { COLORS } from '../../src/constants/theme';
import { useDraftListing } from '../../src/hooks/useDraftListing';
import draftListingService from '../../src/services/draftListingService';

// House Rules options
const HOUSE_RULES = [
  { id: 'no_smoking', label: 'No Smoking' },
  { id: 'no_pets', label: 'No Pets' },
  { id: 'no_parties', label: 'No Parties' },
  { id: 'quiet_hours', label: 'Quiet Hours' },
  { id: 'no_unregistered', label: 'No Unregistered Guests' },
  { id: 'no_shoes', label: 'No Shoes Inside' },
  { id: 'no_cooking', label: 'No Cooking' },
  { id: 'recycling', label: 'Recycling Required' },
];

// Close X Icon - with explicit dimensions for web
const CloseIcon = ({ size = 24, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ width: size, height: size }}>
    <Path
      d="M18 6L6 18M6 6L18 18"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Progress Bar Component
const ProgressBar = ({ currentStep, totalSteps }) => {
  return (
    <View style={progressStyles.container}>
      <View style={progressStyles.barsContainer}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View
            key={index}
            style={[
              progressStyles.segment,
              index < currentStep ? progressStyles.segmentFilled : progressStyles.segmentEmpty,
            ]}
          />
        ))}
      </View>
      <Text style={progressStyles.text}>{currentStep} of {totalSteps}</Text>
    </View>
  );
};

const Availability = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const draftId = params.draftId || null;
  const { draftData, saveDraftData } = useDraftListing();
  
  // Initialize with empty/default values
  const [instantBooking, setInstantBooking] = useState(true);
  const [minStay, setMinStay] = useState('1');
  const [maxStay, setMaxStay] = useState('30');
  const [advanceNotice, setAdvanceNotice] = useState('1');
  const [availableNow, setAvailableNow] = useState(true);
  const [availabilityStatus, setAvailabilityStatus] = useState('available'); // 'available' or 'booked'
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);
  const [isCheckInPickerVisible, setCheckInPickerVisible] = useState(false);
  const [isCheckOutPickerVisible, setCheckOutPickerVisible] = useState(false);
  const [selectedRules, setSelectedRules] = useState([]);
  const [additionalRules, setAdditionalRules] = useState('');
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Load draft data on mount
  useEffect(() => {
    if (draftData && !initialLoadDone) {
      setInstantBooking(draftData.instantBooking !== false);
      setMinStay(String(draftData.minStay || '1'));
      setMaxStay(String(draftData.maxStay || '30'));
      setAdvanceNotice(String(draftData.advanceNotice || '1'));
      setAvailableNow(draftData.availableNow !== false);
      setAvailabilityStatus(draftData.availabilityStatus || 'available');
      setCheckInTime(draftData.checkInTime || null);
      setCheckOutTime(draftData.checkOutTime || null);
      // Load house rules
      if (draftData.houseRules) {
        if (Array.isArray(draftData.houseRules)) {
          setSelectedRules(draftData.houseRules);
        } else if (typeof draftData.houseRules === 'object') {
          // Convert object format to array
          const rulesArray = Object.keys(draftData.houseRules).filter(key => draftData.houseRules[key]);
          setSelectedRules(rulesArray);
        }
      }
      setAdditionalRules(draftData.additionalRules || '');
      setInitialLoadDone(true);
    }
  }, [draftData, initialLoadDone]);

  // Toggle house rule selection
  const toggleRule = (ruleId) => {
    setSelectedRules(prev => {
      const newRules = prev.includes(ruleId)
        ? prev.filter(id => id !== ruleId)
        : [...prev, ruleId];
      
      // Auto-save when rules change
      saveDraftData({ houseRules: newRules });
      return newRules;
    });
  };

  // Debounced save for text inputs to prevent glitching
  const debouncedSave = useCallback(
    (text) => {
      const timeoutId = setTimeout(() => {
        saveDraftData({ additionalRules: text });
      }, 500);
      return () => clearTimeout(timeoutId);
    },
    [saveDraftData]
  );

  // Auto-save function
  const updateAvailability = (updates) => {
    const finalUpdates = {
      instantBooking: updates.instantBooking !== undefined ? updates.instantBooking : instantBooking,
      minStay: updates.minStay !== undefined ? updates.minStay : minStay,
      maxStay: updates.maxStay !== undefined ? updates.maxStay : maxStay,
      advanceNotice: updates.advanceNotice !== undefined ? updates.advanceNotice : advanceNotice,
      availableNow: updates.availableNow !== undefined ? updates.availableNow : availableNow,
      availabilityStatus: updates.availabilityStatus !== undefined ? updates.availabilityStatus : availabilityStatus,
      houseRules: selectedRules,
      additionalRules,
      currentStep: 8,
    };

    if (updates.instantBooking !== undefined) setInstantBooking(updates.instantBooking);
    if (updates.minStay !== undefined) setMinStay(updates.minStay);
    if (updates.maxStay !== undefined) setMaxStay(updates.maxStay);
    if (updates.advanceNotice !== undefined) setAdvanceNotice(updates.advanceNotice);
    if (updates.availableNow !== undefined) setAvailableNow(updates.availableNow);
    if (updates.availabilityStatus !== undefined) setAvailabilityStatus(updates.availabilityStatus);

    saveDraftData(finalUpdates);
  };

  const handleClose = () => {
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    // Save as draft before dismissing
    try {
      const finalDraftId = (draftData && draftData.draftId) || draftId || draftListingService.generateDraftId();
      
      await saveDraftData({
        instantBooking,
        minStay,
        maxStay,
        advanceNotice,
        availableNow,
        currentStep: 8,
        draftId: finalDraftId,
      });
      
      setShowCancelModal(false);
      router.dismissAll();
      router.replace('/(host-tabs)/listings?filter=drafts&showDraftSaved=true');
    } catch (error) {
      console.error('Error saving draft:', error);
      setShowCancelModal(false);
      router.dismissAll();
      router.replace('/(host-tabs)/listings?filter=drafts&showDraftSaved=true');
    }
  };

  const handleCancelDismiss = () => {
    setShowCancelModal(false);
  };

  const handleCheckInConfirm = (date) => {
    setCheckInTime(date.toISOString());
    setCheckInPickerVisible(false);
    saveDraftData({ checkInTime: date.toISOString() });
  };

  const handleCheckOutConfirm = (date) => {
    setCheckOutTime(date.toISOString());
    setCheckOutPickerVisible(false);
    saveDraftData({ checkOutTime: date.toISOString() });
  };

  const handleBack = () => {
    // Navigate back with current params to preserve data
    const finalDraftId = (draftData && draftData.draftId) || draftId || draftListingService.generateDraftId();
    
    saveDraftData({
      ...draftData,  // Preserve all existing data
      instantBooking,
      minStay,
      maxStay,
      advanceNotice,
      availableNow,
      currentStep: 8,
      draftId: finalDraftId,
    }).then(() => {
      router.replace({
        pathname: '/create-listing/pricing',
        params: { draftId: finalDraftId },
      });
    }).catch(() => {
      router.replace({
        pathname: '/create-listing/pricing',
        params: { draftId: finalDraftId },
      });
    });
  };

  const handleNext = () => {
    // Validate that check-in and check-out times are not the same
    if (checkInTime && checkOutTime) {
      const checkInDate = new Date(checkInTime);
      const checkOutDate = new Date(checkOutTime);
      
      if (checkInDate.getHours() === checkOutDate.getHours() && 
          checkInDate.getMinutes() === checkOutDate.getMinutes()) {
        Alert.alert(
          'Invalid Times',
          'Check-in and check-out times cannot be the same. Please select different times.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    const finalDraftId = (draftData && draftData.draftId) || draftId || draftListingService.generateDraftId();
    
    saveDraftData({
      ...draftData,  // Preserve all existing data
      instantBooking,
      minStay,
      maxStay,
      advanceNotice,
      availableNow,
      houseRules: selectedRules,
      additionalRules,
      checkInTime,
      checkOutTime,
      currentStep: 8,
      draftId: finalDraftId,
    }).then(() => {
      // Skip house-rules step, go directly to terms-agreement
      router.push({
        pathname: '/create-listing/terms-agreement',
        params: { draftId: finalDraftId },
      });
    }).catch(() => {
      router.push({
        pathname: '/create-listing/terms-agreement',
        params: { draftId: finalDraftId },
      });
    });
  };

  return (
    <SafeAreaView style={baseStyles.container} edges={['top']}>
      {/* Header */}
      <View style={headerStyles.container}>
        <Text style={headerStyles.title}>Create a Listing</Text>
        <Pressable style={headerStyles.closeButton} onPress={handleClose}>
          <View style={headerStyles.closeButtonBg} />
          <CloseIcon size={14} color="#000000" />
        </Pressable>
      </View>

      {/* Progress Bar */}
      <ProgressBar currentStep={8} totalSteps={10} />

      {/* Content */}
      <ScrollView style={scrollStyles.container} contentContainerStyle={scrollStyles.contentContainer}>
        <Text style={textStyles.sectionTitle}>Availability & Rules:</Text>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#000', marginBottom: 10 }}>Control your calendar and guest experience.</Text>

        {/* Availability Status Toggle */}
        <View style={[toggleStyles.container, { backgroundColor: '#F8F8F8', borderRadius: 10, padding: 15, marginTop: 10 }]}>
          <View style={toggleStyles.infoContainer}>
            <Text style={toggleStyles.label}>Available for Booking</Text>
            <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
              {availabilityStatus === 'available' ? 'Your property is visible to guests' : 'Your property is hidden from search'}
            </Text>
          </View>
          <Switch
            value={availabilityStatus === 'available'}
            onValueChange={(value) => updateAvailability({ availabilityStatus: value ? 'available' : 'booked' })}
            trackColor={{ false: '#E5E5E5', true: COLORS.secondary }}
            thumbColor="#FFFFFF"
          />
        </View>
        
        {/* Instant Booking Toggle */}
        <View style={[toggleStyles.container, { backgroundColor: '#ECF2FF', borderRadius: 10, padding: 15 }]}>
          <View style={toggleStyles.infoContainer}>
            <Text style={toggleStyles.label}>Instant Booking</Text>
          </View>
          <Switch
            value={instantBooking}
            onValueChange={(value) => updateAvailability({ instantBooking: value })}
            trackColor={{ false: '#E5E5E5', true: COLORS.secondary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* House Rules Section */}
        <View style={{ marginTop: 20 }}>
          <Text style={textStyles.label}>House Rules</Text>
          <Text style={{ fontSize: 13, color: '#666', marginBottom: 15 }}>Select rules that apply to your property</Text>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {HOUSE_RULES.map((rule) => {
              const isSelected = selectedRules.includes(rule.id);
              return (
                <Pressable
                  key={rule.id}
                  onPress={() => toggleRule(rule.id)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: isSelected ? '#010135' : '#DADADA',
                    backgroundColor: isSelected ? 'rgba(1, 1, 53, 0.08)' : '#FFFFFF',
                  }}
                >
                  <Text style={{
                    fontSize: 13,
                    fontWeight: '500',
                    color: isSelected ? '#010135' : '#333',
                  }}>
                    {rule.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Additional Rules Input */}
          <View style={{ marginTop: 20 }}>
            <Text style={textStyles.label}>Additional Rules (Optional)</Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#DADADA',
                borderRadius: 10,
                padding: 15,
                minHeight: 100,
                textAlignVertical: 'top',
                fontSize: 14,
                color: '#333',
                marginTop: 8,
                backgroundColor: '#fff',
              }}
              placeholder="Add any other rules guests should know about..."
              placeholderTextColor="#999"
              multiline
              scrollEnabled={false}
              textAlignVertical="top"
              value={additionalRules}
              onChangeText={(text) => {
                setAdditionalRules(text);
                debouncedSave(text);
              }}
            />
          </View>
        </View>

        {/* Check-in / Check-out Times Section */}
        <View style={{
          borderRadius: 9,
          padding: 15,
          gap: 13,
          backgroundColor: '#fff',
          shadowColor: '#BEBBB7',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 15,
          elevation: 15,
        }}>
          <Text style={textStyles.label}>Check-in / Check-out Times</Text>
          <Text style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>
            Set the times when guests can check in and must check out
          </Text>
          
          {/* Check-in and Check-out Time Pickers side by side */}
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <View style={{ flex: 1 }}>
              <View style={{
                backgroundColor: '#fff',
                borderWidth: 1,
                borderColor: '#BDBDBD',
                borderRadius: 7,
                height: 52,
                justifyContent: 'center',
                paddingHorizontal: 15,
              }}>
                <Text style={{ 
                  position: 'absolute', 
                  top: -10, 
                  left: 15, 
                  backgroundColor: '#fff', 
                  paddingHorizontal: 3,
                  fontSize: 11,
                  fontWeight: '700',
                  color: '#000',
                }}>Check-in</Text>
                <Pressable onPress={() => setCheckInPickerVisible(true)}>
                  <Text style={{ fontSize: 14, color: checkInTime ? '#000' : '#7C7C7C' }}>
                    {checkInTime && !isNaN(new Date(checkInTime).getTime()) 
                      ? format(new Date(checkInTime), "hh:mm a") 
                      : "Select time"}
                  </Text>
                </Pressable>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{
                backgroundColor: '#fff',
                borderWidth: 1,
                borderColor: '#BDBDBD',
                borderRadius: 7,
                height: 52,
                justifyContent: 'center',
                paddingHorizontal: 15,
              }}>
                <Text style={{ 
                  position: 'absolute', 
                  top: -10, 
                  left: 15, 
                  backgroundColor: '#fff', 
                  paddingHorizontal: 3,
                  fontSize: 11,
                  fontWeight: '700',
                  color: '#000',
                }}>Check-out</Text>
                <Pressable onPress={() => setCheckOutPickerVisible(true)}>
                  <Text style={{ fontSize: 14, color: checkOutTime ? '#000' : '#7C7C7C' }}>
                    {checkOutTime && !isNaN(new Date(checkOutTime).getTime()) 
                      ? format(new Date(checkOutTime), "hh:mm a") 
                      : "Select time"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <DateTimePickerModal
          isVisible={isCheckInPickerVisible}
          mode="time"
          onConfirm={handleCheckInConfirm}
          onCancel={() => setCheckInPickerVisible(false)}
        />

        <DateTimePickerModal
          isVisible={isCheckOutPickerVisible}
          mode="time"
          onConfirm={handleCheckOutConfirm}
          onCancel={() => setCheckOutPickerVisible(false)}
        />

        {/* Info Note */}
        <View style={infoBoxStyles.warning}>
          <Text style={infoBoxStyles.warningText}>
            💡 You can always update your availability later from your dashboard
          </Text>
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={footerStyles.container}>
        <View style={baseStyles.flex1}>
          <Button
            variant="secondary"
            onPress={handleBack}
          >
            Back
          </Button>
        </View>
        <View style={baseStyles.flex1}>
          <Button
            variant="primary"
            onPress={handleNext}
          >
            Next
          </Button>
        </View>
      </View>

      {/* Cancel Confirmation Modal */}
      <CancelConfirmationModal
        visible={showCancelModal}
        onConfirm={handleCancelConfirm}
        onDismiss={handleCancelDismiss}
      />
    </SafeAreaView>
  );
};

export default Availability;
