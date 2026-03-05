/**
 * Create Listing - Step 8: House Rules
 * Set house rules and policies
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import CancelConfirmationModal from '../../src/components/create-listing/CancelConfirmationModal';
import draftListingService from '../../src/services/draftListingService';
import { useDraftListing } from '../../src/hooks/useDraftListing';
import { Platform } from 'react-native';

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
    <View style={styles.progressContainer}>
      <View style={styles.progressBars}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressSegment,
              index < currentStep ? styles.progressFilled : styles.progressEmpty,
            ]}
          />
        ))}
      </View>
      <Text style={styles.progressText}>{currentStep} of {totalSteps}</Text>
    </View>
  );
};

// House Rules
const HOUSE_RULES = [
  { id: 'no_smoking', label: 'No smoking', defaultValue: true },
  { id: 'no_pets', label: 'No pets', defaultValue: false },
  { id: 'no_parties', label: 'No parties or events', defaultValue: true },
  { id: 'quiet_hours', label: 'Quiet hours (10 PM - 8 AM)', defaultValue: true },
  { id: 'no_unregistered', label: 'No unregistered guests', defaultValue: true },
];

// Safe JSON parse helper - defined outside component
const safeParseObject = (value, defaultValue) => {
  if (!value || value === '' || value === '{}' || value === '[]') return defaultValue;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? parsed : defaultValue;
  } catch (e) {
    console.warn('Error parsing JSON:', e);
    return defaultValue;
  }
};

const defaultRules = HOUSE_RULES.reduce((acc, rule) => ({ ...acc, [rule.id]: rule.defaultValue }), {});

const HouseRules = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const draftId = params.draftId || null;
  const { draftData, saveDraftData } = useDraftListing();
  
  // Initialize with empty/default values
  const [rules, setRules] = useState(() => safeParseObject({}, defaultRules));
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [additionalRules, setAdditionalRules] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Load draft data on mount
  useEffect(() => {
    if (draftData) {
      setRules(safeParseObject(draftData.houseRules, defaultRules));
      setCheckInTime(draftData.checkInTime || '14:00');
      setCheckOutTime(draftData.checkOutTime || '11:00');
      setAdditionalRules(draftData.additionalRules || '');
    } else {
      setRules(defaultRules);
      setCheckInTime('14:00');
      setCheckOutTime('11:00');
      setAdditionalRules('');
    }
  }, [draftData]);

  // Auto-save function
  const updateHouseRules = (updates) => {
    const finalUpdates = {
      houseRules: updates.houseRules !== undefined ? updates.houseRules : rules,
      checkInTime: updates.checkInTime !== undefined ? updates.checkInTime : checkInTime,
      checkOutTime: updates.checkOutTime !== undefined ? updates.checkOutTime : checkOutTime,
      additionalRules: updates.additionalRules !== undefined ? updates.additionalRules : additionalRules,
      currentStep: 8,
    };

    if (updates.houseRules !== undefined) setRules(updates.houseRules);
    if (updates.checkInTime !== undefined) setCheckInTime(updates.checkInTime);
    if (updates.checkOutTime !== undefined) setCheckOutTime(updates.checkOutTime);
    if (updates.additionalRules !== undefined) setAdditionalRules(updates.additionalRules);

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
        houseRules: rules,
        checkInTime,
        checkOutTime,
        additionalRules,
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

  const handleBack = () => {
    // Navigate back with current params to preserve data
    const finalDraftId = (draftData && draftData.draftId) || draftId || draftListingService.generateDraftId();
    
    saveDraftData({
      houseRules: rules,
      checkInTime,
      checkOutTime,
      additionalRules,
      currentStep: 8,
      draftId: finalDraftId,
    }).then(() => {
      router.replace({
        pathname: '/create-listing/availability',
        params: { draftId: finalDraftId },
      });
    }).catch(() => {
      router.replace({
        pathname: '/create-listing/availability',
        params: { draftId: finalDraftId },
      });
    });
  };

  const toggleRule = (ruleId) => {
    const updatedRules = { ...rules, [ruleId]: !rules[ruleId] };
    updateHouseRules({ houseRules: updatedRules });
  };

  const handleNext = () => {
    const finalDraftId = (draftData && draftData.draftId) || draftId || draftListingService.generateDraftId();
    
    saveDraftData({
      houseRules: rules,
      checkInTime,
      checkOutTime,
      additionalRules,
      currentStep: 8,
      draftId: finalDraftId,
    }).then(() => {
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create a Listing</Text>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <View style={styles.closeButtonBg} />
          <CloseIcon size={14} color="#000000" />
        </Pressable>
      </View>

      {/* Progress Bar */}
      <ProgressBar currentStep={8} totalSteps={10} />

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Set your house rules</Text>
        
        {/* Check-in/Check-out Times */}
        <View style={styles.timesSection}>
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Check-in Time</Text>
              <TextInput
                style={styles.textInput}
                placeholder="14:00"
                placeholderTextColor="#999999"
                value={checkInTime}
                onChangeText={(value) => updateHouseRules({ checkInTime: value })}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Check-out Time</Text>
              <TextInput
                style={styles.textInput}
                placeholder="11:00"
                placeholderTextColor="#999999"
                value={checkOutTime}
                onChangeText={(value) => updateHouseRules({ checkOutTime: value })}
              />
            </View>
          </View>
        </View>

        {/* House Rules List */}
        <View style={styles.rulesSection}>
          <Text style={styles.sectionLabel}>Standard Rules</Text>
          {HOUSE_RULES.map((rule) => (
            <View key={rule.id} style={styles.ruleRow}>
              <Text style={styles.ruleLabel}>{rule.label}</Text>
              <Switch
                value={rules[rule.id]}
                onValueChange={() => toggleRule(rule.id)}
                trackColor={{ false: '#E5E5E5', true: '#192DFF' }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}
        </View>

        {/* Additional Rules */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Additional Rules (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Add any other rules guests should know about..."
            placeholderTextColor="#999999"
            value={additionalRules}
            onChangeText={(value) => updateHouseRules({ additionalRules: value })}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Pressable style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
        </Pressable>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
    
    color: '#000000',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonBg: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  progressBars: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    marginRight: 15,
  },
  progressSegment: {
    height: 5,
    flex: 1,
    borderRadius: 2,
  },
  progressFilled: {
    backgroundColor: '#0E2F5D',
  },
  progressEmpty: {
    backgroundColor: '#20A4FF',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
    gap: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    
    color: '#000000',
  },
  timesSection: {
    gap: 12,
  },
  inputGroup: {
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    
    color: '#292929',
  },
  textInput: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingHorizontal: 16,
    fontSize: 14,
    
    color: '#000000',
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 100,
    paddingTop: 14,
    paddingBottom: 14,
  },
  rulesSection: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    
    color: '#000000',
    marginBottom: 4,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 16,
  },
  ruleLabel: {
    fontSize: 14,
    fontWeight: '500',
    
    color: '#292929',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'android' ? 30 : 20,
    gap: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#010135',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    
    color: '#000000',
  },
  nextButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#010135',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    
    color: '#FFFFFF',
  },
});

export default HouseRules;
