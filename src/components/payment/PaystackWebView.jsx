/**
 * PaystackWebView - In-app Paystack payment component
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { PaystackWebView as Paystack } from 'react-native-paystack-webview';
import apiClient from '../../services/apiClient';

const PaystackWebView = ({
  amount,
  email,
  reference,
  onSuccess,
  onCancel,
  onError
}) => {
  const paystackWebViewRef = useRef(null);
  const [publicKey, setPublicKey] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicKey();
  }, []);

  const fetchPublicKey = async () => {
    try {
      const response = await apiClient.get('/v1/payments/public-key');
      if (response.success) {
        setPublicKey(response.body.publicKey);
      } else {
        console.error('[PaystackWebView] Failed to fetch public key');
        onError(new Error('Failed to load payment configuration'));
      }
    } catch (error) {
      console.error('[PaystackWebView] Error fetching public key:', error);
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  if (!publicKey) {
    return (
      <View style={styles.errorContainer}>
        <Text>Failed to load payment configuration</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Paystack
        ref={paystackWebViewRef}
        paystackKey={publicKey}
        amount={amount}
        email={email}
        reference={reference}
        onSuccess={(response) => {
          console.log("[PaystackWebView] Payment successful:", response);
          onSuccess(response);
        }}
        onCancel={() => {
          console.log("[PaystackWebView] Payment cancelled");
          onCancel();
        }}
        onError={(error) => {
          console.error("[PaystackWebView] Payment error:", error);
          onError(error);
        }}
        autoStart={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export default PaystackWebView;