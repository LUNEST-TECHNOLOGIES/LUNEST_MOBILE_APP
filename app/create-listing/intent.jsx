/**
 * Create Listing - Step 2: Select Listing Intent
 * Choose between For Rent or For Sale
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import CancelConfirmationModal from '../../src/components/create-listing/CancelConfirmationModal';
import useDraftListing from '../../src/hooks/useDraftListing';
import draftListingService from '../../src/services/draftListingService';

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

// Intent Option Component
const IntentOption = ({ title, selected, onPress, comingSoon }) => (
  <Pressable
    style={[
      styles.intentOption, 
      selected && styles.intentOptionSelected,
      comingSoon && styles.intentOptionDisabled
    ]}
    onPress={comingSoon ? null : onPress}
    disabled={comingSoon}
  >
    <Text style={[
      styles.intentText, 
      selected && styles.intentTextSelected,
      comingSoon && styles.intentTextDisabled
    ]}>
      {title}
    </Text>
    {comingSoon && (
      <View style={styles.comingSoonBadge}>
        <Text style={styles.comingSoonText}>Coming Soon</Text>
      </View>
    )}
  </Pressable>
);

const SelectListingIntent = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { draftData, isLoadingDraft, saveDraftData, draftId } = useDraftListing();
  
  // Initialize from draft data or params
  const [selectedIntent, setSelectedIntent] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Load intent from draft when available
  useEffect(() => {
    if (draftData && draftData.intent) {
      console.log('✅ [Intent] Loaded intent from draft:', draftData.intent);
      setSelectedIntent(draftData.intent);
    } else if (params.intent) {
      console.log('✅ [Intent] Loaded intent from params:', params.intent);
      setSelectedIntent(params.intent);
    }
  }, [draftData, params.intent]);

  // Save to draft when intent changes (but don't navigate)
  const updateIntent = (intent) => {
    setSelectedIntent(intent);
    if (draftId) {
      // Save immediately to preserve user selection
      saveDraftData({
        intent,
        currentStep: 2,
      }).catch(err => console.error('Error auto-saving intent:', err));
    }
  };

  const handleClose = () => {
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    try {
      // Get draftId from either draftData or params
      const draftId = (draftData && draftData.draftId) || params.draftId || draftListingService.generateDraftId();
      
      // Build draft from draftData if available, otherwise from params
      const baseData = draftData || { ...params };
      const draftDataToSave = draftListingService.buildDraftFromParams({
        ...baseData,
        intent: selectedIntent,
        draftId,
      }, 2);
      
      await draftListingService.saveDraft(draftDataToSave);
      setShowCancelModal(false);
      // Navigate to listings page with drafts tab and show toast
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
    // Navigate back with draftId to preserve data
    const draftId = (draftData && draftData.draftId) || params.draftId;
    router.replace({
      pathname: '/create-listing',
      params: draftId ? { draftId } : {},
    });
  };

  const handleNext = () => {
    if (selectedIntent) {
      // Save draft with latest data
      const draftId = draftData?.draftId || params.draftId || draftListingService.generateDraftId();
      
      // Save draft before navigation
      saveDraftData({
        intent: selectedIntent,
        currentStep: 2,
        draftId,
      }).then(() => {
        // Navigate after save completes
        router.push({
          pathname: '/create-listing/property-details',
          params: { draftId },
        });
      }).catch(err => {
        console.error('Error saving draft:', err);
        // Still navigate even if save fails
        router.push({
          pathname: '/create-listing/property-details',
          params: { draftId },
        });
      });
    }
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
      <ProgressBar currentStep={1} totalSteps={10} />

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Select Listing Intent:</Text>
        
        <View style={styles.intentOptions}>
          <IntentOption
            title="For Rent"
            selected={selectedIntent === 'rent'}
            onPress={() => updateIntent('rent')}
          />
          <IntentOption
            title="For Sale"
            selected={selectedIntent === 'sale'}
            onPress={() => updateIntent('sale')}
            comingSoon={true}
          />
        </View>
      </View>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Pressable
          style={[styles.nextButton, !selectedIntent && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!selectedIntent}
        >
          <Text style={[styles.nextButtonText, !selectedIntent && styles.nextButtonTextDisabled]}>
            Next
          </Text>
        </Pressable>
      </View>

      {/* Cancel Confirmation Modal */}
      <CancelConfirmationModal
        visible={showCancelModal}
        onCancel={handleCancelConfirm}
        onContinue={handleCancelDismiss}
        onClose={handleCancelDismiss}
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    gap: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    
    color: '#000000',
  },
  intentOptions: {
    gap: 20,
  },
  intentOption: {
    height: 76,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#888888',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  intentOptionSelected: {
    borderColor: '#192DFF',
    backgroundColor: '#F0F4FF',
  },
  intentOptionDisabled: {
    borderColor: '#E0E0E0',
    backgroundColor: '#F8F8F8',
    opacity: 0.8,
  },
  intentText: {
    fontSize: 15,
    fontWeight: '500',
    
    color: '#292929',
    textAlign: 'center',
  },
  intentTextSelected: {
    color: '#192DFF',
    fontWeight: '600',
  },
  intentTextDisabled: {
    color: '#999999',
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '600',
    
    color: '#FF9800',
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
  nextButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    
    color: '#FFFFFF',
  },
  nextButtonTextDisabled: {
    color: '#999999',
  },
});

export default SelectListingIntent;
