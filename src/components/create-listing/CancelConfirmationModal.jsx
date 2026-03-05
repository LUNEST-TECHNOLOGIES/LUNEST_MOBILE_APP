/**
 * CancelConfirmationModal Component
 * Shows when user tries to cancel/close the create listing flow
 * Saves listing as draft when confirmed
 * Optimized for fast, responsive interactions with no delays
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Close X Icon
const CloseIcon = ({ size = 24, color = '#000000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ width: size, height: size, minWidth: size, minHeight: size }}>
    <Path
      d="M18 6L6 18M6 6L18 18"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CancelConfirmationModal = ({ 
  visible, 
  onCancel, 
  onContinue, 
  onClose,
  // Support both naming conventions for backward compatibility
  onConfirm,
  onDismiss
}) => {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Animate modal in/out instantly with spring animation
  useEffect(() => {
    if (visible) {
      // Animate in - fast spring
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 20,
          stiffness: 150,
          mass: 1,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset for next time
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleOverlayPress = () => {
    // Close modal when pressing overlay - instant response
    const closeHandler = onClose || onDismiss || onContinue;
    if (closeHandler) {
      closeHandler();
    }
  };

  const handleCancelPress = () => {
    const cancelHandler = onCancel || onConfirm;
    if (cancelHandler) {
      cancelHandler();
    }
  };

  const handleContinuePress = () => {
    const continueHandler = onContinue || onDismiss;
    if (continueHandler) {
      continueHandler();
    }
  };

  // Handle escape key on web
  useEffect(() => {
    if (Platform.OS === 'web' && visible) {
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          handleOverlayPress();
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [visible]);

  if (!visible) return null;

  const modalContent = (
    <View style={styles.modalContainer}>
      <View style={styles.modalCard}>
        {/* Close Button */}
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={handleOverlayPress}
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <CloseIcon size={18} color="#000000" />
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>Are you sure you want to cancel?</Text>
          <Text style={styles.description}>
            Your Listing creation will stop here and be saved for later on your Listing page.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.cancelButton]} 
            onPress={handleCancelPress}
            activeOpacity={0.6}
          >
            <Text style={styles.cancelButtonText}>Yes, Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.continueButton]} 
            onPress={handleContinuePress}
            activeOpacity={0.6}
          >
            <Text style={styles.continueButtonText}>No, Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // For web, use a custom overlay instead of Modal
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webOverlay}>
        <TouchableWithoutFeedback onPress={handleOverlayPress}>
          <View style={styles.webBackdrop} />
        </TouchableWithoutFeedback>
        {modalContent}
      </View>
    );
  }

  // For native platforms, use Modal
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={handleOverlayPress}
      hardwareAccelerated={true}
    >
      <TouchableWithoutFeedback onPress={handleOverlayPress}>
        <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <Animated.View 
              style={[
                styles.modalContainer,
                {
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {modalContent}
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Web-specific overlay (renders as regular View, not Modal)
  webOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    padding: 20,
  },
  webBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  // Native overlay (inside Modal)
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 0,
    position: 'relative',
    zIndex: 100000,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 18,
  },
  content: {
    alignItems: 'center',
    gap: 16,
    marginTop: 24,
    marginBottom: 28,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    
    color: '#010135',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    
    color: '#666666',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
  },
  cancelButton: {
    borderWidth: 1.5,
    borderColor: '#B70808',
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    
    color: '#B70808',
  },
  continueButton: {
    backgroundColor: '#010135',
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '700',
    
    color: '#FFFFFF',
  },
});

export default CancelConfirmationModal;
