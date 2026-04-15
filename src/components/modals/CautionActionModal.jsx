import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Icons
const SuccessIcon = ({ size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <Circle cx="24" cy="24" r="22" stroke="#31EB3D" strokeWidth={2} fill="rgba(49, 235, 61, 0.1)" />
    <Path
      d="M14 24L21 31L34 18"
      stroke="#31EB3D"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const DisputeIcon = ({ size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <Circle cx="24" cy="24" r="22" stroke="#FD3131" strokeWidth={2} fill="rgba(253, 49, 49, 0.1)" />
    <Path
      d="M24 14V26M24 34H24.01"
      stroke="#FD3131"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ReleaseIcon = ({ size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <Circle cx="24" cy="24" r="22" stroke="#00897B" strokeWidth={2} fill="rgba(0, 137, 123, 0.1)" />
    <Path
      d="M16 24H32M32 24L26 18M32 24L26 30"
      stroke="#00897B"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/**
 * CautionActionModal
 * Unified modal for Releasing Caution Fee or Raising a Dispute
 * 
 * Steps:
 * 1. CONFIRM (Confirm release OR Input dispute reason)
 * 2. PROCESSING (Spinner + Status text)
 * 3. SUCCESS (Success icon + "Done")
 */
const CautionActionModal = ({
  visible,
  action, // 'RELEASE' or 'DISPUTE'
  booking,
  onConfirm, // async function that performs the action
  onClose,
  initialStep = 1,
  initialReason = '',
}) => {
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      const startStep = initialStep || 1;
      setStep(startStep);
      setReason(initialReason || '');
      setIsLoading(false);
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // If starting at Step 2 (Processing), trigger the action immediately
      if (startStep === 2) {
        // Use a small timeout to ensure state is committed
        setTimeout(() => {
          handleAction(initialReason || '');
        }, 100);
      }
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, initialStep]);

  const handleAction = async (forcedReason) => {
    const finalReason = forcedReason !== undefined ? forcedReason : reason;
    
    if (action === 'DISPUTE' && !finalReason.trim()) {
      return; 
    }

    setStep(2);
    setIsLoading(true);

    try {
      const success = await onConfirm(action === 'DISPUTE' ? finalReason : 'Caution fee release');
      if (success) {
        setStep(3);
      } else {
        // Fallback to step 1 on failure
        setStep(1);
      }
    } catch (error) {
      console.error('[CautionActionModal] Action failed:', error);
      setStep(1);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.content}>
            <View style={styles.iconWrapper}>
              {action === 'RELEASE' ? <ReleaseIcon /> : <DisputeIcon />}
            </View>
            <Text style={styles.title}>
              {action === 'RELEASE' ? 'Release Caution Fee?' : 'Raise Caution Dispute?'}
            </Text>
            <Text style={styles.description}>
              {action === 'RELEASE'
                ? `Confirm that you want to release the caution fee of ₦${(booking?.pricingBreakdown?.securityDeposit || 0).toLocaleString()} back to ${booking?.bookedBy?.fullName || 'the guest'}.`
                : 'Please describe the issue or damage caused. This will be reviewed by Lunest Admin before any deductions.'}
            </Text>

            {action === 'DISPUTE' && (
              <TextInput
                style={styles.textArea}
                placeholder="Reason for dispute (e.g. Broken TV, stained sofa...)"
                multiline
                numberOfLines={4}
                value={reason}
                onChangeText={setReason}
                placeholderTextColor="#999"
              />
            )}

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  { backgroundColor: action === 'RELEASE' ? '#00897B' : '#FD3131' },
                ]}
                onPress={handleAction}
              >
                <Text style={styles.confirmBtnText}>
                  {action === 'RELEASE' ? 'Confirm Release' : 'Submit Dispute'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.content}>
            <ActivityIndicator size="large" color="#010135" />
            <Text style={styles.processingTitle}>
              {action === 'RELEASE' ? 'Releasing to Guest...' : 'Processing Dispute...'}
            </Text>
            <Text style={styles.processingDesc}>
              Please wait while we update the transaction status.
            </Text>
          </View>
        );

      case 3:
        return (
          <View style={styles.content}>
            <View style={styles.iconWrapper}>
              <SuccessIcon />
            </View>
            <Text style={styles.title}>
              {action === 'RELEASE' ? 'Caution Fee Released' : 'Dispute Submitted'}
            </Text>
            <Text style={styles.description}>
              {action === 'RELEASE'
                ? `The caution fee has been successfully credited to ${booking?.bookedBy?.fullName || 'the guest'}.`
                : 'Your dispute has been received. Our team will review the details and get back to you shortly.'}
            </Text>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.modalContainer, { opacity: fadeAnim }]}>
          {/* Close Icon (only for steps 1 and 3) */}
          {step !== 2 && (
            <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          )}

          {renderStep()}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 28,
    width: '100%',
    maxWidth: 420,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  closeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 10,
    padding: 4,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  iconWrapper: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#010135',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  textArea: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    fontSize: 14,
    color: '#010135',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: 24,
  },
  btnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  confirmBtn: {
    flex: 2,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#010135',
    marginTop: 20,
    marginBottom: 8,
  },
  processingDesc: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  doneBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: '#010135',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default CautionActionModal;
