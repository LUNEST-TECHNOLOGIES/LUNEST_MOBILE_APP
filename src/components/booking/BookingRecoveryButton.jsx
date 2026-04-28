/**
 * BookingRecoveryButton
 * 
 * A button component that allows users to manually check and recover
 * a booking that is stuck in PENDING_PAYMENT status when payment was successful.
 * 
 * Usage:
 * <BookingRecoveryButton 
 *   bookingId={bookingId} 
 *   currentStatus={booking.status}
 *   onRecovered={(updatedBooking) => navigation.navigate('BookingDetail', updatedBooking)}
 * />
 */

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import authService from "../../services/authService";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://api.lunest.app/v1";

const BookingRecoveryButton = ({ 
  bookingId, 
  currentStatus,
  onRecovered,
  style = {}
}) => {
  const [isRecovering, setIsRecovering] = useState(false);

  // Only show if booking is stuck in PENDING_PAYMENT
  if (currentStatus !== 'PENDING_PAYMENT') {
    return null;
  }

  const handleRecover = async () => {
    Alert.alert(
      "Confirm Booking Status",
      "Check if your payment was successful and confirm your booking?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Check & Confirm", 
          style: "default",
          onPress: performRecovery 
        }
      ]
    );
  };

  const performRecovery = async () => {
    try {
      setIsRecovering(true);
      
      const userData = await authService.getUserData();
      const token = await authService.getToken();
      
      if (!token) {
        Alert.alert("Error", "Please log in to check your booking status");
        return;
      }

      console.log(`[BookingRecovery] Checking booking: ${bookingId}`);

      const response = await fetch(
        `${API_BASE_URL}/v1/payment/recover-booking/${bookingId}?userId=${userData?.id || ''}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      console.log('[BookingRecovery] Response:', data);

      if (data.success) {
        // Booking was recovered or already confirmed
        if (data.recovered) {
          Alert.alert(
            "✅ Booking Confirmed!",
            "Your booking has been successfully confirmed.",
            [
              { 
                text: "View Booking", 
                onPress: () => onRecovered && onRecovered(data.booking)
              }
            ]
          );
        } else {
          Alert.alert(
            "✅ Already Confirmed",
            "Your booking is already confirmed.",
            [
              { 
                text: "View Booking", 
                onPress: () => onRecovered && onRecovered(data.booking)
              }
            ]
          );
        }
        
        // Notify parent component
        if (onRecovered) {
          onRecovered(data.booking);
        }
      } else {
        // Recovery failed - show appropriate message
        Alert.alert(
          "❌ Unable to Confirm",
          data.message || "Could not confirm your booking. Please contact support.",
          [
            { text: "OK" },
            { 
              text: "Contact Support", 
              onPress: () => {
                // Navigate to support or open email
                // navigation.navigate('Support');
              }
            }
          ]
        );
      }

    } catch (error) {
      console.error('[BookingRecovery] Error:', error);
      Alert.alert(
        "Error",
        "Failed to check booking status. Please try again or contact support."
      );
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <Pressable 
      style={[styles.container, style, isRecovering && styles.containerDisabled]} 
      onPress={handleRecover}
      disabled={isRecovering}
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
          {isRecovering ? "Verifying payment..." : "Payment Done? Confirm Booking"}
        </Text>
      </View>
    </Pressable>
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
  loader: {
    marginLeft: 8,
  }
});

export default BookingRecoveryButton;
