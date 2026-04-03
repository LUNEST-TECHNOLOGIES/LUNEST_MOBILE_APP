/**
 * Payment Callback Hook
 * React Native hook for handling payment callbacks from Paystack
 * Industry-standard mobile payment callback handling
 */

import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';

interface PaymentCallbackData {
  status: 'success' | 'failed' | 'error' | 'unknown';
  reference?: string;
  verified: boolean;
  message: string;
  timestamp: string;
}

interface UsePaymentCallbackOptions {
  onSuccess?: (data: PaymentCallbackData) => void;
  onFailed?: (data: PaymentCallbackData) => void;
  onError?: (data: PaymentCallbackData) => void;
  onUnknown?: (data: PaymentCallbackData) => void;
}

export const usePaymentCallback = (options: UsePaymentCallbackOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [lastCallback, setLastCallback] = useState<PaymentCallbackData | null>(null);

  /**
   * Parse callback URL from deep link
   */
  const parseCallbackUrl = useCallback((url: string): PaymentCallbackData | null => {
    try {
      console.log('🔗 [PaymentCallback] Parsing callback URL:', url);

      // Check if this is a payment callback
      if (!url.includes('lunestmobile://payment-callback')) {
        console.log('⚠️ [PaymentCallback] Not a payment callback URL');
        return null;
      }

      // Parse URL parameters manually (safer for React Native)
      const queryString = url.split("?")[1] || "";
      const params: Record<string, string> = {};
      
      if (queryString) {
        queryString.split("&").forEach(pair => {
          const [key, value] = pair.split("=");
          if (key) params[decodeURIComponent(key)] = decodeURIComponent(value || "");
        });
      }

      const callbackData: PaymentCallbackData = {
        status: (params.status as any) || 'unknown',
        reference: params.reference || undefined,
        verified: params.verified === 'true',
        message: params.message || 'Payment processed',
        timestamp: params.timestamp || Date.now().toString()
      };

      console.log('✅ [PaymentCallback] Parsed callback data:', callbackData);
      return callbackData;

    } catch (error) {
      console.error('❌ [PaymentCallback] Error parsing callback URL:', error);
      return null;
    }
  }, []);

  /**
   * Handle payment callback
   */
  const handlePaymentCallback = useCallback((data: PaymentCallbackData) => {
    console.log('🔄 [PaymentCallback] Handling payment callback:', data);

    setLastCallback(data);

    // Show appropriate alert
    const alertTitle = getAlertTitle(data.status);
    const alertMessage = getAlertMessage(data);
    
    Alert.alert(alertTitle, alertMessage, [
      {
        text: 'OK',
        onPress: () => {
          // Navigate based on status
          handleCallbackNavigation(data);
        }
      }
    ]);

    // Call appropriate callback
    switch (data.status) {
      case 'success':
        options.onSuccess?.(data);
        break;
      case 'failed':
        options.onFailed?.(data);
        break;
      case 'error':
        options.onError?.(data);
        break;
      default:
        options.onUnknown?.(data);
        break;
    }
  }, [options]);

  /**
   * Handle navigation based on callback status
   */
  const handleCallbackNavigation = useCallback((data: PaymentCallbackData) => {
    console.log('🧭 [PaymentCallback] Navigating based on status:', data.status);

    switch (data.status) {
      case 'success':
        // Navigate to success screen or refresh current screen
        if (data.reference) {
          router.push(`/payment-success?reference=${data.reference}` as any);
        } else {
          router.back(); // Go back to previous screen
        }
        break;

      case 'failed':
        // Navigate to failure screen or payment retry
        router.push(`/payment-failed?reference=${data.reference || ''}` as any);
        break;

      case 'error':
        // Navigate to error screen or show error message
        router.push(`/payment-error?reference=${data.reference || ''}` as any);
        break;

      default:
        // Navigate to payment status screen
        router.push(`/payment-status?reference=${data.reference || ''}` as any);
        break;
    }
  }, []);

  /**
   * Get alert title based on status
   */
  const getAlertTitle = (status: string): string => {
    switch (status) {
      case 'success':
        return 'Payment Successful ✅';
      case 'failed':
        return 'Payment Failed ❌';
      case 'error':
        return 'Payment Error ⚠️';
      default:
        return 'Payment Status 📋';
    }
  };

  /**
   * Get alert message based on status
   */
  const getAlertMessage = (data: PaymentCallbackData): string => {
    switch (data.status) {
      case 'success':
        return data.verified 
          ? 'Your payment has been successfully processed and verified.'
          : 'Your payment was successful. Verification is in progress.';
      
      case 'failed':
        return 'Your payment could not be processed. Please try again or contact support.';
      
      case 'error':
        return 'An error occurred during payment processing. Please try again.';
      
      default:
        return data.message || 'Payment status unknown. Please check your payment history.';
    }
  };

  /**
   * Start listening for payment callbacks
   */
  const startListening = useCallback(() => {
    console.log('👂 [PaymentCallback] Starting to listen for payment callbacks...');
    setIsListening(true);

    const handleUrl = (event: { url: string }) => {
      const callbackData = parseCallbackUrl(event.url);
      if (callbackData) {
        handlePaymentCallback(callbackData);
      }
    };

    // Add event listener
    const subscription = Linking.addEventListener('url', handleUrl);

    // Check if app was opened with a URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        const callbackData = parseCallbackUrl(url);
        if (callbackData) {
          handlePaymentCallback(callbackData);
        }
      }
    });

    return () => {
      subscription.remove();
      setIsListening(false);
    };
  }, [parseCallbackUrl, handlePaymentCallback]);

  /**
   * Stop listening for payment callbacks
   */
  const stopListening = useCallback(() => {
    console.log('🔇 [PaymentCallback] Stopping payment callback listener...');
    setIsListening(false);
  }, []);

  /**
   * Manual payment status check
   */
  const checkPaymentStatus = useCallback(async (reference: string) => {
    try {
      console.log('🔍 [PaymentCallback] Checking payment status for reference:', reference);

      // Import API client
      const { default: apiClient } = await import('../services/apiClient');
      
      const response = await apiClient.get(`/v1/payment/status/${reference}`);
      
      if (response.success) {
        const statusData = {
          status: response.body.status.toLowerCase(),
          reference: response.body.reference,
          verified: response.body.status === 'COMPLETED',
          message: response.body.message,
          timestamp: Date.now().toString()
        };

        handlePaymentCallback(statusData);
        return statusData;
      } else {
        throw new Error(response.message || 'Failed to check payment status');
      }

    } catch (error: any) {
      console.error('❌ [PaymentCallback] Error checking payment status:', error);
      
      const errorData: PaymentCallbackData = {
        status: 'error',
        reference,
        verified: false,
        message: error.message || 'Failed to check payment status',
        timestamp: Date.now().toString()
      };

      handlePaymentCallback(errorData);
      return errorData;
    }
  }, [handlePaymentCallback]);

  // Auto-start listening when hook is used
  useEffect(() => {
    const cleanup = startListening();
    return cleanup;
  }, [startListening]);

  return {
    isListening,
    lastCallback,
    handlePaymentCallback,
    startListening,
    stopListening,
    checkPaymentStatus
  };
};

export default usePaymentCallback;
