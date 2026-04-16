import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Image, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import bookingService from '../../src/services/bookingService';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';

/**
 * Manual Agreement Verification Entry Point
 * Allows users to manually type a reference code to verify an agreement.
 */
const VerifyIndexPage = () => {
  const router = useRouter();
  const [bookingRef, setBookingRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, type: 'error', message: '' });
  
  const inputRef = useRef(null);
  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setTimeout(() => inputRef.current?.focus(), 500);
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulseAnim.value,
    transform: [{ scale: 1 + (1 - pulseAnim.value) * 0.02 }]
  }));

  useEffect(() => {
    if (loading) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      pulseAnim.value = withTiming(1);
    }
  }, [loading]);

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
    <SafeAreaView className="flex-1 bg-gray-50 lg:bg-slate-200">
      <Stack.Screen options={{ 
        title: 'Verify Agreement',
        headerShown: false
      }} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 lg:justify-center items-center py-10">
            <View className="w-full px-8 lg:px-10 lg:max-w-[480px] lg:my-8 lg:rounded-[40px] lg:overflow-hidden lg:shadow-2xl lg:bg-white lg:border lg:border-slate-100">

              {/* Header Branding */}
              <View className="mb-10 items-center mt-10 lg:mt-0">
                <Image 
                  source={require('../../src/assets/images/lunest_logo_main.png')}
                  style={{ width: 180, height: 60, resizeMode: 'contain' }}
                />
                <Text className="text-slate-400 font-medium text-center mt-3 px-4">
                  Official Property Agreement Verification Hub
                </Text>
              </View>

              {/* Verification Form Card */}
              <Animated.View 
                style={animatedStyle}
                className="w-full bg-white rounded-[32px] p-8 lg:p-10 shadow-lg lg:shadow-none border border-slate-100"
              >
                <View className="items-center mb-8">
                  <View className="w-16 h-16 bg-blue-50 rounded-2xl items-center justify-center mb-5 rotate-3">
                    <Ionicons name="shield-checkmark" size={32} color="#010135" />
                  </View>
                  <Text className="text-2xl font-bold text-slate-900">Verify Document</Text>
                  <Text className="text-slate-500 text-xs text-center mt-3 leading-relaxed">
                    Enter the reference code (e.g., LNS-XXXXXX) to confirm the authenticity of your rental agreement.
                  </Text>
                </View>

                <View className="space-y-5">
                  <View>
                    <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Reference Code</Text>
                    <TextInput
                      ref={inputRef}
                      className={`bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-slate-800 font-bold text-base ${loading ? 'opacity-50' : 'opacity-100'}`}
                      placeholder="e.g. LNS-A1B2C3D4"
                      placeholderTextColor="#94a3b8"
                      value={bookingRef}
                      onChangeText={setBookingRef}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      editable={!loading}
                      returnKeyType="go"
                      onSubmitEditing={handleVerify}
                    />
                  </View>

                  <TouchableOpacity 
                    onPress={handleVerify}
                    disabled={loading}
                    className={`w-full py-4 rounded-2xl flex-row items-center justify-center shadow-md ${loading ? 'bg-slate-300' : 'bg-primary'}`}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <>
                        <Text className="text-white font-bold text-base mr-2">Verify Now</Text>
                        <Ionicons name="arrow-forward" size={20} color="white" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </Animated.View>

              {/* Help/Return links */}
              <View className="mt-10 mb-10 items-center">
                <TouchableOpacity 
                  onPress={() => router.replace('/')}
                  className="flex-row items-center bg-white px-6 py-3 rounded-full shadow-sm border border-slate-100"
                >
                  <Ionicons name="home-outline" size={14} color="#64748b" />
                  <Text className="text-slate-500 font-bold text-[10px] uppercase tracking-widest ml-2">
                    Return to Lunest Home
                  </Text>
                </TouchableOpacity>
                
                <Text className="mt-8 text-slate-300 text-[9px] uppercase tracking-widest">
                  Protected by Lunest Shield™
                </Text>
              </View>

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Toast Notification */}
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
