/**
 * Create Listing - Step 8: Terms & Agreement
 * User must agree to terms before proceeding to review
 */

import { 
  X, 
  Check, 
  ChevronRight, 
  AlertCircle,
  LayoutGrid
} from "lucide-react-native";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import * as WebBrowser from 'expo-web-browser';
import CancelConfirmationModal from '../../src/components/create-listing/CancelConfirmationModal';
import TermsModal from '../../src/components/create-listing/TermsModal';
import { DEMO_TERMS } from '../../src/constants/termsConfig';
import { useDraftListing } from '../../src/hooks/useDraftListing';
import draftListingService from '../../src/services/draftListingService';
import toastService from '../../src/services/toastService';
import ToastNotification from '../../src/components/common/ToastNotification';

// Icons migrated to Lucide

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
  
  const [termsAgreed, setTermsAgreed] = useState(draftData?.termsAgreed || false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Sync termsAgreed with draftData when it loads
  useEffect(() => {
    if (draftData?.termsAgreed !== undefined) {
      setTermsAgreed(draftData.termsAgreed);
    }
  }, [draftData]);

  const handleToggleAgreement = () => {
    const newValue = !termsAgreed;
    setTermsAgreed(newValue);
    
    // Optimized: Immediate background save when toggled
    const finalDraftId = (draftData && draftData.draftId) || draftId;
    saveDraftData({
      ...draftData,
      termsAgreed: newValue,
      currentStep: 8,
      draftId: finalDraftId,
    }, { background: true });
  };

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

  // Ensure useEffect is imported from react
  // (Wait, line 7 has only { useState }) - fix imports in chunk 3 if needed.
  

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
    const finalDraftId = (draftData && draftData.draftId) || draftId;

    await saveDraftData({
      ...draftData,
      termsAgreed,
      currentStep: 8,
      draftId: finalDraftId,
    }, { background: true });

    router.replace({
      pathname: '/create-listing/availability',
      params: finalDraftId ? { draftId: finalDraftId } : {},
    });
  };

  const handleNext = async () => {
    if (!termsAgreed) {
      toastService.showError("Please accept the terms and conditions to continue.");
      return;
    }

    const finalDraftId = (draftData && draftData.draftId) || draftId || draftListingService.generateDraftId();

    await saveDraftData({
      ...draftData,
      termsAgreed: true,
      currentStep: 9,
      draftId: finalDraftId,
    }, { background: true });

    router.push({
      pathname: '/create-listing/review',
      params: { draftId: finalDraftId },
    });
  };

  const handleViewTerm = (termId) => {
    WebBrowser.openBrowserAsync("https://www.lunest.app/terms-of-use");
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
          <X size={24} color="#000000" />
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
          onPress={handleToggleAgreement}
        >
          <View style={[
            styles.checkbox,
            termsAgreed && styles.checkboxChecked
          ]}>
            {termsAgreed && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
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
