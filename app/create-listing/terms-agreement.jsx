/**
 * Create Listing - Step 8: Terms & Agreement
 * User must agree to terms before proceeding to review
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import CancelConfirmationModal from '../../src/components/create-listing/CancelConfirmationModal';
import TermsModal from '../../src/components/create-listing/TermsModal';
import { DEMO_TERMS } from '../../src/constants/termsConfig';
import { useDraftListing } from '../../src/hooks/useDraftListing';
import draftListingService from '../../src/services/draftListingService';

// Close X Icon
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

// Check Icon
const CheckIcon = ({ size = 20, color = '#22C55E' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17L4 12"
      stroke={color}
      strokeWidth={2.5}
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

const TermsAgreement = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const draftId = params.draftId || null;
  const { draftData, saveDraftData } = useDraftListing();
  
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleClose = () => {
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    try {
      const finalDraftId = (draftData && draftData.draftId) || draftId || draftListingService.generateDraftId();
      
      await saveDraftData({
        ...draftData,
        termsAgreed,
        currentStep: 9,
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
    // Save terms agreement state and navigate back to availability
    const finalDraftId = (draftData && draftData.draftId) || draftId;
    
    // OPTIMIZATION: Trigger save in background and navigate immediately
    await saveDraftData({
      ...draftData,  // Preserve all existing data
      termsAgreed,
      currentStep: 8,
      draftId: finalDraftId,
    }, { background: true });

    router.push({
      pathname: '/create-listing/availability',
      params: finalDraftId ? { draftId: finalDraftId } : {},
    });
  };

  const handleNext = async () => {
    if (termsAgreed) {
      const finalDraftId = (draftData && draftData.draftId) || draftId || draftListingService.generateDraftId();
      
      // OPTIMIZATION: Trigger save in background and navigate immediately
      await saveDraftData({
        ...draftData,  // Preserve all existing data
        termsAgreed: true,
        currentStep: 9,
        draftId: finalDraftId,
      }, { background: true });

      router.push({
        pathname: '/create-listing/review',
        params: { draftId: finalDraftId },
      });
    }
  };

  const handleViewTerm = (termId) => {
    const term = DEMO_TERMS[termId];
    if (term) {
      setSelectedTerm(term);
      setShowTermsModal(true);
    }
  };

  const handleCloseTermsModal = () => {
    setShowTermsModal(false);
    setSelectedTerm(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create a Listing</Text>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <View style={styles.closeButtonBg} />
          <View style={{ zIndex: 5 }}>
            <CloseIcon size={14} color="#000000" />
          </View>
        </Pressable>
      </View>

      {/* Progress Bar */}
      <ProgressBar currentStep={9} totalSteps={10} />

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Terms & Agreement</Text>
        <Text style={styles.sectionSubtitle}>
          Please review and agree to the following terms before proceeding
        </Text>
        
        {/* Terms of Service */}
        <View style={styles.tosContainer}>
          <View style={styles.tosItem}>
            <View style={styles.tosRow}>
              <Text style={styles.tosLabel}>Terms of Service</Text>
              <Pressable style={styles.previewButton} onPress={() => handleViewTerm('termsOfService')}>
                <Text style={styles.previewButtonText}>View</Text>
              </Pressable>
            </View>
          </View>
          
          <View style={styles.tosItem}>
            <View style={styles.tosRow}>
              <Text style={styles.tosLabel}>Listing Agreement</Text>
              <Pressable style={styles.previewButton} onPress={() => handleViewTerm('listingAgreement')}>
                <Text style={styles.previewButtonText}>View</Text>
              </Pressable>
            </View>
          </View>
          
          <View style={styles.tosItem}>
            <View style={styles.tosRow}>
              <Text style={styles.tosLabel}>Cancellation Policy</Text>
              <Pressable style={styles.previewButton} onPress={() => handleViewTerm('cancellationPolicy')}>
                <Text style={styles.previewButtonText}>View</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Agreement Checkbox */}
        <Pressable 
          style={styles.agreementContainer} 
          onPress={() => setTermsAgreed(!termsAgreed)}
        >
          <View style={[
            styles.checkbox,
            termsAgreed && styles.checkboxChecked
          ]}>
            {termsAgreed && <CheckIcon size={14} color="#FFFFFF" />}
          </View>
          <Text style={styles.agreementText}>
            I agree to the Terms of Service and Listing Agreement
          </Text>
        </Pressable>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <Pressable 
          style={styles.backButton} 
          onPress={handleBack}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Pressable 
          style={[
            styles.nextButton, 
            !termsAgreed && styles.nextButtonDisabled
          ]} 
          onPress={handleNext}
          disabled={!termsAgreed}
        >
          <Text style={[
            styles.nextButtonText,
            !termsAgreed && styles.nextButtonTextDisabled
          ]}>
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

      {/* Terms Modal */}
      <TermsModal
        visible={showTermsModal}
        term={selectedTerm}
        onClose={handleCloseTermsModal}
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
    zIndex: 10,
  },
  closeButtonBg: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    zIndex: 1,
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
    gap: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    
    color: '#000000',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    
    color: '#666666',
    lineHeight: 20,
  },
  tosContainer: {
    gap: 12,
    marginTop: 10,
  },
  tosItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingBottom: 12,
  },
  tosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tosLabel: {
    fontSize: 15,
    fontWeight: '500',
    
    color: '#292929',
  },
  previewButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E5EFFF',
  },
  previewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    
    color: '#010135',
  },
  agreementContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  agreementText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    
    color: '#292929',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'android' ? 48 : 20,
    gap: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
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

export default TermsAgreement;
