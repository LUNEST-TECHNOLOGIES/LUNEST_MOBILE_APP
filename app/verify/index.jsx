import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import bookingService from '../../src/services/bookingService';

/**
 * Manual Agreement Verification Entry Point
 * Allows users to manually type a reference code to verify an agreement.
 */
const VerifyIndexPage = () => {
  const router = useRouter();
  const [bookingRef, setBookingRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, type: 'error', message: '' });

  const showToast = (type, message) => {
    setToast({ visible: true, type, message });
    setTimeout(() => setToast({ visible: false, type: 'error', message: '' }), 4000);
  };

  const handleVerify = async () => {
    if (!bookingRef || bookingRef.trim().length < 5) {
      showToast('error', 'Please enter a valid reference code.');
      return;
    }

    setLoading(true);
    try {
      // PERFORM VALIDATION BEFORE REDIRECTING (as requested for error handling)
      const cleanRef = bookingRef.trim().toUpperCase();
      const result = await bookingService.verifyPublicAgreement(cleanRef);
      
      if (result.success) {
        // Redirection on valid ref
        router.push(`/verify/agreement/${cleanRef}`);
      } else {
        // Error on invalid ref
        showToast('error', result.message || 'This reference code could not be verified.');
      }
    } catch (err) {
      showToast('error', 'An error occurred during verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ 
        title: 'Verify Agreement',
        headerShown: false
      }} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-8 justify-center items-center">
          {/* Header Branding */}
          <View className="mb-12 items-center">
            <Image 
              source={require('../../src/assets/images/lunest_logo_main.png')}
              style={{ width: 180, height: 60, resizeMode: 'contain' }}
            />
            <Text className="text-slate-400 font-medium text-center mt-2 px-6">
              Official Property Agreement Verification Hub
            </Text>
          </View>

          {/* Verification Form Card */}
          <View className="w-full bg-slate-50 rounded-3xl p-8 border border-slate-100 shadow-sm">
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-blue-50 rounded-full items-center justify-center mb-4">
                <Ionicons name="shield-checkmark" size={32} color="#010135" />
              </View>
              <Text className="text-xl font-bold text-slate-900">Verify Document</Text>
              <Text className="text-slate-500 text-xs text-center mt-2">
                Enter the reference code (e.g., LNS-XXXXXX) to confirm the authenticity of your rental agreement.
              </Text>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Reference Code</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-800 font-bold text-base"
                  placeholder="e.g. LNS-A1B2C3D4"
                  placeholderTextColor="#94a3b8"
                  value={bookingRef}
                  onChangeText={setBookingRef}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={handleVerify}
                />
              </View>

              <TouchableOpacity 
                onPress={handleVerify}
                disabled={loading}
                className={`w-full py-4 rounded-2xl flex-row items-center justify-center ${loading ? 'bg-slate-300' : 'bg-slate-900'}`}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Text className="text-white font-bold text-lg mr-2">Verify Now</Text>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Help Text */}
          <TouchableOpacity 
            onPress={() => router.replace('/')}
            className="mt-12"
          >
            <Text className="text-slate-400 font-bold text-xs uppercase tracking-tighter decoration-slate-400">
               Return to Lunest Home
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Legacy Toast Notification (Matching Project Aesthetic) */}
      {toast.visible && (
        <View style={[
          styles.toastContainer,
          toast.type === 'success' ? styles.toastSuccess : styles.toastError
        ]}>
          <View style={styles.toastContent}>
            <View style={styles.toastIconSection}>
              <Ionicons 
                name={toast.type === 'success' ? "checkmark-circle" : "alert-circle"} 
                size={20} 
                color="#FFFFFF" 
              />
            </View>
            <Text style={styles.toastMessage}>{toast.message}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 9999,
  },
  toastSuccess: {
    backgroundColor: '#10b981',
  },
  toastError: {
    backgroundColor: '#ef4444',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastIconSection: {
    marginRight: 12,
  },
  toastMessage: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default VerifyIndexPage;
