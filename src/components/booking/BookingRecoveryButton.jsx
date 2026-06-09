import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import apiClient from "../../services/apiClient";

const BookingRecoveryButton = ({ 
  bookingId, 
  currentStatus,
  onRecovered,
  onFailed,
  variant = 'dark', // 'dark' or 'light'
  style = {}
}) => {
  const [isRecovering, setIsRecovering] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('checking'); // 'checking', 'success', 'not_found'
  
  // Animation for slick button feel
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Only show if booking is in PENDING_PAYMENT status (stuck payment)
  const isEligible = currentStatus?.toUpperCase() === 'PENDING_PAYMENT';
  
  if (!isEligible) {
    return null;
  }

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleStartRecovery = () => {
    setModalVisible(true);
    setVerificationStatus('checking');
    performRecovery();
  };

  const performRecovery = async () => {
    try {
      setIsRecovering(true);
      
      console.log(`[BookingRecovery] Verifying booking: ${bookingId}`);

      if (!bookingId) {
        console.error('[BookingRecovery] Missing bookingId inside performRecovery');
        setVerificationStatus('not_found');
        return;
      }

      // Call the backend recovery route
      const response = await apiClient.get(`/v1/payment/recover-booking/${bookingId}`);

      console.log('[BookingRecovery] Response:', response);

      // Add a slight delay for better UX (so the modal doesn't flash)
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Check for success wrapping from CallBack.body (response.success && response.body?.success)
      const isSuccess = response.success && (
        response.body?.success === true || 
        response.body?.recovered === true || 
        response.body?.booking?.status === 'CONFIRMED'
      );

      if (isSuccess) {
        setVerificationStatus('success');
        
        // Wait a bit before closing and notifying
        setTimeout(() => {
          setModalVisible(false);
          if (onRecovered) onRecovered();
        }, 3000);
      } else {
        setVerificationStatus('not_found');
      }

    } catch (error) {
      console.error('[BookingRecovery] Error:', error);
      setVerificationStatus('not_found');
    } finally {
      setIsRecovering(false);
    }
  };

  const isLight = variant === 'light';

  return (
    <View style={[styles.wrapper, style]}>
      <Pressable 
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handleStartRecovery}
      >
        <Animated.View style={[
          styles.slickButton, 
          isLight && styles.lightButton,
          { transform: [{ scale: scaleAnim }] }
        ]}>
          <View style={styles.slickButtonContent}>
            <Ionicons 
              name="shield-checkmark-outline" 
              size={14} 
              color={isLight ? "#192DFF" : "#FFFFFF"} 
            />
            <Text 
              style={[
                styles.slickButtonText,
                isLight && styles.lightButtonText
              ]}
              numberOfLines={1}
            >
              Paid? Verify with Paystack
            </Text>
            <Ionicons 
              name="chevron-forward" 
              size={12} 
              color={isLight ? "#192DFF" : "#FFFFFF"} 
              opacity={0.5} 
            />
          </View>
        </Animated.View>
      </Pressable>

      {/* Verification Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => !isRecovering && setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {verificationStatus === 'checking' && (
              <View style={styles.statusView}>
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color="#192DFF" />
                </View>
                <Text style={styles.modalTitle}>Verifying Payment</Text>
                <Text style={styles.modalSubtext}>
                  We are checking with our payment gateway to confirm your booking. Please hold on...
                </Text>
              </View>
            )}

            {verificationStatus === 'success' && (
              <View style={styles.statusView}>
                <View style={styles.iconCircleSuccess}>
                  <Ionicons name="checkmark-done" size={40} color="#FFFFFF" />
                </View>
                <Text style={styles.modalTitle}>Verification Successful!</Text>
                <Text style={styles.modalSubtext}>
                  Great news! Your payment has been confirmed. Your booking is now secure.
                </Text>
              </View>
            )}

            {verificationStatus === 'not_found' && (
              <View style={styles.statusView}>
                <View style={styles.iconCircleError}>
                  <Ionicons name="alert-circle" size={40} color="#FFFFFF" />
                </View>
                <Text style={styles.modalTitle}>Not Yet Confirmed</Text>
                <Text style={styles.modalSubtext}>
                  We couldn't confirm your payment just yet. If you just paid, it might take a moment to reflect.
                </Text>
                <Pressable 
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Close & Try Later</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch', // Allow parent margins to work
  },
  slickButton: {
    backgroundColor: '#010135',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  lightButton: {
    backgroundColor: '#F0F4FF',
    borderWidth: 1,
    borderColor: '#D1DBFF',
    shadowOpacity: 0.03,
    elevation: 1,
  },
  slickButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  slickButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  lightButtonText: {
    color: '#192DFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 30,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  loaderContainer: {
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusView: {
    alignItems: 'center',
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#010135',
    marginTop: 20,
    textAlign: 'center',
  },
  modalSubtext: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  iconCircleSuccess: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleError: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    marginTop: 25,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#010135',
    fontSize: 15,
    fontWeight: '700',
  }
});

export default BookingRecoveryButton;
