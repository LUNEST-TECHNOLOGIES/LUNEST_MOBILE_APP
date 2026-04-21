/**
 * Create Listing - Step 8: Availability
 * Set property availability and booking settings
 */

import { format } from "date-fns";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
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
import toastService from '../../src/services/toastService';
import ToastNotification from '../../src/components/common/ToastNotification';

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

// Time Options
const CHECK_IN_OPTIONS = [
  { value: "12:00 PM", label: "12:00 PM" },
  { value: "02:00 PM", label: "02:00 PM", recommended: true },
  { value: "04:00 PM", label: "04:00 PM" },
];

const CHECK_OUT_OPTIONS = [
  { value: "10:00 AM", label: "10:00 AM" },
  { value: "11:00 AM", label: "11:00 AM", recommended: true },
  { value: "12:00 PM", label: "12:00 PM" },
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
  const [checkInTime, setCheckInTime] = useState("02:00 PM – 04:00 PM"); // Default Recommended Range
  const [checkOutTime, setCheckOutTime] = useState("11:00 AM – 12:00 PM"); // Default Recommended Range
  const [selectedRules, setSelectedRules] = useState([]);
  const [additionalRules, setAdditionalRules] = useState('');
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Toast Notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("SUCCESS");

  // Subscribe to toast service
  useEffect(() => {
    const unsubscribe = toastService.subscribe(({ message, type }) => {
      setToastMessage(message);
      setToastType(type);
      setToastVisible(true);
    });
    return unsubscribe;
  }, []);

  // Load draft data on mount
  useEffect(() => {
    if (draftData && !initialLoadDone) {
      setInstantBooking(draftData.instantBooking !== false);
      setMinStay(String(draftData.minStay || '1'));
      setMaxStay(String(draftData.maxStay || '30'));
      setAdvanceNotice(String(draftData.advanceNotice || '1'));
      setAvailableNow(draftData.availableNow !== false);
      setAvailabilityStatus(draftData.availabilityStatus || 'available');
      // Handle legacy ISO dates or new string format
      if (draftData.checkInTime) {
        if (draftData.checkInTime.includes('T')) {
          try { setCheckInTime(format(new Date(draftData.checkInTime), "hh:mm a")); } catch (e) { setCheckInTime("02:00 PM – 04:00 PM"); }
        } else {
          setCheckInTime(draftData.checkInTime);
        }
      }
      if (draftData.checkOutTime) {
        if (draftData.checkOutTime.includes('T')) {
          try { setCheckOutTime(format(new Date(draftData.checkOutTime), "hh:mm a")); } catch (e) { setCheckOutTime("11:00 AM – 12:00 PM"); }
        } else {
          setCheckOutTime(draftData.checkOutTime);
        }
      }
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

  const handleBack = async () => {
    // Navigate back with current params to preserve data
    const finalDraftId = (draftData && draftData.draftId) || draftId || draftListingService.generateDraftId();
    
    // OPTIMIZATION: Trigger save in background and navigate immediately
    await saveDraftData({
      ...draftData,  // Preserve all existing data
      instantBooking,
      minStay,
      maxStay,
      advanceNotice,
      availableNow,
      currentStep: 8,
      draftId: finalDraftId,
    }, { background: true });

    router.replace({
      pathname: '/create-listing/pricing',
      params: { draftId: finalDraftId },
    });
  };

  const handleNext = async () => {
    // Validate that check-in and check-out times are not the same
    if (checkInTime && checkOutTime && checkInTime === checkOutTime) {
      toastService.showError('Check-in and check-out times cannot be the same. Please select different times.');
      return;
    }

    const finalDraftId = (draftData && draftData.draftId) || draftId || draftListingService.generateDraftId();
    
    // OPTIMIZATION: Trigger save in background and navigate immediately
    await saveDraftData({
      ...draftData,  // Preserve all existing data
      instantBooking,
      availableNow: availabilityStatus === 'available',
      houseRules: selectedRules,
      additionalRules,
      checkInTime: checkInTime || '02:00 PM',
      checkOutTime: checkOutTime || '11:00 AM',
      currentStep: 8,
      draftId: finalDraftId,
    }, { background: true });

    // Skip house-rules step, go directly to terms-agreement
    router.push({
      pathname: '/create-listing/terms-agreement',
      params: { draftId: finalDraftId },
    });
  };

  return (
    <SafeAreaView style={baseStyles.container} edges={['top']}>
      {/* Header */}
      <View style={headerStyles.container}>
        <Text style={headerStyles.title}>Create a Listing</Text>
        <Pressable style={headerStyles.closeButton} onPress={handleClose}>
          <View style={headerStyles.closeButtonBg} />
          <View style={{ zIndex: 5 }}>
            <CloseIcon size={14} color="#000000" />
          </View>
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

        {/* Check-in / Check-out Times Section */}
        <View style={{
          marginTop: 20,
          borderRadius: 9,
          padding: 15,
          gap: 13,
          backgroundColor: '#fff',
          shadowColor: '#BEBBB7',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 15,
          elevation: 5,
        }}>
          <Text style={[textStyles.label, { marginBottom: 0 }]}>Check-in / Check-out Times</Text>
          <Text style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
            Set standard times for your guests
          </Text>
          
          {/* Check-in Section */}
          <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
               <Text style={{ fontSize: 13, fontWeight: '700', color: '#333' }}>Check-in after</Text>
               <View style={{ marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#E8F5E9', borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#2E7D32' }}>Recommended: 2 PM</Text>
               </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {CHECK_IN_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    setCheckInTime(opt.value);
                    saveDraftData({ checkInTime: opt.value });
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 8,
                    borderWidth: 1.5,
                    borderColor: checkInTime === opt.value ? COLORS.primary : '#E0E0E0',
                    backgroundColor: checkInTime === opt.value ? 'rgba(1, 1, 53, 0.05)' : '#fff',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: 13,
                    fontWeight: checkInTime === opt.value ? '700' : '500',
                    color: checkInTime === opt.value ? COLORS.primary : '#616161',
                  }}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Check-out Section */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
               <Text style={{ fontSize: 13, fontWeight: '700', color: '#333' }}>Check-out before</Text>
               <View style={{ marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#E8F5E9', borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#2E7D32' }}>Recommended: 11 AM</Text>
               </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {CHECK_OUT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    setCheckOutTime(opt.value);
                    saveDraftData({ checkOutTime: opt.value });
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 8,
                    borderWidth: 1.5,
                    borderColor: checkOutTime === opt.value ? COLORS.primary : '#E0E0E0',
                    backgroundColor: checkOutTime === opt.value ? 'rgba(1, 1, 53, 0.05)' : '#fff',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: 13,
                    fontWeight: checkOutTime === opt.value ? '700' : '500',
                    color: checkOutTime === opt.value ? COLORS.primary : '#616161',
                  }}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* House Rules Section */}
        <View style={{ marginTop: 25 }}>
          <Text style={textStyles.label}>House Rules</Text>
          <Text style={{ fontSize: 13, color: '#666', marginBottom: 15 }}>Select options for your guests</Text>
          
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
              value={additionalRules}
              onChangeText={(text) => {
                setAdditionalRules(text);
                debouncedSave(text);
              }}
            />
          </View>
        </View>

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
        onCancel={handleCancelConfirm}
        onContinue={handleCancelDismiss}
        onClose={handleCancelDismiss}
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

export default Availability;
