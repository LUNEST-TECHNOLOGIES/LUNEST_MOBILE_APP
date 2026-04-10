/**
 * Submit Confirmation Modal
 * Confirms user agreement before listing submission
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Check Circle Icon
const CheckCircleIcon = ({ size = 24, color = '#22C55E' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill={color} />
    <Path
      d="M8 12L11 15L16 9"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Close Icon
const CloseIcon = ({ size = 24, color = '#000000' }) => (
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

const SubmitConfirmationModal = ({ visible, onConfirm, onDismiss }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onDismiss}
    >
      <View style={styles.modalContainer}>
        {/* Overlay */}
        <Pressable
          style={styles.overlay}
          onPress={onDismiss}
        />

        {/* Modal Content */}
        <View style={styles.modalView}>
          {/* Close Button */}
          <Pressable
            style={styles.closeButton}
            onPress={onDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <CloseIcon size={20} color="#666666" />
          </Pressable>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <CheckCircleIcon size={60} color="#22C55E" />
          </View>

          {/* Title */}
          <Text style={styles.modalTitle}>
            Ready to Submit Your Listing?
          </Text>

          {/* Description */}
          <Text style={styles.modalDescription}>
            Please review the submission guidelines before proceeding. Once submitted, your listing will undergo a quality and safety review.
          </Text>

          {/* Guidelines List */}
          <View style={styles.guidelinesList}>
            <GuidelineItem text="All information must be accurate and complete" />
            <GuidelineItem text="Photos should be clear and well-lit" />
            <GuidelineItem text="Pricing must be competitive" />
            <GuidelineItem text="House rules should be clear" />
          </View>

          {/* Confirmation Text */}
          <View style={styles.confirmationBox}>
            <Text style={styles.confirmationText}>
              I confirm that all information provided is accurate and complete, and I agree to LUNEST&apos;s terms and conditions.
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={onDismiss}
              activeOpacity={0.6}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>
                Review Again
              </Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.submitButton]}
              onPress={onConfirm}
              activeOpacity={0.6}
            >
              <Text style={[styles.buttonText, styles.submitButtonText]}>
                Submit Listing
              </Text>
            </Pressable>
          </View>

          {/* Info Text */}
          <Text style={styles.infoText}>
            Review process typically takes 24-48 hours
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const GuidelineItem = ({ text }) => (
  <View style={styles.guidelineItem}>
    <View style={styles.checkmark}>
      <Text style={styles.checkmarkText}>✓</Text>
    </View>
    <Text style={styles.guidelineText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingTop: 40,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    
    color: '#010135',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  modalDescription: {
    fontSize: 14,
    fontWeight: '400',
    
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  guidelinesList: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 6,
    gap: 8,
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  checkmarkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22C55E',
  },
  guidelineText: {
    fontSize: 12,
    fontWeight: '400',
    
    color: '#333333',
    flex: 1,
    lineHeight: 16,
  },
  confirmationBox: {
    backgroundColor: '#EBF5FF',
    borderLeftWidth: 3,
    borderLeftColor: '#192DFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
  },
  confirmationText: {
    fontSize: 12,
    fontWeight: '400',
    
    color: '#192DFF',
    lineHeight: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  submitButton: {
    backgroundColor: '#192DFF',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    
    textAlign: 'center',
  },
  cancelButtonText: {
    color: '#010135',
  },
  submitButtonText: {
    color: '#FFFFFF',
  },
  infoText: {
    fontSize: 12,
    fontWeight: '400',
    
    color: '#999999',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default SubmitConfirmationModal;
