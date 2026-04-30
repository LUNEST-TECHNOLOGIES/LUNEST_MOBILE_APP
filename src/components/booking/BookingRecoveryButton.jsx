/**
 * BookingRecoveryButton
 * 
 * A button component that allows users to manually check and recover
 * a booking that is stuck in PENDING_PAYMENT status when payment was successful.
 */

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  StyleSheet,
  Text,
  View,
} from "react-native";
import apiClient from "../../services/apiClient";

const BookingRecoveryButton = ({ 
  bookingId, 
  currentStatus,
  onStartRecovery,
  onRecovered,
  onFailed,
  style = {}
}) => {
  const [isRecovering, setIsRecovering] = useState(false);

  // Only show if booking is in PENDING_PAYMENT status (stuck payment)
  const showButton = currentStatus?.toUpperCase() === 'PENDING_PAYMENT' || currentStatus?.toUpperCase() === 'RESERVED';
  
  if (!showButton) {
    return null;
  }

  const handleRecover = async () => {
    console.log(`[BookingRecovery] Button tapped for booking: ${bookingId}`);
    Alert.alert(
      "Confirm Payment",
      "Did you complete the payment? We will check with our servers to confirm your booking.",
      [
        { text: "No, Cancel", style: "cancel" },
        { 
          text: "Yes, Confirm", 
          style: "default",
          onPress: () => {
             if (onStartRecovery) onStartRecovery();
             performRecovery();
          } 
        }
      ]
    );
  };

  const performRecovery = async () => {
    try {
      setIsRecovering(true);
      
      console.log(`[BookingRecovery] Checking booking: ${bookingId}`);

      // FIX: URL pluralization from /v1/booking to /v1/bookings
      const response = await apiClient.post('/v1/bookings/resolve-stuck-payment', {
        bookingId: bookingId
      });

      console.log('[BookingRecovery] Response:', response);

      if (response.success || response.processed > 0) {
        // Booking was recovered or already confirmed
        const confirmed = response.processed > 0 || (response.data && response.data.status === 'CONFIRMED');
        
        if (confirmed) {
          Alert.alert(
            "✅ Booking Confirmed!",
            "Your payment has been verified and your booking is now confirmed.",
            [
              { 
                text: "Great!", 
                onPress: () => onRecovered && onRecovered()
              }
            ]
          );
        } else {
          Alert.alert(
            "⏳ Still Processing",
            "We couldn't find a successful payment yet. If you just paid, it might take a minute to reflect. Please try again shortly.",
            [
              { text: "OK" }
            ]
          );
        }
        
        // Notify parent component to refresh data
        if (onRecovered) {
          onRecovered();
        }
      } else {
        // Recovery failed - notify parent
        const errorMessage = response.message || "Could not verify your payment at this time.";
        if (onFailed) {
           onFailed(errorMessage);
        } else {
          Alert.alert("❌ Verification Failed", errorMessage);
        }
      }

    } catch (error) {
      console.error('[BookingRecovery] Error:', error);
      Alert.alert(
        "Error",
        "Failed to check booking status. Please try again or contact support if the issue persists."
      );
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, style, isRecovering && styles.containerDisabled]} 
      onPress={handleRecover}
      disabled={isRecovering}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <View style={styles.content}>
        {isRecovering ? (
          <ActivityIndicator size="small" color="#192DFF" style={styles.loader} />
        ) : (
          <Ionicons 
            name="refresh-circle" 
            size={20} 
            color="#192DFF" 
          />
        )}
        <Text style={[styles.text, isRecovering && styles.textDisabled]}>
          {isRecovering ? "Verifying payment..." : "Paid but still pending? Verify here"}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F0F4FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#192DFF',
    marginVertical: 8,
    width: '100%',
  },
  containerDisabled: {
    opacity: 0.7,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#192DFF',
    fontSize: 14,
    fontWeight: '600',
  },
  textDisabled: {
    color: '#6B7280',
  },
  loader: {
    marginRight: 4,
  }
});

export default BookingRecoveryButton;
